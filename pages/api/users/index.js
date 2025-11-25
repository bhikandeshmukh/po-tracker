// pages/api/users/index.js
// Get all users and create new user

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
            return await getUsers(req, res, user);
        } else if (req.method === 'POST') {
            if (!await requireRole(user, ['admin', 'super_admin'])) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Admin access required' }
                });
            }
            return await createUser(req, res, user);
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

async function getUsers(req, res, user) {
    const { role, isActive, limit = 10, page = 1 } = req.query;

    let query = db.collection('users');

    if (role) query = query.where('role', '==', role);
    if (isActive !== undefined) query = query.where('isActive', '==', isActive === 'true');

    const totalSnapshot = await query.get();
    const total = totalSnapshot.size;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    query = query.limit(limitNum).offset(skip);
    const snapshot = await query.get();

    const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    return res.status(200).json({
        success: true,
        data: users,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
            hasNextPage: skip + limitNum < total,
            hasPreviousPage: pageNum > 1
        }
    });
}

async function createUser(req, res, user) {
    const { email, password, firstName, lastName, phone, role } = req.body;

    if (!email || !password || !firstName || !lastName || !phone) {
        return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' }
        });
    }

    const userId = `${firstName}${lastName}`.toLowerCase().replace(/[^a-z0-9]/g, '');

    const existingUser = await db.collection('users').doc(userId).get();
    if (existingUser.exists) {
        return res.status(409).json({
            success: false,
            error: { code: 'USER_EXISTS', message: 'User already exists' }
        });
    }

    await db.collection('users').doc(userId).set({
        userId,
        email,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        phone,
        role: role || 'user',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user.uid,
        permissions: {
            canCreatePO: role !== 'user',
            canApprovePO: ['admin', 'super_admin', 'manager'].includes(role),
            canManageVendors: ['admin', 'super_admin', 'manager'].includes(role),
            canManageReturns: ['admin', 'super_admin', 'manager'].includes(role),
            canViewReports: true,
            canManageUsers: ['admin', 'super_admin'].includes(role)
        },
        metadata: { lastLogin: null, loginCount: 0 }
    });

    return res.status(201).json({
        success: true,
        data: { userId, message: 'User created successfully' }
    });
}
