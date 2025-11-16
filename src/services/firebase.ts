// src/services/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

// ✅ Debug: Firebase config kontrolü
console.log('🔥 Firebase Config:', {
  apiKey: firebaseConfig.apiKey ? '✅ Var' : '❌ Yok',
  authDomain: firebaseConfig.authDomain ? '✅ Var' : '❌ Yok',
  projectId: firebaseConfig.projectId ? '✅ Var' : '❌ Yok',
  databaseURL: firebaseConfig.databaseURL ? '✅ Var' : '❌ Yok',
});

// ✅ Firebase başlat
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase başlatıldı');
} catch (error) {
  console.error('❌ Firebase başlatma hatası:', error);
  throw error;
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const database = getDatabase(app);
export const storage = getStorage(app);

// ✅ Google Provider ayarları
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

console.log('✅ Firebase Auth:', auth ? 'Hazır' : 'Hata');
console.log('✅ Firebase Database:', database ? 'Hazır' : 'Hata');

export default app;
