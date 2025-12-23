// pages/api/admin/sync-appointments.js
// Sync/create missing appointments for existing shipments

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

        if (req.method !== 'POST') {
            return res.status(405).json({
                success: false,
                error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }
            });
        }

        const { shipmentId } = req.body;
        let createdCount = 0;
        let updatedCount = 0;
        let errors = [];

        // If specific shipmentId provided, sync only that shipment
        if (shipmentId) {
            try {
                const result = await syncSingleShipment(shipmentId);
                if (result.created) createdCount = 1;
                if (result.updated) updatedCount = 1;
            } catch (err) {
                errors.push({ shipmentId, error: err.message });
            }
        } else {
            // Sync all shipments
            const shipmentsSnapshot = await db.collection('shipments').get();

            for (const shipmentDoc of shipmentsSnapshot.docs) {
                try {
                    const result = await syncSingleShipment(shipmentDoc.id);
                    if (result.created) createdCount++;
                    if (result.updated) updatedCount++;
                } catch (err) {
                    errors.push({ shipmentId: shipmentDoc.id, error: err.message });
                    console.error(`Error syncing shipment ${shipmentDoc.id}:`, err);
                }
            }
        }

        return res.status(200).json({
            success: true,
            message: `Created ${createdCount} appointment(s), updated ${updatedCount} appointment(s)`,
            createdCount,
            updatedCount,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message }
        });
    }
}

async function syncSingleShipment(shipmentId) {
    const shipmentDoc = await db.collection('shipments').doc(shipmentId).get();
    if (!shipmentDoc.exists) {
        throw new Error('Shipment not found');
    }
    
    const shipmentData = shipmentDoc.data();
    
    // Check if appointment exists
    const appointmentDoc = await db.collection('appointments').doc(shipmentId).get();
    
    const appointmentData = {
        appointmentId: shipmentId,
        appointmentNumber: shipmentData.shipmentNumber || shipmentId,
        shipmentId: shipmentId,
        shipmentNumber: shipmentData.shipmentNumber || shipmentId,
        poId: shipmentData.poId,
        poNumber: shipmentData.poNumber,
        vendorId: shipmentData.vendorId || '',
        vendorName: shipmentData.vendorName || '',
        transporterId: shipmentData.transporterId || '',
        transporterName: shipmentData.transporterName || '',
        invoiceNumber: shipmentData.invoiceNumber || '',
        lrDocketNumber: shipmentData.lrDocketNumber || '',
        totalQuantity: shipmentData.totalQuantity || 0,
        totalItems: shipmentData.totalItems || 0,
        status: shipmentData.status || 'created',
        scheduledDate: shipmentData.expectedDeliveryDate || shipmentData.shipmentDate,
        scheduledTimeSlot: shipmentData.scheduledTimeSlot || '09:00-12:00',
        deliveryLocation: shipmentData.shippingAddress || {},
        notes: shipmentData.notes || '',
        updatedAt: new Date()
    };
    
    if (appointmentDoc.exists) {
        // Update existing appointment
        await db.collection('appointments').doc(shipmentId).update(appointmentData);
        console.log(`Updated appointment for shipment ${shipmentId}`);
        return { updated: true, created: false };
    } else {
        // Create new appointment
        appointmentData.createdAt = new Date();
        appointmentData.createdBy = 'system-sync';
        await db.collection('appointments').doc(shipmentId).set(appointmentData);
        console.log(`Created appointment for shipment ${shipmentId}`);
        return { created: true, updated: false };
    }
}
