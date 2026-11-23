'use strict';

const { Router } = require('express');
const { asyncHandler } = require('../middleware/errors');
const c = require('../controllers/produtos.controller');

const router = Router();

router.post('/', asyncHandler(c.criar));
router.patch('/:id', asyncHandler(c.atualizar));
router.patch('/:id/estoque', asyncHandler(c.ajustarEstoque));
router.delete('/:id', asyncHandler(c.excluir));

module.exports = router;
