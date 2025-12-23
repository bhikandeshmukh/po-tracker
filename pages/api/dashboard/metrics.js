// pages/api/dashboard/metrics.js
// Get dashboard metrics - Quantity based

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

        if (req.method !== 'GET') {
            return res.status(405).json({
                success: false,
                error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }
            });
        }

        // Set cache control headers to prevent caching
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Always calculate fresh metrics from actual data
        const metrics = await calculateMetrics();

        return res.status(200).json({
            success: true,
            data: {
                ...metrics,
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message }
        });
    }
}

async function calculateMetrics() {
    // Get all POs and shipments
    const [posSnapshot, shipmentsSnapshot] = await Promise.all([
        db.collection('purchaseOrders').get(),
        db.collection('shipments').get()
    ]);

    // Calculate quantity totals from POs
    let totalOrderQty = 0;
    let totalShippedQty = 0;
    let totalPendingQty = 0;
    let totalDeliveredQty = 0;

    posSnapshot.docs.forEach(doc => {
        const data = doc.data();
        totalOrderQty += data.totalQuantity || 0;
        totalShippedQty += data.shippedQuantity || 0;
        totalPendingQty += (data.totalQuantity || 0) - (data.shippedQuantity || 0);
    });

    // Calculate shipment status counts and delivered qty
    let inTransitShipments = 0;
    let deliveredShipments = 0;
    let pendingShipments = 0;
    let createdShipments = 0;

    shipmentsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const status = data.status;
        
        if (status === 'in_transit') {
            inTransitShipments++;
        } else if (status === 'delivered') {
            deliveredShipments++;
            totalDeliveredQty += data.totalQuantity || 0;
        } else if (status === 'pending') {
            pendingShipments++;
        } else if (status === 'created') {
            createdShipments++;
            pendingShipments++; // Count created as pending too
        }
    });

    // Count PO by status
    let activePOs = 0;
    let completedPOs = 0;
    let pendingPOs = 0;

    posSnapshot.docs.forEach(doc => {
        const status = doc.data().status;
        if (['approved', 'partial_sent'].includes(status)) activePOs++;
        if (['completed', 'partial_completed'].includes(status)) completedPOs++;
        if (status === 'pending' || status === 'draft') pendingPOs++;
    });

    return {
        // Quantity metrics (for top KPIs)
        totalOrderQty,
        totalShippedQty,
        totalPendingQty: Math.max(0, totalPendingQty),
        totalDeliveredQty,
        
        // PO count metrics
        totalPOs: posSnapshot.size,
        activePOs,
        completedPOs,
        pendingPOs,
        
        // Shipment count metrics
        totalShipments: shipmentsSnapshot.size,
        inTransitShipments,
        deliveredShipments,
        pendingShipments,
        
        // For backward compatibility
        totalPOAmount: 0,
        totalReturnAmount: 0
    };
}
