// pages/api/search.js
// Global search API - Scalable implementation

import { db } from '../../lib/firebase-admin';
import { verifyAuth } from '../../lib/auth-middleware';
import { search, searchFallback } from '../../lib/search-service';

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

        const { q, types, limit = 20, offset = 0, useIndex = 'auto' } = req.query;

        if (!q || q.length < 2) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_QUERY', message: 'Search query must be at least 2 characters' }
            });
        }

        // Parse entity types filter
        const entityTypes = types ? types.split(',') : undefined;
        const limitNum = Math.min(parseInt(limit, 10) || 20, 50);
        const offsetNum = parseInt(offset, 10) || 0;

        let searchResult;

        // Try indexed search first, fall back to direct search
        if (useIndex === 'true' || useIndex === 'auto') {
            try {
                // Check if search index exists
                const indexCheck = await db.collection('searchIndex').limit(1).get();
                
                if (!indexCheck.empty) {
                    searchResult = await search(q, {
                        entityTypes,
                        limit: limitNum,
                        offset: offsetNum
                    });
                } else {
                    // Index not populated, use fallback
                    searchResult = await searchFallback(q, {
                        entityTypes,
                        limit: limitNum
                    });
                }
            } catch (indexError) {
                console.warn('Index search failed, using fallback:', indexError.message);
                searchResult = await searchFallback(q, {
                    entityTypes,
                    limit: limitNum
                });
            }
        } else {
            // Explicitly use fallback
            searchResult = await searchFallback(q, {
                entityTypes,
                limit: limitNum
            });
        }

        return res.status(200).json({
            success: true,
            data: searchResult.results,
            total: searchResult.total,
            hasMore: searchResult.hasMore,
            pagination: {
                limit: limitNum,
                offset: offsetNum
            }
        });
    } catch (error) {
        console.error('Search API Error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message }
        });
    }
}
