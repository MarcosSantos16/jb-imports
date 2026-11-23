const CHAVE = 'jb_cart_v1';
const MAX_POR_ITEM = 20;

let itens = ler();
const ouvintes = new Set();

function ler() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE) || '[]');
    return Array.isArray(bruto)
      ? bruto.filter((i) => i && typeof i.id === 'string' && Number.isInteger(i.qtd) && i.qtd > 0)
      : [];
  } catch (e) {
    return [];
  }
}

function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(itens));
  } catch (e) {
  }
  ouvintes.forEach((fn) => fn(itens));
}

export const cart = {
  itens: () => itens.map((i) => ({ ...i })),
  total: () => itens.reduce((s, i) => s + i.qtd, 0),
  qtd: (id) => (itens.find((i) => i.id === id) || { qtd: 0 }).qtd,

  adicionar(id, limite = MAX_POR_ITEM) {
    const teto = Math.min(limite, MAX_POR_ITEM);
    const atual = itens.find((i) => i.id === id);
    if (atual) {
      if (atual.qtd >= teto) return false;
      atual.qtd += 1;
    } else {
      if (teto < 1) return false;
      itens.push({ id, qtd: 1 });
    }
    salvar();
    return true;
  },

  definir(id, qtd) {
    const atual = itens.find((i) => i.id === id);
    if (!atual) return;
    if (qtd <= 0) itens = itens.filter((i) => i.id !== id);
    else atual.qtd = Math.min(qtd, MAX_POR_ITEM);
    salvar();
  },

  remover(id) {
    itens = itens.filter((i) => i.id !== id);
    salvar();
  },

  limpar() {
    itens = [];
    salvar();
  },

  assinar(fn) {
    ouvintes.add(fn);
    return () => ouvintes.delete(fn);
  },
};
