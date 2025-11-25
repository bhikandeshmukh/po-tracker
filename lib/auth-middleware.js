// lib/auth-middleware.js
// Authentication middleware for API routes

import { auth, db } from './firebase-admin';

export async function verifyAuth(req) {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }

        const token = authHeader.split('Bearer ')[1];

        // Verify token with Firebase Admin
        const decodedToken = await auth.verifyIdToken(token);

        // Fetch user data from Firestore to get role and permissions
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        
        if (!userDoc.exists) {
            console.warn('User document not found in Firestore:', decodedToken.uid);
            return {
                uid: decodedToken.uid,
                email: decodedToken.email,
                role: 'user',
                name: decodedToken.name || decodedToken.email
            };
        }

        const userData = userDoc.data();

        return {
            uid: decodedToken.uid,
            email: decodedToken.email,
            role: userData.role || 'user',
            name: userData.name || decodedToken.name || decodedToken.email,
            permissions: userData.permissions || {}
        };
    } catch (error) {
        console.error('Auth verification error:', error);
        return null;
    }
}

export async function requireRole(user, allowedRoles = []) {
    if (!user) {
        return false;
    }

    if (allowedRoles.length === 0) {
        return true;
    }

    return allowedRoles.includes(user.role);
}
