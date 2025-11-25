// pages/api/auth/profile.js
// Get current user profile with role and permissions

import { db } from '../../../lib/firebase-admin';
import { verifyAuth } from '../../../lib/auth-middleware';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
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

        // Get user document from Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();

        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_NOT_FOUND',
                    message: 'User profile not found'
                }
            });
        }

        const userData = userDoc.data();

        return res.status(200).json({
            success: true,
            data: {
                uid: user.uid,
                email: userData.email,
                name: userData.name,
                role: userData.role,
                permissions: userData.permissions,
                phone: userData.phone,
                isActive: userData.isActive
            }
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: error.message || 'Failed to fetch profile'
            }
        });
    }
}
