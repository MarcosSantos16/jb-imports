'use strict';

const express = require('express');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));

app.use('/api', routes);
app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
