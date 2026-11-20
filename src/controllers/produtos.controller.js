'use strict';

const service = require('../services/produtos.service');

exports.criar = async (req, res) => {
  const produto = await service.criar(req.body);
  res.status(201).json(produto);
};

exports.atualizar = async (req, res) => {
  res.json(await service.atualizar(req.params.id, req.body));
};

exports.ajustarEstoque = async (req, res) => {
  res.json(await service.ajustarEstoque(req.params.id, req.body && req.body.delta));
};

exports.excluir = async (req, res) => {
  await service.excluir(req.params.id);
  res.status(204).end();
};
