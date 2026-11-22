// Inicia o servidor para uso local e para hospedagem Node.js.
'use strict';

const path = require('path');
const express = require('express');
const app = require('./src/app');

const publicDir = path.join(__dirname, 'public');

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  next();
});

app.use(express.static(publicDir, { extensions: ['html'] }));

app.use((req, res) => {
  res.status(404).sendFile(path.join(publicDir, '404.html'));
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`JB Imports em http://localhost:${port}`);
});
