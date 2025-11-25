// pages/api/vendors/index.js
// Get all vendors and create new vendor

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

        if (req.method === 'GET') {
            return await getVendors(req, res);
        } else if (req.method === 'POST') {
            if (!await requireRole(user, ['manager', 'admin', 'super_admin'])) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Manager access required' }
                });
            }
            return await createVendor(req, res, user);
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

async function getVendors(req, res) {
    const { isActive, search, limit = 10, page = 1 } = req.query;

    let query = db.collection('vendors');

    if (isActive !== undefined) {
        query = query.where('isActive', '==', isActive === 'true');
    }

    if (search) {
        query = query.where('vendorName', '>=', search)
            .where('vendorName', '<=', search + '\uf8ff');
    }

    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    query = query.limit(limitNum).offset(skip);
    const snapshot = await query.get();

    const vendors = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    return res.status(200).json({
        success: true,
        data: vendors,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
        }
    });
}

async function createVendor(req, res, user) {
    const { vendorName, contactPerson, email, phone, address, gstNumber, panNumber, paymentTerms } = req.body;

    if (!vendorName || !contactPerson || !email || !phone) {
        return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' }
        });
    }

    const vendorId = vendorName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const existingVendor = await db.collection('vendors').doc(vendorId).get();
    if (existingVendor.exists) {
        return res.status(409).json({
            success: false,
            error: { code: 'VENDOR_EXISTS', message: 'Vendor already exists' }
        });
    }

    const vendorData = {
        vendorId,
        vendorCode: `VEN-${Date.now().toString().slice(-6)}`,
        vendorName,
        contactPerson,
        email,
        phone,
        address: address || {},
        gstNumber: gstNumber || '',
        panNumber: panNumber || '',
        isActive: true,
        paymentTerms: paymentTerms || '30 days',
        rating: 0,
        totalOrders: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user.uid
    };

    await db.collection('vendors').doc(vendorId).set(vendorData);

    return res.status(201).json({
        success: true,
        data: { vendorId, message: 'Vendor created successfully' }
    });
}
