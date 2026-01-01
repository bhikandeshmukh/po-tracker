// pages/api/auth/login.js
// Login verification API - validates user after frontend Firebase authentication

import { db } from '../../../lib/firebase-admin';
import { verifyAuth } from '../../../lib/auth-middleware';
import { logAction, getIpAddress, getUserAgent } from '../../../lib/audit-logger';

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
        const shouldSkipLog = req.query.skipLog === 'true' || req.body?.skipLog === true;
        console.log(`[DEBUG] Login API called. shouldSkipLog: ${shouldSkipLog}, Body:`, req.body, 'Query:', req.query);
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

        // Create audit log using centralized logger
        // Support skipLog in both query (more reliable) and body
        shouldSkipLog = req.query.skipLog === 'true' || req.body?.skipLog === true;

        if (!shouldSkipLog) {
            await logAction(
                'LOGIN',
                user.uid,
                'USER',
                user.uid,
                { after: { email: userData.email, name: userData.name } },
                {
                    ipAddress: getIpAddress(req),
                    userAgent: getUserAgent(req),
                    userRole: userData.role
                }
            );
        }

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
