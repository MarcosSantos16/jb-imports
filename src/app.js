'use strict';

const express = require('express');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
// Fotos do computador vao no corpo do pedido (base64): ate 8 fotos de 60 KB cabem com folga.
app.use(express.json({ limit: '1mb' }));

app.use('/api', routes);
app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
