// lib/validation-schemas.js
// Comprehensive validation schemas for all entities

const Joi = require('joi');

// Purchase Order Validation Schema
const purchaseOrderSchema = Joi.object({
    poNumber: Joi.string()
        .min(3)
        .max(50)
        .pattern(/^[A-Z0-9-]+$/)
        .required()
        .messages({
            'string.pattern.base': 'PO number can only contain uppercase letters, numbers, and hyphens',
            'string.min': 'PO number must be at least 3 characters',
            'string.max': 'PO number cannot exceed 50 characters',
            'any.required': 'PO number is required'
        }),
    
    vendorId: Joi.string()
        .min(3)
        .max(50)
        .required()
        .messages({
            'any.required': 'Vendor ID is required',
            'string.min': 'Vendor ID must be at least 3 characters',
            'string.max': 'Vendor ID cannot exceed 50 characters'
        }),
    
    vendorWarehouseId: Joi.string()
        .min(3)
        .max(50)
        .required()
        .messages({
            'any.required': 'Warehouse ID is required',
            'string.min': 'Warehouse ID must be at least 3 characters',
            'string.max': 'Warehouse ID cannot exceed 50 characters'
        }),
    
    poDate: Joi.date()
        .required()
        .messages({
            'any.required': 'PO date is required',
            'date.base': 'PO date must be a valid date'
        }),
    
    expectedDeliveryDate: Joi.date()
        .min(Joi.ref('poDate'))
        .required()
        .messages({
            'any.required': 'Expected delivery date is required',
            'date.min': 'Expected delivery date must be after PO date',
            'date.base': 'Expected delivery date must be a valid date'
        }),
    
    notes: Joi.string()
        .max(2000)
        .allow('', null)
        .optional(),
    
    termsAndConditions: Joi.string()
        .max(5000)
        .allow('', null)
        .optional(),
    
    items: Joi.array()
        .min(1)
        .max(500)
        .items(
            Joi.object({
                poQuantity: Joi.number()
                    .integer()
                    .min(1)
                    .max(1000000)
                    .required()
                    .messages({
                        'any.required': 'Order quantity is required',
                        'number.min': 'Order quantity must be at least 1',
                        'number.max': 'Order quantity cannot exceed 1,000,000',
                        'number.integer': 'Order quantity must be a whole number'
                    }),
                
                shippedQuantity: Joi.number()
                    .integer()
                    .min(0)
                    .optional()
                    .default(0),
                
                pendingQuantity: Joi.number()
                    .integer()
                    .min(0)
                    .optional(),
                
                deliveredQuantity: Joi.number()
                    .integer()
                    .min(0)
                    .optional()
                    .default(0)
            })
        )
        .required()
        .messages({
            'array.min': 'At least one item is required',
            'array.max': 'Cannot exceed 500 items per PO'
        })
});

// PO Update Schema (partial updates allowed)
const purchaseOrderUpdateSchema = Joi.object({
    vendorId: Joi.string().min(3).max(50).optional(),
    vendorWarehouseId: Joi.string().min(3).max(50).optional(),
    poDate: Joi.date().iso().max('now').optional(),
    expectedDeliveryDate: Joi.date().iso().optional(),
    notes: Joi.string().max(2000).allow('', null).optional(),
    termsAndConditions: Joi.string().max(5000).allow('', null).optional(),
    status: Joi.string()
        .valid('draft', 'submitted', 'approved', 'partially_shipped', 'fully_shipped', 'cancelled')
        .optional()
}).min(1); // At least one field must be provided

// Status Transition Rules
const STATUS_TRANSITIONS = {
    draft: ['submitted', 'approved', 'cancelled'],
    submitted: ['approved', 'cancelled'],
    approved: ['partially_shipped', 'cancelled'],
    partially_shipped: ['fully_shipped', 'cancelled'],
    fully_shipped: [],
    cancelled: []
};

function validateStatusTransition(currentStatus, newStatus) {
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];
    
    if (!allowedTransitions.includes(newStatus)) {
        return {
            valid: false,
            error: `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`
        };
    }
    
    return { valid: true };
}

// Sanitization function to prevent XSS
function sanitizeInput(input) {
    if (typeof input === 'string') {
        return input
            .replace(/[<>]/g, '') // Remove < and >
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+=/gi, '') // Remove event handlers
            .trim();
    }
    
    // Handle arrays separately to preserve array type
    if (Array.isArray(input)) {
        return input.map(item => sanitizeInput(item));
    }
    
    if (typeof input === 'object' && input !== null) {
        const sanitized = {};
        for (const [key, value] of Object.entries(input)) {
            sanitized[key] = sanitizeInput(value);
        }
        return sanitized;
    }
    
    return input;
}

// Validate and sanitize PO data
function validatePurchaseOrder(data, isUpdate = false) {
    // Sanitize input first
    const sanitizedData = sanitizeInput(data);
    
    // Choose schema based on operation
    const schema = isUpdate ? purchaseOrderUpdateSchema : purchaseOrderSchema;
    
    // Validate
    const { error, value } = schema.validate(sanitizedData, {
        abortEarly: false,
        stripUnknown: true
    });
    
    if (error) {
        const details = {};
        error.details.forEach(detail => {
            const path = detail.path.join('.');
            details[path] = detail.message;
        });
        
        return {
            valid: false,
            error: 'Validation failed',
            details
        };
    }
    
    return {
        valid: true,
        data: value
    };
}

module.exports = {
    purchaseOrderSchema,
    purchaseOrderUpdateSchema,
    validatePurchaseOrder,
    validateStatusTransition,
    sanitizeInput,
    STATUS_TRANSITIONS
};
