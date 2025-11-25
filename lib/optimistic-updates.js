// lib/optimistic-updates.js
// Utilities for optimistic UI updates

/**
 * Perform an optimistic update with rollback on error
 */
export async function withOptimisticUpdate({
    optimisticUpdate,
    apiCall,
    onSuccess,
    onError,
    rollback
}) {
    // Apply optimistic update immediately
    optimisticUpdate();

    try {
        // Make API call
        const result = await apiCall();
        
        // Call success handler if provided
        if (onSuccess) {
            onSuccess(result);
        }
        
        return { success: true, data: result };
    } catch (error) {
        // Rollback optimistic update
        if (rollback) {
            rollback();
        }
        
        // Call error handler if provided
        if (onError) {
            onError(error);
        }
        
        return { success: false, error };
    }
}

/**
 * Generate optimistic ID for new items
 */
export function generateOptimisticId() {
    return `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if an ID is optimistic
 */
export function isOptimisticId(id) {
    return typeof id === 'string' && id.startsWith('optimistic_');
}

/**
 * Create optimistic PO object
 */
export function createOptimisticPO(formData, user) {
    const now = new Date().toISOString();
    return {
        id: generateOptimisticId(),
        poId: formData.poNumber,
        poNumber: formData.poNumber,
        vendorId: formData.vendorId,
        vendorName: formData.vendorId, // Will be updated by API
        vendorWarehouseId: formData.vendorWarehouseId,
        vendorWarehouseName: formData.vendorWarehouseId,
        status: 'draft',
        poDate: formData.poDate,
        expectedDeliveryDate: formData.expectedDelivery,
        notes: formData.notes || '',
        totalItems: formData.items.length,
        grandTotal: formData.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0),
        createdAt: now,
        updatedAt: now,
        _optimistic: true
    };
}

/**
 * Create optimistic item object
 */
export function createOptimisticItem(itemData, lineNumber) {
    const now = new Date().toISOString();
    const lineTotal = itemData.poQuantity * itemData.unitPrice;
    const gstAmount = (lineTotal * itemData.gstRate) / 100;
    
    return {
        id: generateOptimisticId(),
        ...itemData,
        lineNumber,
        itemId: itemData.sku,
        shippedQuantity: 0,
        pendingQuantity: itemData.poQuantity,
        receivedQuantity: 0,
        returnedQuantity: 0,
        gstAmount,
        totalAmount: lineTotal + gstAmount,
        createdAt: now,
        updatedAt: now,
        _optimistic: true
    };
}
