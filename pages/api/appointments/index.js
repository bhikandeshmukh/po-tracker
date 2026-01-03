// pages/api/appointments/index.js
// Get all appointments and create new appointments

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

        if (req.method === 'GET') {
            return await getAppointments(req, res, user);
        } else if (req.method === 'POST') {
            return await createAppointment(req, res, user);
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

async function getAppointments(req, res, user) {
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
}


async function createAppointment(req, res, user) {
    const {
        newAppointmentId,
        appointmentNumber: providedAppointmentNumber,
        shipmentId,
        lrDocketNumber,
        invoiceNumber,
        scheduledDate,
        scheduledTimeSlot,
        deliveryLocation,
        notes,
        status = 'scheduled'
    } = req.body;

    // Use user-provided appointment ID, or generate one if not provided
    const appointmentId = newAppointmentId || providedAppointmentNumber;
    
    // Validate required fields
    if (!appointmentId) {
        return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Appointment ID is required' }
        });
    }

    if (!scheduledDate) {
        return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Scheduled date is required' }
        });
    }

    // Check if appointment ID already exists
    const existingAppointment = await db.collection('appointments').doc(appointmentId).get();
    if (existingAppointment.exists) {
        return res.status(409).json({
            success: false,
            error: { code: 'DUPLICATE_ERROR', message: `Appointment ID '${appointmentId}' already exists` }
        });
    }

    // Validate shipment exists if provided
    let shipmentData = null;
    if (shipmentId) {
        const shipmentDoc = await db.collection('shipments').doc(shipmentId).get();
        if (!shipmentDoc.exists) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Shipment not found' }
            });
        }
        shipmentData = shipmentDoc.data();
    }

    const now = new Date();
    
    const appointmentData = {
        appointmentId: appointmentId,
        appointmentNumber: appointmentId,
        shipmentId: shipmentId || null,
        shipmentNumber: shipmentData?.shipmentNumber || '',
        poId: shipmentData?.poId || '',
        poNumber: shipmentData?.poNumber || '',
        vendorId: shipmentData?.vendorId || '',
        vendorName: shipmentData?.vendorName || '',
        transporterId: shipmentData?.transporterId || '',
        transporterName: shipmentData?.transporterName || '',
        lrDocketNumber: lrDocketNumber || '',
        invoiceNumber: invoiceNumber || '',
        scheduledDate: new Date(scheduledDate),
        scheduledTimeSlot: scheduledTimeSlot || '',
        deliveryLocation: deliveryLocation || {},
        notes: notes || '',
        status: status,
        createdBy: user.uid,
        createdByEmail: user.email,
        createdAt: now,
        updatedAt: now
    };

    // Use the user-provided appointment ID as document ID
    await db.collection('appointments').doc(appointmentId).set(appointmentData);

    return res.status(201).json({
        success: true,
        data: {
            id: appointmentId,
            ...appointmentData,
            scheduledDate: appointmentData.scheduledDate.toISOString(),
            createdAt: appointmentData.createdAt.toISOString(),
            updatedAt: appointmentData.updatedAt.toISOString(),
            message: 'Appointment created successfully'
        }
    });
}
