// pages/api/returns/[returnId].js
// Get, update specific return order

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

        const { returnId } = req.query;

        if (req.method === 'GET') {
            return await getReturn(req, res, returnId);
        } else if (req.method === 'PUT') {
            if (!await requireRole(user, ['manager', 'admin', 'super_admin'])) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Manager access required' }
                });
            }
            return await updateReturn(req, res, returnId, user);
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

async function getReturn(req, res, returnId) {
    const returnDoc = await db.collection('returnOrders').doc(returnId).get();

    if (!returnDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Return order not found' }
        });
    }

    const returnData = { id: returnDoc.id, ...returnDoc.data() };

    // Get items
    const itemsSnapshot = await db.collection('returnOrders')
        .doc(returnId)
        .collection('items')
        .get();

    returnData.items = itemsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    return res.status(200).json({
        success: true,
        data: returnData
    });
}

async function updateReturn(req, res, returnId, user) {
    const returnDoc = await db.collection('returnOrders').doc(returnId).get();
    if (!returnDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Return order not found' }
        });
    }

    const updateData = { ...req.body, updatedAt: new Date() };
    delete updateData.returnId;
    delete updateData.createdAt;

    await db.collection('returnOrders').doc(returnId).update(updateData);

    return res.status(200).json({
        success: true,
        message: 'Return order updated successfully'
    });
}
