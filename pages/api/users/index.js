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
    const { role, isActive, limit = 10, lastDocId } = req.query;

    const limitNum = Math.min(parseInt(limit, 10) || 10, 100);
    let query = db.collection('users').orderBy('createdAt', 'desc');

    if (role) query = query.where('role', '==', role);

    // Cursor-based pagination
    if (lastDocId) {
        const lastDoc = await db.collection('users').doc(lastDocId).get();
        if (lastDoc.exists) {
            query = query.startAfter(lastDoc);
        }
    }

    query = query.limit(limitNum + 1);
    const snapshot = await query.get();

    const hasMore = snapshot.docs.length > limitNum;
    const docs = hasMore ? snapshot.docs.slice(0, limitNum) : snapshot.docs;

    let users = docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
        };
    });

    // Apply isActive filter in memory
    if (isActive !== undefined) {
        users = users.filter(u => u.isActive === (isActive === 'true'));
    }

    const nextCursor = hasMore && users.length > 0
        ? users[users.length - 1].id
        : null;

    return res.status(200).json({
        success: true,
        data: users,
        pagination: {
            limit: limitNum,
            hasMore,
            nextCursor,
            count: users.length
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
