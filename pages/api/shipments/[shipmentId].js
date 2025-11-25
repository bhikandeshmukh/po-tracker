// pages/api/shipments/[shipmentId].js
// Get, update specific shipment

import { db } from '../../../lib/firebase-admin';
import { verifyAuth, requireRole } from '../../../lib/auth-middleware';

export default async function handler(req, res) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            });
        }

        const { shipmentId } = req.query;

        if (req.method === 'GET') {
            return await getShipment(req, res, shipmentId);
        } else if (req.method === 'PUT') {
            if (!await requireRole(user, ['manager', 'admin', 'super_admin'])) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Manager access required' }
                });
            }
            return await updateShipment(req, res, shipmentId, user);
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

async function getShipment(req, res, shipmentId) {
    const shipmentDoc = await db.collection('shipments').doc(shipmentId).get();

    if (!shipmentDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Shipment not found' }
        });
    }

    const data = shipmentDoc.data();
    const shipmentData = { 
        id: shipmentDoc.id, 
        ...data,
        shipmentDate: data.shipmentDate?.toDate?.()?.toISOString() || data.shipmentDate,
        expectedDeliveryDate: data.expectedDeliveryDate?.toDate?.()?.toISOString() || data.expectedDeliveryDate,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
    };

    // Get items
    const itemsSnapshot = await db.collection('shipments')
        .doc(shipmentId)
        .collection('items')
        .get();

    shipmentData.items = itemsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    return res.status(200).json({
        success: true,
        data: shipmentData
    });
}

async function updateShipment(req, res, shipmentId, user) {
    const shipmentDoc = await db.collection('shipments').doc(shipmentId).get();
    if (!shipmentDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Shipment not found' }
        });
    }

    const { newShipmentId, ...otherUpdates } = req.body;
    
    // If shipment ID is being changed
    if (newShipmentId && newShipmentId !== shipmentId) {
        const shipmentData = shipmentDoc.data();
        const batch = db.batch();

        // 1. Update shipment document fields
        const shipmentRef = db.collection('shipments').doc(shipmentId);
        batch.update(shipmentRef, {
            ...otherUpdates,
            shipmentId: newShipmentId,
            shipmentNumber: newShipmentId,
            updatedAt: new Date(),
            updatedBy: user.uid
        });

        // 2. Update appointment with new shipment ID
        const appointmentId = shipmentData.appointmentId || shipmentId;
        const appointmentRef = db.collection('appointments').doc(appointmentId);
        const appointmentDoc = await appointmentRef.get();
        
        if (appointmentDoc.exists) {
            batch.update(appointmentRef, {
                appointmentNumber: newShipmentId,
                shipmentId: newShipmentId,
                shipmentNumber: newShipmentId,
                updatedAt: new Date(),
                updatedBy: user.uid
            });
        }

        // 3. Update audit logs that reference this shipment
        const auditLogsSnapshot = await db.collection('auditLogs')
            .where('entityId', '==', shipmentId)
            .get();
        
        auditLogsSnapshot.docs.forEach(logDoc => {
            batch.update(logDoc.ref, {
                entityId: newShipmentId,
                entityNumber: newShipmentId
            });
        });

        // 4. Update PO reference if exists
        if (shipmentData.poId) {
            const poRef = db.collection('purchaseOrders').doc(shipmentData.poId);
            const poDoc = await poRef.get();
            
            if (poDoc.exists) {
                const poData = poDoc.data();
                // Update shipments array if it exists
                if (poData.shipments && Array.isArray(poData.shipments)) {
                    const updatedShipments = poData.shipments.map(s => 
                        s === shipmentId ? newShipmentId : s
                    );
                    batch.update(poRef, { shipments: updatedShipments });
                }
            }
        }

        // Commit all changes
        await batch.commit();

        // Create audit log for this rename operation
        await db.collection('auditLogs').add({
            logId: `SHIPMENT_RENAMED_${Date.now()}`,
            entityType: 'SHIPMENT',
            entityId: newShipmentId,
            entityNumber: newShipmentId,
            action: 'renamed',
            changes: {
                oldId: shipmentId,
                newId: newShipmentId
            },
            performedBy: user.uid,
            performedAt: new Date(),
            createdAt: new Date()
        });

        return res.status(200).json({
            success: true,
            message: 'Shipment ID updated successfully',
            newShipmentId
        });
    } else {
        // Normal update without ID change
        const updateData = { ...otherUpdates, updatedAt: new Date() };
        delete updateData.shipmentId;
        delete updateData.createdAt;

        await db.collection('shipments').doc(shipmentId).update(updateData);

        return res.status(200).json({
            success: true,
            message: 'Shipment updated successfully'
        });
    }
}
