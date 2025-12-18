import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log('🔧 Firebase config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  storageBucket: firebaseConfig.storageBucket,
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with offline persistence
const db = getFirestore(app);

// Enable offline persistence for PWA (IndexedDB caching)
if (typeof window !== 'undefined') {
  console.log('📱 Initializing IndexedDB persistence...');
  enableIndexedDbPersistence(db)
    .then(() => {
      console.log('✅ IndexedDB persistence enabled - offline data will be cached');
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('⚠️ Firestore persistence failed: Multiple tabs open');
      } else if (err.code === 'unimplemented') {
        console.warn('⚠️ Firestore persistence not available in this browser');
      } else {
        console.error('❌ Unexpected persistence error:', err);
      }
    });
}

// Initialize Firebase Storage
const storage = getStorage(app);

console.log('✓ Firebase initialized successfully');

export { db, storage };
