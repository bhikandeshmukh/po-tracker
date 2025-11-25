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

    // Comprehensive validation
    const errors = {};
    
    if (!item.sku) errors.sku = 'SKU is required';
    else if (item.sku.length > 100) errors.sku = 'SKU cannot exceed 100 characters';
    
    if (!item.itemName) errors.itemName = 'Item name is required';
    else if (item.itemName.length > 200) errors.itemName = 'Item name cannot exceed 200 characters';
    
    if (!item.poQuantity) errors.poQuantity = 'PO quantity is required';
    else if (item.poQuantity <= 0) errors.poQuantity = 'Quantity must be greater than 0';
    else if (!Number.isInteger(item.poQuantity)) errors.poQuantity = 'Quantity must be a whole number';
    else if (item.poQuantity > 1000000) errors.poQuantity = 'Quantity cannot exceed 1,000,000';
    
    if (item.unitPrice === undefined) errors.unitPrice = 'Unit price is required';
    else if (item.unitPrice < 0) errors.unitPrice = 'Unit price cannot be negative';
    else if (item.unitPrice > 10000000) errors.unitPrice = 'Unit price cannot exceed 10,000,000';
    
    if (item.gstRate === undefined) errors.gstRate = 'GST rate is required';
    else if (item.gstRate < 0 || item.gstRate > 100) errors.gstRate = 'GST rate must be between 0 and 100';
    
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

        // Check if item already exists
        const existingItem = await db.collection('purchaseOrders')
            .doc(poId)
            .collection('items')
            .doc(item.sku)
            .get();

        if (existingItem.exists) {
            return res.status(409).json({
                success: false,
                error: { 
                    code: 'DUPLICATE_ERROR', 
                    message: 'Item with this SKU already exists in PO',
                    details: { sku: item.sku }
                }
            });
        }

        // Get current item count for line number
        const itemsSnapshot = await db.collection('purchaseOrders')
            .doc(poId)
            .collection('items')
            .get();

        const lineNumber = itemsSnapshot.size + 1;

        // Calculate item totals
        const gstRate = item.gstRate || 0;
        const lineTotal = item.poQuantity * item.unitPrice;
        const gstAmount = (lineTotal * gstRate) / 100;
        const itemTotal = lineTotal + gstAmount;

        const itemData = {
            sku: item.sku,
            itemName: item.itemName,
            poQuantity: item.poQuantity,
            unitPrice: item.unitPrice,
            gstRate: gstRate,
            mrp: item.mrp || 0,
            lineNumber,
            itemId: item.sku,
            shippedQuantity: 0,
            pendingQuantity: item.poQuantity,
            receivedQuantity: 0,
            returnedQuantity: 0,
            gstAmount,
            totalAmount: itemTotal,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Add item
        await db.collection('purchaseOrders')
            .doc(poId)
            .collection('items')
            .doc(item.sku)
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
                sku: item.sku,
                itemName: item.itemName,
                quantity: item.poQuantity,
                amount: itemTotal
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
