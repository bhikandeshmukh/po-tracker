// pages/api/vendors/[vendorId].js
// Get, update, delete specific vendor

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

        const { vendorId } = req.query;

        if (req.method === 'GET') {
            return await getVendor(req, res, vendorId);
        } else if (req.method === 'PUT') {
            if (!await requireRole(user, ['manager', 'admin', 'super_admin'])) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Manager access required' }
                });
            }
            return await updateVendor(req, res, vendorId);
        } else if (req.method === 'DELETE') {
            if (!await requireRole(user, ['admin', 'super_admin'])) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Admin access required' }
                });
            }
            return await deleteVendor(req, res, vendorId);
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

async function getVendor(req, res, vendorId) {
    const vendorDoc = await db.collection('vendors').doc(vendorId).get();

    if (!vendorDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Vendor not found' }
        });
    }

    const vendorData = { id: vendorDoc.id, ...vendorDoc.data() };

    // Get warehouses
    const warehousesSnapshot = await db.collection('vendors')
        .doc(vendorId)
        .collection('warehouses')
        .get();

    vendorData.warehouses = warehousesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    return res.status(200).json({
        success: true,
        data: vendorData
    });
}

async function updateVendor(req, res, vendorId) {
    const vendorDoc = await db.collection('vendors').doc(vendorId).get();
    if (!vendorDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Vendor not found' }
        });
    }

    const updateData = { ...req.body, updatedAt: new Date() };
    delete updateData.vendorId;
    delete updateData.createdAt;

    await db.collection('vendors').doc(vendorId).update(updateData);

    return res.status(200).json({
        success: true,
        message: 'Vendor updated successfully'
    });
}

async function deleteVendor(req, res, vendorId) {
    const vendorDoc = await db.collection('vendors').doc(vendorId).get();
    if (!vendorDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Vendor not found' }
        });
    }

    // Delete warehouses
    const warehousesSnapshot = await db.collection('vendors')
        .doc(vendorId)
        .collection('warehouses')
        .get();

    const batch = db.batch();
    warehousesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    // Delete vendor
    await db.collection('vendors').doc(vendorId).delete();

    return res.status(200).json({
        success: true,
        message: 'Vendor deleted successfully'
    });
}
