// pages/api/vendors/[vendorId]/warehouses.js
// Get all warehouses or add new warehouse for a vendor

import { db } from '../../../../lib/firebase-admin';
import { verifyAuth, requireRole } from '../../../../lib/auth-middleware';

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
            return await getWarehouses(req, res, vendorId);
        } else if (req.method === 'POST') {
            if (!await requireRole(user, ['manager', 'admin', 'super_admin'])) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Manager access required' }
                });
            }
            return await addWarehouse(req, res, vendorId, user);
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

async function getWarehouses(req, res, vendorId) {
    // Verify vendor exists
    const vendorDoc = await db.collection('vendors').doc(vendorId).get();
    if (!vendorDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Vendor not found' }
        });
    }

    // Get warehouses
    const warehousesSnapshot = await db.collection('vendors')
        .doc(vendorId)
        .collection('warehouses')
        .get();

    const warehouses = warehousesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            warehouseId: data.warehouseId || doc.id, // Use warehouseId from data or fallback to doc.id
            warehouseName: data.warehouseName || data.name,
            ...data
        };
    });

    return res.status(200).json({
        success: true,
        data: warehouses
    });
}

async function addWarehouse(req, res, vendorId, user) {
    // Verify vendor exists
    const vendorDoc = await db.collection('vendors').doc(vendorId).get();
    if (!vendorDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Vendor not found' }
        });
    }

    // Generate warehouse ID from name or use auto-generated
    const warehouseName = req.body.name || req.body.warehouseName;
    const warehouseId = req.body.warehouseId || 
                       warehouseName?.toLowerCase().replace(/\s+/g, '_').substring(0, 30) || 
                       `warehouse_${Date.now()}`;

    // Check if warehouse ID already exists
    const existingWarehouse = await db.collection('vendors')
        .doc(vendorId)
        .collection('warehouses')
        .doc(warehouseId)
        .get();

    if (existingWarehouse.exists) {
        return res.status(409).json({
            success: false,
            error: { 
                code: 'DUPLICATE_ERROR', 
                message: 'Warehouse with this ID already exists',
                details: { warehouseId }
            }
        });
    }

    const warehouseData = {
        warehouseId: warehouseId,
        warehouseName: warehouseName,
        name: warehouseName, // Keep both for compatibility
        ...req.body,
        vendorId: vendorId,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user.uid
    };

    // Use set() with specific ID instead of add()
    await db.collection('vendors')
        .doc(vendorId)
        .collection('warehouses')
        .doc(warehouseId)
        .set(warehouseData);

    return res.status(201).json({
        success: true,
        data: {
            id: warehouseId,
            warehouseId: warehouseId,
            ...warehouseData
        },
        message: 'Warehouse added successfully'
    });
}
