// pages/api/transporters/index.js
// Get all transporters and create new transporter

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
            return await getTransporters(req, res);
        } else if (req.method === 'POST') {
            if (!await requireRole(user, ['manager', 'admin', 'super_admin'])) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Manager access required' }
                });
            }
            return await createTransporter(req, res, user);
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

async function getTransporters(req, res) {
    const { isActive, limit = 10, page = 1 } = req.query;

    let query = db.collection('transporters');

    if (isActive !== undefined) {
        query = query.where('isActive', '==', isActive === 'true');
    }

    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    query = query.limit(limitNum).offset(skip);
    const snapshot = await query.get();

    const transporters = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    return res.status(200).json({
        success: true,
        data: transporters,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
        }
    });
}

async function createTransporter(req, res, user) {
    const { transporterName, contactPerson, email, phone, address, gstNumber, vehicleTypes } = req.body;

    if (!transporterName || !contactPerson || !email || !phone) {
        return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' }
        });
    }

    const transporterId = transporterName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const existingTransporter = await db.collection('transporters').doc(transporterId).get();
    if (existingTransporter.exists) {
        return res.status(409).json({
            success: false,
            error: { code: 'TRANSPORTER_EXISTS', message: 'Transporter already exists' }
        });
    }

    const transporterData = {
        transporterId,
        transporterCode: `TRN-${Date.now().toString().slice(-6)}`,
        transporterName,
        contactPerson,
        email,
        phone,
        address: address || {},
        gstNumber: gstNumber || '',
        vehicleTypes: vehicleTypes || [],
        isActive: true,
        rating: 0,
        totalShipments: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user.uid
    };

    await db.collection('transporters').doc(transporterId).set(transporterData);

    // Create audit log using centralized logger
    await logAction(
        'CREATE',
        user.uid,
        'TRANSPORTER',
        transporterId,
        { after: transporterData },
        {
            ipAddress: getIpAddress(req),
            userAgent: getUserAgent(req),
            userRole: user.role
        }
    );

    // Create recent activity
    const activityId = `TRANSPORTER_CREATED_${transporterId}`;
    await db.collection('recentActivities').doc(activityId).set({
        activityId: activityId,
        type: 'TRANSPORTER_CREATED',
        title: 'Transporter Created',
        description: `${transporterName} registered as transporter`,
        entityType: 'TRANSPORTER',
        entityId: transporterId,
        entityNumber: transporterData.transporterCode,
        userId: user.uid,
        userName: user.name || user.email,
        metadata: {
            transporterName: transporterName,
            contactPerson: contactPerson
        },
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    });

    // Update metrics
    await incrementMetric('totalTransporters', 1);

    return res.status(201).json({
        success: true,
        data: { transporterId, message: 'Transporter created successfully' }
    });
}
