import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: 'AIzaSyDalprpTLvpkC0QMFYS4mNCQ6VJ6fUhctk',
  authDomain: 'ai-contract-3282d.firebaseapp.com',
  projectId: 'ai-contract-3282d',
  storageBucket: 'ai-contract-3282d.firebasestorage.app',
  messagingSenderId: '340936204446',
  appId: '1:340936204446:web:8172bd94525b86ef7e5b8f',
  measurementId: 'G-JQ76H768VW',
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const firebaseApp = app;
export const firebaseProjectId = firebaseConfig.projectId;
export const firebaseFunctionsRegion = 'us-central1';
