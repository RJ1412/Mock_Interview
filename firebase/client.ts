// Import the functions you need from the SDKs you need
import { getFirestore } from "firebase/firestore";
import { initializeApp , getApp , getApps} from "firebase/app";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA52afYwsXB1MI8xgYtqF007PVq_oOQpis",
  authDomain: "prepbyte-91de5.firebaseapp.com",
  projectId: "prepbyte-91de5",
  storageBucket: "prepbyte-91de5.firebasestorage.app",
  messagingSenderId: "810725831796",
  appId: "1:810725831796:web:ee00eea4588caf5ef94d21",
  measurementId: "G-4YEM336TL3"
};

// Initialize Firebase
const app = !getApps.length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
