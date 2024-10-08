import { initializeApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDocs, query, where, deleteDoc, getDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAmFhk75hRVRRpV-HgkUcx3nrObbfgJTKU",
  authDomain: "plantscope-4ccd2.firebaseapp.com",
  projectId: "plantscope-4ccd2",
  storageBucket: "plantscope-4ccd2.appspot.com",
  messagingSenderId: "928856242106",
  appId: "1:928856242106:web:e76ab857ff829dbb894f83",
  measurementId: "G-4G7LM5C0FG"
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const firestore = getFirestore(app);
const storage = getStorage(app);

export { auth, firestore, storage, doc, collection, query, where, getDocs, setDoc, deleteDoc, getDoc };
