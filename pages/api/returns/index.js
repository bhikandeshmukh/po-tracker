// pages/api/returns/index.js
// Get all return orders and create new return order

import { db } from '../../../lib/firebase-admin';
import { verifyAuth } from '../../../lib/auth-middleware';
import { logAction, getIpAddress, getUserAgent } from '../../../lib/audit-logger';
import { incrementMetric } from '../../../lib/metrics-service';

export default async function handler(req, res) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            });
        }

        if (req.method === 'GET') {
            return await getReturns(req, res);
        } else if (req.method === 'POST') {
            return await createReturn(req, res, user);
        } else {
            return res.status(405).json({
                success: false,
                error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }
            });
        }
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message }
        });
    }
}

async function getReturns(req, res) {
    const { status, poId, vendorId, limit = 10, lastDocId } = req.query;

    const limitNum = Math.min(parseInt(limit, 10) || 10, 100);
    let query = db.collection('returnOrders').orderBy('returnDate', 'desc');

    // Apply single filter to avoid composite index requirement
    if (status) query = query.where('status', '==', status);

    // Cursor-based pagination
    if (lastDocId) {
        const lastDoc = await db.collection('returnOrders').doc(lastDocId).get();
        if (lastDoc.exists) {
            query = query.startAfter(lastDoc);
        }
    }

    query = query.limit(limitNum + 1);
    const snapshot = await query.get();

    const hasMore = snapshot.docs.length > limitNum;
    const docs = hasMore ? snapshot.docs.slice(0, limitNum) : snapshot.docs;

    let returns = docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            returnId: doc.id,
            poId: data.poId || '',
            vendorId: data.vendorId || '',
            ...data,
            returnDate: data.returnDate?.toDate?.()?.toISOString() || data.returnDate,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
        };
    });

    // Apply additional filters in memory
    if (poId) returns = returns.filter(r => r.poId === poId);
    if (vendorId) returns = returns.filter(r => r.vendorId === vendorId);

    const nextCursor = hasMore && returns.length > 0
        ? returns[returns.length - 1].id
        : null;

    return res.status(200).json({
        success: true,
        data: returns,
        pagination: {
            limit: limitNum,
            hasMore,
            nextCursor,
            count: returns.length
        }
    });
}

async function createReturn(req, res, user) {
    const {
        returnNumber,
        poId,
        shipmentId,
        returnType,
        returnReason,
        returnDate,
        transporterId,
        items
    } = req.body;

    if (!returnNumber || !poId || !returnType || !returnReason || !items || items.length === 0) {
        return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' }
        });
    }

    // Check if return already exists
    const existingReturn = await db.collection('returnOrders').doc(returnNumber).get();
    if (existingReturn.exists) {
        return res.status(409).json({
            success: false,
            error: { code: 'RETURN_EXISTS', message: 'Return order already exists' }
        });
    }

    // Get PO details
    const poDoc = await db.collection('purchaseOrders').doc(poId).get();
    if (!poDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'PO_NOT_FOUND', message: 'Purchase order not found' }
        });
    }

    const poData = poDoc.data();

    // Get transporter details if provided
    let transporterName = '';
    if (transporterId) {
        const transporterDoc = await db.collection('transporters').doc(transporterId).get();
        if (transporterDoc.exists) {
            transporterName = transporterDoc.data().transporterName || '';
        }
    }

    // Calculate totals - Quantity only
    let totalQuantity = 0;

    const processedItems = items.map((item, index) => {
        totalQuantity += item.returnQuantity || 0;

        return {
            ...item,
            itemId: `item_${index + 1}`,
            returnQuantity: item.returnQuantity || 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    });

    // Create return order
    const returnData = {
        returnId: returnNumber,
        returnNumber,
        poId,
        poNumber: poData.poNumber,
        shipmentId: shipmentId || '',
        shipmentNumber: shipmentId || '',
        vendorId: poData.vendorId,
        vendorName: poData.vendorName,
        vendorWarehouseId: poData.vendorWarehouseId,
        transporterId: transporterId || '',
        transporterName: transporterName,
        status: 'created',
        returnType,
        returnReason,
        returnDate: new Date(returnDate),
        totalItems: processedItems.length,
        totalQuantity,
        isRefundProcessed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user.uid
    };

    await db.collection('returnOrders').doc(returnNumber).set(returnData);

    // Save return items
    const batch = db.batch();
    processedItems.forEach(item => {
        const itemRef = db.collection('returnOrders')
            .doc(returnNumber)
            .collection('items')
            .doc(item.itemId);
        batch.set(itemRef, item);
    });
    await batch.commit();

    // Create audit log
    await logAction(
        'CREATE',
        user.uid,
        'RETURN',
        returnNumber,
        { after: { returnNumber, poNumber: poData.poNumber, totalQuantity, returnType, returnReason } },
        {
            ipAddress: getIpAddress(req),
            userAgent: getUserAgent(req),
            userRole: user.role,
            extra: { vendorName: poData.vendorName, shipmentId: shipmentId || '' }
        }
    );

    // Create recent activity
    const activityId = `RETURN_CREATED_${returnNumber}`;
    await db.collection('recentActivities').doc(activityId).set({
        activityId,
        type: 'RETURN_CREATED',
        title: 'Return Order Created',
        description: `${returnNumber} created for PO ${poData.poNumber}`,
        entityType: 'RETURN',
        entityId: returnNumber,
        entityNumber: returnNumber,
        userId: user.uid,
        userName: user.name || user.email,
        metadata: {
            poNumber: poData.poNumber,
            totalQuantity,
            returnType,
            returnReason
        },
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    });

    return res.status(201).json({
        success: true,
        data: {
            returnId: returnNumber,
            message: 'Return order created successfully'
        }
    });
}
