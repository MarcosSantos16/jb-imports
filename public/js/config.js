// Configuracao publica do front-end.
// Os valores do Firebase Web NAO sao segredos (a seguranca esta em firestore.rules),
// mas precisam ser preenchidos com os dados do seu projeto.
// Enquanto houver "PREENCHER", a loja mostra um aviso em vez do catalogo.

export const FIREBASE_SDK_VERSION = '10.14.1';

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDWwmmRw8yQyShWW-Z9AhoCTLPVbNr2-MM",
  authDomain: "jb-imports-b7c96.firebaseapp.com",
  projectId: "jb-imports-b7c96",
  appId: "1:1042733273937:web:68f15db75b3456a8003970",
  storageBucket: "jb-imports-b7c96.firebasestorage.app",
  messagingSenderId: "1042733273937",
};

// ID de medicao do Google Analytics 4 (formato G-XXXXXXXXXX).
// So e carregado depois que o visitante aceita os cookies analiticos.
export const GA_MEASUREMENT_ID = 'G-PREENCHER';

export const WHATSAPP_NUMBER = '5581984543444';

// Upload de fotos pelo painel (Cloudinary, plano gratuito).
// Crie um "upload preset" do tipo UNSIGNED em Settings > Upload > Upload presets.
// O cloud name aparece no painel inicial do Cloudinary. Estes dois valores sao publicos.
export const CLOUDINARY = {
  cloudName: 'PREENCHER',
  uploadPreset: 'PREENCHER',
};

// Versao do texto da Politica de Privacidade. Alterar reabre o banner de cookies.
export const POLICY_VERSION = '2026-11-18';

export const isPlaceholder = (valor) => !valor || String(valor).includes('PREENCHER');
