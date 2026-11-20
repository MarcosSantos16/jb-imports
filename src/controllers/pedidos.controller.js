'use strict';

const service = require('../services/pedidos.service');
const { AppError } = require('../middleware/errors');

// Rota publica: finalizacao do carrinho.
exports.criar = async (req, res) => {
  const corpo = req.body || {};
  // Campo isca ("website"): pessoas nao o veem nem o preenchem, robos sim.
  if (typeof corpo.website === 'string' && corpo.website.trim() !== '') {
    throw new AppError(400, 'REQUISICAO_INVALIDA', 'Requisição inválida.');
  }
  res.status(201).json(await service.criarPedido(corpo));
};

// Rotas administrativas.
exports.listar = async (req, res) => {
  res.json({ pedidos: await service.listar() });
};

exports.atualizarStatus = async (req, res) => {
  res.json(await service.atualizarStatus(req.params.id, req.body && req.body.status));
};

exports.anonimizar = async (req, res) => {
  res.json(await service.anonimizar(req.params.id));
};
