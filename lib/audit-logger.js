// lib/audit-logger.js
// Centralized Audit Logging Service

import { db } from './firebase-admin';

/**
 * Log an action to the audit logs
 * @param {string} action - Action type: CREATE, UPDATE, DELETE, LOGIN, LOGOUT
 * @param {string} userId - User ID who performed the action
 * @param {string} resourceType - Type of resource: PO, SHIPMENT, USER, VENDOR, etc.
 * @param {string} resourceId - ID of the resource
 * @param {object} changes - Object containing before and after states
 * @param {object} metadata - Additional metadata (IP, User Agent, etc.)
 */
export async function logAction(
    action,
    userId,
    resourceType,
    resourceId,
    changes = {},
    metadata = {}
) {
    try {
        // Get user details
        let userName = 'Unknown';
        let userEmail = 'unknown@example.com';

        if (userId) {
            try {
                const userDoc = await db.collection('users').doc(userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    userName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
                    userEmail = userData.email || 'unknown@example.com';
                }
            } catch (error) {
                console.error('Error fetching user details for audit log:', error);
            }
        }

        // Create audit log entry
        const logEntry = {
            timestamp: new Date(),
            userId: userId || 'system',
            userName,
            userEmail,
            action,
            resourceType,
            resourceId: resourceId || 'N/A',
            changes: {
                before: changes.before || null,
                after: changes.after || null
            },
            ipAddress: metadata.ipAddress || 'unknown',
            userAgent: metadata.userAgent || 'unknown',
            metadata: metadata.extra || {}
        };

        // Save to Firestore
        await db.collection('audit_logs').add(logEntry);

        console.log(`Audit log created: ${action} on ${resourceType}/${resourceId} by ${userName}`);
    } catch (error) {
        // Don't fail the main operation if logging fails
        console.error('Error creating audit log:', error);
    }
}

/**
 * Get audit logs with filtering and pagination
 * @param {object} filters - Filter options
 * @returns {Promise<object>} Logs and metadata
 */
export async function getAuditLogs(filters = {}) {
    try {
        let query = db.collection('audit_logs');

        // Apply filters
        if (filters.userId) {
            query = query.where('userId', '==', filters.userId);
        }

        if (filters.action) {
            query = query.where('action', '==', filters.action);
        }

        if (filters.resourceType) {
            query = query.where('resourceType', '==', filters.resourceType);
        }

        if (filters.resourceId) {
            query = query.where('resourceId', '==', filters.resourceId);
        }

        // Date range filtering
        if (filters.startDate) {
            query = query.where('timestamp', '>=', new Date(filters.startDate));
        }

        if (filters.endDate) {
            query = query.where('timestamp', '<=', new Date(filters.endDate));
        }

        // Order by timestamp (newest first)
        query = query.orderBy('timestamp', 'desc');

        // Pagination
        const limit = filters.limit || 50;
        query = query.limit(limit);

        if (filters.startAfter) {
            const startAfterDoc = await db.collection('audit_logs').doc(filters.startAfter).get();
            if (startAfterDoc.exists) {
                query = query.startAfter(startAfterDoc);
            }
        }

        // Execute query
        const snapshot = await query.get();

        const logs = [];
        snapshot.forEach(doc => {
            logs.push({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp
            });
        });

        return {
            success: true,
            data: logs,
            count: logs.length,
            hasMore: logs.length === limit
        };
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return {
            success: false,
            error: error.message,
            data: []
        };
    }
}

/**
 * Get statistics about audit logs
 * @returns {Promise<object>} Statistics
 */
export async function getAuditStats() {
    try {
        const snapshot = await db.collection('audit_logs').get();
        const logs = snapshot.docs.map(doc => doc.data());

        const stats = {
            totalLogs: logs.length,
            actionBreakdown: {},
            resourceBreakdown: {},
            topUsers: {}
        };

        logs.forEach(log => {
            // Action breakdown
            stats.actionBreakdown[log.action] = (stats.actionBreakdown[log.action] || 0) + 1;

            // Resource breakdown
            stats.resourceBreakdown[log.resourceType] = (stats.resourceBreakdown[log.resourceType] || 0) + 1;

            // Top users
            stats.topUsers[log.userName] = (stats.topUsers[log.userName] || 0) + 1;
        });

        return {
            success: true,
            data: stats
        };
    } catch (error) {
        console.error('Error fetching audit stats:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Helper to extract IP address from request
 * @param {object} req - HTTP request object
 * @returns {string} IP address
 */
export function getIpAddress(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
        req.headers['x-real-ip'] ||
        req.connection?.remoteAddress ||
        'unknown';
}

/**
 * Helper to get user agent from request
 * @param {object} req - HTTP request object
 * @returns {string} User agent
 */
export function getUserAgent(req) {
    return req.headers['user-agent'] || 'unknown';
}
