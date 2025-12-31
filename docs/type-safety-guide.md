# Type Safety Guide

Guide for using Zod schemas and type validation in the Purchase Order Tracking System.

---

## Overview

The application uses Zod for runtime type validation. This provides:
- Runtime validation of data
- Automatic TypeScript-like type inference
- Detailed error messages
- Schema composition and transformation

---

## Available Schemas

### Entity Schemas

| Schema | Description |
|--------|-------------|
| `UserSchema` | User account validation |
| `VendorSchema` | Vendor data validation |
| `WarehouseSchema` | Warehouse data validation |
| `TransporterSchema` | Transporter data validation |
| `POItemSchema` | Purchase order item validation |
| `PurchaseOrderSchema` | Purchase order validation |
| `ShipmentSchema` | Shipment data validation |
| `AppointmentSchema` | Appointment data validation |
| `ReturnOrderSchema` | Return order validation |
| `APIResponseSchema` | API response format validation |
| `DashboardMetricsSchema` | Dashboard metrics validation |

---

## Basic Usage

### Import Schemas

```javascript
import { 
    UserSchema,
    VendorSchema,
    PurchaseOrderSchema,
    validate,
    validateOrThrow 
} from '../lib/types';
```

### Validate Data

```javascript
// Safe validation (returns result object)
const result = validate(UserSchema, userData);

if (result.success) {
    console.log('Valid user:', result.data);
} else {
    console.error('Validation errors:', result.errors);
}
```

### Validate or Throw

```javascript
try {
    const validData = validateOrThrow(PurchaseOrderSchema, poData);
    // Use validData safely
} catch (error) {
    if (error.code === 'VALIDATION_ERROR') {
        console.error('Invalid data:', error.details);
    }
}
```

---

## Schema Definitions

### UserSchema

```javascript
const UserSchema = z.object({
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
```

### VendorSchema

```javascript
const VendorSchema = z.object({
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
```

### PurchaseOrderSchema

```javascript
const PurchaseOrderSchema = z.object({
    poId: z.string(),
    poNumber: z.string().min(1, 'PO number is required'),
    vendorId: z.string().min(1, 'Vendor is required'),
    vendorName: z.string().optional(),
    vendorWarehouseId: z.string().min(1, 'Warehouse is required'),
    vendorWarehouseName: z.string().optional(),
    status: z.enum([
        'draft', 'submitted', 'approved', 'partial_sent',
        'fully_shipped', 'partial_completed',
        'completed', 'cancelled'
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
    updatedAt: z.string().or(z.date()).optional()
});
```

### POItemSchema

```javascript
const POItemSchema = z.object({
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
    mrp: z.number().min(0).optional()
});
```

### ShipmentSchema

```javascript
const ShipmentSchema = z.object({
    shipmentId: z.string(),
    shipmentNumber: z.string().optional(),
    poId: z.string().min(1, 'PO is required'),
    poNumber: z.string().optional(),
    transporterId: z.string().min(1, 'Transporter is required'),
    transporterName: z.string().optional(),
    status: z.enum([
        'created', 'dispatched', 'in_transit',
        'out_for_delivery', 'delivered', 'cancelled'
    ]).default('created'),
    shipmentDate: z.string().or(z.date()),
    expectedDeliveryDate: z.string().or(z.date()).optional(),
    totalItems: z.number().int().min(0).default(0),
    totalQuantity: z.number().int().min(0).default(0),
    notes: z.string().optional()
});
```

---

## Validation Helpers

### validate()

Safe validation that returns a result object:

```javascript
import { validate, UserSchema } from '../lib/types';

const result = validate(UserSchema, {
    uid: 'user123',
    email: 'test@example.com'
});

// Result structure:
// Success: { success: true, data: { ... } }
// Failure: { success: false, errors: { email: 'Invalid email' } }
```

### validateOrThrow()

Throws an error if validation fails:

```javascript
import { validateOrThrow, PurchaseOrderSchema } from '../lib/types';

try {
    const po = validateOrThrow(PurchaseOrderSchema, formData);
    await savePurchaseOrder(po);
} catch (error) {
    if (error.code === 'VALIDATION_ERROR') {
        // Handle validation errors
        Object.entries(error.details).forEach(([field, message]) => {
            setFieldError(field, message);
        });
    }
}
```

### createPartialSchema()

Create a schema where all fields are optional (for updates):

```javascript
import { createPartialSchema, VendorSchema, validate } from '../lib/types';

const PartialVendorSchema = createPartialSchema(VendorSchema);

// Now all fields are optional
const result = validate(PartialVendorSchema, {
    phone: '+91-9876543210'  // Only updating phone
});
```

---

## Usage Examples

### Form Validation

```javascript
import { validate, PurchaseOrderSchema } from '../lib/types';

function POForm() {
    const [errors, setErrors] = useState({});

    const handleSubmit = (formData) => {
        const result = validate(PurchaseOrderSchema, {
            poId: formData.poNumber,
            poNumber: formData.poNumber,
            vendorId: formData.vendorId,
            vendorWarehouseId: formData.warehouseId,
            poDate: formData.poDate,
            expectedDeliveryDate: formData.expectedDelivery
        });

        if (!result.success) {
            setErrors(result.errors);
            return;
        }

        // Submit valid data
        submitPO(result.data);
    };

    return (
        <form onSubmit={handleSubmit}>
            <input name="poNumber" />
            {errors.poNumber && <span className="error">{errors.poNumber}</span>}
            
            <select name="vendorId">...</select>
            {errors.vendorId && <span className="error">{errors.vendorId}</span>}
            
            {/* ... */}
        </form>
    );
}
```

