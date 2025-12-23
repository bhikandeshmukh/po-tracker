// pages/api/dashboard/chart-data.js
// Get quantity-based chart data for dashboard

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

        const { period = '6months' } = req.query;

        const chartData = await getQuantityChartData(period);

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

async function getQuantityChartData(period) {
    const months = period === '12months' ? 12 : 6;
    const chartData = [];
    
    const now = new Date();
    
    // Get all POs and process in memory (to handle different date formats)
    const posSnapshot = await db.collection('purchaseOrders').get();
    const shipmentsSnapshot = await db.collection('shipments').get();
    
    // Create monthly buckets
    const monthlyData = {};
    
    for (let i = months - 1; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
        const monthName = monthDate.toLocaleString('default', { month: 'short' });
        
        monthlyData[monthKey] = {
            month: monthName,
            orderQty: 0,
            shippedQty: 0,
            deliveredQty: 0
        };
    }
    
    // Process POs
    posSnapshot.docs.forEach(doc => {
        const data = doc.data();
        let poDate = data.poDate;
        
        // Handle different date formats
        if (poDate?.toDate) {
            poDate = poDate.toDate();
        } else if (typeof poDate === 'string') {
            poDate = new Date(poDate);
        }
        
        if (poDate && !isNaN(poDate.getTime())) {
            const monthKey = `${poDate.getFullYear()}-${String(poDate.getMonth() + 1).padStart(2, '0')}`;
            
            if (monthlyData[monthKey]) {
                monthlyData[monthKey].orderQty += data.totalQuantity || 0;
                monthlyData[monthKey].shippedQty += data.shippedQuantity || 0;
            }
        }
    });
    
    // Process Shipments for delivered qty
    shipmentsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'delivered') {
            let shipmentDate = data.shipmentDate;
            
            if (shipmentDate?.toDate) {
                shipmentDate = shipmentDate.toDate();
            } else if (typeof shipmentDate === 'string') {
                shipmentDate = new Date(shipmentDate);
            }
            
            if (shipmentDate && !isNaN(shipmentDate.getTime())) {
                const monthKey = `${shipmentDate.getFullYear()}-${String(shipmentDate.getMonth() + 1).padStart(2, '0')}`;
                
                if (monthlyData[monthKey]) {
                    monthlyData[monthKey].deliveredQty += data.totalQuantity || 0;
                }
            }
        }
    });
    
    // Convert to array in order
    for (let i = months - 1; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (monthlyData[monthKey]) {
            chartData.push(monthlyData[monthKey]);
        }
    }
    
    return chartData;
}
