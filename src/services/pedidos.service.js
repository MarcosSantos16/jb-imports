'use strict';

const { db, FieldValue } = require('../config/firebase');
const { AppError } = require('../middleware/errors');
const { disponibilidade, POLITICA_VERSAO } = require('../config/catalogo');

const COLECAO = 'pedidos';
const ID_PRODUTO = /^[A-Za-z0-9]{10,40}$/;

function normalizarTelefone(valor) {
  const digitos = String(valor || '').replace(/\D/g, '');
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith('55')) return digitos;
  return null;
}

function validar(corpo) {
  const erros = [];
  const nome = typeof corpo.cliente?.nome === 'string' ? corpo.cliente.nome.trim() : '';
  if (nome.length < 2 || nome.length > 80) erros.push('Nome: de 2 a 80 caracteres.');

  const whatsapp = normalizarTelefone(corpo.cliente?.whatsapp);
  if (!whatsapp) erros.push('WhatsApp: informe DDD e número, por exemplo 81 98454-3444.');

  if (corpo.consentimento !== true) {
    erros.push('É necessário confirmar a ciência da Política de Privacidade.');
  }

  const itens = new Map();
  const bruto = Array.isArray(corpo.itens) ? corpo.itens : [];
  if (bruto.length < 1 || bruto.length > 20) erros.push('Itens: informe de 1 a 20 produtos.');
  for (const item of bruto) {
    const id = item && item.produtoId;
    const qtd = item && item.qtd;
    if (typeof id !== 'string' || !ID_PRODUTO.test(id) || !Number.isInteger(qtd) || qtd < 1 || qtd > 20) {
      erros.push('Itens: produto ou quantidade inválidos.');
      break;
    }
    itens.set(id, (itens.get(id) || 0) + qtd);
  }

  if (erros.length) throw new AppError(400, 'DADOS_INVALIDOS', 'Confira os dados do pedido.', erros);
  return {
    cliente: { nome, whatsapp },
    itens: [...itens].map(([produtoId, qtd]) => ({ produtoId, qtd })),
  };
}

async function criarPedido(corpo) {
  const { cliente, itens } = validar(corpo);
  const firestore = db();
  const pedidoRef = firestore.collection(COLECAO).doc();
  const numero = `JB-${pedidoRef.id.slice(0, 6).toUpperCase()}`;

  return firestore.runTransaction(async (tx) => {
    const refs = itens.map((i) => firestore.collection('produtos').doc(i.produtoId));
    const snaps = await tx.getAll(...refs);

    const linhas = [];
    const problemas = [];
    snaps.forEach((snap, idx) => {
      const item = itens[idx];
      const p = snap.exists ? snap.data() : null;
      if (!p || p.ativo !== true) {
        problemas.push({ produtoId: item.produtoId, motivo: 'indisponivel', nome: p ? p.nome : undefined });
      } else if ((p.estoque || 0) < item.qtd) {
        problemas.push({ produtoId: item.produtoId, motivo: 'estoque-insuficiente', nome: p.nome, disponivel: p.estoque || 0 });
      } else {
        linhas.push({
          produtoId: item.produtoId,
          nome: p.nome,
          condicao: p.condicao,
          procedencia: p.procedencia,
          precoCentavos: p.precoCentavos,
          qtd: item.qtd,
          _ref: refs[idx],
          _novoEstoque: p.estoque - item.qtd,
        });
      }
    });

    if (problemas.length) {
      throw new AppError(
        409,
        'ESTOQUE_INDISPONIVEL',
        'Algum item ficou indisponível ou com menos unidades do que o pedido. Revise o carrinho.',
        problemas
      );
    }

    const agora = FieldValue.serverTimestamp();
    for (const l of linhas) {
      tx.update(l._ref, {
        estoque: l._novoEstoque,
        disponibilidade: disponibilidade(l._novoEstoque),
        atualizadoEm: agora,
      });
    }

    const itensPedido = linhas.map(({ _ref, _novoEstoque, ...resto }) => resto);
    const subtotalCentavos = itensPedido.reduce((s, i) => s + i.precoCentavos * i.qtd, 0);

    tx.set(pedidoRef, {
      numero,
      cliente,
      itens: itensPedido,
      subtotalCentavos,
      status: 'reservado',
      consentimento: { aceito: true, versaoPolitica: POLITICA_VERSAO, em: agora },
      criadoEm: agora,
      atualizadoEm: agora,
    });

    return { id: pedidoRef.id, numero, cliente, itens: itensPedido, subtotalCentavos };
  });
}

async function listar() {
  const snap = await db().collection(COLECAO).orderBy('criadoEm', 'desc').limit(50).get();
  return snap.docs.map((d) => {
    const p = d.data();
    return {
      id: d.id,
      numero: p.numero,
      cliente: p.cliente,
      itens: p.itens,
      subtotalCentavos: p.subtotalCentavos,
      status: p.status,
      criadoEm: p.criadoEm && p.criadoEm.toMillis ? p.criadoEm.toMillis() : null,
    };
  });
}

async function atualizarStatus(id, status) {
  if (!['concluido', 'cancelado'].includes(status)) {
    throw new AppError(400, 'DADOS_INVALIDOS', 'Status inválido.');
  }
  const firestore = db();
  const ref = firestore.collection(COLECAO).doc(id);

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new AppError(404, 'NAO_ENCONTRADO', 'Pedido não encontrado.');
    const pedido = snap.data();
    if (pedido.status !== 'reservado') {
      throw new AppError(409, 'STATUS_FINAL', 'Este pedido já foi concluído ou cancelado.');
    }

    const agora = FieldValue.serverTimestamp();
    if (status === 'cancelado') {
      const refs = pedido.itens.map((i) => firestore.collection('produtos').doc(i.produtoId));
      const produtos = await tx.getAll(...refs);
      produtos.forEach((ps, idx) => {
        if (!ps.exists) return;
        const novo = (ps.data().estoque || 0) + pedido.itens[idx].qtd;
        tx.update(refs[idx], { estoque: novo, disponibilidade: disponibilidade(novo), atualizadoEm: agora });
      });
    }
    tx.update(ref, { status, atualizadoEm: agora });
  });
  return { id, status };
}

async function anonimizar(id) {
  const ref = db().collection(COLECAO).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new AppError(404, 'NAO_ENCONTRADO', 'Pedido não encontrado.');
  if (snap.data().status === 'reservado') {
    throw new AppError(409, 'PEDIDO_ABERTO', 'Conclua ou cancele o pedido antes de anonimizar.');
  }
  await ref.update({
    cliente: { nome: 'Removido a pedido do titular', whatsapp: '' },
    anonimizadoEm: FieldValue.serverTimestamp(),
  });
  return { id };
}

module.exports = { criarPedido, listar, atualizarStatus, anonimizar };
