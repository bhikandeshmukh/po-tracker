// pages/api/dashboard/chart-data.js
// Get chart data for dashboard

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

        const { period = '6months', type = 'po' } = req.query;

        let chartData = [];

        if (type === 'po') {
            chartData = await getPOChartData(period);
        } else if (type === 'shipment') {
            chartData = await getShipmentChartData(period);
        }

        return res.status(200).json({
            success: true,
            data: chartData
        });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message }
        });
    }
}

async function getPOChartData(period) {
    const months = period === '12months' ? 12 : 6;
    const chartData = [];
    
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        
        const monthName = monthDate.toLocaleString('default', { month: 'short' });
        
        // Query POs for this month
        const posSnapshot = await db.collection('purchaseOrders')
            .where('poDate', '>=', monthDate)
            .where('poDate', '<', nextMonthDate)
            .get();
        
        let totalValue = 0;
        let orderCount = 0;
        
        posSnapshot.docs.forEach(doc => {
            const data = doc.data();
            totalValue += data.grandTotal || 0;
            orderCount++;
        });
        
        chartData.push({
            month: monthName,
            value: Math.round(totalValue),
            orders: orderCount
        });
    }
    
    return chartData;
}

async function getShipmentChartData(period) {
    const months = period === '12months' ? 12 : 6;
    const chartData = [];
    
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        
        const monthName = monthDate.toLocaleString('default', { month: 'short' });
        
        // Query shipments for this month
        const shipmentsSnapshot = await db.collection('shipments')
            .where('createdAt', '>=', monthDate)
            .where('createdAt', '<', nextMonthDate)
            .get();
        
        let totalValue = 0;
        let shipmentCount = 0;
        
        shipmentsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            totalValue += data.totalAmount || 0;
            shipmentCount++;
        });
        
        chartData.push({
            month: monthName,
            value: Math.round(totalValue),
            shipments: shipmentCount
        });
    }
    
    return chartData;
}
