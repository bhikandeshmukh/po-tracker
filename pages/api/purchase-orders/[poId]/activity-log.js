// pages/api/purchase-orders/[poId]/activity-log.js
// Get PO activity log
// FIXED: Use subcollection with pagination (no array growth issue)

import { db } from '../../../../lib/firebase-admin';
import { verifyAuth } from '../../../../lib/auth-middleware';
import { getPOActivities } from '../../../../lib/po-helpers';

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

        const { poId } = req.query;
        const { limit = 50, lastActivityId } = req.query;

        // Check if PO exists
        const poDoc = await db.collection('purchaseOrders').doc(poId).get();
        if (!poDoc.exists) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Purchase order not found' }
            });
        }

        // Get activity log metadata
        const activityLogDoc = await db.collection('poActivityLogs').doc(poId).get();
        
        if (!activityLogDoc.exists) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Activity log not found' }
            });
        }

        // FIXED: Get activities from subcollection with pagination
        const result = await getPOActivities(
            poId, 
            parseInt(limit) || 50, 
            lastActivityId
        );

        return res.status(200).json({
            success: true,
            data: {
                poId: poId,
                poNumber: activityLogDoc.data().poNumber,
                createdAt: activityLogDoc.data().createdAt?.toDate?.()?.toISOString() || activityLogDoc.data().createdAt,
                lastUpdated: activityLogDoc.data().lastUpdated?.toDate?.()?.toISOString() || activityLogDoc.data().lastUpdated,
                activities: result.activities,
                pagination: {
                    hasMore: result.hasMore,
                    nextCursor: result.lastActivityId,
                    count: result.activities.length
                }
            }
        });

    } catch (error) {
        console.error('Get Activity Log Error:', {
            message: error.message,
            poId: req.query.poId,
            user: user?.uid
        });
        
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: 'Internal server error' }
        });
    }
}
