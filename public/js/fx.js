// Efeitos visuais da loja: fundo de pontos, botoes magneticos e cards com inclinacao.
const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)');
const mouseFino = window.matchMedia('(hover: hover) and (pointer: fine)');
const podeAnimar = () => !reduzir.matches;

document.documentElement.classList.add('js');

const ESPACAMENTO = 28;
const RAIO_BASE = 1.1;
const INFLUENCIA = 150;
const EMPURRAO = 22;
const MOLA = 0.09;
const ATRITO = 0.82;
const DPR_MAX = 1.5;

function iniciarGradeDePontos(canvas) {
  const ctx = canvas.getContext('2d');
  let largura = 0;
  let altura = 0;
  let pontos = [];
  let rodando = false;
  let quadroId = 0;
  const mouse = { x: -9999, y: -9999, ativo: false };

  function montar() {
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
    largura = window.innerWidth;
    altura = window.innerHeight;
    canvas.width = Math.round(largura * dpr);
    canvas.height = Math.round(altura * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pontos = [];
    const colunas = Math.ceil(largura / ESPACAMENTO) + 1;
    const linhas = Math.ceil(altura / ESPACAMENTO) + 1;
    for (let i = 0; i < colunas; i++) {
      for (let j = 0; j < linhas; j++) {
        const x = i * ESPACAMENTO;
        const y = j * ESPACAMENTO;
        pontos.push({ x0: x, y0: y, x, y, vx: 0, vy: 0 });
      }
    }
    desenhar(true);
  }

  function desenhar(forcar = false) {
    let agitado = false;
    ctx.clearRect(0, 0, largura, altura);
    for (const p of pontos) {
      const dx = p.x0 - mouse.x;
      const dy = p.y0 - mouse.y;
      const dist = Math.hypot(dx, dy);
      const perto = mouse.ativo && dist < INFLUENCIA ? 1 - dist / INFLUENCIA : 0;

      if (perto > 0) {
        const forca = perto * perto * EMPURRAO;
        p.vx += (dx / (dist || 1)) * forca * 0.12;
        p.vy += (dy / (dist || 1)) * forca * 0.12;
      }
      p.vx += (p.x0 - p.x) * MOLA;
      p.vy += (p.y0 - p.y) * MOLA;
      p.vx *= ATRITO;
      p.vy *= ATRITO;
      p.x += p.vx;
      p.y += p.vy;

      if (Math.abs(p.vx) > 0.02 || Math.abs(p.vy) > 0.02 || Math.abs(p.x - p.x0) > 0.05 || Math.abs(p.y - p.y0) > 0.05) {
        agitado = true;
      }

      const raio = RAIO_BASE + perto * 1.8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, raio, 0, Math.PI * 2);
      ctx.fillStyle = perto > 0.02
        ? `rgba(118, 255, 3, ${(0.25 + perto * 0.75).toFixed(2)})`
        : 'rgba(255, 255, 255, 0.13)';
      ctx.fill();
    }
    return agitado || forcar;
  }

  function quadro() {
    const ainda = desenhar();
    if (ainda || mouse.ativo) {
      quadroId = requestAnimationFrame(quadro);
    } else {
      rodando = false;
    }
  }

  function acordar() {
    if (!rodando && podeAnimar()) {
      rodando = true;
      quadroId = requestAnimationFrame(quadro);
    }
  }

  window.addEventListener('pointermove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.ativo = true;
    acordar();
  }, { passive: true });
  document.addEventListener('pointerleave', () => { mouse.ativo = false; acordar(); });
  window.addEventListener('resize', montar);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(quadroId); rodando = false; }
    else acordar();
  });

  montar();
  if (podeAnimar()) acordar();
}

const SELETOR_MAGNETICO = '.btn, .icon-btn, .chip';

function iniciarBotoes() {
  if (mouseFino.matches && podeAnimar()) {
    document.addEventListener('pointermove', (e) => {
      const alvo = e.target.closest && e.target.closest(SELETOR_MAGNETICO);
      if (!alvo || alvo.disabled) return;
      const r = alvo.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
      alvo.style.translate = `${(dx * 4).toFixed(2)}px ${(dy * 3).toFixed(2)}px`;
    }, { passive: true });

    document.addEventListener('pointerout', (e) => {
      const alvo = e.target.closest && e.target.closest(SELETOR_MAGNETICO);
      if (!alvo || (e.relatedTarget && alvo.contains(e.relatedTarget))) return;
      alvo.style.translate = '';
    });
  }

  document.addEventListener('pointerdown', (e) => {
    const alvo = e.target.closest && e.target.closest('.btn');
    if (!alvo || alvo.disabled || !podeAnimar() || e.button !== 0) return;
    const r = alvo.getBoundingClientRect();
    const onda = document.createElement('span');
    onda.className = 'ripple';
    onda.style.left = `${e.clientX - r.left}px`;
    onda.style.top = `${e.clientY - r.top}px`;
    alvo.appendChild(onda);
    onda.addEventListener('animationend', () => onda.remove());
  });
}

