// pages/api/shipments/[shipmentId]/status.js
// Update shipment status

import { db } from '../../../../lib/firebase-admin';
import { verifyAuth, requireRole } from '../../../../lib/auth-middleware';
import { incrementMetric } from '../../../../lib/metrics-service';

export default async function handler(req, res) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            });
        }

        if (req.method !== 'PUT') {
            return res.status(405).json({
                success: false,
                error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }
            });
        }

        if (!await requireRole(user, ['manager', 'admin', 'super_admin'])) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Manager access required' }
            });
        }

        const { shipmentId } = req.query;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Status is required' }
            });
        }

        // Validate status
        const validStatuses = ['created', 'pending', 'in_transit', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invalid status' }
            });
        }

        // Get shipment data for activity logs
        const shipmentDoc = await db.collection('shipments').doc(shipmentId).get();
        const shipmentData = shipmentDoc.data();

        // Update shipment status
        await db.collection('shipments').doc(shipmentId).update({
            status,
            updatedAt: new Date(),
            updatedBy: user.uid
        });

        // Update linked appointment status (same status as shipment)
        const appointmentDoc = await db.collection('appointments').doc(shipmentId).get();
        if (appointmentDoc.exists) {
            await db.collection('appointments').doc(shipmentId).update({
                status: status,
                updatedAt: new Date(),
                updatedBy: user.uid
            });
        }

        // Sync metrics (O(1) update)
        if (status !== shipmentData.status) {
            const oldStatus = shipmentData.status;
            const newStatus = status;
            const metricsToUpdate = [];

            // Decrement old category
            if (['created', 'pending'].includes(oldStatus)) metricsToUpdate.push(incrementMetric('pendingShipments', -1));
            else if (oldStatus === 'in_transit') metricsToUpdate.push(incrementMetric('inTransitShipments', -1));
            else if (oldStatus === 'delivered') metricsToUpdate.push(incrementMetric('deliveredShipments', -1));

            // Increment new category
            if (['created', 'pending'].includes(newStatus)) metricsToUpdate.push(incrementMetric('pendingShipments', 1));
            else if (newStatus === 'in_transit') metricsToUpdate.push(incrementMetric('inTransitShipments', 1));
            else if (newStatus === 'delivered') metricsToUpdate.push(incrementMetric('deliveredShipments', 1));

            await Promise.all(metricsToUpdate);
        }

        // Create audit log with predictable ID
        const auditLogId = `SHIPMENT_STATUS_${status.toUpperCase()}_${shipmentId}`;
        await db.collection('auditLogs').doc(auditLogId).set({
            logId: auditLogId,
            entityType: 'SHIPMENT',
            entityId: shipmentId,
            entityNumber: shipmentData?.shipmentNumber || shipmentId,
            action: `status_${status}`,
            userId: user.uid,
            userName: user.name || user.email,
            userRole: user.role || 'user',
            timestamp: new Date(),
            metadata: {
                oldStatus: shipmentData?.status,
                newStatus: status,
                poNumber: shipmentData?.poNumber
            }
        });

        // Create recent activity with predictable ID
        const recentActivityId = `SHIPMENT_STATUS_${status.toUpperCase()}_${shipmentId}`;
        await db.collection('recentActivities').doc(recentActivityId).set({
            activityId: recentActivityId,
            type: `SHIPMENT_${status.toUpperCase()}`,
            title: `Shipment ${status.replace('_', ' ')}`,
            description: `${shipmentData?.shipmentNumber || shipmentId} status updated to ${status}`,
            entityType: 'SHIPMENT',
            entityId: shipmentId,
            entityNumber: shipmentData?.shipmentNumber || shipmentId,
            userId: user.uid,
            userName: user.name || user.email,
            metadata: {
                status,
                poNumber: shipmentData?.poNumber
            },
            timestamp: new Date(),
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        });

        // If delivered, update PO items received quantity
        if (status === 'delivered') {
            const shipmentDoc = await db.collection('shipments').doc(shipmentId).get();
            const shipmentData = shipmentDoc.data();

            if (shipmentData && shipmentData.poId) {
                // Get shipment items
                const itemsSnapshot = await db.collection('shipments')
                    .doc(shipmentId)
                    .collection('items')
                    .get();

                // Update PO items
                const batch = db.batch();
                itemsSnapshot.docs.forEach(itemDoc => {
                    const item = itemDoc.data();
                    const poItemRef = db.collection('purchaseOrders')
                        .doc(shipmentData.poId)
                        .collection('items')
                        .doc(item.itemId || itemDoc.id);

                    batch.update(poItemRef, {
                        receivedQuantity: (item.receivedQuantity || 0) + (item.shippedQuantity || 0),
                        updatedAt: new Date()
                    });
                });

                await batch.commit();
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Shipment status updated successfully'
        });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message }
        });
    }
}
