import { verifyAuth } from '../../../lib/auth-middleware';
import { getStoredMetrics, recomputeAllMetrics } from '../../../lib/metrics-service';

export default async function handler(req, res) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            });
        }

        if (req.method !== 'GET') {
            return res.status(405).json({
                success: false,
                error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }
            });
        }

        // Set cache control headers to prevent caching
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        const forceRefresh = req.query.refresh === 'true';
        let metrics;

        if (forceRefresh) {
            console.log('Forced refresh: Recomputing all metrics...');
            metrics = await recomputeAllMetrics();
        } else {
            metrics = await getStoredMetrics();
            if (!metrics) {
                console.log('No stored metrics found: Recomputing...');
                metrics = await recomputeAllMetrics();
            }
        }

        return res.status(200).json({
            success: true,
            data: {
                ...metrics,
                lastUpdated: metrics.lastUpdated?.toDate?.() || metrics.lastUpdated || new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message }
        });
    }
}
