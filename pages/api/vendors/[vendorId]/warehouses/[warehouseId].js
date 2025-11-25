// pages/api/vendors/[vendorId]/warehouses/[warehouseId].js
// Get, update, delete specific warehouse

import { db } from '../../../../../lib/firebase-admin';
import { verifyAuth, requireRole } from '../../../../../lib/auth-middleware';

export default async function handler(req, res) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            });
        }

        const { vendorId, warehouseId } = req.query;

        if (req.method === 'GET') {
            return await getWarehouse(req, res, vendorId, warehouseId);
        } else if (req.method === 'PUT') {
            if (!await requireRole(user, ['manager', 'admin', 'super_admin'])) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Manager access required' }
                });
            }
            return await updateWarehouse(req, res, vendorId, warehouseId, user);
        } else if (req.method === 'DELETE') {
            if (!await requireRole(user, ['admin', 'super_admin'])) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Admin access required' }
                });
            }
            return await deleteWarehouse(req, res, vendorId, warehouseId);
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

async function getWarehouse(req, res, vendorId, warehouseId) {
    const warehouseDoc = await db.collection('vendors')
        .doc(vendorId)
        .collection('warehouses')
        .doc(warehouseId)
        .get();

    if (!warehouseDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Warehouse not found' }
        });
    }

    return res.status(200).json({
        success: true,
        data: { id: warehouseDoc.id, ...warehouseDoc.data() }
    });
}

async function updateWarehouse(req, res, vendorId, warehouseId, user) {
    const warehouseDoc = await db.collection('vendors')
        .doc(vendorId)
        .collection('warehouses')
        .doc(warehouseId)
        .get();

    if (!warehouseDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Warehouse not found' }
        });
    }

    const updateData = { 
        ...req.body, 
        updatedAt: new Date(),
        updatedBy: user.uid
    };
    delete updateData.warehouseId;
    delete updateData.vendorId;
    delete updateData.createdAt;
    delete updateData.createdBy;

    await db.collection('vendors')
        .doc(vendorId)
        .collection('warehouses')
        .doc(warehouseId)
        .update(updateData);

    return res.status(200).json({
        success: true,
        message: 'Warehouse updated successfully'
    });
}

async function deleteWarehouse(req, res, vendorId, warehouseId) {
    const warehouseDoc = await db.collection('vendors')
        .doc(vendorId)
        .collection('warehouses')
        .doc(warehouseId)
        .get();

    if (!warehouseDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Warehouse not found' }
        });
    }

    await db.collection('vendors')
        .doc(vendorId)
        .collection('warehouses')
        .doc(warehouseId)
        .delete();

    return res.status(200).json({
        success: true,
        message: 'Warehouse deleted successfully'
    });
}
