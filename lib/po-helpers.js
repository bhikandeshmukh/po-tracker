// lib/po-helpers.js
// Helper functions for Purchase Order operations

import { db } from './firebase-admin.js';

/**
 * Recalculate PO totals from all items
 * This is the single source of truth for PO totals
 */
async function recalculatePOTotals(poId, transaction = null) {
    const itemsRef = db.collection('purchaseOrders')
        .doc(poId)
        .collection('items');

    const itemsSnapshot = transaction
        ? await transaction.get(itemsRef)
        : await itemsRef.get();

    let totalQuantity = 0;
    let shippedQuantity = 0;
    let deliveredQuantity = 0;
    let totalItems = 0;

    itemsSnapshot.docs.forEach(doc => {
        const item = doc.data();
        totalQuantity += item.poQuantity || 0;
        shippedQuantity += item.shippedQuantity || 0;
        deliveredQuantity += item.deliveredQuantity || 0;
        totalItems++;
    });

    const pendingQuantity = Math.max(0, totalQuantity - shippedQuantity);

    // Determine status based on quantities
    let autoStatus = null;
    if (shippedQuantity === 0) {
        autoStatus = null; // Keep current status
    } else if (shippedQuantity >= totalQuantity) {
        autoStatus = 'fully_shipped';
    } else if (shippedQuantity > 0) {
        autoStatus = 'partial_sent';
    }

    const totals = {
        totalItems,
        totalQuantity,
        shippedQuantity,
        deliveredQuantity,
        pendingQuantity,
        updatedAt: new Date()
    };

    if (autoStatus) {
        totals.status = autoStatus;
    }

    return totals;
}

/**
 * Validate vendor and warehouse exist
 */
async function validateVendorAndWarehouse(vendorId, warehouseId) {
    // Check vendor exists
    const vendorDoc = await db.collection('vendors').doc(vendorId).get();

    if (!vendorDoc.exists) {
        return {
            valid: false,
            error: 'Vendor not found',
            details: { vendorId }
        };
    }

    // Check warehouse exists and belongs to vendor
    const warehouseDoc = await db.collection('vendors')
        .doc(vendorId)
        .collection('warehouses')
        .doc(warehouseId)
        .get();

    if (!warehouseDoc.exists) {
        return {
            valid: false,
            error: 'Warehouse not found or does not belong to this vendor',
            details: { vendorId, warehouseId }
        };
    }

    return {
        valid: true,
        vendor: { id: vendorDoc.id, ...vendorDoc.data() },
        warehouse: { id: warehouseDoc.id, ...warehouseDoc.data() }
    };
}

/**
 * Create PO with transaction (atomic operation)
 */
