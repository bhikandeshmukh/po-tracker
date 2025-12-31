// lib/search-service.js
// Scalable search service using search index collection

import { db } from './firebase-admin';

/**
 * Search configuration for each entity type
 */
const SEARCH_CONFIG = {
    purchaseOrder: {
        collection: 'purchaseOrders',
        searchFields: ['poNumber', 'vendorName', 'vendorCode', 'status'],
        displayFields: {
            title: 'poNumber',
            subtitle: (data) => `${data.vendorName || ''} - ${data.status || ''}`,
            link: (data) => `/purchase-orders/${data.poId || data.id}`
        }
    },
    vendor: {
        collection: 'vendors',
        searchFields: ['vendorName', 'vendorCode', 'contactPerson', 'email'],
        displayFields: {
            title: 'vendorName',
            subtitle: (data) => data.vendorCode || data.contactPerson || '',
            link: (data) => `/vendors/${data.vendorId || data.id}`
        }
    },
    appointment: {
        collection: 'appointments',
        searchFields: ['appointmentNumber', 'poNumber', 'vendorName', 'lrDocketNumber'],
        displayFields: {
            title: 'appointmentNumber',
            subtitle: (data) => `PO: ${data.poNumber || ''} - ${data.status || ''}`,
            link: (data) => `/appointments/${data.appointmentId || data.id}`
        }
    },
    shipment: {
        collection: 'shipments',
        searchFields: ['shipmentId', 'poNumber', 'vendorName', 'transporterName', 'lrDocketNumber'],
        displayFields: {
            title: 'shipmentId',
            subtitle: (data) => `PO: ${data.poNumber || ''} - ${data.status || ''}`,
            link: (data) => `/shipments/${data.shipmentId || data.id}`
        }
    },
    transporter: {
        collection: 'transporters',
        searchFields: ['transporterName', 'transporterCode', 'contactPerson', 'email'],
        displayFields: {
            title: 'transporterName',
            subtitle: (data) => data.transporterCode || data.contactPerson || '',
            link: (data) => `/transporters/${data.transporterId || data.id}`
        }
    },
    returnOrder: {
        collection: 'returnOrders',
        searchFields: ['returnNumber', 'poNumber', 'vendorName', 'reason'],
        displayFields: {
            title: 'returnNumber',
            subtitle: (data) => `PO: ${data.poNumber || ''} - ${data.status || ''}`,
            link: (data) => `/returns/${data.returnId || data.id}`
        }
    }
};

/**
 * Generate search tokens from text (for prefix search)
 * Creates tokens for each word and prefixes
 */
function generateSearchTokens(text) {
    if (!text) return [];
    
    const tokens = new Set();
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    
    words.forEach(word => {
        // Add full word
        tokens.add(word);
        
        // Add prefixes (minimum 2 chars)
        for (let i = 2; i <= word.length; i++) {
            tokens.add(word.substring(0, i));
        }
    });
    
    return Array.from(tokens);
}

/**
 * Create/update search index entry for a document
 */
export async function indexDocument(entityType, docId, data) {
    const config = SEARCH_CONFIG[entityType];
    if (!config) {
        console.warn(`Unknown entity type for indexing: ${entityType}`);
        return;
    }

    try {
        // Build searchable text from configured fields
        const searchableText = config.searchFields
            .map(field => data[field])
            .filter(Boolean)
            .join(' ');

        // Generate search tokens
        const searchTokens = generateSearchTokens(searchableText);

        // Create index entry
        const indexEntry = {
            entityType,
            entityId: docId,
            collection: config.collection,
            searchableText: searchableText.toLowerCase(),
            searchTokens,
            // Store display data
            displayData: {
                ...Object.fromEntries(
                    config.searchFields.map(f => [f, data[f] || ''])
                ),
                id: docId,
                poId: data.poId,
                vendorId: data.vendorId,
                appointmentId: data.appointmentId,
                shipmentId: data.shipmentId,
                transporterId: data.transporterId,
                returnId: data.returnId,
                status: data.status
            },
            updatedAt: new Date()
        };

        await db.collection('searchIndex').doc(`${entityType}_${docId}`).set(indexEntry);
    } catch (error) {
        console.error(`Failed to index ${entityType}/${docId}:`, error);
    }
}

/**
 * Remove document from search index
 */
export async function removeFromIndex(entityType, docId) {
    try {
        await db.collection('searchIndex').doc(`${entityType}_${docId}`).delete();
    } catch (error) {
        console.error(`Failed to remove ${entityType}/${docId} from index:`, error);
    }
}

/**
 * Perform scalable search using search index
 */
