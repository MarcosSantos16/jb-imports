// Classe de erro padrao da API e tratamento das falhas.
'use strict';

class AppError extends Error {
  constructor(status, codigo, mensagem, detalhes) {
    super(mensagem);
    this.status = status;
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function notFound(req, res, next) {
  next(new AppError(404, 'NAO_ENCONTRADO', 'Rota não encontrada.'));
}

function errorHandler(err, req, res, next) {
  let erro = err;
  if (err.type === 'entity.parse.failed') {
    erro = new AppError(400, 'JSON_INVALIDO', 'Corpo da requisição inválido.');
  } else if (err.type === 'entity.too.large') {
    erro = new AppError(413, 'CORPO_GRANDE', 'Corpo da requisição grande demais.');
  }

  const conhecido = erro instanceof AppError;
  if (!conhecido) console.error(erro);

  res.status(conhecido ? erro.status : 500).json({
    erro: {
      codigo: conhecido ? erro.codigo : 'ERRO_INTERNO',
      mensagem: conhecido ? erro.message : 'Erro interno. Tente novamente em instantes.',
      detalhes: conhecido ? erro.detalhes : undefined,
    },
  });
}

module.exports = { AppError, asyncHandler, notFound, errorHandler };
