// __tests__/lib/types.test.js
import {
    UserSchema,
    VendorSchema,
    TransporterSchema,
    PurchaseOrderSchema,
    ShipmentSchema,
    AppointmentSchema,
    POItemSchema,
    validate,
    validateOrThrow,
    createPartialSchema
} from '../../lib/types';

describe('Type Schemas', () => {
    describe('UserSchema', () => {
        test('should validate valid user', () => {
            const user = {
                uid: 'user123',
                email: 'test@example.com',
                name: 'Test User',
                role: 'user'
            };
            const result = validate(UserSchema, user);
            expect(result.success).toBe(true);
        });

        test('should reject invalid email', () => {
            const user = {
                uid: 'user123',
                email: 'invalid-email',
                role: 'user'
            };
            const result = validate(UserSchema, user);
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();
        });

        test('should reject invalid role', () => {
            const user = {
                uid: 'user123',
                email: 'test@example.com',
                role: 'invalid_role'
            };
            const result = validate(UserSchema, user);
            expect(result.success).toBe(false);
        });

        test('should default role to user', () => {
            const user = {
                uid: 'user123',
                email: 'test@example.com'
            };
            const result = validate(UserSchema, user);
            expect(result.success).toBe(true);
            expect(result.data.role).toBe('user');
        });
    });

    describe('VendorSchema', () => {
        test('should validate valid vendor', () => {
            const vendor = {
                vendorId: 'V001',
                vendorName: 'Test Vendor',
                email: 'vendor@example.com'
            };
            const result = validate(VendorSchema, vendor);
            expect(result.success).toBe(true);
        });

        test('should reject empty vendor name', () => {
            const vendor = {
                vendorId: 'V001',
                vendorName: ''
            };
            const result = validate(VendorSchema, vendor);
            expect(result.success).toBe(false);
        });

        test('should allow empty email string', () => {
            const vendor = {
                vendorId: 'V001',
                vendorName: 'Test',
                email: ''
            };
            const result = validate(VendorSchema, vendor);
            expect(result.success).toBe(true);
        });
    });

    describe('PurchaseOrderSchema', () => {
        const validPO = {
            poId: 'PO-001',
            poNumber: 'PO-2024-001',
            vendorId: 'V001',
            vendorWarehouseId: 'WH001',
            poDate: '2024-01-15',
            expectedDeliveryDate: '2024-01-20'
        };

        test('should validate valid PO', () => {
            const result = validate(PurchaseOrderSchema, validPO);
            expect(result.success).toBe(true);
        });

        test('should reject missing poNumber', () => {
            const { poNumber, ...invalid } = validPO;
            const result = validate(PurchaseOrderSchema, invalid);
            expect(result.success).toBe(false);
        });

        test('should default status to draft', () => {
            const result = validate(PurchaseOrderSchema, validPO);
            expect(result.data.status).toBe('draft');
        });

        test('should validate all status values', () => {
            const statuses = [
                'draft', 'submitted', 'approved', 'partial_sent',
                'partially_shipped', 'fully_shipped', 'partial_completed',
                'completed', 'cancelled'
            ];
            
            statuses.forEach(status => {
                const result = validate(PurchaseOrderSchema, { ...validPO, status });
                expect(result.success).toBe(true);
            });
        });

        test('should reject invalid status', () => {
            const result = validate(PurchaseOrderSchema, { ...validPO, status: 'invalid' });
            expect(result.success).toBe(false);
        });
    });

    describe('POItemSchema', () => {
        test('should validate valid item', () => {
            const item = {
                poQuantity: 100,
                unitPrice: 50,
                gstRate: 18
            };
            const result = validate(POItemSchema, item);
            expect(result.success).toBe(true);
        });

        test('should reject zero quantity', () => {
            const item = { poQuantity: 0 };
            const result = validate(POItemSchema, item);
            expect(result.success).toBe(false);
        });

        test('should reject negative quantity', () => {
            const item = { poQuantity: -5 };
            const result = validate(POItemSchema, item);
            expect(result.success).toBe(false);
        });

        test('should default shipped quantity to 0', () => {
            const item = { poQuantity: 100 };
            const result = validate(POItemSchema, item);
            expect(result.data.shippedQuantity).toBe(0);
        });
    });

    describe('ShipmentSchema', () => {
        const validShipment = {
            shipmentId: 'SH-001',
            poId: 'PO-001',
            transporterId: 'T001',
            shipmentDate: '2024-01-15'
        };

        test('should validate valid shipment', () => {
            const result = validate(ShipmentSchema, validShipment);
            expect(result.success).toBe(true);
        });

        test('should reject missing transporterId', () => {
            const { transporterId, ...invalid } = validShipment;
            const result = validate(ShipmentSchema, invalid);
            expect(result.success).toBe(false);
        });

        test('should default status to created', () => {
            const result = validate(ShipmentSchema, validShipment);
            expect(result.data.status).toBe('created');
        });
    });

    describe('AppointmentSchema', () => {
        const validAppointment = {
            appointmentId: 'APT-001',
            shipmentId: 'SH-001',
            scheduledDate: '2024-01-20'
        };

        test('should validate valid appointment', () => {
            const result = validate(AppointmentSchema, validAppointment);
            expect(result.success).toBe(true);
        });

        test('should reject missing shipmentId', () => {
            const { shipmentId, ...invalid } = validAppointment;
            const result = validate(AppointmentSchema, invalid);
            expect(result.success).toBe(false);
        });
    });

    describe('validate helper', () => {
        test('should return success true for valid data', () => {
            const result = validate(UserSchema, {
                uid: 'u1',
                email: 'test@test.com'
            });
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
        });

        test('should return errors object for invalid data', () => {
            const result = validate(UserSchema, {
                uid: 'u1',
                email: 'invalid'
            });
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();
        });
    });

    describe('validateOrThrow helper', () => {
        test('should return data for valid input', () => {
            const data = validateOrThrow(UserSchema, {
                uid: 'u1',
                email: 'test@test.com'
            });
            expect(data.uid).toBe('u1');
        });

        test('should throw for invalid input', () => {
            expect(() => {
                validateOrThrow(UserSchema, {
                    uid: 'u1',
                    email: 'invalid'
                });
            }).toThrow('Validation failed');
        });

        test('should include error details in thrown error', () => {
            try {
                validateOrThrow(UserSchema, {
                    uid: 'u1',
                    email: 'invalid'
                });
            } catch (error) {
                expect(error.code).toBe('VALIDATION_ERROR');
                expect(error.details).toBeDefined();
            }
        });
    });

    describe('createPartialSchema helper', () => {
        test('should make all fields optional', () => {
            const PartialVendor = createPartialSchema(VendorSchema);
            const result = validate(PartialVendor, {});
            expect(result.success).toBe(true);
        });

        test('should still validate provided fields when invalid', () => {
            const PartialUser = createPartialSchema(UserSchema);
            // Email validation should still apply when email is provided
            const result = validate(PartialUser, {
                email: 'not-an-email'
            });
            expect(result.success).toBe(false);
            expect(result.errors).toBeDefined();
        });
    });
});
