// lib/validators.js
// Input validation schemas using Zod

import { z } from 'zod';

// Common schemas
const phoneRegex = /^\+?[1-9]\d{1,14}$/;
const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

// Auth schemas
export const registerSchema = z.object({
    email: z.string().min(1, 'Email is required').refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
        message: 'Invalid email format'
    }),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    phone: z.string().regex(phoneRegex, 'Invalid phone number format'),
    role: z.enum(['user', 'manager', 'admin', 'super_admin']).default('user')
});

export const loginSchema = z.object({
    email: z.string().min(1, 'Email is required').refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
        message: 'Invalid email format'
    }),
    password: z.string().min(1, 'Password is required')
});

// User schemas
export const createUserSchema = registerSchema;

export const updateUserSchema = z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phone: z.string().regex(phoneRegex).optional(),
    role: z.enum(['user', 'manager', 'admin', 'super_admin']).optional(),
    isActive: z.boolean().optional(),
    profileImage: z.string().refine((val) => /^https?:\/\/.+/.test(val), {
        message: 'Invalid URL format'
    }).optional()
});

// Vendor schemas
export const addressSchema = z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    pincode: z.string().min(1, 'Pincode is required'),
    country: z.string().default('India')
});

export const createVendorSchema = z.object({
    vendorName: z.string().min(1, 'Vendor name is required'),
    contactPerson: z.string().min(1, 'Contact person is required'),
    email: z.string().min(1, 'Email is required').refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
        message: 'Invalid email format'
    }),
    phone: z.string().regex(phoneRegex, 'Invalid phone number'),
    address: addressSchema,
    gstNumber: z.string().regex(gstRegex, 'Invalid GST number').optional(),
    panNumber: z.string().regex(panRegex, 'Invalid PAN number').optional(),
    paymentTerms: z.string().default('30 days')
});

export const updateVendorSchema = createVendorSchema.partial();

// Warehouse schema
export const createWarehouseSchema = z.object({
    warehouseName: z.string().min(1, 'Warehouse name is required'),
    address: addressSchema,
    contactPerson: z.string().min(1, 'Contact person is required'),
    phone: z.string().regex(phoneRegex, 'Invalid phone number'),
    email: z.string().min(1, 'Email is required').refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
        message: 'Invalid email format'
    }),
    capacity: z.string().optional(),
    operatingHours: z.string().optional()
});

// Transporter schema
export const createTransporterSchema = z.object({
    transporterName: z.string().min(1, 'Transporter name is required'),
    contactPerson: z.string().min(1, 'Contact person is required'),
    email: z.string().min(1, 'Email is required').refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
        message: 'Invalid email format'
    }),
    phone: z.string().regex(phoneRegex, 'Invalid phone number'),
    address: addressSchema,
    gstNumber: z.string().regex(gstRegex, 'Invalid GST number').optional(),
    vehicleTypes: z.array(z.string()).min(1, 'At least one vehicle type required')
});

export const updateTransporterSchema = createTransporterSchema.partial();

// Purchase Order schemas
export const poItemSchema = z.object({
    sku: z.string().min(1, 'SKU is required'),
    barcode: z.string().optional(),
    itemName: z.string().min(1, 'Item name is required'),
    itemDescription: z.string().optional(),
    poQuantity: z.number().positive('Quantity must be positive'),
    unitPrice: z.number().positive('Unit price must be positive'),
    mrp: z.number().positive('MRP must be positive'),
    gstRate: z.number().min(0).max(100, 'GST rate must be between 0 and 100'),
    unit: z.string().default('pcs'),
    hsnCode: z.string().optional()
});

export const createPOSchema = z.object({
    poNumber: z.string().min(1, 'PO number is required'),
    vendorId: z.string().min(1, 'Vendor is required'),
    vendorWarehouseId: z.string().min(1, 'Warehouse is required'),
    poDate: z.string().min(1, 'PO date is required'),
    expectedDeliveryDate: z.string().min(1, 'Expected delivery date is required'),
    notes: z.string().optional(),
    termsAndConditions: z.string().optional(),
    items: z.array(poItemSchema).min(1, 'At least one item is required')
});

export const updatePOSchema = z.object({
    expectedDeliveryDate: z.string().optional(),
    notes: z.string().optional(),
    termsAndConditions: z.string().optional()
});

export const approvePOSchema = z.object({
    approvedBy: z.string().min(1, 'Approver is required'),
    notes: z.string().optional()
});

// Shipment schemas
export const shipmentItemSchema = z.object({
    sku: z.string().min(1, 'SKU is required'),
    shippedQuantity: z.number().positive('Shipped quantity must be positive'),
    unitPrice: z.number().positive().optional(),
    gstRate: z.number().min(0).max(100).optional()
});

export const createShipmentSchema = z.object({
    appointmentNumber: z.string().min(1, 'Appointment number is required'),
    poId: z.string().min(1, 'PO ID is required'),
    transporterId: z.string().min(1, 'Transporter is required'),
    shipmentDate: z.string().min(1, 'Shipment date is required'),
    expectedDeliveryDate: z.string().min(1, 'Expected delivery date is required'),
    shippingAddress: addressSchema,
    items: z.array(shipmentItemSchema).min(1, 'At least one item is required'),
    notes: z.string().optional()
});

export const updateShipmentStatusSchema = z.object({
    status: z.enum(['created', 'dispatched', 'in_transit', 'delivered', 'cancelled']),
    notes: z.string().optional(),
    trackingNumber: z.string().optional(),
    vehicleNumber: z.string().optional(),
    driverName: z.string().optional(),
    driverPhone: z.string().regex(phoneRegex).optional()
});

// Return Order schemas
export const returnItemSchema = z.object({
    sku: z.string().min(1, 'SKU is required'),
    returnQuantity: z.number().positive('Return quantity must be positive'),
    condition: z.enum(['damaged', 'defective', 'wrong_item', 'excess', 'other']),
    conditionNotes: z.string().optional()
});

export const createReturnSchema = z.object({
    returnNumber: z.string().min(1, 'Return number is required'),
    poId: z.string().min(1, 'PO ID is required'),
    shipmentId: z.string().optional(),
    returnType: z.enum(['damaged', 'defective', 'wrong_item', 'excess', 'other']),
    returnReason: z.string().min(1, 'Return reason is required'),
    returnDate: z.string().min(1, 'Return date is required'),
    transporterId: z.string().optional(),
    items: z.array(returnItemSchema).min(1, 'At least one item is required')
});

// Appointment schemas
export const updateAppointmentSchema = z.object({
    scheduledDate: z.string().optional(),
    scheduledTimeSlot: z.string().optional(),
    status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled']).optional(),
    notes: z.string().optional(),
    specialInstructions: z.string().optional()
});

export const rescheduleAppointmentSchema = z.object({
    scheduledDate: z.string().min(1, 'Scheduled date is required'),
    scheduledTimeSlot: z.string().min(1, 'Time slot is required'),
    rescheduledReason: z.string().min(1, 'Reason is required'),
    rescheduledBy: z.string().min(1, 'Rescheduled by is required')
});

// Validation helper
export function validateData(schema, data) {
    try {
        const validated = schema.parse(data);
        return { success: true, data: validated };
    } catch (error) {
        const errors = {};
        if (error.issues && Array.isArray(error.issues)) {
            error.issues.forEach(issue => {
                const path = issue.path.join('.') || 'general';
                errors[path] = issue.message;
            });
        }
        return {
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid input data',
                details: errors
            }
        };
    }
}
