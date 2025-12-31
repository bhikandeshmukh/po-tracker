// pages/api/auth/register.js
// Register API using Firebase Email Authentication
// Updated: Force redeploy

import { auth, db } from '../../../lib/firebase-admin';
import { validateData, registerSchema } from '../../../lib/validators';
import logger from '../../../lib/logger';
import { applyRateLimit, authLimiter } from '../../../lib/rate-limiter';
import { logAction, getIpAddress, getUserAgent } from '../../../lib/audit-logger';

export default async function handler(req, res) {
    const startTime = Date.now();

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).end();
    }

    // Apply rate limiting
    try {
        await applyRateLimit(authLimiter)(req, res);
    } catch (error) {
        logger.warn('Rate limit exceeded for registration', { ip: req.headers['x-forwarded-for'] });
        return;
    }

    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST', 'OPTIONS']);
        return res.status(405).json({
            success: false,
            error: {
                code: 'METHOD_NOT_ALLOWED',
                message: `Method ${req.method} not allowed. Use POST.`
            }
        });
    }

    logger.logRequest(req);

    // Validate input data
    const validation = validateData(registerSchema, req.body);
    if (!validation.success) {
        logger.warn('Registration validation failed', validation.error);
        return res.status(400).json(validation.error);
    }

    const {
        email,
        password,
        firstName,
        lastName,
        phone,
        role
    } = validation.data;

    try {
        // Create user ID (firstname+lastname in lowercase)
        const userId = `${firstName}${lastName}`.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Check if user ID already exists
        const existingUser = await db.collection('users').doc(userId).get();
        if (existingUser.exists) {
            return res.status(409).json({
                success: false,
                error: {
                    code: 'USER_EXISTS',
                    message: 'User with this name already exists. Please use a different name.'
                }
            });
        }

        // NEW: Check for existing Super Admin if registering as one
        if (role === 'super_admin') {
            const superAdminQuery = await db.collection('users').where('role', '==', 'super_admin').limit(1).get();
            if (!superAdminQuery.empty) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'SUPER_ADMIN_EXISTS',
                        message: 'Only one Super Admin is allowed in the system.'
                    }
                });
            }
        }

        // Create Firebase Auth user
        const userRecord = await auth.createUser({
            uid: userId,
            email: email,
            password: password,
            displayName: `${firstName} ${lastName}`,
            emailVerified: false
        });

        // Set role permissions based on role
        const permissions = {
            canCreatePO: role !== 'user',
            canApprovePO: ['admin', 'super_admin', 'manager'].includes(role),
            canManageVendors: ['admin', 'super_admin', 'manager'].includes(role),
            canManageReturns: ['admin', 'super_admin', 'manager'].includes(role),
            canViewReports: true,
            canManageUsers: ['admin', 'super_admin'].includes(role)
        };

        // Create user document in Firestore
        const userData = {
            userId: userId,
            email: email,
            firstName: firstName,
            lastName: lastName,
            name: `${firstName} ${lastName}`,
            phone: phone,
            role: role,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'system',
            profileImage: '',
            permissions: permissions,
            metadata: {
                lastLogin: null,
                loginCount: 0
            }
        };

        await db.collection('users').doc(userId).set(userData);

        // Create recent activity
        await db.collection('recentActivities').doc(`USER_CREATED_${userId}`).set({
            activityId: `USER_CREATED_${userId}`,
            type: 'USER_CREATED',
            title: 'New User Registered',
            description: `${userData.name} registered as ${role}`,
            entityType: 'User',
            entityId: userId,
            userId: userId,
            userName: userData.name,
            timestamp: new Date(),
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        });

        // Log the user creation action
        await logAction(
            'CREATE',
            userId, // The newly created user
            'USER',
            userId,
            { before: null, after: userData },
            {
                ipAddress: getIpAddress(req),
                userAgent: getUserAgent(req),
                extra: { createdBy: 'self-registration' }
            }
        );

        const duration = Date.now() - startTime;
        logger.info('User registered successfully', { userId, email, role, duration });
        logger.logResponse(req, res, duration);

        return res.status(201).json({
            success: true,
            data: {
                userId: userId,
                email: email,
                name: userData.name,
                role: role,
                message: 'User registered successfully'
            }
        });

    } catch (error) {
        logger.error('Registration error', { error: error.message, stack: error.stack });

        // Handle specific Firebase errors
        if (error.code === 'auth/email-already-exists') {
            return res.status(409).json({
                success: false,
                error: {
                    code: 'EMAIL_EXISTS',
                    message: 'Email already registered'
                }
            });
        }

        if (error.code === 'auth/invalid-email') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_EMAIL',
                    message: 'Invalid email format'
                }
            });
        }

        if (error.code === 'auth/weak-password') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'WEAK_PASSWORD',
                    message: 'Password is too weak'
                }
            });
        }

        return res.status(500).json({
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: error.message || 'Registration failed'
            }
        });
    }
}
