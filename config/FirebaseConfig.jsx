import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";

// Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyDLi3dNbiMB6wadEMPm58ks9Y4T4n7WmPw",
  authDomain: "suicide-detection-ff25b.firebaseapp.com",
  projectId: "suicide-detection-ff25b",
  storageBucket: "suicide-detection-ff25b.firebasestorage.app",
  messagingSenderId: "302440720550",
  appId: "1:302440720550:web:2bbd7545d1aaa548d8ec67",
  measurementId: "G-D7593REKVD",
};

// Initialize Firebase app
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Firebase Auth with AsyncStorage for persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Initialize Firestore
const db = getFirestore(app);

export { auth, db };