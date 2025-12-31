// lib/audit-logger.js
// Centralized Audit Logging Service
// 
// SCHEMA STANDARD (matches API routes):
// - entityType (not resourceType)
// - entityId (not resourceId)  
// - action (uppercase: CREATE, UPDATE, DELETE, LOGIN, LOGOUT)
// - userId, userName, userEmail, userRole
// - timestamp
// - changes (before/after states)
// - ipAddress, userAgent
// - metadata (extra info)

import { db } from './firebase-admin';

/**
 * Log an action to the audit logs
 * @param {string} action - Action type: CREATE, UPDATE, DELETE, LOGIN, LOGOUT
 * @param {string} userId - User ID who performed the action
 * @param {string} entityType - Type of entity: PO, SHIPMENT, USER, VENDOR, TRANSPORTER, APPOINTMENT, RETURN
 * @param {string} entityId - ID of the entity
 * @param {object} changes - Object containing before and after states
 * @param {object} metadata - Additional metadata (IP, User Agent, userRole, etc.)
 */
export async function logAction(
    action,
    userId,
    entityType,
    entityId,
    changes = {},
    metadata = {}
) {
    try {
        // Get user details
        let userName = 'Unknown';
        let userEmail = 'unknown@example.com';
        let userRole = metadata.userRole || 'unknown';

        if (userId && userId !== 'system') {
            try {
                const userDoc = await db.collection('users').doc(userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    userName = userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown';
                    userEmail = userData.email || 'unknown@example.com';
                    userRole = userData.role || userRole;
                }
            } catch (error) {
                console.error('Error fetching user details for audit log:', error);
            }
        }

        // Generate unique log ID
        const logId = `${entityType}_${action}_${entityId}_${Date.now()}`;

        // Create audit log entry with STANDARD SCHEMA
        const logEntry = {
            logId,
            timestamp: new Date(),
            // User info
            userId: userId || 'system',
            userName,
            userEmail,
            userRole,
            // Action info
            action: action.toUpperCase(),
            entityType: entityType.toUpperCase(),
            entityId: entityId || 'N/A',
            // Changes tracking
            changes: {
                before: changes.before || null,
                after: changes.after || null
            },
            // Request metadata
            ipAddress: metadata.ipAddress || 'unknown',
            userAgent: metadata.userAgent || 'unknown',
            // Extra metadata
            metadata: metadata.extra || {}
        };

        // Save to Firestore
        await db.collection('auditLogs').doc(logId).set(logEntry);

        console.log(`Audit log created: ${action} on ${entityType}/${entityId} by ${userName}`);
        return { success: true, logId };
    } catch (error) {
        // Don't fail the main operation if logging fails
        console.error('Error creating audit log:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get audit logs with filtering and pagination
 * Supports both old (resourceType/resourceId) and new (entityType/entityId) field names
 * @param {object} filters - Filter options
 * @returns {Promise<object>} Logs and metadata
 */
export async function getAuditLogs(filters = {}) {
    try {
        let query = db.collection('auditLogs');

        // Apply filters - support both old and new field names
        if (filters.userId) {
            query = query.where('userId', '==', filters.userId);
        }

        if (filters.action) {
            query = query.where('action', '==', filters.action.toUpperCase());
        }

        // Support both resourceType and entityType
        if (filters.resourceType || filters.entityType) {
            const type = (filters.resourceType || filters.entityType).toUpperCase();
            query = query.where('entityType', '==', type);
        }

        // Support both resourceId and entityId
        if (filters.resourceId || filters.entityId) {
            query = query.where('entityId', '==', filters.resourceId || filters.entityId);
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
            const startAfterDoc = await db.collection('auditLogs').doc(filters.startAfter).get();
            if (startAfterDoc.exists) {
                query = query.startAfter(startAfterDoc);
            }
        }

        // Execute query
        const snapshot = await query.get();

        const logs = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            logs.push({
                id: doc.id,
                ...data,
                // Normalize timestamp
                timestamp: data.timestamp?.toDate?.() || data.timestamp,
                // Provide backward compatible field names for UI
                resourceType: data.entityType,
                resourceId: data.entityId
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
        // Use a more efficient approach - limit to recent logs for stats
        const snapshot = await db.collection('auditLogs')
            .orderBy('timestamp', 'desc')
            .limit(1000)
            .get();
            
        const logs = snapshot.docs.map(doc => doc.data());

        const stats = {
            totalLogs: logs.length,
            actionBreakdown: {},
            resourceBreakdown: {},
            topUsers: {}
        };

        logs.forEach(log => {
            // Action breakdown
            const action = log.action || 'UNKNOWN';
            stats.actionBreakdown[action] = (stats.actionBreakdown[action] || 0) + 1;

            // Resource breakdown - support both field names
            const resourceType = log.entityType || log.resourceType || 'UNKNOWN';
            stats.resourceBreakdown[resourceType] = (stats.resourceBreakdown[resourceType] || 0) + 1;

            // Top users
            const userName = log.userName || 'Unknown';
            stats.topUsers[userName] = (stats.topUsers[userName] || 0) + 1;
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
    return req.headers?.['x-forwarded-for']?.split(',')[0] ||
        req.headers?.['x-real-ip'] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        'unknown';
}

/**
 * Helper to get user agent from request
 * @param {object} req - HTTP request object
 * @returns {string} User agent
 */
export function getUserAgent(req) {
    return req.headers?.['user-agent'] || 'unknown';
}
