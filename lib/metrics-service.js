import { db } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const METRICS_DOC_PATH = 'metadata/dashboard_metrics';

export async function getStoredMetrics() {
    try {
        const doc = await db.doc(METRICS_DOC_PATH).get();
        if (doc.exists) {
            return doc.data();
        }
        return null;
    } catch (error) {
        console.error('Error getting stored metrics:', error);
        return null;
    }
}

export async function updateMetrics(update) {
    try {
        await db.doc(METRICS_DOC_PATH).set({
            ...update,
            lastUpdated: FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('Error updating metrics:', error);
    }
}

/**
 * Recomputes all metrics by scanning collections.
 * Use this sparingly or via a scheduled task.
 */
export async function recomputeAllMetrics() {
    const [posSnapshot, shipmentsSnapshot] = await Promise.all([
        db.collection('purchaseOrders').get(),
        db.collection('shipments').get()
    ]);

    let totalOrderQty = 0;
    let totalShippedQty = 0;
    let totalPendingQty = 0;
    let totalDeliveredQty = 0;

    posSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const status = data.status;

        // Exclude cancelled POs from quantity totals
        if (status !== 'cancelled') {
            totalOrderQty += data.totalQuantity || 0;
            totalShippedQty += data.shippedQuantity || 0;
            totalPendingQty += (data.totalQuantity || 0) - (data.shippedQuantity || 0);
        }
    });

    let inTransitShipments = 0;
    let deliveredShipments = 0;
    let pendingShipments = 0;
    let createdShipments = 0;

    shipmentsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const status = data.status;

        if (status === 'in_transit') inTransitShipments++;
        else if (status === 'delivered') {
            deliveredShipments++;
            totalDeliveredQty += (data.deliveredQuantity !== undefined ? data.deliveredQuantity : data.totalQuantity) || 0;
        } else if (status === 'pending') pendingShipments++;
        else if (status === 'created') {
            createdShipments++;
            pendingShipments++;
        }
    });

    let activePOs = 0;
    let completedPOs = 0;
    let pendingPOs = 0;

    posSnapshot.docs.forEach(doc => {
        const status = doc.data().status;
        if (['approved', 'partial_sent'].includes(status)) activePOs++;
        if (['completed', 'partial_completed'].includes(status)) completedPOs++;
        if (status === 'pending' || status === 'draft') pendingPOs++;
    });

    const metrics = {
        totalOrderQty,
        totalShippedQty,
        totalPendingQty: Math.max(0, totalPendingQty),
        totalDeliveredQty,
        totalPOs: posSnapshot.size,
        activePOs,
        completedPOs,
        pendingPOs,
        totalShipments: shipmentsSnapshot.size,
        inTransitShipments,
        deliveredShipments,
        pendingShipments,
    };

    await updateMetrics(metrics);
    return metrics;
}

/**
 * Increment or decrement a specific metric
 */
export async function incrementMetric(field, value = 1) {
    try {
        await db.doc(METRICS_DOC_PATH).update({
            [field]: FieldValue.increment(value),
            lastUpdated: FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error(`Error incrementing metric ${field}:`, error);
    }
}
