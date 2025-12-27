// pages/api/users/[userId].js
// Get, update, delete specific user

import { db, auth } from '../../../lib/firebase-admin';
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

        const { userId } = req.query;

        if (req.method === 'GET') {
            return await getUser(req, res, userId);
        } else if (req.method === 'PUT') {
            return await updateUser(req, res, user, userId);
        } else if (req.method === 'DELETE') {
            const hasPermission = await requireRole(user, ['super_admin']);

            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Super admin access required' }
                });
            }
            return await deleteUser(req, res, userId);
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

async function getUser(req, res, userId) {
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'User not found' }
        });
    }

    return res.status(200).json({
        success: true,
        data: { id: userDoc.id, ...userDoc.data() }
    });
}

async function updateUser(req, res, user, userId) {
    // Only admin or self can update
    if (user.uid !== userId && !await requireRole(user, ['admin', 'super_admin'])) {
        return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Access denied' }
        });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'User not found' }
        });
    }

    const updateData = { ...req.body, updatedAt: new Date() };

    // NEW: Check for single Super Admin restriction on update
    if (updateData.role === 'super_admin' && userDoc.data().role !== 'super_admin') {
        const superAdminQuery = await db.collection('users').where('role', '==', 'super_admin').limit(1).get();
        if (!superAdminQuery.empty) {
            return res.status(400).json({
                success: false,
                error: { code: 'BAD_REQUEST', message: 'Only one Super Admin is allowed in the system.' }
            });
        }
    }

    delete updateData.userId;
    delete updateData.createdAt;
    delete updateData.createdBy;

    await db.collection('users').doc(userId).update(updateData);

    return res.status(200).json({
        success: true,
        message: 'User updated successfully'
    });
}

async function deleteUser(req, res, userId) {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'User not found' }
        });
    }

    // NEW: Prevent Super Admin deletion
    if (userDoc.data().role === 'super_admin') {
        return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Super admin users cannot be deleted' }
        });
    }

    // Delete from Firebase Auth (if exists)
    try {
        await auth.deleteUser(userId);
    } catch (error) {
        // User might not exist in Firebase Auth, that's okay
        if (error.code !== 'auth/user-not-found') {
            console.error('Error deleting auth user:', error.message);
        }
    }

    // Delete from Firestore
    await db.collection('users').doc(userId).delete();

    return res.status(200).json({
        success: true,
        message: 'User deleted successfully'
    });
}
