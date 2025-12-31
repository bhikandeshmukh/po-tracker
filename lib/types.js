// lib/types.js
// Type definitions using JSDoc and Zod for runtime validation

import { z } from 'zod';

// ==========================================
// ZOD SCHEMAS (Runtime Validation)
// ==========================================

/**
 * User schema
 */
export const UserSchema = z.object({
    uid: z.string(),
    email: z.string().email(),
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    role: z.enum(['user', 'manager', 'admin', 'super_admin']).default('user'),
    isActive: z.boolean().default(true),
    phone: z.string().optional(),
    createdAt: z.string().or(z.date()).optional(),
    updatedAt: z.string().or(z.date()).optional()
});

/**
 * Vendor schema
 */
export const VendorSchema = z.object({
    vendorId: z.string(),
    vendorName: z.string().min(1, 'Vendor name is required'),
    vendorCode: z.string().optional(),
    contactPerson: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    gstNumber: z.string().optional(),
    panNumber: z.string().optional(),
    isActive: z.boolean().default(true),
    createdAt: z.string().or(z.date()).optional(),
    updatedAt: z.string().or(z.date()).optional()
});

/**
 * Warehouse schema
 */
export const WarehouseSchema = z.object({
    warehouseId: z.string(),
    warehouseName: z.string().min(1, 'Warehouse name is required'),
    name: z.string().optional(),
    address: z.object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        pincode: z.string().optional(),
        country: z.string().default('India')
    }).optional(),
    contactPerson: z.string().optional(),
    phone: z.string().optional(),
    isActive: z.boolean().default(true)
});

/**
 * Transporter schema
 */
export const TransporterSchema = z.object({
    transporterId: z.string(),
    transporterName: z.string().min(1, 'Transporter name is required'),
    transporterCode: z.string().optional(),
    contactPerson: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    gstNumber: z.string().optional(),
    isActive: z.boolean().default(true),
    createdAt: z.string().or(z.date()).optional(),
    updatedAt: z.string().or(z.date()).optional()
});

/**
 * PO Item schema
 */
export const POItemSchema = z.object({
    itemId: z.string().optional(),
    lineNumber: z.number().int().positive().optional(),
    sku: z.string().optional(),
    itemName: z.string().optional(),
    description: z.string().optional(),
    poQuantity: z.number().int().min(1, 'Quantity must be at least 1'),
    shippedQuantity: z.number().int().min(0).default(0),
    pendingQuantity: z.number().int().min(0).optional(),
    deliveredQuantity: z.number().int().min(0).default(0),
    unitPrice: z.number().min(0).default(0),
    gstRate: z.number().min(0).max(100).default(0),
    gstAmount: z.number().min(0).default(0),
    totalAmount: z.number().min(0).default(0),
    mrp: z.number().min(0).optional(),
    createdAt: z.string().or(z.date()).optional(),
    updatedAt: z.string().or(z.date()).optional()
});

/**
 * Purchase Order schema
 */
export const PurchaseOrderSchema = z.object({
    poId: z.string(),
    poNumber: z.string().min(1, 'PO number is required'),
    vendorId: z.string().min(1, 'Vendor is required'),
    vendorName: z.string().optional(),
    vendorWarehouseId: z.string().min(1, 'Warehouse is required'),
    vendorWarehouseName: z.string().optional(),
    status: z.enum([
        'draft', 
        'submitted', 
        'approved', 
        'partial_sent',
        'partially_shipped', 
        'fully_shipped',
        'partial_completed',
        'completed', 
        'cancelled'
    ]).default('draft'),
    poDate: z.string().or(z.date()),
    expectedDeliveryDate: z.string().or(z.date()),
    totalItems: z.number().int().min(0).default(0),
    totalQuantity: z.number().int().min(0).default(0),
    shippedQuantity: z.number().int().min(0).default(0),
    pendingQuantity: z.number().int().min(0).default(0),
    deliveredQuantity: z.number().int().min(0).default(0),
    notes: z.string().optional(),
    termsAndConditions: z.string().optional(),
    createdBy: z.string().optional(),
    createdAt: z.string().or(z.date()).optional(),
    updatedAt: z.string().or(z.date()).optional(),
    approvedAt: z.string().or(z.date()).optional(),
    approvedBy: z.string().optional(),
    cancelledAt: z.string().or(z.date()).optional(),
    cancelledBy: z.string().optional(),
    cancellationReason: z.string().optional()
});

