// pages/api/health.js
// Health check endpoint

import { db } from '../../lib/firebase-admin';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }
        });
    }

    try {
        // Check Firestore connection
        const startTime = Date.now();
        await db.collection('_health_check').limit(1).get();
        const firestoreLatency = Date.now() - startTime;

        return res.status(200).json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            services: {
                firestore: {
                    status: 'connected',
                    latency: `${firestoreLatency}ms`
                },
                api: {
                    status: 'running',
                    version: '1.0.0'
                }
            },
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        return res.status(503).json({
            success: false,
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'Health check failed',
                details: error.message
            }
        });
    }
}