async function createPOWithTransaction(poData, items, user) {
    return await db.runTransaction(async (transaction) => {
        const poRef = db.collection('purchaseOrders').doc(poData.poNumber);

        // Check if PO already exists (atomic check)
        const existingPO = await transaction.get(poRef);
        if (existingPO.exists) {
            throw new Error('DUPLICATE_PO');
        }

        // Calculate totals from items
        let totalQuantity = 0;
        let shippedQuantity = 0;
        let deliveredQuantity = 0;

        const processedItems = items.map((item, index) => {
            totalQuantity += item.poQuantity || 0;
            shippedQuantity += item.shippedQuantity || 0;
            deliveredQuantity += item.deliveredQuantity || 0;

            return {
                ...item,
                lineNumber: index + 1,
                shippedQuantity: item.shippedQuantity || 0,
                pendingQuantity: (item.poQuantity || 0) - (item.shippedQuantity || 0),
                deliveredQuantity: item.deliveredQuantity || 0,
                createdAt: new Date(),
                updatedAt: new Date()
            };
        });

        const pendingQuantity = Math.max(0, totalQuantity - shippedQuantity);

        // Create PO document
        const finalPOData = {
            ...poData,
            totalItems: processedItems.length,
            totalQuantity,
            shippedQuantity,
            pendingQuantity,
            deliveredQuantity,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: user.uid,
            metadata: {
                totalShipments: 0,
                completedShipments: 0,
                pendingShipments: 0
            }
        };

        // Write PO
        transaction.set(poRef, finalPOData);

        // Write items
        processedItems.forEach((item, index) => {
            const itemRef = db.collection('purchaseOrders')
                .doc(poData.poNumber)
                .collection('items')
                .doc(`item_${index + 1}`);
            transaction.set(itemRef, item);
        });

        // Create activity log
        const activityLogRef = db.collection('poActivityLogs').doc(poData.poNumber);
        transaction.set(activityLogRef, {
            poId: poData.poNumber,
            poNumber: poData.poNumber,
            createdAt: new Date(),
            lastUpdated: new Date()
        });

        // Add first activity to subcollection
        const firstActivityRef = activityLogRef
            .collection('activities')
            .doc(Date.now().toString());
        transaction.set(firstActivityRef, {
            actionId: Date.now().toString(),
            action: 'created',
            timestamp: new Date(),
            performedBy: user.uid,
            performedByName: user.name || user.email,
            performedByRole: user.role || 'user',
            metadata: {
                totalQuantity,
                vendorId: poData.vendorId,
                totalItems: processedItems.length
            }
        });

        // Create audit log
        const auditLogRef = db.collection('auditLogs').doc();
        transaction.set(auditLogRef, {
            logId: auditLogRef.id,
            entityType: 'PO',
            entityId: poData.poNumber,
            entityNumber: poData.poNumber,
            action: 'created',
            userId: user.uid,
            userName: user.name || user.email,
            userRole: user.role || 'user',
            timestamp: new Date(),
            metadata: {
                totalQuantity,
                vendorName: poData.vendorName
            }
        });

        // Create recent activity with predictable document ID
        const activityDocId = `PO_CREATED_${poData.poNumber}`;
        const recentActivityRef = db.collection('recentActivities').doc(activityDocId);
        transaction.set(recentActivityRef, {
            activityId: activityDocId,
            type: 'PO_CREATED',
            title: 'Purchase Order Created',
            description: `${poData.poNumber} created for ${poData.vendorName}`,
            entityType: 'PO',
            entityId: poData.poNumber,
            entityNumber: poData.poNumber,
            userId: user.uid,
            userName: user.name || user.email,
            metadata: {
                vendorName: poData.vendorName,
                totalQuantity,
                status: poData.status
            },
            timestamp: new Date(),
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        });

        return {
            poId: poData.poNumber,
            poNumber: poData.poNumber,
            totalQuantity,
            totalItems: processedItems.length
        };
    });
}

/**
 * Update PO with transaction
 */
async function updatePOWithTransaction(poId, updateData, user) {
    return await db.runTransaction(async (transaction) => {
        const poRef = db.collection('purchaseOrders').doc(poId);
        const poDoc = await transaction.get(poRef);

        if (!poDoc.exists) {
            throw new Error('PO_NOT_FOUND');
        }

        const currentData = poDoc.data();

        // Prepare update
        const finalUpdateData = {
            ...updateData,
            updatedAt: new Date()
        };

        // Track changes for activity log
        const changes = [];
        for (const [key, value] of Object.entries(updateData)) {
            if (currentData[key] !== value) {
                changes.push({
                    field: key,
                    oldValue: currentData[key],
                    newValue: value
                });
            }
        }

        // Update PO
        transaction.update(poRef, finalUpdateData);

        // Add activity
        if (changes.length > 0) {
            const activityRef = db.collection('poActivityLogs')
                .doc(poId)
                .collection('activities')
                .doc(Date.now().toString());

            transaction.set(activityRef, {
                actionId: Date.now().toString(),
                action: 'updated',
                timestamp: new Date(),
                performedBy: user.uid,
                performedByName: user.name || user.email,
                performedByRole: user.role || 'user',
                changes,
                metadata: { fieldsUpdated: Object.keys(updateData) }
            });

            // Update activity log timestamp
            transaction.update(db.collection('poActivityLogs').doc(poId), {
                lastUpdated: new Date()
            });
        }

        return { success: true, changes };
    });
}

/**
 * Add activity to PO (using subcollection to avoid array growth)
 */
async function addPOActivity(poId, activity, transaction = null) {
    const activityRef = db.collection('poActivityLogs')
        .doc(poId)
        .collection('activities')
        .doc(activity.actionId || Date.now().toString());

    const activityData = {
        ...activity,
        actionId: activity.actionId || Date.now().toString(),
        timestamp: activity.timestamp || new Date()
    };

    if (transaction) {
        transaction.set(activityRef, activityData);
        transaction.update(db.collection('poActivityLogs').doc(poId), {
            lastUpdated: new Date()
        });
    } else {
        await activityRef.set(activityData);
        await db.collection('poActivityLogs').doc(poId).update({
            lastUpdated: new Date()
        });
    }

    return activityData;
}

