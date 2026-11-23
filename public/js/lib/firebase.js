import { FIREBASE_CONFIG, FIREBASE_SDK_VERSION, isPlaceholder } from '../config.js';

const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;

export const firebaseReady = () =>
  !isPlaceholder(FIREBASE_CONFIG.apiKey) && !isPlaceholder(FIREBASE_CONFIG.projectId);

let appPromise;
export function getApp() {
  if (!appPromise) {
    appPromise = import(`${base}/firebase-app.js`).then(({ initializeApp, getApps }) =>
      getApps()[0] || initializeApp(FIREBASE_CONFIG)
    );
  }
  return appPromise;
}

export const loadFirestore = () => import(`${base}/firebase-firestore.js`);
export const loadAuth = () => import(`${base}/firebase-auth.js`);
