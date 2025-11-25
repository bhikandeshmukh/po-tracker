// __tests__/lib/validators.test.js
import { validateData, registerSchema, createVendorSchema, createPOSchema } from '../../lib/validators';

describe('Validators', () => {
    describe('registerSchema', () => {
        it('should validate correct registration data', () => {
            const data = {
                email: 'test@example.com',
                password: 'password123',
                firstName: 'John',
                lastName: 'Doe',
                phone: '+919876543210',
                role: 'user'
            };

            const result = validateData(registerSchema, data);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(data);
        });

        it('should reject invalid email', () => {
            const data = {
                email: 'invalid-email',
                password: 'password123',
                firstName: 'John',
                lastName: 'Doe',
                phone: '+919876543210'
            };

            const result = validateData(registerSchema, data);
            expect(result.success).toBe(false);
            expect(result.error.details).toHaveProperty('email');
        });

        it('should reject short password', () => {
            const data = {
                email: 'test@example.com',
                password: '123',
                firstName: 'John',
                lastName: 'Doe',
                phone: '+919876543210'
            };

            const result = validateData(registerSchema, data);
            expect(result.success).toBe(false);
            expect(result.error.details).toHaveProperty('password');
        });
    });

    describe('createVendorSchema', () => {
        it('should validate correct vendor data', () => {
            const data = {
                vendorName: 'ABC Traders',
                contactPerson: 'John Doe',
                email: 'vendor@example.com',
                phone: '+919876543210',
                address: {
                    street: '123 Main St',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    pincode: '400001',
                    country: 'India'
                }
            };

            const result = validateData(createVendorSchema, data);
            expect(result.success).toBe(true);
        });

        it('should reject missing required fields', () => {
            const data = {
                vendorName: 'ABC Traders'
            };

            const result = validateData(createVendorSchema, data);
            expect(result.success).toBe(false);
            expect(result.error.details).toHaveProperty('contactPerson');
        });
    });

    describe('createPOSchema', () => {
        it('should validate correct PO data', () => {
            const data = {
                poNumber: 'PO-2024-0001',
                vendorId: 'abc-traders',
                vendorWarehouseId: 'main-warehouse',
                poDate: '2024-11-23',
                expectedDeliveryDate: '2024-11-30',
                items: [
                    {
                        sku: 'SKU123',
                        itemName: 'Widget A',
                        poQuantity: 100,
                        unitPrice: 400,
                        mrp: 500,
                        gstRate: 18
                    }
                ]
            };

            const result = validateData(createPOSchema, data);
            expect(result.success).toBe(true);
        });

        it('should reject PO without items', () => {
            const data = {
                poNumber: 'PO-2024-0001',
                vendorId: 'abc-traders',
                vendorWarehouseId: 'main-warehouse',
                poDate: '2024-11-23',
                expectedDeliveryDate: '2024-11-30',
                items: []
            };

            const result = validateData(createPOSchema, data);
            expect(result.success).toBe(false);
            expect(result.error.details).toHaveProperty('items');
        });
    });
});
