import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDocs, query, where, deleteDoc, getDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Constants from 'expo-constants';

const firebaseConfig = {
    apiKey: Constants.expoConfig.extra.firebaseApiKey, 
    authDomain: Constants.expoConfig.extra.firebaseAuthDomain, 
    projectId: Constants.expoConfig.extra.firebaseProjectId,
    storageBucket: Constants.expoConfig.extra.firebaseStorageBucket, 
    messagingSenderId: Constants.expoConfig.extra.firebaseMessagingSenderId, 
    appId: Constants.expoConfig.extra.firebaseAppId, 
    measurementId: Constants.expoConfig.extra.firebaseMeasurementId 
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
