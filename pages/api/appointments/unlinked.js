// pages/api/appointments/unlinked.js
// Get all appointments that are not linked to any PO/Shipment

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

        // Get all appointments that don't have a poId or shipmentId linked
        const snapshot = await db.collection('appointments')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();

        const unlinkedAppointments = [];

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            // Check if appointment is not linked to any PO or shipment
            if (!data.poId && !data.shipmentId) {
                unlinkedAppointments.push({
                    id: doc.id,
                    appointmentId: doc.id,
                    appointmentNumber: data.appointmentNumber || doc.id,
                    scheduledDate: data.scheduledDate?.toDate?.()?.toISOString() || data.scheduledDate,
                    scheduledTimeSlot: data.scheduledTimeSlot || '',
                    status: data.status || 'scheduled',
                    notes: data.notes || '',
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
                });
            }
        });

        return res.status(200).json({
            success: true,
            data: unlinkedAppointments,
            count: unlinkedAppointments.length
        });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message }
        });
    }
}