/**
 * Shipment schema
 */
export const ShipmentSchema = z.object({
    shipmentId: z.string(),
    shipmentNumber: z.string().optional(),
    poId: z.string().min(1, 'PO is required'),
    poNumber: z.string().optional(),
    vendorId: z.string().optional(),
    vendorName: z.string().optional(),
    vendorWarehouseId: z.string().optional(),
    transporterId: z.string().min(1, 'Transporter is required'),
    transporterName: z.string().optional(),
    invoiceNumber: z.string().optional(),
    lrDocketNumber: z.string().optional(),
    status: z.enum([
        'created',
        'dispatched',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'cancelled'
    ]).default('created'),
    shipmentDate: z.string().or(z.date()),
    expectedDeliveryDate: z.string().or(z.date()).optional(),
    actualDeliveryDate: z.string().or(z.date()).optional(),
    totalItems: z.number().int().min(0).default(0),
    totalQuantity: z.number().int().min(0).default(0),
    shippingAddress: z.object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        pincode: z.string().optional()
    }).optional(),
    notes: z.string().optional(),
    appointmentId: z.string().optional(),
    appointmentScheduled: z.boolean().default(false),
    createdBy: z.string().optional(),
    createdAt: z.string().or(z.date()).optional(),
    updatedAt: z.string().or(z.date()).optional()
});

/**
 * Appointment schema
 */
export const AppointmentSchema = z.object({
    appointmentId: z.string(),
    appointmentNumber: z.string().optional(),
    shipmentId: z.string().min(1, 'Shipment is required'),
    shipmentNumber: z.string().optional(),
    poId: z.string().optional(),
    poNumber: z.string().optional(),
    vendorId: z.string().optional(),
    vendorName: z.string().optional(),
    transporterId: z.string().optional(),
    transporterName: z.string().optional(),
    invoiceNumber: z.string().optional(),
    lrDocketNumber: z.string().optional(),
    status: z.enum([
        'created',
        'scheduled',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'rescheduled'
    ]).default('created'),
    scheduledDate: z.string().or(z.date()),
    scheduledTimeSlot: z.string().optional(),
    actualDate: z.string().or(z.date()).optional(),
    totalItems: z.number().int().min(0).default(0),
    totalQuantity: z.number().int().min(0).default(0),
    receivedQuantity: z.number().int().min(0).default(0),
    damagedQuantity: z.number().int().min(0).default(0),
    deliveryLocation: z.object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        pincode: z.string().optional()
    }).optional(),
    notes: z.string().optional(),
    createdBy: z.string().optional(),
    createdAt: z.string().or(z.date()).optional(),
    updatedAt: z.string().or(z.date()).optional()
});

/**
 * Return Order schema
 */
export const ReturnOrderSchema = z.object({
    returnId: z.string(),
    returnNumber: z.string().optional(),
    poId: z.string().optional(),
    poNumber: z.string().optional(),
    shipmentId: z.string().optional(),
    vendorId: z.string().optional(),
    vendorName: z.string().optional(),
    status: z.enum([
        'draft',
        'pending_approval',
        'approved',
        'rejected',
        'in_transit',
        'received',
        'completed',
        'cancelled'
    ]).default('draft'),
    reason: z.string().optional(),
    totalItems: z.number().int().min(0).default(0),
    totalQuantity: z.number().int().min(0).default(0),
    notes: z.string().optional(),
    createdBy: z.string().optional(),
    createdAt: z.string().or(z.date()).optional(),
    updatedAt: z.string().or(z.date()).optional()
});

/**
 * API Response schema
 */
