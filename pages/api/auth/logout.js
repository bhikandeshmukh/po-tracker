// pages/api/auth/logout.js
// Logout API - Revoke refresh tokens

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
        // Verify authentication
        const user = await verifyAuth(req);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required'
                }
            });
        }

        // Revoke all refresh tokens for the user
        await auth.revokeRefreshTokens(user.uid);

        // Create audit log
        await db.collection('auditLogs').doc(`user_logout_${user.uid}_${Date.now()}`).set({
            logId: `user_logout_${user.uid}_${Date.now()}`,
            entityType: 'User',
            entityId: user.uid,
            action: 'logout',
            userId: user.uid,
            userName: user.name,
            userRole: user.role,
            timestamp: new Date()
        });

        return res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: error.message || 'Logout failed'
            }
        });
    }
}
