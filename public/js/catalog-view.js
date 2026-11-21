// Vitrine: filtros, cards e painel "Estoque agora".
// Os cards sao atualizados no lugar (por id), sem recriar a lista, para que o foco
// do teclado e a posicao de rolagem nao se percam quando o estoque muda em tempo real.
import { h, icon, semAcento } from './lib/dom.js';
import {
  CATEGORIAS, CONDICAO_LABEL, PROCEDENCIA_LABEL, disponibilidade, formatBRL,
} from './catalog.js';

const PLACEHOLDER = '/img/placeholder.svg';
const ORDEM_CONDICAO = { novo: 0, seminovo: 1, reposicao: 2 };
const ordemCategoria = (id) => {
  const i = CATEGORIAS.findIndex((c) => c.id === id);
  return i === -1 ? 99 : i;
};

export function iniciarCatalogo({ grade, filtros, selectCondicao, busca, contagem, vazio, aoAdicionar }) {
  const estado = { produtos: [], categoria: 'todos', condicao: 'todos', termo: '' };
  const cards = new Map();

  // Filtros por categoria: botoes com aria-pressed, operaveis por Tab/Enter/Espaco.
  const botoes = [{ id: 'todos', nome: 'Todos' }, ...CATEGORIAS].map((c) => {
    const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(c.id === 'todos'), dataset: { cat: c.id } }, c.nome);
    b.addEventListener('click', () => {
      estado.categoria = c.id;
      botoes.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      renderizar();
    });
    return b;
  });
  filtros.replaceChildren(...botoes);

  selectCondicao.addEventListener('change', () => { estado.condicao = selectCondicao.value; renderizar(); });
  busca.addEventListener('input', () => { estado.termo = semAcento(busca.value.trim()); renderizar(); });

  vazio.addEventListener('click', (e) => {
    if (!e.target.closest('[data-limpar]')) return;
    estado.categoria = 'todos';
    estado.condicao = 'todos';
    estado.termo = '';
    selectCondicao.value = 'todos';
    busca.value = '';
    botoes.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.cat === 'todos')));
    renderizar();
  });

  function criarCard(id) {
    const img = h('img', { class: 'product__img', width: '640', height: '480', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer', alt: '' });
    const ref = {
      img,
      selos: h('div', { class: 'product__badges' }),
      nome: h('h3', { class: 'product__name' }),
      descricao: h('p', { class: 'product__desc' }),
      garantia: h('p', { class: 'product__meta' }),
      preco: h('p', { class: 'product__price' }),
      status: h('p', { class: 'stock' }, h('span', { class: 'stock__dot', 'aria-hidden': 'true' }), h('span', { class: 'stock__text' })),
      botao: h('button', { type: 'button', class: 'btn btn--primary btn--block' }),
      miniaturas: h('div', { class: 'product__thumbs', role: 'group', 'aria-label': 'Fotos do produto' }),
      imagemAtual: '',
      chaveFotos: '',
      falhou: false,
      ultimoEstado: null,
      p: null,
    };
    ref.botao.addEventListener('click', () => aoAdicionar(id));
    img.addEventListener('error', () => {
      if (ref.falhou) return;
      ref.falhou = true;
      img.setAttribute('src', PLACEHOLDER);
      img.alt = `Imagem ilustrativa de ${ref.nome.textContent}. Foto real em breve.`;
    });
    ref.el = h('article', { class: 'product', dataset: { id } },
      h('div', { class: 'product__media' }, img),
      h('div', { class: 'product__body' },
        ref.selos, ref.nome, ref.descricao, ref.miniaturas, ref.garantia,
        h('div', { class: 'product__foot' }, ref.preco, ref.status),
        ref.botao));
    return ref;
  }

  function preencher(ref, p) {
    const estoque = Number.isInteger(p.estoque) ? p.estoque : 0;
    const disp = disponibilidade(estoque);
    const condicao = CONDICAO_LABEL[p.condicao] || p.condicao;

    ref.nome.textContent = p.nome;
    ref.descricao.textContent = p.descricao || '';
    ref.preco.textContent = formatBRL(p.precoCentavos);

    // Galeria: a primeira foto e a principal. A foto escolhida pelo visitante e mantida nas atualizacoes de estoque.
    ref.p = p;
    const fotos = Array.isArray(p.imagens) && p.imagens.length
      ? p.imagens.filter((u) => typeof u === 'string' && u !== '')
      : (typeof p.imagemUrl === 'string' && p.imagemUrl ? [p.imagemUrl] : []);
    if (!fotos.includes(ref.imagemAtual)) { ref.falhou = false; ref.imagemAtual = fotos[0] || ''; }
    const url = ref.imagemAtual;
    const posicao = fotos.indexOf(url) + 1;

    // Texto alternativo dinamico: usa o texto cadastrado ou monta um a partir dos dados.
    const usaFoto = url !== '' && !ref.falhou;
    const src = usaFoto ? url : PLACEHOLDER;
    if (ref.img.getAttribute('src') !== src) ref.img.setAttribute('src', src);
    const base = p.imagemAlt || `${p.nome} - ${condicao}`;
    ref.img.alt = usaFoto
      ? (fotos.length > 1 ? `${base}, foto ${posicao} de ${fotos.length}` : base)
      : `Imagem ilustrativa de ${p.nome}. Foto real em breve.`;

    const chave = fotos.join('|');
    if (ref.chaveFotos !== chave) {
      ref.chaveFotos = chave;
      ref.miniaturas.replaceChildren(...(fotos.length > 1 ? fotos.map((u, i) => {
        const miniatura = h('img', { src: u, alt: '', width: '56', height: '56', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
        const b = h('button', { type: 'button', class: 'product__thumb', 'aria-label': `Ver foto ${i + 1} de ${fotos.length}` }, miniatura);
        miniatura.addEventListener('error', () => b.remove());
        b.addEventListener('click', () => { ref.imagemAtual = u; ref.falhou = false; preencher(ref, ref.p); });
        return b;
      }) : []));
    }
    ref.miniaturas.hidden = fotos.length < 2;
    ref.miniaturas.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(fotos[i] === url)));

    const selo = (texto, classe = '') => h('span', { class: `badge ${classe}`.trim() }, texto);
    ref.selos.replaceChildren(
      selo(condicao),
      selo(PROCEDENCIA_LABEL[p.procedencia] || '', p.procedencia === 'compativel' ? 'badge--alerta' : '')
    );

    ref.garantia.textContent = p.garantiaLojaDias > 0
      ? `Garantia legal de 90 dias (CDC) e mais ${p.garantiaLojaDias} dias de garantia adicional da loja.`
      : 'Garantia legal de 90 dias (CDC).';

    ref.status.dataset.estado = disp;
    ref.status.lastChild.textContent =
      disp === 'esgotado' ? 'Esgotado' : disp === 'ultimas-unidades' ? `Últimas unidades (${estoque})` : 'Em estoque';

    ref.botao.disabled = disp === 'esgotado';
    ref.botao.setAttribute('aria-label',
      disp === 'esgotado' ? `${p.nome}: esgotado` : `Adicionar ${p.nome} ao carrinho`);
    if (ref.ultimoEstado !== disp) {
      ref.botao.replaceChildren(icon('cart'), h('span', {}, disp === 'esgotado' ? 'Esgotado' : 'Adicionar ao carrinho'));
      ref.ultimoEstado = disp;
    }
  }

  function filtrar() {
    return estado.produtos
      .filter((p) => estado.categoria === 'todos' || p.categoriaId === estado.categoria)
      .filter((p) => estado.condicao === 'todos' || p.condicao === estado.condicao)
      .filter((p) => !estado.termo || semAcento(`${p.nome} ${p.descricao}`).includes(estado.termo))
      .sort((a, b) =>
        ordemCategoria(a.categoriaId) - ordemCategoria(b.categoriaId) ||
        (ORDEM_CONDICAO[a.condicao] ?? 9) - (ORDEM_CONDICAO[b.condicao] ?? 9) ||
        a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  function renderizar() {
    const visiveis = filtrar();
    const vistos = new Set();
    let anterior = null;

    visiveis.forEach((p) => {
      let ref = cards.get(p.id);
      if (!ref) { ref = criarCard(p.id); cards.set(p.id, ref); }
      preencher(ref, p);
      vistos.add(p.id);
      const alvo = anterior ? anterior.nextSibling : grade.firstChild;
      if (ref.el !== alvo) grade.insertBefore(ref.el, alvo);
      anterior = ref.el;
    });

    for (const [id, ref] of cards) {
      if (!vistos.has(id) && ref.el.parentNode === grade) ref.el.remove();
      if (!estado.produtos.some((p) => p.id === id)) cards.delete(id);
    }

    contagem.textContent = estado.produtos.length
      ? `${visiveis.length} ${visiveis.length === 1 ? 'item exibido' : 'itens exibidos'}`
      : '';

    if (!visiveis.length) {
      vazio.hidden = false;
      vazio.replaceChildren(
        estado.produtos.length
          ? h('div', {}, h('p', {}, 'Nenhum produto encontrado com esses filtros.'),
              h('button', { type: 'button', class: 'btn btn--secondary', 'data-limpar': '' }, 'Limpar filtros'))
          : h('p', {}, 'Nenhum produto disponível no momento. Fale com a gente pelo WhatsApp para consultar novidades.')
      );
    } else {
      vazio.hidden = true;
      vazio.replaceChildren();
    }
  }

  return {
    atualizar(produtos) { estado.produtos = produtos; renderizar(); },
    falhou(mensagem) {
      estado.produtos = [];
      renderizar();
      vazio.hidden = false;
      vazio.replaceChildren(h('p', {}, mensagem));
    },
  };
}

// Painel do topo: unidades disponiveis por categoria, calculadas dos dados reais.
export function iniciarPainelEstoque({ lista, status }) {
  const linhas = new Map();
  CATEGORIAS.forEach((c) => {
    const valor = h('span', { class: 'live-list__value' }, '-');
    const detalhe = h('span', { class: 'live-list__detail' }, 'Carregando');
    linhas.set(c.id, { valor, detalhe });
    lista.append(h('li', { class: 'live-list__row' },
      icon(c.icone, 'icon icon--lg'),
      h('span', { class: 'live-list__name' }, c.nome),
      detalhe, valor));
  });

  return {
    atualizar(produtos) {
      CATEGORIAS.forEach((c) => {
        const itens = produtos.filter((p) => p.categoriaId === c.id);
        const unidades = itens.reduce((s, p) => s + (p.estoque > 0 ? p.estoque : 0), 0);
        const modelos = itens.filter((p) => p.estoque > 0).length;
        const l = linhas.get(c.id);
        l.valor.textContent = String(unidades);
        l.detalhe.textContent = unidades ? `${modelos} ${modelos === 1 ? 'modelo' : 'modelos'}` : 'sem estoque';
      });
      status.textContent = `Atualizado às ${new Date().toLocaleTimeString('pt-BR')}`;
    },
    indisponivel(texto) {
      status.textContent = texto;
      linhas.forEach((l) => { l.valor.textContent = '-'; l.detalhe.textContent = 'indisponível'; });
    },
  };
}
