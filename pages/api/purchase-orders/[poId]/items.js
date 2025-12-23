// pages/api/purchase-orders/[poId]/items.js
// Manage PO items
// FIXED: Recalculate totals from source, proper validation

import { db } from '../../../../lib/firebase-admin';
import { verifyAuth, requireRole } from '../../../../lib/auth-middleware';
import { recalculatePOTotals, addPOActivity } from '../../../../lib/po-helpers';
import { sanitizeInput } from '../../../../lib/validation-schemas';

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

        if (req.method === 'GET') {
            return await getPOItems(req, res, poId);
        } else if (req.method === 'POST') {
            if (!await requireRole(user, ['manager', 'admin', 'super_admin'])) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Manager access required' }
                });
            }
            return await addPOItem(req, res, poId, user);
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

async function getPOItems(req, res, poId) {
    // Check if PO exists
    const poDoc = await db.collection('purchaseOrders').doc(poId).get();
    if (!poDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Purchase order not found' }
        });
    }

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

    return res.status(200).json({
        success: true,
        data: items
    });
}

// FIXED: Recalculate totals from all items (single source of truth)
async function addPOItem(req, res, poId, user) {
    const item = sanitizeInput(req.body);

    // Comprehensive validation - Quantity only
    const errors = {};
    
    if (!item.poQuantity) errors.poQuantity = 'PO quantity is required';
    else if (item.poQuantity <= 0) errors.poQuantity = 'Quantity must be greater than 0';
    else if (!Number.isInteger(item.poQuantity)) errors.poQuantity = 'Quantity must be a whole number';
    else if (item.poQuantity > 1000000) errors.poQuantity = 'Quantity cannot exceed 1,000,000';
    
    if (Object.keys(errors).length > 0) {
        return res.status(400).json({
            success: false,
            error: { 
                code: 'VALIDATION_ERROR', 
                message: 'Validation failed',
                details: errors
            }
        });
    }

    try {
        // Check if PO exists
        const poDoc = await db.collection('purchaseOrders').doc(poId).get();
        if (!poDoc.exists) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Purchase order not found' }
            });
        }

        // Get current item count for line number
        const itemsSnapshot = await db.collection('purchaseOrders')
            .doc(poId)
            .collection('items')
            .get();

        const lineNumber = itemsSnapshot.size + 1;
        const itemId = `item_${lineNumber}`;

        const itemData = {
            itemId,
            poQuantity: item.poQuantity,
            lineNumber,
            shippedQuantity: 0,
            pendingQuantity: item.poQuantity,
            receivedQuantity: 0,
            deliveredQuantity: 0,
            returnedQuantity: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Add item
        await db.collection('purchaseOrders')
            .doc(poId)
            .collection('items')
            .doc(itemId)
            .set(itemData);

        // FIXED: Recalculate totals from all items (single source of truth)
        const totals = await recalculatePOTotals(poId);
        
        await db.collection('purchaseOrders').doc(poId).update(totals);

        // Add activity
        await addPOActivity(poId, {
            action: 'item_added',
            performedBy: user.uid,
            performedByName: user.name || user.email,
            performedByRole: user.role || 'user',
            metadata: {
                itemId,
                quantity: item.poQuantity
            }
        });

        return res.status(201).json({
            success: true,
            message: 'Item added successfully',
            data: {
                item: itemData,
                poTotals: totals
            }
        });

    } catch (error) {
        console.error('Add Item Error:', error);
        throw error;
    }
}
