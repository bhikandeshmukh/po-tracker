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

    // Sync with linked shipment - ALL fields
    const appointmentData = appointmentDoc.data();
    const shipmentId = appointmentData.shipmentId || appointmentId;
    const shipmentDoc = await db.collection('shipments').doc(shipmentId).get();
    
    if (shipmentDoc.exists) {
        const shipmentUpdate = {
            updatedAt: new Date(),
            updatedBy: user.uid
        };

        // Sync all relevant fields
        if (updateData.status !== undefined) {
            shipmentUpdate.status = updateData.status;
        }
        if (updateData.lrDocketNumber !== undefined) {
            shipmentUpdate.lrDocketNumber = updateData.lrDocketNumber;
        }
        if (updateData.invoiceNumber !== undefined) {
            shipmentUpdate.invoiceNumber = updateData.invoiceNumber;
        }
        if (updateData.scheduledDate) {
            shipmentUpdate.expectedDeliveryDate = updateData.scheduledDate;
        }
        if (updateData.scheduledTimeSlot !== undefined) {
            shipmentUpdate.scheduledTimeSlot = updateData.scheduledTimeSlot;
        }
        if (updateData.transporterId !== undefined) {
            shipmentUpdate.transporterId = updateData.transporterId;
        }
        if (updateData.transporterName !== undefined) {
            shipmentUpdate.transporterName = updateData.transporterName;
        }
        if (updateData.notes !== undefined) {
            shipmentUpdate.notes = updateData.notes;
        }
        if (updateData.totalQuantity !== undefined) {
            shipmentUpdate.totalQuantity = updateData.totalQuantity;
        }
        if (updateData.vendorId !== undefined) {
            shipmentUpdate.vendorId = updateData.vendorId;
        }
        if (updateData.vendorName !== undefined) {
            shipmentUpdate.vendorName = updateData.vendorName;
        }

        await db.collection('shipments').doc(shipmentId).update(shipmentUpdate);
    }

    return res.status(200).json({
        success: true,
        message: 'Appointment updated successfully'
    });
}
