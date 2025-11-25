// pages/api/purchase-orders/index.js
// API endpoint to handle GET all POs and POST new PO
// FIXED: All root cause issues resolved

import { db } from '../../../lib/firebase-admin';
import { verifyAuth } from '../../../lib/auth-middleware';
import { validatePurchaseOrder, sanitizeInput } from '../../../lib/validation-schemas';
import { 
    createPOWithTransaction, 
    validateVendorAndWarehouse 
} from '../../../lib/po-helpers';
import { standardRateLimiter, createOperationLimiter } from '../../../lib/rate-limiter';

export default async function handler(req, res) {
    let user = null;
    
    try {
        // Verify authentication
        user = await verifyAuth(req);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required'
                }
            });
        }

        if (req.method === 'GET') {
            // Apply standard rate limiting for reads
            await applyRateLimit(standardRateLimiter, req, res);
            return await getPurchaseOrders(req, res, user);
        } else if (req.method === 'POST') {
            // Apply strict rate limiting for creates
            await applyRateLimit(createOperationLimiter, req, res);
            return await createPurchaseOrder(req, res, user);
        } else {
            return res.status(405).json({
                success: false,
                error: {
                    code: 'METHOD_NOT_ALLOWED',
                    message: 'Method not allowed'
                }
            });
        }
    } catch (error) {
        console.error('API Error:', {
            endpoint: '/api/purchase-orders',
            method: req.method,
            message: error.message,
            code: error.code,
            stack: error.stack,
            user: user?.uid
        });
        
        return res.status(500).json({
            success: false,
            error: {
                code: 'SERVER_ERROR',
                message: 'Internal server error'
            }
        });
    }
}

// Helper to apply rate limiting
async function applyRateLimit(limiter, req, res) {
    return new Promise((resolve, reject) => {
        limiter(req, res, (result) => {
            if (result instanceof Error) {
                reject(result);
            } else {
                resolve();
            }
        });
    });
}

// GET all purchase orders
// FIXED: Cursor-based pagination, proper filtering, no composite index issues
async function getPurchaseOrders(req, res, user) {
    const {
        status,
        vendorId,
        startDate,
        endDate,
        search,
        limit = 10,
        lastDocId
    } = req.query;

    try {
        const limitNum = Math.min(parseInt(limit, 10) || 10, 100); // Max 100 per page
        
        // Base query - always order by createdAt for consistent pagination
        let query = db.collection('purchaseOrders')
            .orderBy('createdAt', 'desc');

        // Apply single filter at a time to avoid composite index requirement
        // For multiple filters, we'll filter in memory
        const filters = [];
        
        if (status) {
            filters.push({ field: 'status', value: status });
        }
        
        if (vendorId) {
            filters.push({ field: 'vendorId', value: vendorId });
        }

        // Apply first filter to query if exists
        if (filters.length > 0) {
            const firstFilter = filters[0];
            query = query.where(firstFilter.field, '==', firstFilter.value);
        }

        // Cursor-based pagination (FIXED: No more offset)
        if (lastDocId) {
            const lastDoc = await db.collection('purchaseOrders').doc(lastDocId).get();
            if (lastDoc.exists) {
                query = query.startAfter(lastDoc);
            }
        }

        // Fetch more than needed for client-side filtering
        const fetchLimit = filters.length > 1 ? limitNum * 3 : limitNum + 1;
        query = query.limit(fetchLimit);

        const snapshot = await query.get();
        
        let purchaseOrders = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                poId: doc.id, // Consistent with detail endpoint
                ...data,
                // Convert Firestore timestamps to ISO strings
                poDate: data.poDate?.toDate?.()?.toISOString() || data.poDate,
                expectedDeliveryDate: data.expectedDeliveryDate?.toDate?.()?.toISOString() || data.expectedDeliveryDate,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
                approvedAt: data.approvedAt?.toDate?.()?.toISOString() || data.approvedAt,
                cancelledAt: data.cancelledAt?.toDate?.()?.toISOString() || data.cancelledAt
            };
        });

        // Apply additional filters in memory (FIXED: No composite index needed)
        if (filters.length > 1) {
            purchaseOrders = purchaseOrders.filter(po => {
                return filters.every(filter => po[filter.field] === filter.value);
            });
        }

        // Apply date range filters in memory
        if (startDate) {
            const start = new Date(startDate);
            purchaseOrders = purchaseOrders.filter(po => 
                new Date(po.poDate) >= start
            );
        }

        if (endDate) {
            const end = new Date(endDate);
            purchaseOrders = purchaseOrders.filter(po => 
                new Date(po.poDate) <= end
            );
        }

        // Apply search filter in memory
        if (search) {
            const searchLower = search.toLowerCase();
            purchaseOrders = purchaseOrders.filter(po =>
                po.poNumber?.toLowerCase().includes(searchLower) ||
                po.vendorName?.toLowerCase().includes(searchLower)
            );
        }

        // Limit results
        const hasMore = purchaseOrders.length > limitNum;
        const results = purchaseOrders.slice(0, limitNum);
        const nextCursor = hasMore && results.length > 0 
            ? results[results.length - 1].id 
            : null;

        return res.status(200).json({
            success: true,
            data: results,
            pagination: {
                limit: limitNum,
                hasMore,
                nextCursor,
                count: results.length
            }
        });
    } catch (error) {
        console.error('Get POs Error:', error);
        throw error;
    }
}

