// pages/api/appointments/[appointmentId].js
// Get, update specific appointment

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

        const { appointmentId } = req.query;

        if (req.method === 'GET') {
            return await getAppointment(req, res, appointmentId);
        } else if (req.method === 'PUT') {
            return await updateAppointment(req, res, appointmentId, user);
        } else {
            return res.status(405).json({
                success: false,
                error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }
            });
        }
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message }
        });
    }
}

async function getAppointment(req, res, appointmentId) {
    const appointmentDoc = await db.collection('appointments').doc(appointmentId).get();

    if (!appointmentDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Appointment not found' }
        });
    }

    const data = appointmentDoc.data();
    return res.status(200).json({
        success: true,
        data: { 
            id: appointmentDoc.id, 
            ...data,
            scheduledDate: data.scheduledDate?.toDate?.()?.toISOString() || data.scheduledDate,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
        }
    });
}

async function updateAppointment(req, res, appointmentId, user) {
    const appointmentDoc = await db.collection('appointments').doc(appointmentId).get();
    if (!appointmentDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Appointment not found' }
        });
    }

    const updateData = { ...req.body, updatedAt: new Date() };
    delete updateData.appointmentId;
    delete updateData.createdAt;

    // Convert scheduledDate string to Date object if present
    if (updateData.scheduledDate) {
        updateData.scheduledDate = new Date(updateData.scheduledDate);
    }

    await db.collection('appointments').doc(appointmentId).update(updateData);

    // Sync with linked shipment
    const shipmentDoc = await db.collection('shipments').doc(appointmentId).get();
    if (shipmentDoc.exists) {
        const shipmentUpdate = {
            updatedAt: new Date(),
            updatedBy: user.uid
        };

        // Sync status if changed
        if (updateData.status) {
            const shipmentStatusMap = {
                'scheduled': 'pending',
                'confirmed': 'in_transit',
                'completed': 'delivered',
                'cancelled': 'cancelled'
            };
            shipmentUpdate.status = shipmentStatusMap[updateData.status] || 'pending';
        }

        // Sync LR docket number if changed
        if (updateData.lrDocketNumber !== undefined) {
            shipmentUpdate.lrDocketNumber = updateData.lrDocketNumber;
        }

        // Sync scheduled date and time if changed
        if (updateData.scheduledDate) {
            shipmentUpdate.expectedDeliveryDate = updateData.scheduledDate;
        }
        if (updateData.scheduledTimeSlot) {
            shipmentUpdate.scheduledTimeSlot = updateData.scheduledTimeSlot;
        }

        await db.collection('shipments').doc(appointmentId).update(shipmentUpdate);
    }

    return res.status(200).json({
        success: true,
        message: 'Appointment updated successfully'
    });
}
