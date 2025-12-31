// pages/api/auth/logout.js
// Logout API - Revoke refresh tokens

import { auth, db } from '../../../lib/firebase-admin';
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

        // Create audit log using centralized logger
        await logAction(
            'LOGOUT',
            user.uid,
            'USER',
            user.uid,
            {},
            {
                ipAddress: getIpAddress(req),
                userAgent: getUserAgent(req),
                userRole: user.role
            }
        );

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