/**
 * Get PO activities with pagination
 */
async function getPOActivities(poId, limit = 50, startAfter = null) {
    let query = db.collection('poActivityLogs')
        .doc(poId)
        .collection('activities')
        .orderBy('timestamp', 'desc')
        .limit(limit);

    if (startAfter) {
        const lastDoc = await db.collection('poActivityLogs')
            .doc(poId)
            .collection('activities')
            .doc(startAfter)
            .get();

        if (lastDoc.exists) {
            query = query.startAfter(lastDoc);
        }
    }

    const snapshot = await query.get();

    return {
        activities: snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
            };
        }),
        hasMore: snapshot.docs.length === limit,
        lastActivityId: snapshot.docs.length > 0
            ? snapshot.docs[snapshot.docs.length - 1].id
            : null
    };
}

/**
 * Delete PO with transaction (cascade delete)
 */
async function deletePOWithTransaction(poId, user) {
    return await db.runTransaction(async (transaction) => {
        const poRef = db.collection('purchaseOrders').doc(poId);
        const poDoc = await transaction.get(poRef);

        if (!poDoc.exists) {
            throw new Error('PO_NOT_FOUND');
        }

        // Get all items
        const itemsSnapshot = await transaction.get(
            db.collection('purchaseOrders').doc(poId).collection('items')
        );

        // Delete items
        itemsSnapshot.docs.forEach(doc => {
            transaction.delete(doc.ref);
        });

        // Delete PO
        transaction.delete(poRef);

        // Note: Activity logs are kept for audit purposes
        // Mark as deleted instead
        transaction.update(db.collection('poActivityLogs').doc(poId), {
            deleted: true,
            deletedAt: new Date(),
            deletedBy: user.uid
        });

        return { success: true };
    });
}

export {
    recalculatePOTotals,
    validateVendorAndWarehouse,
    createPOWithTransaction,
    updatePOWithTransaction,
    addPOActivity,
    getPOActivities,
    deletePOWithTransaction
};


/**
 * Update dashboard metrics
 */
async function updateDashboardMetrics() {
    try {
        const [posSnapshot, activePosSnapshot, shipmentsSnapshot, inTransitSnapshot, deliveredSnapshot, vendorsSnapshot, activeVendorsSnapshot, transportersSnapshot] = await Promise.all([
            db.collection('purchaseOrders').get(),
            db.collection('purchaseOrders').where('status', 'in', ['approved', 'partial_sent']).get(),
            db.collection('shipments').get(),
            db.collection('shipments').where('status', '==', 'in_transit').get(),
            db.collection('shipments').where('status', '==', 'delivered').get(),
            db.collection('vendors').get(),
            db.collection('vendors').where('isActive', '==', true).get(),
            db.collection('transporters').get()
        ]);

        // Calculate quantity totals
        let totalOrderQty = 0;
        let totalShippedQty = 0;
        let totalDeliveredQty = 0;

        posSnapshot.docs.forEach(doc => {
            const data = doc.data();
            totalOrderQty += data.totalQuantity || 0;
            totalShippedQty += data.shippedQuantity || 0;
            totalDeliveredQty += (data.deliveredQuantity !== undefined ? data.deliveredQuantity : 0);
        });

        const totalPendingQty = Math.max(0, totalOrderQty - totalShippedQty);

        const metrics = {
            totalPOs: posSnapshot.size,
            activePOs: activePosSnapshot.size,
            totalOrderQty,
            totalShippedQty,
            totalPendingQty,
            totalDeliveredQty,
            totalShipments: shipmentsSnapshot.size,
            inTransitShipments: inTransitSnapshot.size,
            deliveredShipments: deliveredSnapshot.size,
            pendingShipments: shipmentsSnapshot.docs.filter(doc => doc.data().status === 'pending').length,
            totalVendors: vendorsSnapshot.size,
            activeVendors: activeVendorsSnapshot.size,
            totalTransporters: transportersSnapshot.size,
            lastUpdated: new Date()
        };

        await db.collection('dashboardMetrics').doc('overview').set(metrics);
        console.log('Dashboard metrics updated automatically');
    } catch (error) {
        console.error('Error updating dashboard metrics:', error);
    }
}

export { updateDashboardMetrics };
