// pages/api/auth/login.js
// Login verification API - validates user after frontend Firebase authentication

import { auth, db } from '../../../lib/firebase-admin';
import { verifyAuth } from '../../../lib/auth-middleware';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: {
                code: 'METHOD_NOT_ALLOWED',
                message: 'Method not allowed'
            }
        });
    }

    try {
        // Verify the user is already authenticated (logged in via frontend)
        const user = await verifyAuth(req);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required. Please login first.'
                }
            });
        }

        // Get user document from Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();

        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User profile not found in database'
                }
            });
        }

        const userData = userDoc.data();

        // Check if user is active
        if (!userData.isActive) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'USER_INACTIVE',
                    message: 'User account is inactive. Please contact administrator.'
                }
            });
        }

        // Update last login
        await db.collection('users').doc(user.uid).update({
            'metadata.lastLogin': new Date(),
            'metadata.loginCount': (userData.metadata?.loginCount || 0) + 1,
            updatedAt: new Date()
        });

        // Create audit log
        await db.collection('auditLogs').doc(`user_login_${user.uid}_${Date.now()}`).set({
            logId: `user_login_${user.uid}_${Date.now()}`,
            entityType: 'User',
            entityId: user.uid,
            action: 'login',
            userId: user.uid,
            userName: userData.name,
            userRole: userData.role,
            timestamp: new Date(),
            metadata: {
                email: userData.email
            }
        });

        return res.status(200).json({
            success: true,
            data: {
                user: {
                    uid: user.uid,
                    email: userData.email,
                    name: userData.name,
                    role: userData.role,
                    permissions: userData.permissions
                }
            }
        });

    } catch (error) {
        console.error('Login verification error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: error.message || 'Login verification failed'
            }
        });
    }
}