export async function search(query, options = {}) {
    const {
        entityTypes = Object.keys(SEARCH_CONFIG),
        limit = 20,
        offset = 0
    } = options;

    if (!query || query.length < 2) {
        return { results: [], total: 0 };
    }

    const searchLower = query.toLowerCase().trim();
    const searchTokens = searchLower.split(/\s+/).filter(w => w.length >= 2);
    
    if (searchTokens.length === 0) {
        return { results: [], total: 0 };
    }

    try {
        // Use array-contains for token-based search (scalable)
        // Search for the first token to narrow down results
        const primaryToken = searchTokens[0];
        
        let searchQuery = db.collection('searchIndex')
            .where('searchTokens', 'array-contains', primaryToken)
            .limit(100); // Fetch more than needed for filtering

        // Filter by entity types if specified
        if (entityTypes.length < Object.keys(SEARCH_CONFIG).length) {
            searchQuery = db.collection('searchIndex')
                .where('entityType', 'in', entityTypes)
                .where('searchTokens', 'array-contains', primaryToken)
                .limit(100);
        }

        const snapshot = await searchQuery.get();
        
        let results = [];
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const config = SEARCH_CONFIG[data.entityType];
            
            if (!config) return;

            // Additional filtering for multi-word queries
            const matchesAllTokens = searchTokens.every(token => 
                data.searchableText.includes(token)
            );
            
            if (!matchesAllTokens) return;

            // Calculate relevance score
            const exactMatch = data.searchableText.includes(searchLower);
            const startsWithMatch = data.searchableText.startsWith(searchLower);
            const relevance = startsWithMatch ? 0 : (exactMatch ? 1 : 2);

            results.push({
                type: formatEntityType(data.entityType),
                title: data.displayData[config.displayFields.title] || data.entityId,
                subtitle: config.displayFields.subtitle(data.displayData),
                link: config.displayFields.link(data.displayData),
                entityType: data.entityType,
                entityId: data.entityId,
                relevance
            });
        });

        // Sort by relevance
        results.sort((a, b) => a.relevance - b.relevance);

        // Apply pagination
        const total = results.length;
        const paginatedResults = results.slice(offset, offset + limit);

        return {
            results: paginatedResults,
            total,
            hasMore: offset + limit < total
        };
    } catch (error) {
        console.error('Search error:', error);
        throw error;
    }
}

/**
 * Fallback search (direct collection scan) - for when index isn't populated
 */
export async function searchFallback(query, options = {}) {
    const {
        entityTypes = Object.keys(SEARCH_CONFIG),
        limit = 20
    } = options;

    if (!query || query.length < 2) {
        return { results: [], total: 0 };
    }

    const searchLower = query.toLowerCase().trim();
    const results = [];

    // Search each collection in parallel with limits
    const searchPromises = entityTypes.map(async (entityType) => {
        const config = SEARCH_CONFIG[entityType];
        if (!config) return [];

        try {
            // Use Firestore's native ordering and limit
            const snapshot = await db.collection(config.collection)
                .orderBy('createdAt', 'desc')
                .limit(50) // Reduced limit per collection
                .get();

            const matches = [];
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const searchableText = config.searchFields
                    .map(field => data[field])
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                if (searchableText.includes(searchLower)) {
                    const exactMatch = searchableText.includes(searchLower);
                    const startsWithMatch = searchableText.startsWith(searchLower);
                    
                    matches.push({
                        type: formatEntityType(entityType),
                        title: data[config.displayFields.title] || doc.id,
                        subtitle: config.displayFields.subtitle(data),
                        link: config.displayFields.link({ ...data, id: doc.id }),
                        entityType,
                        entityId: doc.id,
                        relevance: startsWithMatch ? 0 : (exactMatch ? 1 : 2)
                    });
                }
            });

            return matches;
        } catch (err) {
            console.error(`Search error for ${entityType}:`, err);
            return [];
        }
    });

    const allResults = await Promise.all(searchPromises);
    allResults.forEach(matches => results.push(...matches));

    // Sort by relevance and limit
    results.sort((a, b) => a.relevance - b.relevance);
    
    return {
        results: results.slice(0, limit),
        total: results.length,
        hasMore: results.length > limit
    };
}

/**
 * Rebuild search index for all documents
 */
export async function rebuildSearchIndex(entityTypes = Object.keys(SEARCH_CONFIG)) {
    const stats = { indexed: 0, errors: 0 };

    for (const entityType of entityTypes) {
        const config = SEARCH_CONFIG[entityType];
        if (!config) continue;

        try {
            const snapshot = await db.collection(config.collection).get();
            
            for (const doc of snapshot.docs) {
                try {
                    await indexDocument(entityType, doc.id, doc.data());
                    stats.indexed++;
                } catch (err) {
                    stats.errors++;
                    console.error(`Failed to index ${entityType}/${doc.id}:`, err);
                }
            }
        } catch (err) {
            console.error(`Failed to fetch ${config.collection}:`, err);
        }
    }

    return stats;
}

/**
 * Format entity type for display
 */
function formatEntityType(entityType) {
    const typeMap = {
        purchaseOrder: 'Purchase Order',
        vendor: 'Vendor',
        appointment: 'Appointment',
        shipment: 'Shipment',
        transporter: 'Transporter',
        returnOrder: 'Return'
    };
    return typeMap[entityType] || entityType;
}

export { SEARCH_CONFIG, generateSearchTokens };
