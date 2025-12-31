// lib/firebase.js
// Firebase SDK initialization for frontend

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
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

// Presence system using Firestore - track online/offline status
export const setupPresence = (userId, userName) => {
    if (!userId || typeof window === 'undefined') return () => {};
    
    const userPresenceRef = doc(db, 'presence', userId);
    
    // Set user as online
    const setOnline = () => {
        setDoc(userPresenceRef, {
            state: 'online',
            lastSeen: serverTimestamp(),
            userName: userName || 'Unknown'
        }, { merge: true }).catch(err => console.error('Presence update failed:', err));
    };
    
    // Set user as offline
    const setOffline = () => {
        setDoc(userPresenceRef, {
            state: 'offline',
            lastSeen: serverTimestamp(),
            userName: userName || 'Unknown'
        }, { merge: true }).catch(err => console.error('Presence update failed:', err));
    };
    
    // Set online immediately
    setOnline();
    
    // Update presence periodically (heartbeat every 30 seconds)
    const heartbeat = setInterval(setOnline, 30000);
    
    // Handle visibility change
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            setOnline();
        } else {
            setOffline();
        }
    };
    
    // Handle before unload
    const handleBeforeUnload = () => {
        setOffline();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Return cleanup function
    return () => {
        clearInterval(heartbeat);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        setOffline();
    };
};

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
