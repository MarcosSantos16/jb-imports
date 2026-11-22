// Junta as rotas da API em um unico roteador.
'use strict';

const { Router } = require('express');
const { asyncHandler } = require('../middleware/errors');
const { requireAdmin } = require('../middleware/auth');
const produtos = require('./produtos.routes');
const pedidos = require('./pedidos.routes');

const router = Router();

router.get('/health', (req, res) => res.json({ ok: true }));
router.use('/pedidos', pedidos.publico);

const admin = Router();
admin.use(asyncHandler(requireAdmin));
admin.get('/me', (req, res) => res.json({ ok: true, email: req.admin.email }));
admin.use('/produtos', produtos);
admin.use('/pedidos', pedidos.admin);

router.use('/admin', admin);

module.exports = router;
