// Auxiliares de DOM. Todo texto entra por textContent/createTextNode,
// nunca por innerHTML, para impedir injecao de HTML vinda do banco de dados.

export function h(tag, props = {}, ...filhos) {
  const el = document.createElement(tag);
  for (const [chave, valor] of Object.entries(props)) {
    if (valor === false || valor == null) continue;
    if (chave === 'class') el.className = valor;
    else if (chave === 'dataset') Object.assign(el.dataset, valor);
    else if (chave.startsWith('on') && typeof valor === 'function') {
      el.addEventListener(chave.slice(2).toLowerCase(), valor);
    } else el.setAttribute(chave, valor === true ? '' : valor);
  }
  for (const filho of filhos.flat()) {
    if (filho == null || filho === false) continue;
    el.append(filho.nodeType ? filho : document.createTextNode(String(filho)));
  }
  return el;
}

// Icone vetorial a partir do sprite inline (#i-nome) presente em todas as paginas.
export function icon(nome, classe = 'icon') {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', classe);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', `#i-${nome}`);
  svg.append(use);
  return svg;
}

// Anuncia mudancas para leitores de tela (regiao aria-live da pagina).
let timer;
export function announce(mensagem) {
  const regiao = document.getElementById('live-region');
  if (!regiao) return;
  clearTimeout(timer);
  regiao.textContent = '';
  timer = setTimeout(() => { regiao.textContent = mensagem; }, 60);
}

export const semAcento = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
