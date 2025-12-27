// lib/firebase.js
// Firebase SDK initialization for frontend

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Messaging (only on client)
let messaging = null;
if (typeof window !== 'undefined') {
    try {
        messaging = getMessaging(app);
    } catch (err) {
        console.error('Firebase messaging initialization failed:', err);
    }
}

// Enable offline persistence
if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Firestore persistence failed: Multiple tabs open');
        } else if (err.code === 'unimplemented') {
            console.warn('Firestore persistence failed: Browser not supported');
        }
    });
}

export const requestForToken = async () => {
    if (!messaging) return null;
    try {
        const currentToken = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
        });
        if (currentToken) {
            console.log('FCM Token:', currentToken);
            return currentToken;
        }
        console.log('No registration token available. Request permission to generate one.');
        return null;
    } catch (err) {
        console.error('An error occurred while retrieving token:', err);
        return null;
    }
};

export { app, auth, db, messaging };
