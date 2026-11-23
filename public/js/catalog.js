export const CATEGORIAS = [
  { id: 'iphones', nome: 'iPhones', icone: 'phone' },
  { id: 'displays', nome: 'Displays e telas', icone: 'display' },
  { id: 'baterias', nome: 'Baterias', icone: 'battery' },
  { id: 'cabos-fontes', nome: 'Cabos e fontes', icone: 'cable' },
  { id: 'fones', nome: 'Fones', icone: 'headphones' },
];

export const CONDICAO_LABEL = {
  novo: 'Novo',
  seminovo: 'Seminovo',
  reposicao: 'Peça de reposição',
};

export const PROCEDENCIA_LABEL = {
  original: 'Original do fabricante',
  compativel: 'Compatível (não original)',
  'retirada-usada': 'Peça retirada de aparelho (usada)',
};

export const LIMITE_ULTIMAS_UNIDADES = 3;

export function disponibilidade(estoque) {
  if (!(estoque > 0)) return 'esgotado';
  if (estoque <= LIMITE_ULTIMAS_UNIDADES) return 'ultimas-unidades';
  return 'em-estoque';
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatBRL = (centavos) => brl.format((centavos || 0) / 100);

export const categoriaNome = (id) => (CATEGORIAS.find((c) => c.id === id) || { nome: id }).nome;
