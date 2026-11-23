'use strict';

const { Router } = require('express');
const { asyncHandler } = require('../middleware/errors');
const { rateLimit } = require('../middleware/rateLimit');
const c = require('../controllers/pedidos.controller');

const publico = Router();
publico.post('/', rateLimit({ windowMs: 10 * 60 * 1000, max: 10 }), asyncHandler(c.criar));

const admin = Router();
admin.get('/', asyncHandler(c.listar));
admin.patch('/:id/status', asyncHandler(c.atualizarStatus));
admin.post('/:id/anonimizar', asyncHandler(c.anonimizar));

module.exports = { publico, admin };
