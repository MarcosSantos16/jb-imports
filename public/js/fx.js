// Efeitos visuais e interacoes da loja (JavaScript puro, sem dependencias).
// - Grade de pontos reativa ao cursor (fundo animado, desenhado em canvas)
// - Botoes magneticos e ondulacao (ripple) ao clicar
// - Indicador deslizante na navegacao
// - Cabecalho com sombra ao rolar
// Tudo respeita prefers-reduced-motion: com ele ativo, so a grade estatica aparece.

const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(pointer: fine)');

// ---------- 1. Grade de pontos ----------
const SPACING = 28;        // distancia entre pontos (px)
const BASE_RADIUS = 1.1;   // raio do ponto em repouso
const INFLUENCE = 150;     // raio de influencia do cursor (px)
const PUSH = 22;           // deslocamento maximo causado pelo cursor (px)
const SPRING = 0.09;       // rigidez da mola que devolve o ponto ao lugar
const DAMPING = 0.82;      // atrito (menor = mais inercia)

function iniciarGradeDePontos(canvas) {
  const ctx = canvas.getContext('2d');
  let largura = 0;
  let altura = 0;
  let pontos = [];
  const mouse = { x: -9999, y: -9999, ativo: false };

  function montar() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    largura = window.innerWidth;
    altura = window.innerHeight;
    canvas.width = Math.round(largura * dpr);
    canvas.height = Math.round(altura * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    pontos = [];
    const colunas = Math.ceil(largura / SPACING) + 1;
    const linhas = Math.ceil(altura / SPACING) + 1;
    for (let i = 0; i < colunas; i++) {
      for (let j = 0; j < linhas; j++) {
        const x = i * SPACING;
        const y = j * SPACING;
        pontos.push({ x0: x, y0: y, x, y, vx: 0, vy: 0 });
      }
    }
  }

  function desenhar() {
    ctx.clearRect(0, 0, largura, altura);
    for (const p of pontos) {
      const dx = p.x0 - mouse.x;
      const dy = p.y0 - mouse.y;
      const dist = Math.hypot(dx, dy);
      const perto = mouse.ativo && dist < INFLUENCE ? 1 - dist / INFLUENCE : 0;

      if (mouse.ativo && perto > 0) {
        // Empurra o ponto para longe do cursor, com forca quadratica
        const forca = perto * perto * PUSH;
        const nx = dist > 0.001 ? dx / dist : 0;
        const ny = dist > 0.001 ? dy / dist : 0;
        p.vx += nx * forca * 0.12;
        p.vy += ny * forca * 0.12;
      }

      // Mola de volta a posicao original + atrito
      p.vx += (p.x0 - p.x) * SPRING;
      p.vy += (p.y0 - p.y) * SPRING;
      p.vx *= DAMPING;
      p.vy *= DAMPING;
      p.x += p.vx;
      p.y += p.vy;

      const brilho = perto;
      const raio = BASE_RADIUS + brilho * 1.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, raio, 0, Math.PI * 2);
      ctx.fillStyle = brilho > 0.02
        ? `rgba(118, 255, 3, ${0.25 + brilho * 0.75})`
        : 'rgba(255, 255, 255, 0.13)';
      ctx.fill();
    }
  }

  function quadro() {
    desenhar();
    requestAnimationFrame(quadro);
  }

  window.addEventListener('pointermove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.ativo = true;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { mouse.ativo = false; });
  window.addEventListener('resize', montar);

  montar();
  if (reduzir.matches) {
    desenhar();              // um quadro estatico apenas
    return;
  }
  requestAnimationFrame(quadro);
}

// ---------- 2. Botoes magneticos e ondulacao ----------
const SELETOR_MAGNETICO = '.btn, .icon-btn, .chip';

function iniciarBotoes() {
  if (!reduzir.matches && finePointer.matches) {
    document.addEventListener('pointermove', (e) => {
      const alvo = e.target.closest && e.target.closest(SELETOR_MAGNETICO);
      if (!alvo || alvo.disabled) return;
      const r = alvo.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
      alvo.style.translate = `${(dx * 3).toFixed(2)}px ${(dy * 2).toFixed(2)}px`;
    }, { passive: true });

    document.addEventListener('pointerout', (e) => {
      const alvo = e.target.closest && e.target.closest(SELETOR_MAGNETICO);
      if (!alvo || (e.relatedTarget && alvo.contains(e.relatedTarget))) return;
      alvo.style.translate = '';
    });
  }

  document.addEventListener('pointerdown', (e) => {
    const alvo = e.target.closest && e.target.closest('.btn');
    if (!alvo || alvo.disabled || reduzir.matches || e.button !== 0) return;
    const r = alvo.getBoundingClientRect();
    const onda = document.createElement('span');
    onda.className = 'ripple';
    onda.style.left = `${e.clientX - r.left}px`;
    onda.style.top = `${e.clientY - r.top}px`;
    alvo.appendChild(onda);
    onda.addEventListener('animationend', () => onda.remove());
  });
}

// ---------- 3. Indicador deslizante na navegacao ----------
function iniciarNavegacao() {
  const lista = document.querySelector('.site-nav__list');
  if (!lista) return;

  const pilula = document.createElement('span');
  pilula.className = 'nav-pill';
  pilula.setAttribute('aria-hidden', 'true');
  lista.prepend(pilula);

  function moverPara(link) {
    if (!link) { pilula.style.opacity = '0'; return; }
    const r = link.getBoundingClientRect();
    const base = lista.getBoundingClientRect();
    pilula.style.opacity = '1';
    pilula.style.width = `${r.width + 16}px`;
    pilula.style.transform = `translateX(${r.left - base.left - 8}px)`;
  }

  lista.addEventListener('pointerover', (e) => {
    const link = e.target.closest('a');
    if (link) moverPara(link);
  });
  lista.addEventListener('pointerleave', () => {
    const atual = lista.querySelector('a[aria-current="true"]') || document.activeElement;
    moverPara(atual && lista.contains(atual) ? atual : null);
  });
  lista.addEventListener('focusin', (e) => moverPara(e.target.closest('a')));
  lista.addEventListener('focusout', () => moverPara(null));
}

// ---------- 4. Cabecalho e cards ----------
function iniciarRolagemECartoes() {
  const cabecalho = document.querySelector('.site-header');
  if (cabecalho) {
    const atualizar = () => cabecalho.classList.toggle('is-scrolled', window.scrollY > 8);
    window.addEventListener('scroll', atualizar, { passive: true });
    atualizar();
  }

  // Luz do cursor nos cards de produto (a variavel --mx/--my alimenta o CSS)
  if (!reduzir.matches) {
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest && e.target.closest('.product');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });
  }
}

// ---------- Inicializacao ----------
const canvas = document.querySelector('.fx-dots');
if (canvas) iniciarGradeDePontos(canvas);
iniciarBotoes();
iniciarNavegacao();
iniciarRolagemECartoes();
