// lib/firebase-admin.js
// Firebase Admin SDK setup for backend API routes - OPTIMIZED

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin with optimized settings
let db = null;
let auth = null;

function initializeFirebaseAdmin() {
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

    // Get Firestore with optimized settings
    if (!db) {
        db = getFirestore();

        // Enable Firestore settings for better performance
        db.settings({
            // Ignore undefined properties to reduce document size
            ignoreUndefinedProperties: true,
            // Use preferRest for faster cold starts in serverless
            preferRest: true
        });
    }

    if (!auth) {
        auth = getAuth();
    }

    return { db, auth };
}

// Initialize immediately for module-level exports
const instance = initializeFirebaseAdmin();
db = instance.db;
auth = instance.auth;

export { db, auth, FieldValue, Timestamp };
