// pages/api/dashboard/recent-activities.js
// Get recent activities for dashboard

import { db } from '../../../lib/firebase-admin';
import { verifyAuth } from '../../../lib/auth-middleware';

export default async function handler(req, res) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            });
        }

        if (req.method !== 'GET') {
            return res.status(405).json({
                success: false,
                error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }
            });
        }

        const { limit = 10, type } = req.query;

        let query = db.collection('recentActivities');

        if (type) {
            query = query.where('type', '==', type);
        }

        query = query.orderBy('timestamp', 'desc').limit(parseInt(limit, 10) || 10);

        const snapshot = await query.get();

        const activities = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp,
                expiresAt: data.expiresAt?.toDate?.()?.toISOString() || data.expiresAt
            };
        });

        return res.status(200).json({
            success: true,
            data: activities
        });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message }
        });
    }
}
