// pages/api/purchase-orders/[poId]/index.js
// Get, update, delete specific purchase order
// FIXED: All root cause issues resolved

import { db } from '../../../../lib/firebase-admin';
import { verifyAuth, requireRole } from '../../../../lib/auth-middleware';
import { validatePurchaseOrder, validateStatusTransition } from '../../../../lib/validation-schemas';
import {
    updatePOWithTransaction,
    deletePOWithTransaction,
    validateVendorAndWarehouse
} from '../../../../lib/po-helpers';
import { standardRateLimiter } from '../../../../lib/rate-limiter';
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

        const { poId } = req.query;

        // Apply rate limiting
        await applyRateLimit(standardRateLimiter, req, res);

        if (req.method === 'GET') {
            return await getPurchaseOrder(req, res, poId);
        } else if (req.method === 'PUT') {
            if (!await requireRole(user, ['manager', 'admin', 'super_admin'])) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Manager access required' }
                });
            }
            return await updatePurchaseOrder(req, res, poId, user);
        } else if (req.method === 'DELETE') {
            if (!await requireRole(user, ['admin', 'super_admin'])) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Admin access required' }
                });
            }
            return await deletePurchaseOrder(req, res, poId, user);
        } else {
            return res.status(405).json({
                success: false,
                error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }
            });
        }
    } catch (error) {
        console.error('API Error:', {
            message: error.message,
            poId: req.query.poId,
            user: user?.uid
        });

        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Internal server error' }
        });
    }
}

async function applyRateLimit(limiter, req, res) {
    return new Promise((resolve, reject) => {
        limiter(req, res, (result) => {
            if (result instanceof Error) {
                reject(result);
            } else {
                resolve();
            }
        });
    });
}

// FIXED: Proper timestamp conversion, complete data
async function getPurchaseOrder(req, res, poId) {
    const poDoc = await db.collection('purchaseOrders').doc(poId).get();

    if (!poDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Purchase order not found' }
        });
    }

    const poData = poDoc.data();

    // Fetch warehouse name if missing but vendorWarehouseId exists
    if (!poData.vendorWarehouseName && poData.vendorWarehouseId && poData.vendorId) {
        try {
            const warehouseDoc = await db.collection('vendors')
                .doc(poData.vendorId)
                .collection('warehouses')
                .doc(poData.vendorWarehouseId)
                .get();

            if (warehouseDoc.exists) {
                const warehouseData = warehouseDoc.data();
                poData.vendorWarehouseName = warehouseData.warehouseName || warehouseData.name || poData.vendorWarehouseId;
            }
        } catch (err) {
            console.error('Failed to fetch warehouse name:', err);
        }
    }

    // Get items
    const itemsSnapshot = await db.collection('purchaseOrders')
        .doc(poId)
        .collection('items')
        .orderBy('lineNumber', 'asc')
        .get();

    const items = itemsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
        };
    });

    // Convert Firestore timestamps to ISO strings
    const response = {
        id: poDoc.id,
        ...poData,
        poDate: poData.poDate?.toDate?.()?.toISOString() || poData.poDate,
        expectedDeliveryDate: poData.expectedDeliveryDate?.toDate?.()?.toISOString() || poData.expectedDeliveryDate,
        createdAt: poData.createdAt?.toDate?.()?.toISOString() || poData.createdAt,
        updatedAt: poData.updatedAt?.toDate?.()?.toISOString() || poData.updatedAt,
        approvedAt: poData.approvedAt?.toDate?.()?.toISOString() || poData.approvedAt,
        cancelledAt: poData.cancelledAt?.toDate?.()?.toISOString() || poData.cancelledAt,
        items
    };

    return res.status(200).json({
        success: true,
        data: response
    });
}

