// lib/firebase-admin.js
// Firebase Admin SDK setup for backend API routes

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
if (getApps().length === 0) {
    try {
        const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (!projectId || !clientEmail || !privateKey) {
            console.error('Missing Firebase Admin credentials:', {
                hasProjectId: !!projectId,
                hasClientEmail: !!clientEmail,
                hasPrivateKey: !!privateKey
            });
            throw new Error('Missing Firebase Admin credentials');
        }

        const serviceAccount = {
            projectId,
            clientEmail,
            privateKey,
        };

        initializeApp({
            credential: cert(serviceAccount),
        });

        console.log('Firebase Admin initialized successfully');
    } catch (error) {
        console.error('Firebase Admin initialization error:', error);
    }
}

const db = getFirestore();
const auth = getAuth();

export { db, auth };
