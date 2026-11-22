// Recebe as requisicoes de pedidos e repassa ao servico.
'use strict';

const service = require('../services/pedidos.service');
const { AppError } = require('../middleware/errors');

exports.criar = async (req, res) => {
  const corpo = req.body || {};
  if (typeof corpo.website === 'string' && corpo.website.trim() !== '') {
    throw new AppError(400, 'REQUISICAO_INVALIDA', 'Requisição inválida.');
  }
  res.status(201).json(await service.criarPedido(corpo));
};

exports.listar = async (req, res) => {
  res.json({ pedidos: await service.listar() });
};

exports.atualizarStatus = async (req, res) => {
  res.json(await service.atualizarStatus(req.params.id, req.body && req.body.status));
};

exports.anonimizar = async (req, res) => {
  res.json(await service.anonimizar(req.params.id));
};
