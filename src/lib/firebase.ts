import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// User's real Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyA9TFoQH3mCpvS0P7dAaBHSFulAFWN7WSU",
  authDomain: "care-coord.firebaseapp.com",
  projectId: "care-coord",
  storageBucket: "care-coord.appspot.com", // Fixed storage bucket URL
  messagingSenderId: "1000147747451",
  appId: "1:1000147747451:web:02c5eea96beabccc2458de",
  measurementId: "G-14S69PDYMS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Log storage initialization for debugging
console.log("Firebase Storage initialized ");
