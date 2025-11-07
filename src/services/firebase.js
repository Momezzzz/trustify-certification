import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCmNcQMpYnt8-LEXETgbPBu-untzOAV_BM",
  authDomain: "trustify-certification.firebaseapp.com",
  projectId: "trustify-certification",
  storageBucket: "trustify-certification.firebasestorage.app",
  messagingSenderId: "4026121521",
  appId: "1:4026121521:web:c44a9e55612fcd01814410"
};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export default app;