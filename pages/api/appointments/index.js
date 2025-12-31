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

        const { date, status, poId, limit = 10, lastDocId } = req.query;

        const limitNum = Math.min(parseInt(limit, 10) || 10, 100);
        let query = db.collection('appointments');

        // Apply filters
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

        // Cursor-based pagination
        if (lastDocId) {
            const lastDoc = await db.collection('appointments').doc(lastDocId).get();
            if (lastDoc.exists) {
                query = query.startAfter(lastDoc);
            }
        }

        query = query.limit(limitNum + 1);
        const snapshot = await query.get();

        const hasMore = snapshot.docs.length > limitNum;
        const docs = hasMore ? snapshot.docs.slice(0, limitNum) : snapshot.docs;

        const appointments = docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                appointmentId: doc.id,
                ...data,
                scheduledDate: data.scheduledDate?.toDate?.()?.toISOString() || data.scheduledDate,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
            };
        });

        const nextCursor = hasMore && appointments.length > 0
            ? appointments[appointments.length - 1].id
            : null;

        return res.status(200).json({
            success: true,
            data: appointments,
            pagination: {
                limit: limitNum,
                hasMore,
                nextCursor,
                count: appointments.length
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
