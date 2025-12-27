// pages/api/audit-logs/index.js
// API route for audit logs

import { verifyAuth } from '../../../lib/auth-middleware';
import { getAuditLogs, getAuditStats } from '../../../lib/audit-logger';

export default async function handler(req, res) {
    try {
        // Verify authentication
        const user = await verifyAuth(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            });
        }

        // Only allow GET requests
        if (req.method !== 'GET') {
            return res.status(405).json({
                success: false,
                error: { code: 'METHOD_NOT_ALLOWED', message: 'Only GET requests are allowed' }
            });
        }

        // Check if user is admin or super_admin
        if (user.role !== 'admin' && user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Only admins can view audit logs' }
            });
        }

        // Check if stats are requested
        if (req.query.stats === 'true') {
            const stats = await getAuditStats();
            return res.status(200).json(stats);
        }

        // Build filters from query params
        const filters = {
            userId: req.query.userId,
            action: req.query.action,
            resourceType: req.query.resourceType,
            resourceId: req.query.resourceId,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            limit: parseInt(req.query.limit) || 50,
            startAfter: req.query.startAfter
        };

        // Remove undefined values
        Object.keys(filters).forEach(key => {
            if (filters[key] === undefined) {
                delete filters[key];
            }
        });

        const result = await getAuditLogs(filters);
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error in audit logs API:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message }
        });
    }
}
