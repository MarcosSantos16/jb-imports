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
    'Strict-Transport-Security': 'max-age=63072000',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' https://www.gstatic.com https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://www.gstatic.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com; frame-src https://*.firebaseapp.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
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
