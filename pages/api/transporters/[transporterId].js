// pages/api/transporters/[transporterId].js
// Get, update, delete specific transporter

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

        const { transporterId } = req.query;

        if (req.method === 'GET') {
            return await getTransporter(req, res, transporterId);
        } else if (req.method === 'PUT') {
            if (!await requireRole(user, ['manager', 'admin', 'super_admin'])) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Manager access required' }
                });
            }
            return await updateTransporter(req, res, transporterId);
        } else if (req.method === 'DELETE') {
            if (!await requireRole(user, ['admin', 'super_admin'])) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Admin access required' }
                });
            }
            return await deleteTransporter(req, res, transporterId);
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

async function getTransporter(req, res, transporterId) {
    const transporterDoc = await db.collection('transporters').doc(transporterId).get();

    if (!transporterDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Transporter not found' }
        });
    }

    return res.status(200).json({
        success: true,
        data: { id: transporterDoc.id, ...transporterDoc.data() }
    });
}

async function updateTransporter(req, res, transporterId) {
    const transporterDoc = await db.collection('transporters').doc(transporterId).get();
    if (!transporterDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Transporter not found' }
        });
    }

    const updateData = { ...req.body, updatedAt: new Date() };
    delete updateData.transporterId;
    delete updateData.createdAt;

    await db.collection('transporters').doc(transporterId).update(updateData);

    return res.status(200).json({
        success: true,
        message: 'Transporter updated successfully'
    });
}

async function deleteTransporter(req, res, transporterId) {
    const transporterDoc = await db.collection('transporters').doc(transporterId).get();
    if (!transporterDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Transporter not found' }
        });
    }

    await db.collection('transporters').doc(transporterId).delete();

    return res.status(200).json({
        success: true,
        message: 'Transporter deleted successfully'
    });
}
