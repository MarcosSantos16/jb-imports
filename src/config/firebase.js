// Conecta o servidor ao Firebase Admin (banco e autenticacao).
'use strict';

const admin = require('firebase-admin');

function app() {
  if (admin.apps.length) return admin.app();

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new Error(
      'Variaveis FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY nao configuradas.'
    );
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

module.exports = {
  db: () => app().firestore(),
  auth: () => app().auth(),
  FieldValue: admin.firestore.FieldValue,
};
