// pages/api/appointments/index.js
// Get all appointments

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

        const { date, status, poId, limit = 10, page = 1 } = req.query;

        let query = db.collection('appointments');

        if (status) query = query.where('status', '==', status);
        if (poId) query = query.where('poId', '==', poId);
        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            query = query.where('scheduledDate', '>=', startDate)
                .where('scheduledDate', '<', endDate);
        }

        query = query.orderBy('scheduledDate', 'asc');

        const totalSnapshot = await query.get();
        const total = totalSnapshot.size;

        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;
        const skip = (pageNum - 1) * limitNum;

        query = query.limit(limitNum).offset(skip);
        const snapshot = await query.get();

        const appointments = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                scheduledDate: data.scheduledDate?.toDate?.()?.toISOString() || data.scheduledDate,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
            };
        });

        return res.status(200).json({
            success: true,
            data: appointments,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message }
        });
    }
}
