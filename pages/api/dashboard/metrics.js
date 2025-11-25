// pages/api/dashboard/metrics.js
// Get dashboard metrics

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

        // Get metrics from dashboardMetrics collection
        const metricsDoc = await db.collection('dashboardMetrics').doc('overview').get();

        if (metricsDoc.exists) {
            return res.status(200).json({
                success: true,
                data: metricsDoc.data()
            });
        }

        // If no metrics exist, calculate them
        const metrics = await calculateMetrics();

        // Save metrics
        await db.collection('dashboardMetrics').doc('overview').set({
            ...metrics,
            lastUpdated: new Date()
        });

        return res.status(200).json({
            success: true,
            data: metrics
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
    // Get counts for各 collections
    const [
        posSnapshot,
        activePosSnapshot,
        shipmentsSnapshot,
        inTransitSnapshot,
        deliveredSnapshot,
        returnsSnapshot,
        vendorsSnapshot,
        activeVendorsSnapshot,
        transportersSnapshot
    ] = await Promise.all([
        db.collection('purchaseOrders').get(),
        db.collection('purchaseOrders').where('status', 'in', ['approved', 'partially_shipped']).get(),
        db.collection('shipments').get(),
        db.collection('shipments').where('status', '==', 'in_transit').get(),
        db.collection('shipments').where('status', '==', 'delivered').get(),
        db.collection('returnOrders').get(),
        db.collection('vendors').get(),
        db.collection('vendors').where('isActive', '==', true).get(),
        db.collection('transporters').get()
    ]);

    // Calculate totals
    let totalPOAmount = 0;
    posSnapshot.docs.forEach(doc => {
        totalPOAmount += doc.data().grandTotal || 0;
    });

    let totalReturnAmount = 0;
    returnsSnapshot.docs.forEach(doc => {
        totalReturnAmount += doc.data().totalAmount || 0;
    });

    return {
        totalPOs: posSnapshot.size,
        activePOs: activePosSnapshot.size,
        pendingApprovalPOs: 0, // Calculate separately if needed
        totalPOAmount,
        thisMonthPOAmount: 0, // Calculate separately
        totalShipments: shipmentsSnapshot.size,
        inTransitShipments: inTransitSnapshot.size,
        deliveredShipments: deliveredSnapshot.size,
        pendingShipments: shipmentsSnapshot.size - deliveredSnapshot.size,
        todayAppointments: 0, // Calculate separately
        upcomingAppointments: 0, // Calculate separately
        completedAppointments: 0, // Calculate separately
        totalReturns: returnsSnapshot.size,
        pendingReturns: 0, // Calculate separately
        completedReturns: 0, // Calculate separately
        totalReturnAmount,
        totalVendors: vendorsSnapshot.size,
        activeVendors: activeVendorsSnapshot.size,
        totalTransporters: transportersSnapshot.size,
        activeTransporters: 0 // Calculate separately
    };
}