function iniciarCartoes() {
  if (!mouseFino.matches || !podeAnimar()) return;
  let quadro = 0;
  let alvoCard = null;
  let ultimo = { x: 0, y: 0 };

  function aplicar() {
    quadro = 0;
    if (!alvoCard) return;
    const r = alvoCard.getBoundingClientRect();
    const px = (ultimo.x - r.left) / r.width - 0.5;
    const py = (ultimo.y - r.top) / r.height - 0.5;
    alvoCard.style.setProperty('--rx', `${(-py * 6).toFixed(2)}deg`);
    alvoCard.style.setProperty('--ry', `${(px * 8).toFixed(2)}deg`);
  }

  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest && e.target.closest('.product');
    if (card !== alvoCard) {
      if (alvoCard) { alvoCard.style.setProperty('--rx', '0deg'); alvoCard.style.setProperty('--ry', '0deg'); }
      alvoCard = card;
    }
    if (!card) return;
    ultimo = { x: e.clientX, y: e.clientY };
    if (!quadro) quadro = requestAnimationFrame(aplicar);
  }, { passive: true });
}

function iniciarRevelacao() {
  if (!podeAnimar() || !('IntersectionObserver' in window)) {
    document.documentElement.classList.remove('js');
    return;
  }

  const observador = new IntersectionObserver((entradas) => {
    for (const entrada of entradas) {
      if (!entrada.isIntersecting) continue;
      const el = entrada.target;
      el.classList.add('is-visible');
      observador.unobserve(el);
      el.addEventListener('transitionend', (ev) => {
        if (ev.propertyName === 'opacity') el.classList.remove('reveal', 'is-visible');
      }, { once: true });
    }
  }, { rootMargin: '0px 0px -4% 0px', threshold: 0.05 });

  function preparar(el) {
    if (el.dataset.rev) return;
    el.dataset.rev = '1';
    const pai = el.parentElement;
    if (pai) {
      const idx = Math.min([...pai.children].indexOf(el), 6);
      if (idx > 0) el.style.setProperty('--d', `${idx * 110}ms`);
    }
    el.classList.add('reveal');
    observador.observe(el);
  }

  document.querySelectorAll('.reveal').forEach(preparar);
  new MutationObserver((mutacoes) => {
    for (const m of mutacoes) {
      for (const no of m.addedNodes) {
        if (no.nodeType !== 1) continue;
        if (no.matches('.product')) preparar(no);
        if (no.querySelectorAll) no.querySelectorAll('.product').forEach(preparar);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}

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

  const links = [...document.querySelectorAll('.site-nav a[href*="#"]')];
  const secoes = links
    .map((a) => ({ a, el: document.getElementById(a.hash.slice(1)) }))
    .filter((x) => x.el);
  if (secoes.length && 'IntersectionObserver' in window) {
    const observador = new IntersectionObserver((entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        const alvo = secoes.find((x) => x.el === entrada.target);
        if (!alvo) continue;
        links.forEach((a) => a.removeAttribute('aria-current'));
        alvo.a.setAttribute('aria-current', 'true');
        moverPara(alvo.a);
      }
    }, { rootMargin: '-45% 0px -50% 0px' });
    secoes.forEach((x) => observador.observe(x.el));
  }
}

function iniciarCabecalho() {
  const cabecalho = document.querySelector('.site-header');
  if (!cabecalho) return;
  let pendente = false;
  const atualizar = () => {
    pendente = false;
    cabecalho.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  window.addEventListener('scroll', () => {
    if (!pendente) { pendente = true; requestAnimationFrame(atualizar); }
  }, { passive: true });
  atualizar();
}

const canvas = document.querySelector('.fx-dots');
if (canvas) iniciarGradeDePontos(canvas);
iniciarBotoes();
iniciarCartoes();
iniciarRevelacao();
iniciarNavegacao();
iniciarCabecalho();
