'use strict';

const { auth, db } = require('../config/firebase');
const { AppError } = require('./errors');

// Exige token do Firebase Authentication E presenca do usuario na colecao "admins".
// Criar uma conta no Authentication sozinha nao concede acesso ao painel.
async function requireAdmin(req, res, next) {
  const cabecalho = req.headers.authorization || '';
  const m = cabecalho.match(/^Bearer (.+)$/);
  if (!m) throw new AppError(401, 'NAO_AUTENTICADO', 'Entre com sua conta de administrador.');

  let decodificado;
  try {
    decodificado = await auth().verifyIdToken(m[1]);
  } catch (e) {
    throw new AppError(401, 'TOKEN_INVALIDO', 'Sessão expirada. Entre novamente.');
  }

  const doc = await db().collection('admins').doc(decodificado.uid).get();
  if (!doc.exists || doc.data().ativo === false) {
    throw new AppError(403, 'SEM_PERMISSAO', 'Esta conta não tem permissão de administrador.');
  }

  req.admin = { uid: decodificado.uid, email: decodificado.email || '' };
  next();
}

module.exports = { requireAdmin };
