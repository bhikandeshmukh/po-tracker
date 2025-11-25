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
        } else if (req.method === 'DELETE') {
            if (!await requireRole(user, ['admin', 'super_admin'])) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Admin access required' }
                });
            }
            return await deleteShipment(req, res, shipmentId, user);
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

async function deleteShipment(req, res, shipmentId, user) {
    const shipmentDoc = await db.collection('shipments').doc(shipmentId).get();
    if (!shipmentDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Shipment not found' }
        });
    }

    const shipmentData = shipmentDoc.data();
    const poId = shipmentData.poId;

    // Get all shipment items to reverse quantities
    const itemsSnapshot = await db.collection('shipments')
        .doc(shipmentId)
        .collection('items')
        .get();

    const batch = db.batch();
    let totalQuantityToReverse = 0;

    // Reverse PO item quantities
    for (const itemDoc of itemsSnapshot.docs) {
        const itemData = itemDoc.data();
        const shippedQty = itemData.shippedQuantity || 0;
        totalQuantityToReverse += shippedQty;

        // Update PO item
        const poItemRef = db.collection('purchaseOrders')
            .doc(poId)
            .collection('items')
            .doc(itemDoc.id);

        const poItemDoc = await poItemRef.get();
        if (poItemDoc.exists) {
            const poItemData = poItemDoc.data();
            const currentShipped = poItemData.shippedQuantity || 0;
            const newShipped = Math.max(0, currentShipped - shippedQty);
            const newPending = (poItemData.poQuantity || 0) - newShipped;

            batch.update(poItemRef, {
                shippedQuantity: newShipped,
                pendingQuantity: Math.max(0, newPending),
                updatedAt: new Date()
            });
        }

        // Delete shipment item
        batch.delete(itemDoc.ref);
    }

    // Update PO totals
    const poRef = db.collection('purchaseOrders').doc(poId);
    const poDoc = await poRef.get();
    
    if (poDoc.exists) {
        const poData = poDoc.data();
        const currentShippedQty = poData.shippedQuantity || 0;
        const newShippedQty = Math.max(0, currentShippedQty - totalQuantityToReverse);
        const newPendingQty = (poData.totalQuantity || 0) - newShippedQty;

        // Recalculate PO status
        let newStatus = poData.status;
        const totalQty = poData.totalQuantity || 0;
        const expectedDeliveryDate = poData.expectedDeliveryDate?.toDate?.() || new Date(poData.expectedDeliveryDate);
        const isExpired = expectedDeliveryDate && new Date() > expectedDeliveryDate;

        if (newShippedQty === 0) {
            // No items shipped
            if (isExpired) {
                newStatus = 'expired';
            } else {
                newStatus = 'approved';
            }
        } else if (newShippedQty >= totalQty) {
            // All items shipped
            newStatus = 'completed';
        } else if (newShippedQty > 0) {
            // Some items shipped
            if (isExpired) {
                newStatus = 'partial_completed';
            } else {
                newStatus = 'partial_sent';
            }
        }

        batch.update(poRef, {
            shippedQuantity: newShippedQty,
            pendingQuantity: Math.max(0, newPendingQty),
            status: newStatus,
            updatedAt: new Date()
        });
    }

    // Delete appointment
    const appointmentId = shipmentData.appointmentId || shipmentId;
    const appointmentRef = db.collection('appointments').doc(appointmentId);
    const appointmentDoc = await appointmentRef.get();
    if (appointmentDoc.exists) {
        batch.delete(appointmentRef);
    }

    // Delete shipment
    batch.delete(shipmentDoc.ref);

    await batch.commit();

    // Create audit log
    await db.collection('auditLogs').add({
        logId: `SHIPMENT_DELETED_${shipmentId}_${Date.now()}`,
        entityType: 'SHIPMENT',
        entityId: shipmentId,
        entityNumber: shipmentId,
        action: 'deleted',
        userId: user.uid,
        userName: user.name || user.email,
        userRole: user.role || 'user',
        timestamp: new Date(),
        metadata: {
            poId,
            poNumber: shipmentData.poNumber,
            totalQuantityReversed: totalQuantityToReverse
        }
    });

    return res.status(200).json({
        success: true,
        message: 'Shipment deleted and quantities reversed successfully',
        data: {
            shipmentId,
            quantityReversed: totalQuantityToReverse
        }
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
