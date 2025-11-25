// API endpoint to recalculate PO quantities based on actual shipments
// GET /api/admin/fix-po-quantities

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

        // Only super_admin can run this
        if (!await requireRole(user, ['super_admin'])) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Super admin access required' }
            });
        }

        if (req.method !== 'POST') {
            return res.status(405).json({
                success: false,
                error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }
            });
        }

        console.log('Starting PO quantity fix...');
        const results = [];

        // Get all POs
        const posSnapshot = await db.collection('purchaseOrders').get();
        console.log(`Found ${posSnapshot.size} purchase orders`);

        for (const poDoc of posSnapshot.docs) {
            const poId = poDoc.id;
            const poData = poDoc.data();
            console.log(`Processing PO: ${poData.poNumber} (${poId})`);

            // Get all PO items
            const poItemsSnapshot = await db.collection('purchaseOrders')
                .doc(poId)
                .collection('items')
                .get();

            const itemQuantities = {};
            let totalPOQuantity = 0;

            // Initialize with PO quantities
            for (const itemDoc of poItemsSnapshot.docs) {
                const itemData = itemDoc.data();
                const itemId = itemDoc.id;
                const poQty = itemData.poQuantity || 0;
                
                itemQuantities[itemId] = {
                    poQuantity: poQty,
                    shippedQuantity: 0,
                    sku: itemData.sku
                };
                totalPOQuantity += poQty;
            }

            // Get all shipments for this PO
            const shipmentsSnapshot = await db.collection('shipments')
                .where('poId', '==', poId)
                .get();

            console.log(`Found ${shipmentsSnapshot.size} shipments for PO ${poData.poNumber}`);

            // Calculate actual shipped quantities from shipments
            for (const shipmentDoc of shipmentsSnapshot.docs) {
                const shipmentId = shipmentDoc.id;
                const shipmentItemsSnapshot = await db.collection('shipments')
                    .doc(shipmentId)
                    .collection('items')
                    .get();

                for (const shipmentItemDoc of shipmentItemsSnapshot.docs) {
                    const itemId = shipmentItemDoc.id;
                    const itemData = shipmentItemDoc.data();
                    const shippedQty = itemData.shippedQuantity || 0;

                    if (itemQuantities[itemId]) {
                        itemQuantities[itemId].shippedQuantity += shippedQty;
                    } else {
                        console.warn(`Warning: Item ${itemId} in shipment but not in PO`);
                    }
                }
            }

            // Update PO items with correct quantities
            const batch = db.batch();
            let totalShippedQuantity = 0;
            const itemUpdates = [];

            for (const [itemId, quantities] of Object.entries(itemQuantities)) {
                const poItemRef = db.collection('purchaseOrders')
                    .doc(poId)
                    .collection('items')
                    .doc(itemId);

                const pendingQty = Math.max(0, quantities.poQuantity - quantities.shippedQuantity);
                
                batch.update(poItemRef, {
                    shippedQuantity: quantities.shippedQuantity,
                    pendingQuantity: pendingQty,
                    updatedAt: new Date()
                });

                totalShippedQuantity += quantities.shippedQuantity;

                itemUpdates.push({
                    sku: quantities.sku,
                    poQuantity: quantities.poQuantity,
                    shippedQuantity: quantities.shippedQuantity,
                    pendingQuantity: pendingQty
                });
            }

            // Calculate PO status
            const totalPendingQuantity = Math.max(0, totalPOQuantity - totalShippedQuantity);
            const expectedDeliveryDate = poData.expectedDeliveryDate?.toDate?.() || new Date(poData.expectedDeliveryDate);
            const isExpired = expectedDeliveryDate && new Date() > expectedDeliveryDate;

            let newStatus = poData.status;
            if (totalShippedQuantity === 0) {
                newStatus = isExpired ? 'expired' : 'approved';
            } else if (totalShippedQuantity >= totalPOQuantity) {
                newStatus = 'completed';
            } else if (totalShippedQuantity > 0) {
                newStatus = isExpired ? 'partial_completed' : 'partial_sent';
            }

            // Update PO totals
            const poRef = db.collection('purchaseOrders').doc(poId);
            batch.update(poRef, {
                shippedQuantity: totalShippedQuantity,
                pendingQuantity: totalPendingQuantity,
                status: newStatus,
                updatedAt: new Date()
            });

            await batch.commit();

            results.push({
                poNumber: poData.poNumber,
                poId,
                oldStatus: poData.status,
                newStatus,
                oldShippedQty: poData.shippedQuantity || 0,
                newShippedQty: totalShippedQuantity,
                totalQuantity: totalPOQuantity,
                pendingQuantity: totalPendingQuantity,
                itemsUpdated: itemUpdates.length
            });

            console.log(`Updated PO ${poData.poNumber}: Shipped ${totalShippedQuantity}/${totalPOQuantity}, Status: ${newStatus}`);
        }

        return res.status(200).json({
            success: true,
            message: 'PO quantities fixed successfully',
            data: {
                totalPOs: results.length,
                results
            }
        });

    } catch (error) {
        console.error('Error fixing PO quantities:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message }
        });
    }
}
