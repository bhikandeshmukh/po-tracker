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
            data: chartData.chartData,
            totals: chartData.totals
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
    const now = new Date();
    let chartData = [];
    let totals = { orderQty: 0, shippedQty: 0, deliveredQty: 0 };
    
    // Get all POs and shipments
    const posSnapshot = await db.collection('purchaseOrders').get();
    const shipmentsSnapshot = await db.collection('shipments').get();
    
    if (period === '30days') {
        // Last 30 days - daily data
        const dailyData = {};
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        
        // Create daily buckets for last 30 days
        for (let i = 0; i < 30; i++) {
            const dayDate = new Date(startDate);
            dayDate.setDate(startDate.getDate() + i);
            const dayKey = dayDate.toISOString().split('T')[0];
            const dayLabel = dayDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            
            dailyData[dayKey] = {
                month: dayLabel,
                orderQty: 0,
                shippedQty: 0,
                deliveredQty: 0
            };
        }
        
        // Process POs for last 30 days
        posSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.status === 'cancelled') return;
            
            let poDate = data.poDate;
            if (poDate?.toDate) poDate = poDate.toDate();
            else if (typeof poDate === 'string') poDate = new Date(poDate);
            
            if (poDate && !isNaN(poDate.getTime()) && poDate >= startDate) {
                const dayKey = poDate.toISOString().split('T')[0];
                if (dailyData[dayKey]) {
                    dailyData[dayKey].orderQty += data.totalQuantity || 0;
                    dailyData[dayKey].shippedQty += data.shippedQuantity || 0;
                }
            }
        });
        
        // Process Shipments for delivered qty in last 30 days
        shipmentsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.status === 'delivered') {
                let deliveryDate = data.deliveryDate || data.shipmentDate;
                if (deliveryDate?.toDate) deliveryDate = deliveryDate.toDate();
                else if (typeof deliveryDate === 'string') deliveryDate = new Date(deliveryDate);
                
                if (deliveryDate && !isNaN(deliveryDate.getTime()) && deliveryDate >= startDate) {
                    const dayKey = deliveryDate.toISOString().split('T')[0];
                    if (dailyData[dayKey]) {
                        dailyData[dayKey].deliveredQty += (data.deliveredQuantity !== undefined ? data.deliveredQuantity : data.totalQuantity) || 0;
                    }
                }
            }
        });
        
        // Convert to array and calculate totals
        for (let i = 0; i < 30; i++) {
            const dayDate = new Date(startDate);
            dayDate.setDate(startDate.getDate() + i);
            const dayKey = dayDate.toISOString().split('T')[0];
            
            if (dailyData[dayKey]) {
                chartData.push(dailyData[dayKey]);
                totals.orderQty += dailyData[dayKey].orderQty;
                totals.shippedQty += dailyData[dayKey].shippedQty;
                totals.deliveredQty += dailyData[dayKey].deliveredQty;
            }
        }
    } else {
        // Monthly data (6months, 12months, thisYear)
        const months = period === '12months' ? 12 : period === 'thisYear' ? now.getMonth() + 1 : 6;
        const monthlyData = {};
        
        let startMonth, startYear;
        if (period === 'thisYear') {
            startMonth = 0;
            startYear = now.getFullYear();
        } else {
            const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
            startMonth = startDate.getMonth();
            startYear = startDate.getFullYear();
        }
        
        // Create monthly buckets
        for (let i = 0; i < months; i++) {
            let monthDate;
            if (period === 'thisYear') {
                monthDate = new Date(startYear, i, 1);
            } else {
                monthDate = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
            }
            const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
            const monthName = monthDate.toLocaleString('default', { month: 'short' });
            
            monthlyData[monthKey] = {
                month: monthName,
                orderQty: 0,
                shippedQty: 0,
                deliveredQty: 0
            };
        }
        
        const startDate = period === 'thisYear' 
            ? new Date(now.getFullYear(), 0, 1)
            : new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
        
        // Process POs
        posSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.status === 'cancelled') return;
            
            let poDate = data.poDate;
            if (poDate?.toDate) poDate = poDate.toDate();
            else if (typeof poDate === 'string') poDate = new Date(poDate);
            
            if (poDate && !isNaN(poDate.getTime()) && poDate >= startDate) {
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
                let deliveryDate = data.deliveryDate || data.shipmentDate;
                if (deliveryDate?.toDate) deliveryDate = deliveryDate.toDate();
                else if (typeof deliveryDate === 'string') deliveryDate = new Date(deliveryDate);
                
                if (deliveryDate && !isNaN(deliveryDate.getTime()) && deliveryDate >= startDate) {
                    const monthKey = `${deliveryDate.getFullYear()}-${String(deliveryDate.getMonth() + 1).padStart(2, '0')}`;
                    if (monthlyData[monthKey]) {
                        monthlyData[monthKey].deliveredQty += (data.deliveredQuantity !== undefined ? data.deliveredQuantity : data.totalQuantity) || 0;
                    }
                }
            }
        });
        
        // Convert to array and calculate totals
        for (let i = 0; i < months; i++) {
            let monthDate;
            if (period === 'thisYear') {
                monthDate = new Date(startYear, i, 1);
            } else {
                monthDate = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
            }
            const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
            
            if (monthlyData[monthKey]) {
                chartData.push(monthlyData[monthKey]);
                totals.orderQty += monthlyData[monthKey].orderQty;
                totals.shippedQty += monthlyData[monthKey].shippedQty;
                totals.deliveredQty += monthlyData[monthKey].deliveredQty;
            }
        }
    }
    
    totals.pendingQty = Math.max(0, totals.orderQty - totals.shippedQty);
    
    return { chartData, totals };
}
