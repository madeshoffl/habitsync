// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBLmxk6d3w70R8xMAJquGwZOtpvXKiUwJU",
  authDomain: "habitsync-6b2e1.firebaseapp.com",
  projectId: "habitsync-6b2e1",
  storageBucket: "habitsync-6b2e1.firebasestorage.app",
  messagingSenderId: "301971734873",
  appId: "1:301971734873:web:37f334d3d720b378c98c48"
};

// Initialize Firebase (guard for Next.js hot reload)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const auth = getAuth(app);
export const db = getFirestore(app);


