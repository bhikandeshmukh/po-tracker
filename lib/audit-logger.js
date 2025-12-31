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

        // Parse device info from user agent
        const deviceInfo = parseUserAgent(metadata.userAgent);

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
            // Request metadata - Client info
            ipAddress: metadata.ipAddress || 'unknown',
            userAgent: metadata.userAgent || 'unknown',
            // Device info (parsed from user agent)
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            device: deviceInfo.device,
            // Extra metadata
            metadata: metadata.extra || {}
        };

        // Debug logging (remove in production)
        console.log(`[AUDIT] IP: ${logEntry.ipAddress}, UA: ${logEntry.userAgent?.substring(0, 50)}...`);

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
        const baseCollection = db.collection('auditLogs');
        
        // Build query constraints array
        const constraints = [];

        // Apply filters - support both old and new field names
        if (filters.userId) {
            constraints.push({ field: 'userId', op: '==', value: filters.userId });
        }

        if (filters.action) {
            constraints.push({ field: 'action', op: '==', value: filters.action.toUpperCase() });
        }

        // Support both resourceType and entityType
        if (filters.resourceType || filters.entityType) {
            const type = (filters.resourceType || filters.entityType).toUpperCase();
            constraints.push({ field: 'entityType', op: '==', value: type });
        }

        // Support both resourceId and entityId
        if (filters.resourceId || filters.entityId) {
            constraints.push({ field: 'entityId', op: '==', value: filters.resourceId || filters.entityId });
        }

        // Date range filtering
        if (filters.startDate) {
            constraints.push({ field: 'timestamp', op: '>=', value: new Date(filters.startDate) });
        }

        if (filters.endDate) {
            constraints.push({ field: 'timestamp', op: '<=', value: new Date(filters.endDate) });
        }

        // Build query by chaining constraints
        let query = baseCollection.orderBy('timestamp', 'desc');
        
        for (const c of constraints) {
            query = query.where(c.field, /** @type {FirebaseFirestore.WhereFilterOp} */ (c.op), c.value);
        }

        // Pagination
        const limitNum = filters.limit || 50;
        query = query.limit(limitNum);

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
            hasMore: logs.length === limitNum
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
 * Handles various proxy configurations and local development
 * @param {object} req - HTTP request object
 * @returns {string} IP address
 */
export function getIpAddress(req) {
    if (!req) return 'unknown';
    
    // Try various headers (in order of preference)
    const forwardedFor = req.headers?.['x-forwarded-for'];
    if (forwardedFor) {
        // x-forwarded-for can contain multiple IPs, take the first (client IP)
        return forwardedFor.split(',')[0].trim();
    }
    
    // Cloudflare
    if (req.headers?.['cf-connecting-ip']) {
        return req.headers['cf-connecting-ip'];
    }
    
    // Vercel/Next.js
    if (req.headers?.['x-real-ip']) {
        return req.headers['x-real-ip'];
    }
    
    // AWS/Azure
    if (req.headers?.['x-client-ip']) {
        return req.headers['x-client-ip'];
    }
    
    // Direct connection
    if (req.connection?.remoteAddress) {
        return req.connection.remoteAddress.replace('::ffff:', ''); // Remove IPv6 prefix
    }
    
    if (req.socket?.remoteAddress) {
        return req.socket.remoteAddress.replace('::ffff:', '');
    }
    
    // Next.js specific
    if (req.ip) {
        return req.ip;
    }
    
    return 'unknown';
}

/**
 * Helper to get user agent from request
 * @param {object} req - HTTP request object
 * @returns {string} User agent
 */
export function getUserAgent(req) {
    if (!req) return 'unknown';
    return req.headers?.['user-agent'] || 'unknown';
}

/**
 * Helper to get device/browser info from user agent
 * @param {string} userAgent - User agent string
 * @returns {object} Parsed device info
 */
export function parseUserAgent(userAgent) {
    if (!userAgent || userAgent === 'unknown') {
        return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
    }
    
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Desktop';
    
    // Detect browser
    if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Edg')) browser = 'Edge';
    else if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Opera') || userAgent.includes('OPR')) browser = 'Opera';
    
    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    
    // Detect device type
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) device = 'Mobile';
    else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) device = 'Tablet';
    
    return { browser, os, device };
}

/**
 * Get all client info from request (IP, User Agent, Device Info)
 * @param {object} req - HTTP request object
 * @returns {object} Client info
 */
export function getClientInfo(req) {
    const ipAddress = getIpAddress(req);
    const userAgent = getUserAgent(req);
    const deviceInfo = parseUserAgent(userAgent);
    
    return {
        ipAddress,
        userAgent,
        ...deviceInfo
    };
}
