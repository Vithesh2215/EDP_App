import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { FIREBASE_CONFIG } from "./../env";

let app;
if (!getApps().length) {
  app = initializeApp(FIREBASE_CONFIG);
} else {
  app = getApp();
}

let auth;
if (!getAuth.length) {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} else {
  auth = getAuth();
}

const db = getFirestore(app);

export { auth, db };