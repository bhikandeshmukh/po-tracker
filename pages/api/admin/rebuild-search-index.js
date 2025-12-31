// pages/api/admin/rebuild-search-index.js
// Admin endpoint to rebuild search index

import { verifyAuth, requireRole } from '../../../lib/auth-middleware';
import { rebuildSearchIndex } from '../../../lib/search-service';

export default async function handler(req, res) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            });
        }

        if (!await requireRole(user, ['admin', 'super_admin'])) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Admin access required' }
            });
        }

        if (req.method !== 'POST') {
            return res.status(405).json({
                success: false,
                error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }
            });
        }

        const { entityTypes } = req.body;

        console.log('Starting search index rebuild...');
        const stats = await rebuildSearchIndex(entityTypes);
        console.log('Search index rebuild complete:', stats);

        return res.status(200).json({
            success: true,
            data: {
                message: 'Search index rebuilt successfully',
                ...stats
            }
        });
    } catch (error) {
        console.error('Rebuild search index error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message }
        });
    }
}
