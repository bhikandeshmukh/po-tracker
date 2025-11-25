// pages/api/search.js
// Global search API

import { db } from '../../lib/firebase-admin';
import { verifyAuth } from '../../lib/auth-middleware';

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

        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_QUERY', message: 'Search query must be at least 2 characters' }
            });
        }

        const searchLower = q.toLowerCase();
        const results = [];

        // Search Purchase Orders
        try {
            const poSnapshot = await db.collection('purchaseOrders').limit(100).get();
            poSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const searchableText = [
                    data.poNumber,
                    data.vendorName,
                    data.vendorCode,
                    data.status,
                    data.description
                ].filter(Boolean).join(' ').toLowerCase();

                if (searchableText.includes(searchLower)) {
                    results.push({
                        type: 'Purchase Order',
                        title: data.poNumber,
                        subtitle: `${data.vendorName} - ${data.status}`,
                        link: `/purchase-orders/${data.poId}`,
                        relevance: searchableText.indexOf(searchLower)
                    });
                }
            });
        } catch (err) {
            console.error('PO search error:', err);
        }

        // Search Vendors
        try {
            const vendorSnapshot = await db.collection('vendors').limit(100).get();
            vendorSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const searchableText = [
                    data.vendorName,
                    data.vendorCode,
                    data.contactPerson,
                    data.email,
                    data.phone,
                    data.address
                ].filter(Boolean).join(' ').toLowerCase();

                if (searchableText.includes(searchLower)) {
                    results.push({
                        type: 'Vendor',
                        title: data.vendorName,
                        subtitle: data.vendorCode || data.contactPerson,
                        link: `/vendors/${data.vendorId}`,
                        relevance: searchableText.indexOf(searchLower)
                    });
                }
            });
        } catch (err) {
            console.error('Vendor search error:', err);
        }

        // Search Appointments
        try {
            const appointmentSnapshot = await db.collection('appointments').limit(100).get();
            appointmentSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const searchableText = [
                    data.appointmentNumber,
                    data.poNumber,
                    data.shipmentNumber,
                    data.vendorName,
                    data.status,
                    data.lrDocketNumber
                ].filter(Boolean).join(' ').toLowerCase();

                if (searchableText.includes(searchLower)) {
                    results.push({
                        type: 'Appointment',
                        title: data.appointmentNumber,
                        subtitle: `PO: ${data.poNumber} - ${data.status}`,
                        link: `/appointments/${data.appointmentId}`,
                        relevance: searchableText.indexOf(searchLower)
                    });
                }
            });
        } catch (err) {
            console.error('Appointment search error:', err);
        }

        // Search Shipments
        try {
            const shipmentSnapshot = await db.collection('shipments').limit(100).get();
            shipmentSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const searchableText = [
                    data.shipmentId,
                    data.poNumber,
                    data.vendorName,
                    data.transporterName,
                    data.status,
                    data.trackingNumber
                ].filter(Boolean).join(' ').toLowerCase();

                if (searchableText.includes(searchLower)) {
                    results.push({
                        type: 'Shipment',
                        title: data.shipmentId,
                        subtitle: `PO: ${data.poNumber} - ${data.status}`,
                        link: `/shipments/${data.shipmentId}`,
                        relevance: searchableText.indexOf(searchLower)
                    });
                }
            });
        } catch (err) {
            console.error('Shipment search error:', err);
        }

        // Search Transporters
        try {
            const transporterSnapshot = await db.collection('transporters').limit(100).get();
            transporterSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const searchableText = [
                    data.transporterName,
                    data.transporterCode,
                    data.contactPerson,
                    data.email,
                    data.phone
                ].filter(Boolean).join(' ').toLowerCase();

                if (searchableText.includes(searchLower)) {
                    results.push({
                        type: 'Transporter',
                        title: data.transporterName,
                        subtitle: data.transporterCode || data.contactPerson,
                        link: `/transporters/${data.transporterId}`,
                        relevance: searchableText.indexOf(searchLower)
                    });
                }
            });
        } catch (err) {
            console.error('Transporter search error:', err);
        }

        // Search Returns
        try {
            const returnSnapshot = await db.collection('returns').limit(100).get();
            returnSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const searchableText = [
                    data.returnNumber,
                    data.poNumber,
                    data.vendorName,
                    data.status,
                    data.reason
                ].filter(Boolean).join(' ').toLowerCase();

                if (searchableText.includes(searchLower)) {
                    results.push({
                        type: 'Return',
                        title: data.returnNumber,
                        subtitle: `PO: ${data.poNumber} - ${data.status}`,
                        link: `/returns/${data.returnId}`,
                        relevance: searchableText.indexOf(searchLower)
                    });
                }
            });
        } catch (err) {
            console.error('Return search error:', err);
        }

        // Sort by relevance (lower index = more relevant)
        results.sort((a, b) => a.relevance - b.relevance);

        // Limit to top 20 results
        const limitedResults = results.slice(0, 20);

        return res.status(200).json({
            success: true,
            data: limitedResults,
            total: results.length
        });
    } catch (error) {
        console.error('Search API Error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message }
        });
    }
}
