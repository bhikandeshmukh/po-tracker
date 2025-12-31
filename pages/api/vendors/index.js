// pages/api/vendors/index.js
// Get all vendors and create new vendor

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
    const { isActive, search, limit = 10, lastDocId } = req.query;

    const limitNum = Math.min(parseInt(limit, 10) || 10, 100);
    let query = db.collection('vendors').orderBy('vendorName', 'asc');

    if (isActive !== undefined) {
        query = query.where('isActive', '==', isActive === 'true');
    }

    // Cursor-based pagination
    if (lastDocId) {
        const lastDoc = await db.collection('vendors').doc(lastDocId).get();
        if (lastDoc.exists) {
            query = query.startAfter(lastDoc);
        }
    }

    query = query.limit(limitNum + 1);
    const snapshot = await query.get();

    const hasMore = snapshot.docs.length > limitNum;
    const docs = hasMore ? snapshot.docs.slice(0, limitNum) : snapshot.docs;

    let vendors = docs.map(doc => ({
        id: doc.id,
        vendorId: doc.id,
        ...doc.data()
    }));

    // Apply search filter in memory (prefix search doesn't work well with other filters)
    if (search) {
        const searchLower = search.toLowerCase();
        vendors = vendors.filter(v => 
            v.vendorName?.toLowerCase().includes(searchLower)
        );
    }

    const nextCursor = hasMore && vendors.length > 0
        ? vendors[vendors.length - 1].id
        : null;

    return res.status(200).json({
        success: true,
        data: vendors,
        pagination: {
            limit: limitNum,
            hasMore,
            nextCursor,
            count: vendors.length
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

    // Create audit log
    await logAction(
        'CREATE',
        user.uid,
        'VENDOR',
        vendorId,
        { after: vendorData },
        {
            ipAddress: getIpAddress(req),
            userAgent: getUserAgent(req),
            userRole: user.role
        }
    );

    // Create recent activity
    const activityId = `VENDOR_CREATED_${vendorId}`;
    await db.collection('recentActivities').doc(activityId).set({
        activityId,
        type: 'VENDOR_CREATED',
        title: 'Vendor Created',
        description: `${vendorName} registered as vendor`,
        entityType: 'VENDOR',
        entityId: vendorId,
        entityNumber: vendorData.vendorCode,
        userId: user.uid,
        userName: user.name || user.email,
        metadata: {
            vendorName,
            contactPerson
        },
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    });

    // Update metrics
    await incrementMetric('totalVendors', 1);
    await incrementMetric('activeVendors', 1);

    return res.status(201).json({
        success: true,
        data: { vendorId, message: 'Vendor created successfully' }
    });
}
