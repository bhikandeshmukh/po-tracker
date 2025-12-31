// pages/api/vendors/[vendorId].js
// Get, update, delete specific vendor

import { db } from '../../../lib/firebase-admin';
import { verifyAuth, requireRole } from '../../../lib/auth-middleware';
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
            return await updateVendor(req, res, vendorId, user);
        } else if (req.method === 'DELETE') {
            if (!await requireRole(user, ['admin', 'super_admin'])) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Admin access required' }
                });
            }
            return await deleteVendor(req, res, vendorId, user);
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

async function getVendor(_req, res, vendorId) {
    const vendorDoc = await db.collection('vendors').doc(vendorId).get();

    if (!vendorDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Vendor not found' }
        });
    }

    const vendorData = { id: vendorDoc.id, ...vendorDoc.data(), warehouses: [] };

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

async function updateVendor(req, res, vendorId, user) {
    const vendorDoc = await db.collection('vendors').doc(vendorId).get();
    if (!vendorDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Vendor not found' }
        });
    }

    const beforeState = vendorDoc.data();
    const updateData = { ...req.body, updatedAt: new Date(), updatedBy: user.uid };
    delete updateData.vendorId;
    delete updateData.createdAt;

    await db.collection('vendors').doc(vendorId).update(updateData);

    // Create audit log
    await logAction(
        'UPDATE',
        user.uid,
        'VENDOR',
        vendorId,
        { before: { isActive: beforeState.isActive }, after: { isActive: updateData.isActive ?? beforeState.isActive } },
        {
            ipAddress: getIpAddress(req),
            userAgent: getUserAgent(req),
            userRole: user.role,
            extra: { vendorName: beforeState.vendorName }
        }
    );

    // Update metrics if isActive changed
    if (updateData.isActive !== undefined && updateData.isActive !== beforeState.isActive) {
        if (updateData.isActive) {
            await incrementMetric('activeVendors', 1);
        } else {
            await incrementMetric('activeVendors', -1);
        }
    }

    return res.status(200).json({
        success: true,
        message: 'Vendor updated successfully'
    });
}

async function deleteVendor(req, res, vendorId, user) {
    const vendorDoc = await db.collection('vendors').doc(vendorId).get();
    if (!vendorDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Vendor not found' }
        });
    }

    const vendorData = vendorDoc.data();

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

    // Create audit log
    await logAction(
        'DELETE',
        user.uid,
        'VENDOR',
        vendorId,
        { before: vendorData },
        {
            ipAddress: getIpAddress(req),
            userAgent: getUserAgent(req),
            userRole: user.role,
            extra: { vendorName: vendorData.vendorName, warehousesDeleted: warehousesSnapshot.size }
        }
    );

    // Update metrics
    await incrementMetric('totalVendors', -1);
    if (vendorData.isActive) {
        await incrementMetric('activeVendors', -1);
    }

    return res.status(200).json({
        success: true,
        message: 'Vendor deleted successfully'
    });
}
