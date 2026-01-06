import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCEPHzlhJixoK0M4w70d3josThrvtTCJyU",
  authDomain: "quadx-6ad7e.firebaseapp.com",
  projectId: "quadx-6ad7e",
  storageBucket: "quadx-6ad7e.firebasestorage.app",
  messagingSenderId: "425711577256",
  appId: "1:425711577256:web:7d8fd0c6d49758eefe3a9d"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);