// pages/api/appointments/[appointmentId].js
// Get, update specific appointment
// FIXED: Status update now syncs with shipment AND updates metrics, PO quantities

import { db } from '../../../lib/firebase-admin';
import { verifyAuth } from '../../../lib/auth-middleware';
import { incrementMetric } from '../../../lib/metrics-service';
import { logAction, getIpAddress, getUserAgent } from '../../../lib/audit-logger';

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

    const appointmentData = appointmentDoc.data();
    const oldStatus = appointmentData.status;
    const updateData = { ...req.body, updatedAt: new Date(), updatedBy: user.uid };
    delete updateData.appointmentId;
    delete updateData.createdAt;

    // Convert scheduledDate string to Date object if present
    if (updateData.scheduledDate) {
        updateData.scheduledDate = new Date(updateData.scheduledDate);
    }

    // Update appointment
    await db.collection('appointments').doc(appointmentId).update(updateData);

    // Get linked shipment
    const shipmentId = appointmentData.shipmentId || appointmentId;
    const shipmentDoc = await db.collection('shipments').doc(shipmentId).get();
    let shipmentData = null;

    if (shipmentDoc.exists) {
        shipmentData = shipmentDoc.data();
        const shipmentUpdate = {
            updatedAt: new Date(),
            updatedBy: user.uid
        };

        // Sync all relevant fields to shipment
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
        if (updateData.deliveredQuantity !== undefined) {
            shipmentUpdate.deliveredQuantity = updateData.deliveredQuantity;
        }
        if (updateData.shortageQuantity !== undefined) {
            shipmentUpdate.shortageQuantity = updateData.shortageQuantity;
        }
        if (updateData.shortageReason !== undefined) {
            shipmentUpdate.shortageReason = updateData.shortageReason;
        }

        await db.collection('shipments').doc(shipmentId).update(shipmentUpdate);
    }

    // Handle status change - sync metrics and PO quantities
    const newStatus = updateData.status;
    if (newStatus && newStatus !== oldStatus) {
        // Update metrics
        const metricsToUpdate = [];

        // Decrement old category
        if (['created', 'pending'].includes(oldStatus)) {
            metricsToUpdate.push(incrementMetric('pendingShipments', -1));
        } else if (oldStatus === 'in_transit') {
            metricsToUpdate.push(incrementMetric('inTransitShipments', -1));
        } else if (oldStatus === 'delivered') {
            metricsToUpdate.push(incrementMetric('deliveredShipments', -1));
        }

        // Increment new category
        if (['created', 'pending'].includes(newStatus)) {
            metricsToUpdate.push(incrementMetric('pendingShipments', 1));
        } else if (newStatus === 'in_transit') {
            metricsToUpdate.push(incrementMetric('inTransitShipments', 1));
        } else if (newStatus === 'delivered') {
            metricsToUpdate.push(incrementMetric('deliveredShipments', 1));
        }

        if (metricsToUpdate.length > 0) {
            await Promise.all(metricsToUpdate);
        }

        // If delivered, update PO items received quantity
        if (newStatus === 'delivered' && shipmentData && shipmentData.poId) {
            try {
                // Get shipment items
                const itemsSnapshot = await db.collection('shipments')
                    .doc(shipmentId)
                    .collection('items')
                    .get();

                if (!itemsSnapshot.empty) {
                    // Update PO items
                    const batch = db.batch();
                    let totalDeliveredQty = 0;

                    itemsSnapshot.docs.forEach(itemDoc => {
                        const item = itemDoc.data();
                        const shippedQty = item.shippedQuantity || item.quantity || 0;
                        totalDeliveredQty += shippedQty;

                        const poItemRef = db.collection('purchaseOrders')
                            .doc(shipmentData.poId)
                            .collection('items')
                            .doc(item.itemId || itemDoc.id);

                        batch.update(poItemRef, {
                            receivedQuantity: (item.receivedQuantity || 0) + shippedQty,
                            updatedAt: new Date()
                        });
                    });

                    await batch.commit();

                    // Update shipment delivered quantity
                    await db.collection('shipments').doc(shipmentId).update({
                        deliveredQuantity: totalDeliveredQty,
                        deliveredAt: new Date()
                    });

                    // Update metrics for delivered quantity
                    await incrementMetric('totalDeliveredQty', totalDeliveredQty);

                    console.log(`Delivered: Updated ${itemsSnapshot.size} PO items, total qty: ${totalDeliveredQty}`);
                }
            } catch (err) {
                console.error('Error updating PO items on delivery:', err);
            }
        }

        // Create audit log
        await logAction(
            'UPDATE',
            user.uid,
            'APPOINTMENT',
            appointmentId,
            { before: { status: oldStatus }, after: { status: newStatus } },
            {
                ipAddress: getIpAddress(req),
                userAgent: getUserAgent(req),
                userRole: user.role,
                extra: { 
                    action: `status_${newStatus}`, 
                    shipmentId,
                    poNumber: shipmentData?.poNumber 
                }
            }
        );

        // Create recent activity
        const recentActivityId = `APPOINTMENT_STATUS_${newStatus.toUpperCase()}_${appointmentId}`;
        await db.collection('recentActivities').doc(recentActivityId).set({
            activityId: recentActivityId,
            type: `APPOINTMENT_${newStatus.toUpperCase()}`,
            title: `Delivery ${newStatus.replace('_', ' ')}`,
            description: `${appointmentData.appointmentNumber || appointmentId} status updated to ${newStatus}`,
            entityType: 'APPOINTMENT',
            entityId: appointmentId,
            entityNumber: appointmentData.appointmentNumber || appointmentId,
            userId: user.uid,
            userName: user.name || user.email,
            metadata: {
                status: newStatus,
                previousStatus: oldStatus,
                shipmentId,
                poNumber: shipmentData?.poNumber
            },
            timestamp: new Date(),
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        });
    }

    return res.status(200).json({
        success: true,
        message: 'Appointment updated successfully',
        data: {
            statusChanged: newStatus && newStatus !== oldStatus,
            oldStatus,
            newStatus: newStatus || oldStatus,
            shipmentSynced: shipmentDoc.exists
        }
    });
}
