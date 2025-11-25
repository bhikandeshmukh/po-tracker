// Script to recalculate PO quantities based on actual shipments
// Run this to fix incorrect quantities after manual database changes

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixPOQuantities() {
    console.log('Starting PO quantity fix...\n');

    try {
        // Get all POs
        const posSnapshot = await db.collection('purchaseOrders').get();
        console.log(`Found ${posSnapshot.size} purchase orders\n`);

        for (const poDoc of posSnapshot.docs) {
            const poId = poDoc.id;
            const poData = poDoc.data();
            console.log(`\nProcessing PO: ${poData.poNumber} (${poId})`);

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

            console.log(`  Found ${shipmentsSnapshot.size} shipments`);

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
                        console.warn(`  Warning: Item ${itemId} in shipment but not in PO`);
                    }
                }
            }

            // Update PO items with correct quantities
            const batch = db.batch();
            let totalShippedQuantity = 0;

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

                console.log(`  Item ${quantities.sku}: PO=${quantities.poQuantity}, Shipped=${quantities.shippedQuantity}, Pending=${pendingQty}`);
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

            console.log(`  PO Totals: Total=${totalPOQuantity}, Shipped=${totalShippedQuantity}, Pending=${totalPendingQuantity}`);
            console.log(`  Status: ${poData.status} -> ${newStatus}`);

            await batch.commit();
            console.log(`  ✓ Updated successfully`);
        }

        console.log('\n✓ All PO quantities fixed successfully!');
    } catch (error) {
        console.error('Error fixing PO quantities:', error);
        throw error;
    }
}

// Run the script
fixPOQuantities()
    .then(() => {
        console.log('\nScript completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\nScript failed:', error);
        process.exit(1);
    });
