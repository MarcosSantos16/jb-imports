'use strict';

// Fonte unica de regras do catalogo no servidor.
// Existe uma copia espelhada para o navegador em public/js/catalog.js:
// ao alterar categorias ou limites, altere os dois arquivos.

const CATEGORIAS = [
  { id: 'iphones', nome: 'iPhones', ordem: 1 },
  { id: 'displays', nome: 'Displays e telas', ordem: 2 },
  { id: 'baterias', nome: 'Baterias', ordem: 3 },
  { id: 'cabos-fontes', nome: 'Cabos e fontes', ordem: 4 },
  { id: 'fones', nome: 'Fones', ordem: 5 },
];

const CONDICOES = ['novo', 'seminovo', 'reposicao'];

// Procedencia declarada de cada item (evita alegacao enganosa de "100% original").
const PROCEDENCIAS = ['original', 'compativel', 'retirada-usada'];

const LIMITE_ULTIMAS_UNIDADES = 3;

// Versao do texto da Politica de Privacidade aceita no pedido (registro de consentimento).
const POLITICA_VERSAO = '2026-11-18';

function disponibilidade(estoque) {
  if (estoque <= 0) return 'esgotado';
  if (estoque <= LIMITE_ULTIMAS_UNIDADES) return 'ultimas-unidades';
  return 'em-estoque';
}

module.exports = {
  CATEGORIAS,
  CONDICOES,
  PROCEDENCIAS,
  LIMITE_ULTIMAS_UNIDADES,
  POLITICA_VERSAO,
  disponibilidade,
};
