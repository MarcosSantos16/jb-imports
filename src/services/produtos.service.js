'use strict';

const { db, FieldValue } = require('../config/firebase');
const { AppError } = require('../middleware/errors');
const { CATEGORIAS, CONDICOES, PROCEDENCIAS, disponibilidade } = require('../config/catalogo');

const COLECAO = 'produtos';
const MAX_FOTOS = 8;

const FOTO_LOCAL = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/;
const LIMITE_CHARS_FOTO = 90000;
const LIMITE_CHARS_FOTOS = 800000;

const ASSINATURAS = {
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/webp': (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
};

function conteudoEhImagem(v) {
  const cabecalho = v.match(/^data:(image\/(?:webp|jpeg|png));base64,/);
  if (!cabecalho) return false;
  const inicio = Buffer.from(v.slice(cabecalho[0].length, cabecalho[0].length + 32), 'base64');
  return ASSINATURAS[cabecalho[1]](inicio);
}

function urlImagemValida(v) {
  if (v.startsWith('data:')) return v.length <= LIMITE_CHARS_FOTO && FOTO_LOCAL.test(v) && conteudoEhImagem(v);
  try {
    return new URL(v).protocol === 'https:' && v.length <= 500;
  } catch (e) {
    return false;
  }
}

const totalCharsFotos = (lista) => lista.reduce((s, v) => s + (v.startsWith('data:') ? v.length : 0), 0);

function validar(dados, parcial) {
  const d = dados && typeof dados === 'object' ? dados : {};
  const out = {};
  const erros = [];
  const usa = (k) => !parcial || d[k] !== undefined;

  const texto = (k, rotulo, min, max) => {
    if (!usa(k)) return;
    const v = typeof d[k] === 'string' ? d[k].trim() : '';
    if (v.length < min || v.length > max) {
      erros.push(`${rotulo}: de ${min} a ${max} caracteres.`);
      return;
    }
    out[k] = v;
  };

  const inteiro = (k, rotulo, min, max) => {
    if (!usa(k)) return;
    const v = d[k];
    if (!Number.isInteger(v) || v < min || v > max) {
      erros.push(`${rotulo}: número inteiro entre ${min} e ${max}.`);
      return;
    }
    out[k] = v;
  };

  const opcao = (k, rotulo, validos) => {
    if (!usa(k)) return;
    if (!validos.includes(d[k])) {
      erros.push(`${rotulo}: valor inválido.`);
      return;
    }
    out[k] = d[k];
  };

  texto('nome', 'Nome', 3, 120);
  opcao('categoriaId', 'Categoria', CATEGORIAS.map((c) => c.id));
  opcao('condicao', 'Condição', CONDICOES);
  opcao('procedencia', 'Procedência', PROCEDENCIAS);
  texto('descricao', 'Descrição', 10, 2000);
  inteiro('precoCentavos', 'Preço', 1, 100000000);
  inteiro('estoque', 'Estoque', 0, 9999);
  inteiro('garantiaLojaDias', 'Garantia adicional da loja', 0, 730);
  texto('imagemAlt', 'Texto alternativo da imagem', 0, 160);

  if (usa('ativo')) {
    if (typeof d.ativo === 'boolean') out.ativo = d.ativo;
    else erros.push('Ativo: use verdadeiro ou falso.');
  }

  if (d.imagens !== undefined) {
    if (!Array.isArray(d.imagens) || d.imagens.length > MAX_FOTOS) {
      erros.push(`Fotos: envie uma lista de até ${MAX_FOTOS} links.`);
    } else {
      const limpas = [...new Set(d.imagens.map((i) => (typeof i === 'string' ? i.trim() : '')).filter(Boolean))];
      if (limpas.some((v) => !urlImagemValida(v))) {
        erros.push('Fotos: cada foto precisa ser um link https válido de até 500 caracteres ou uma foto enviada do computador (até 60 KB).');
      } else if (totalCharsFotos(limpas) > LIMITE_CHARS_FOTOS) {
        erros.push('Fotos: as fotos enviadas do computador somam muito. Use menos fotos ou links de imagem.');
      } else {
        out.imagens = limpas;
        out.imagemUrl = limpas[0] || '';
      }
    }
  }

  if (usa('imagemUrl') && out.imagemUrl === undefined) {
    const v = typeof d.imagemUrl === 'string' ? d.imagemUrl.trim() : '';
    if (v === '') {
      out.imagemUrl = '';
      out.imagens = [];
    } else if (urlImagemValida(v)) {
      out.imagemUrl = v;
      out.imagens = [v];
    } else {
      erros.push('URL da imagem: informe um link https válido de até 500 caracteres.');
    }
  }

  if (erros.length) {
    throw new AppError(400, 'DADOS_INVALIDOS', 'Dados do produto inválidos.', erros);
  }
  if (out.estoque !== undefined) out.disponibilidade = disponibilidade(out.estoque);
  return out;
}

async function criar(dados) {
  const base = { ativo: true, garantiaLojaDias: 0, imagemUrl: '', imagens: [], imagemAlt: '', ...dados };
  const produto = validar(base, false);
  const ref = db().collection(COLECAO).doc();
  const agora = FieldValue.serverTimestamp();
  await ref.set({ ...produto, criadoEm: agora, atualizadoEm: agora });
  return { id: ref.id, ...produto };
}

async function atualizar(id, dados) {
  const alteracoes = validar(dados, true);
  if (!Object.keys(alteracoes).length) {
    throw new AppError(400, 'SEM_ALTERACOES', 'Nenhum campo para atualizar.');
  }
  const ref = db().collection(COLECAO).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new AppError(404, 'NAO_ENCONTRADO', 'Produto não encontrado.');
  await ref.update({ ...alteracoes, atualizadoEm: FieldValue.serverTimestamp() });
  return { id, ...alteracoes };
}

async function ajustarEstoque(id, delta) {
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 999) {
    throw new AppError(400, 'DADOS_INVALIDOS', 'Ajuste de estoque inválido.');
  }
  const ref = db().collection(COLECAO).doc(id);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new AppError(404, 'NAO_ENCONTRADO', 'Produto não encontrado.');
    const novo = (snap.data().estoque || 0) + delta;
    if (novo < 0) throw new AppError(409, 'ESTOQUE_NEGATIVO', 'O estoque não pode ficar negativo.');
    if (novo > 9999) throw new AppError(409, 'ESTOQUE_MAXIMO', 'Estoque máximo de 9999 unidades.');
    const disp = disponibilidade(novo);
    tx.update(ref, { estoque: novo, disponibilidade: disp, atualizadoEm: FieldValue.serverTimestamp() });
    return { id, estoque: novo, disponibilidade: disp };
  });
}

async function excluir(id) {
  const ref = db().collection(COLECAO).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new AppError(404, 'NAO_ENCONTRADO', 'Produto não encontrado.');
  await ref.delete();
}

module.exports = { criar, atualizar, ajustarEstoque, excluir };