export const APIResponseSchema = z.object({
    success: z.boolean(),
    data: z.any().optional(),
    error: z.object({
        code: z.string(),
        message: z.string(),
        details: z.any().optional()
    }).optional(),
    pagination: z.object({
        page: z.number().optional(),
        limit: z.number(),
        total: z.number().optional(),
        totalPages: z.number().optional(),
        hasMore: z.boolean().optional(),
        nextCursor: z.string().optional()
    }).optional()
});

/**
 * Dashboard Metrics schema
 */
export const DashboardMetricsSchema = z.object({
    totalPOs: z.number().default(0),
    activePOs: z.number().default(0),
    completedPOs: z.number().default(0),
    totalOrderQty: z.number().default(0),
    totalShippedQty: z.number().default(0),
    totalPendingQty: z.number().default(0),
    totalDeliveredQty: z.number().default(0),
    totalShipments: z.number().default(0),
    inTransitShipments: z.number().default(0),
    deliveredShipments: z.number().default(0),
    pendingShipments: z.number().default(0),
    totalVendors: z.number().default(0),
    activeVendors: z.number().default(0),
    totalTransporters: z.number().default(0),
    lastUpdated: z.string().or(z.date()).optional()
});

// ==========================================
// VALIDATION HELPERS
// ==========================================

/**
 * Validate data against a schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {any} data - Data to validate
 * @returns {{ success: boolean, data?: any, errors?: Record<string, string> }}
 */
export function validate(schema, data) {
    const result = schema.safeParse(data);
    
    if (result.success) {
        return { success: true, data: result.data };
    }
    
    const errors = {};
    if (result.error && result.error.errors) {
        result.error.errors.forEach(err => {
            const path = err.path.join('.') || 'root';
            errors[path] = err.message;
        });
    }
    
    return { success: false, errors };
}

/**
 * Validate and throw on error
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {any} data - Data to validate
 * @returns {any} Validated data
 * @throws {Error} If validation fails
 */
export function validateOrThrow(schema, data) {
    const result = validate(schema, data);
    
    if (!result.success) {
        const error = new Error('Validation failed');
        error.code = 'VALIDATION_ERROR';
        error.details = result.errors;
        throw error;
    }
    
    return result.data;
}

/**
 * Create a partial schema (all fields optional)
 * @param {z.ZodSchema} schema - Original schema
 * @returns {z.ZodSchema} Partial schema
 */
export function createPartialSchema(schema) {
    return schema.partial();
}

// ==========================================
// TYPE EXPORTS (for JSDoc)
// ==========================================

/**
 * @typedef {z.infer<typeof UserSchema>} User
 * @typedef {z.infer<typeof VendorSchema>} Vendor
 * @typedef {z.infer<typeof WarehouseSchema>} Warehouse
 * @typedef {z.infer<typeof TransporterSchema>} Transporter
 * @typedef {z.infer<typeof POItemSchema>} POItem
 * @typedef {z.infer<typeof PurchaseOrderSchema>} PurchaseOrder
 * @typedef {z.infer<typeof ShipmentSchema>} Shipment
 * @typedef {z.infer<typeof AppointmentSchema>} Appointment
 * @typedef {z.infer<typeof ReturnOrderSchema>} ReturnOrder
 * @typedef {z.infer<typeof APIResponseSchema>} APIResponse
 * @typedef {z.infer<typeof DashboardMetricsSchema>} DashboardMetrics
 */

// Export type inference helpers
export const Types = {
    User: /** @type {User} */ ({}),
    Vendor: /** @type {Vendor} */ ({}),
    Warehouse: /** @type {Warehouse} */ ({}),
    Transporter: /** @type {Transporter} */ ({}),
    POItem: /** @type {POItem} */ ({}),
    PurchaseOrder: /** @type {PurchaseOrder} */ ({}),
    Shipment: /** @type {Shipment} */ ({}),
    Appointment: /** @type {Appointment} */ ({}),
    ReturnOrder: /** @type {ReturnOrder} */ ({}),
    APIResponse: /** @type {APIResponse} */ ({}),
    DashboardMetrics: /** @type {DashboardMetrics} */ ({})
};