// FIXED: Validation, status transition rules, transaction-based
async function updatePurchaseOrder(req, res, poId, user) {
    try {
        // Validate update data
        const validation = validatePurchaseOrder(req.body, true);

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: validation.error,
                    details: validation.details
                }
            });
        }

        const updateData = validation.data;

        // Get current PO to check status transition
        const poDoc = await db.collection('purchaseOrders').doc(poId).get();
        if (!poDoc.exists) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Purchase order not found' }
            });
        }

        const currentPO = poDoc.data();

        // Validate status transition if status is being updated
        if (updateData.status && updateData.status !== currentPO.status) {
            const transitionValidation = validateStatusTransition(
                currentPO.status,
                updateData.status
            );

            if (!transitionValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_STATUS_TRANSITION',
                        message: transitionValidation.error
                    }
                });
            }
        }

        // Validate vendor/warehouse if being updated
        if (updateData.vendorId || updateData.vendorWarehouseId) {
            const vendorId = updateData.vendorId || currentPO.vendorId;
            const warehouseId = updateData.vendorWarehouseId || currentPO.vendorWarehouseId;

            const vendorValidation = await validateVendorAndWarehouse(vendorId, warehouseId);

            if (!vendorValidation.valid) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: vendorValidation.error,
                        details: vendorValidation.details
                    }
                });
            }

            // Update vendor/warehouse names
            if (updateData.vendorId) {
                updateData.vendorName = vendorValidation.vendor.vendorName || vendorValidation.vendor.name;
            }
            if (updateData.vendorWarehouseId) {
                updateData.vendorWarehouseName = vendorValidation.warehouse.warehouseName || vendorValidation.warehouse.name;
            }
        }

        // Update with transaction
        const result = await updatePOWithTransaction(poId, updateData, user);

        // Sync metrics if status changed
        if (updateData.status && updateData.status !== currentPO.status) {
            const oldStatus = currentPO.status;
            const newStatus = updateData.status;
            const metricsToUpdate = [];

            // Helper to get metric key from status
            const getMetricKey = (status) => {
                if (['approved', 'partial_sent'].includes(status)) return 'activePOs';
                if (['completed', 'partial_completed'].includes(status)) return 'completedPOs';
                if (['pending', 'draft'].includes(status)) return 'pendingPOs';
                return null;
            };

            const oldKey = getMetricKey(oldStatus);
            const newKey = getMetricKey(newStatus);

            if (oldKey) metricsToUpdate.push(incrementMetric(oldKey, -1));
            if (newKey) metricsToUpdate.push(incrementMetric(newKey, 1));

            await Promise.all(metricsToUpdate);
        }

        return res.status(200).json({
            success: true,
            message: 'Purchase order updated successfully',
            data: {
                fieldsUpdated: Object.keys(updateData),
                changesCount: result.changes.length
            }
        });

    } catch (error) {
        if (error.message === 'PO_NOT_FOUND') {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Purchase order not found' }
            });
        }
        throw error;
    }
}

// FIXED: Transaction-based cascade delete
async function deletePurchaseOrder(req, res, poId, user) {
    try {
        const poDoc = await db.collection('purchaseOrders').doc(poId).get();
        if (!poDoc.exists) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Purchase order not found' }
            });
        }
        const poData = poDoc.data();

        await deletePOWithTransaction(poId, user);

        // Sync metrics (O(1) update)
        const metricsToUpdate = [
            incrementMetric('totalPOs', -1),
            incrementMetric('totalOrderQty', -(poData.totalQuantity || 0)),
            incrementMetric('totalShippedQty', -(poData.shippedQuantity || 0)),
            incrementMetric('totalPendingQty', -(poData.pendingQuantity || 0))
        ];

        // Status counts
        const status = poData.status;
        if (['approved', 'partial_sent'].includes(status)) metricsToUpdate.push(incrementMetric('activePOs', -1));
        else if (['completed', 'partial_completed'].includes(status)) metricsToUpdate.push(incrementMetric('completedPOs', -1));
        else if (['pending', 'draft'].includes(status)) metricsToUpdate.push(incrementMetric('pendingPOs', -1));

        await Promise.all(metricsToUpdate);

        return res.status(200).json({
            success: true,
            message: 'Purchase order deleted successfully'
        });

    } catch (error) {
        if (error.message === 'PO_NOT_FOUND') {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Purchase order not found' }
            });
        }
        throw error;
    }
}
