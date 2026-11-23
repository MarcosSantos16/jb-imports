'use strict';

const { AppError } = require('./errors');

function rateLimit({ windowMs, max }) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || 'desconhecido';
    const recentes = (hits.get(key) || []).filter((t) => now - t < windowMs);

    if (recentes.length >= max) {
      return next(
        new AppError(429, 'MUITAS_REQUISICOES', 'Muitas tentativas. Aguarde alguns minutos e tente novamente.')
      );
    }

    recentes.push(now);
    hits.set(key, recentes);

    if (hits.size > 5000) {
      for (const [k, v] of hits) {
        if (!v.length || now - v[v.length - 1] >= windowMs) hits.delete(k);
      }
    }
    return next();
  };
}

module.exports = { rateLimit };