### API Request Validation

```javascript
import { validateOrThrow, ShipmentSchema } from '../../../lib/types';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            // Validate request body
            const shipmentData = validateOrThrow(ShipmentSchema, req.body);
            
            // Data is now type-safe
            await createShipment(shipmentData);
            
            return res.status(201).json({ success: true });
        } catch (error) {
            if (error.code === 'VALIDATION_ERROR') {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid shipment data',
                        details: error.details
                    }
                });
            }
            throw error;
        }
    }
}
```

### API Response Validation

```javascript
import { validate, APIResponseSchema } from '../lib/types';

async function fetchData() {
    const response = await fetch('/api/purchase-orders');
    const json = await response.json();
    
    const result = validate(APIResponseSchema, json);
    
    if (!result.success) {
        console.error('Invalid API response:', result.errors);
        throw new Error('Invalid API response format');
    }
    
    return result.data;
}
```

### Partial Updates

```javascript
import { createPartialSchema, VendorSchema, validate } from '../lib/types';

async function updateVendor(vendorId, updates) {
    const PartialVendor = createPartialSchema(VendorSchema);
    
    const result = validate(PartialVendor, updates);
    
    if (!result.success) {
        throw new Error('Invalid update data');
    }
    
    await db.collection('vendors').doc(vendorId).update(result.data);
}

// Usage
await updateVendor('vendor-123', {
    phone: '+91-9876543210',
    isActive: false
});
```

---

## Custom Validation

### Adding Custom Rules

```javascript
import { z } from 'zod';

// Custom PO number format
const PONumberSchema = z.string()
    .regex(/^PO-\d{4}-\d{4}$/, 'PO number must be in format PO-YYYY-NNNN');

// Custom GST number
const GSTNumberSchema = z.string()
    .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/, 'Invalid GST number')
    .optional();

// Use in schema
const CustomVendorSchema = VendorSchema.extend({
    gstNumber: GSTNumberSchema
});
```

### Conditional Validation

```javascript
const ShipmentWithDeliverySchema = ShipmentSchema.refine(
    (data) => {
        if (data.status === 'delivered') {
            return !!data.actualDeliveryDate;
        }
        return true;
    },
    {
        message: 'Delivery date required for delivered shipments',
        path: ['actualDeliveryDate']
    }
);
```

### Transform Data

```javascript
const DateTransformSchema = z.object({
    date: z.string().transform((val) => new Date(val))
});

const result = validate(DateTransformSchema, { date: '2024-01-15' });
// result.data.date is now a Date object
```

---

## Error Handling

### Error Structure

```javascript
const result = validate(UserSchema, { email: 'invalid' });

if (!result.success) {
    // result.errors = {
    //     'uid': 'Required',
    //     'email': 'Invalid email'
    // }
}
```

### Display Errors in UI

```javascript
function FormField({ name, errors, children }) {
    return (
        <div className="form-field">
            {children}
            {errors[name] && (
                <span className="text-red-500 text-sm">
                    {errors[name]}
                </span>
            )}
        </div>
    );
}

function MyForm() {
    const [errors, setErrors] = useState({});

    return (
        <form>
            <FormField name="email" errors={errors}>
                <input name="email" type="email" />
            </FormField>
            
            <FormField name="vendorId" errors={errors}>
                <select name="vendorId">...</select>
            </FormField>
        </form>
    );
}
```

---

## Best Practices

### 1. Validate at Boundaries

```javascript
// API route - validate incoming data
export default async function handler(req, res) {
    const data = validateOrThrow(Schema, req.body);
    // ...
}

// Component - validate before submit
const handleSubmit = () => {
    const result = validate(Schema, formData);
    if (!result.success) return;
    // ...
};
```

### 2. Use Defaults

```javascript
const ItemSchema = z.object({
    quantity: z.number().default(1),
    status: z.string().default('pending')
});

// Missing fields get defaults
validate(ItemSchema, {});
// { success: true, data: { quantity: 1, status: 'pending' } }
```

### 3. Compose Schemas

```javascript
const AddressSchema = z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    pincode: z.string()
});

const VendorWithAddressSchema = VendorSchema.extend({
    address: AddressSchema.optional()
});
```

### 4. Reuse Validation Logic

```javascript
// lib/validators.js
export const validatePO = (data) => validate(PurchaseOrderSchema, data);
export const validateVendor = (data) => validate(VendorSchema, data);
export const validateShipment = (data) => validate(ShipmentSchema, data);

// Usage
import { validatePO } from '../lib/validators';
const result = validatePO(formData);
```

---

## JSDoc Type Hints

For IDE support without TypeScript:

```javascript
/**
 * @typedef {import('../lib/types').PurchaseOrder} PurchaseOrder
 */

/**
 * Create a new purchase order
 * @param {PurchaseOrder} poData - The purchase order data
 * @returns {Promise<string>} The created PO ID
 */
async function createPO(poData) {
    // IDE now provides autocomplete for poData
}
```

---

## Migration from Joi

If migrating from Joi validation:

**Before (Joi):**
```javascript
const schema = Joi.object({
    email: Joi.string().email().required(),
    age: Joi.number().min(0).max(120)
});

const { error, value } = schema.validate(data);
```

**After (Zod):**
```javascript
const schema = z.object({
    email: z.string().email(),
    age: z.number().min(0).max(120)
});

const result = validate(schema, data);
// result.success, result.data, result.errors
```

---

**Type-safe coding!** 🛡️