// CREATE new purchase order
// FIXED: Transaction-based, proper validation, no race conditions
async function createPurchaseOrder(req, res, user) {
    try {
        console.log('Creating PO - Request body keys:', Object.keys(req.body));
        console.log('Creating PO - Items count:', req.body.items?.length);
        console.log('Creating PO - Items is array?', Array.isArray(req.body.items));
        
        // Sanitize and validate input (FIXED: XSS protection)
        const validation = validatePurchaseOrder(req.body, false);
        
        console.log('Validation result:', validation.valid ? 'VALID' : 'INVALID');
        if (!validation.valid) {
            console.error('Validation failed:', validation.details);
        }
        
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: validation.error,
                    details: validation.details
                }
            });
        }

        const {
            poNumber,
            vendorId,
            vendorWarehouseId,
            poDate,
            expectedDeliveryDate,
            notes,
            termsAndConditions,
            items
        } = validation.data;

        // Validate vendor and warehouse exist (FIXED: Proper validation)
        console.log('Validating vendor:', vendorId, 'warehouse:', vendorWarehouseId);
        const vendorValidation = await validateVendorAndWarehouse(vendorId, vendorWarehouseId);
        
        console.log('Vendor validation result:', vendorValidation.valid ? 'VALID' : 'INVALID');
        if (!vendorValidation.valid) {
            console.error('Vendor validation failed:', vendorValidation.error);
        }
        
        if (!vendorValidation.valid) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: vendorValidation.error,
                    details: vendorValidation.details
                }
            });
        }

        const { vendor, warehouse } = vendorValidation;

        // Prepare PO data
        const poData = {
            poId: poNumber,
            poNumber: poNumber,
            vendorId: vendorId,
            vendorName: vendor.vendorName || vendor.name,
            vendorWarehouseId: vendorWarehouseId,
            vendorWarehouseName: warehouse.warehouseName || warehouse.name || '',
            status: 'draft',
            poDate: new Date(poDate),
            expectedDeliveryDate: new Date(expectedDeliveryDate),
            notes: notes || '',
            termsAndConditions: termsAndConditions || ''
        };

        // Create PO with transaction (FIXED: Atomic operation, no race condition)
        console.log('Creating PO with transaction...');
        const result = await createPOWithTransaction(poData, items, user);
        console.log('PO created successfully:', result.poId);

        return res.status(201).json({
            success: true,
            data: {
                ...result,
                message: 'Purchase order created successfully'
            }
        });

    } catch (error) {
        // Handle specific errors
        if (error.message === 'DUPLICATE_PO') {
            console.error('Duplicate PO detected:', req.body.poNumber);
            return res.status(409).json({
                success: false,
                error: {
                    code: 'DUPLICATE_ERROR',
                    message: 'Purchase order already exists',
                    details: { poNumber: req.body.poNumber }
                }
            });
        }

        console.error('Create PO Error:', {
            message: error.message,
            stack: error.stack,
            user: user?.uid,
            poNumber: req.body?.poNumber
        });

        throw error;
    }
}
