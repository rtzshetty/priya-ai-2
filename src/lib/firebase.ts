import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, initializeAuth, browserLocalPersistence, browserPopupRedirectResolver, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let app;
let auth: any = null;

const isConfigValid = firebaseConfig.apiKey && 
                     firebaseConfig.apiKey !== 'undefined' && 
                     firebaseConfig.apiKey !== '';

if (isConfigValid) {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } else {
    app = getApp();
    auth = getAuth(app);
  }
} else {
  const missingKeys = Object.entries(firebaseConfig)
    .filter(([_, value]) => !value || value === 'undefined')
    .map(([key]) => key);
    
  console.warn("Firebase configuration is incomplete. Missing keys:", missingKeys);
  console.log("Environment check:", {
    isVercel: !!import.meta.env.VITE_VERCEL,
    envMode: import.meta.env.MODE
  });

  auth = {
    app: null, // Explicitly set to null to trigger the "Missing Config" UI
    currentUser: null,
    onAuthStateChanged: () => () => {},
  };
}

export { auth };
export const googleProvider = new GoogleAuthProvider();
