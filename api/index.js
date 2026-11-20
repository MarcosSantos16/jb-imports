'use strict';

// Ponto de entrada da Vercel: cada arquivo dentro de /api vira uma Serverless Function.
// O vercel.json reescreve /api/* para este arquivo e o Express resolve as rotas.
module.exports = require('../src/app');
