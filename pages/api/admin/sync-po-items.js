// pages/api/admin/sync-po-items.js
// Sync PO items shipped quantity from shipments

import { db } from '../../../lib/firebase-admin';
import { verifyAuth } from '../../../lib/auth-middleware';

export default async function handler(req, res) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            });
        }

        if (req.method !== 'POST') {
            return res.status(405).json({
                success: false,
                error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }
            });
        }

        const { poId } = req.body;
        let updatedCount = 0;
        let errors = [];

        // If specific poId provided, sync only that PO
        if (poId) {
            try {
                await syncSinglePO(poId);
                updatedCount = 1;
            } catch (err) {
                errors.push({ poId, error: err.message });
            }
        } else {
            // Sync all POs
            const posSnapshot = await db.collection('purchaseOrders').get();

            for (const poDoc of posSnapshot.docs) {
                try {
                    await syncSinglePO(poDoc.id);
                    updatedCount++;
                } catch (err) {
                    errors.push({ poId: poDoc.id, error: err.message });
                    console.error(`Error updating PO ${poDoc.id}:`, err);
                }
            }
        }

        return res.status(200).json({
            success: true,
            message: `Synced ${updatedCount} PO(s)`,
            updatedCount,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message }
        });
    }
}

async function syncSinglePO(poId) {
    const poDoc = await db.collection('purchaseOrders').doc(poId).get();
    if (!poDoc.exists) return;
    
    const poData = poDoc.data();
    
    // Get all shipments for this PO
    const shipmentsSnapshot = await db.collection('shipments')
        .where('poId', '==', poId)
        .get();
    
    // Calculate total shipped quantity from all shipments
    let totalShippedFromShipments = 0;
    for (const shipmentDoc of shipmentsSnapshot.docs) {
        const shipmentData = shipmentDoc.data();
        totalShippedFromShipments += shipmentData.totalQuantity || 0;
    }
    
    // Get PO items
    const poItemsSnapshot = await db.collection('purchaseOrders')
        .doc(poId)
        .collection('items')
        .get();
    
    if (!poItemsSnapshot.empty && totalShippedFromShipments > 0) {
        const batch = db.batch();
        let remainingQty = totalShippedFromShipments;
        
        // Distribute shipped quantity across PO items
        for (const poItemDoc of poItemsSnapshot.docs) {
            const poItemData = poItemDoc.data();
            const poQty = poItemData.poQuantity || 0;
            
            if (poQty > 0) {
                const shippedForItem = Math.min(poQty, remainingQty);
                const pendingForItem = poQty - shippedForItem;
                
                batch.update(poItemDoc.ref, {
                    shippedQuantity: shippedForItem,
                    pendingQuantity: Math.max(0, pendingForItem),
                    updatedAt: new Date()
                });
                
                remainingQty = Math.max(0, remainingQty - shippedForItem);
            }
        }
        
        // Also update PO document totals
        const poRef = db.collection('purchaseOrders').doc(poId);
        batch.update(poRef, {
            shippedQuantity: totalShippedFromShipments,
            pendingQuantity: Math.max(0, (poData.totalQuantity || 0) - totalShippedFromShipments),
            updatedAt: new Date()
        });
        
        await batch.commit();
        console.log(`Updated PO ${poData.poNumber}: shipped=${totalShippedFromShipments}`);
    }
}
