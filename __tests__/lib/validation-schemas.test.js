// __tests__/lib/validation-schemas.test.js
const {
    validatePurchaseOrder,
    validateStatusTransition,
    sanitizeInput,
    STATUS_TRANSITIONS
} = require('../../lib/validation-schemas');

describe('Validation Schemas', () => {
    describe('validatePurchaseOrder', () => {
        const validPO = {
            poNumber: 'PO-2024-001',
            vendorId: 'VENDOR-001',
            vendorWarehouseId: 'WH-001',
            poDate: new Date().toISOString(),
            expectedDeliveryDate: new Date(Date.now() + 86400000).toISOString(),
            items: [{ poQuantity: 100 }]
        };

        test('should validate a correct PO', () => {
            const result = validatePurchaseOrder(validPO);
            expect(result.valid).toBe(true);
            expect(result.data).toBeDefined();
        });

        test('should reject PO without poNumber', () => {
            const { poNumber, ...invalid } = validPO;
            const result = validatePurchaseOrder(invalid);
            expect(result.valid).toBe(false);
            expect(result.details).toHaveProperty('poNumber');
        });

        test('should reject PO with invalid poNumber format', () => {
            const result = validatePurchaseOrder({ ...validPO, poNumber: 'invalid lowercase' });
            expect(result.valid).toBe(false);
        });

        test('should reject PO without vendorId', () => {
            const { vendorId, ...invalid } = validPO;
            const result = validatePurchaseOrder(invalid);
            expect(result.valid).toBe(false);
            expect(result.details).toHaveProperty('vendorId');
        });

        test('should reject PO without items', () => {
            const result = validatePurchaseOrder({ ...validPO, items: [] });
            expect(result.valid).toBe(false);
        });

        test('should reject PO with invalid item quantity', () => {
            const result = validatePurchaseOrder({
                ...validPO,
                items: [{ poQuantity: 0 }]
            });
            expect(result.valid).toBe(false);
        });

        test('should reject expectedDeliveryDate before poDate', () => {
            const result = validatePurchaseOrder({
                ...validPO,
                poDate: new Date().toISOString(),
                expectedDeliveryDate: new Date(Date.now() - 86400000).toISOString()
            });
            expect(result.valid).toBe(false);
        });

        test('should allow optional notes', () => {
            const result = validatePurchaseOrder({
                ...validPO,
                notes: 'Some notes here'
            });
            expect(result.valid).toBe(true);
        });

        test('should strip unknown fields', () => {
            const result = validatePurchaseOrder({
                ...validPO,
                unknownField: 'should be removed'
            });
            expect(result.valid).toBe(true);
            expect(result.data.unknownField).toBeUndefined();
        });
    });

    describe('validatePurchaseOrder (update mode)', () => {
        test('should allow partial updates', () => {
            const result = validatePurchaseOrder({ notes: 'Updated notes' }, true);
            expect(result.valid).toBe(true);
        });

        test('should reject empty update', () => {
            const result = validatePurchaseOrder({}, true);
            expect(result.valid).toBe(false);
        });

        test('should validate status in update', () => {
            const result = validatePurchaseOrder({ status: 'approved' }, true);
            expect(result.valid).toBe(true);
        });

        test('should reject invalid status', () => {
            const result = validatePurchaseOrder({ status: 'invalid_status' }, true);
            expect(result.valid).toBe(false);
        });
    });

    describe('validateStatusTransition', () => {
        test('should allow valid transitions from draft', () => {
            expect(validateStatusTransition('draft', 'submitted').valid).toBe(true);
            expect(validateStatusTransition('draft', 'approved').valid).toBe(true);
            expect(validateStatusTransition('draft', 'cancelled').valid).toBe(true);
        });

        test('should reject invalid transitions from draft', () => {
            expect(validateStatusTransition('draft', 'fully_shipped').valid).toBe(false);
        });

        test('should allow valid transitions from approved', () => {
            expect(validateStatusTransition('approved', 'partially_shipped').valid).toBe(true);
            expect(validateStatusTransition('approved', 'cancelled').valid).toBe(true);
        });

        test('should reject any transition from fully_shipped', () => {
            expect(validateStatusTransition('fully_shipped', 'cancelled').valid).toBe(false);
            expect(validateStatusTransition('fully_shipped', 'draft').valid).toBe(false);
        });

        test('should reject any transition from cancelled', () => {
            expect(validateStatusTransition('cancelled', 'draft').valid).toBe(false);
            expect(validateStatusTransition('cancelled', 'approved').valid).toBe(false);
        });

        test('should provide error message for invalid transition', () => {
            const result = validateStatusTransition('cancelled', 'approved');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Cannot transition');
        });
    });

    describe('sanitizeInput', () => {
        test('should remove HTML tags', () => {
            expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
        });

        test('should remove javascript: protocol', () => {
            expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)');
        });

        test('should remove event handlers', () => {
            expect(sanitizeInput('onclick=alert(1)')).toBe('alert(1)');
            expect(sanitizeInput('onmouseover=hack()')).toBe('hack()');
        });

        test('should trim whitespace', () => {
            expect(sanitizeInput('  test  ')).toBe('test');
        });

        test('should handle nested objects', () => {
            const input = {
                name: '<script>bad</script>',
                nested: {
                    value: 'javascript:alert(1)'
                }
            };
            const result = sanitizeInput(input);
            expect(result.name).toBe('scriptbad/script');
            expect(result.nested.value).toBe('alert(1)');
        });

        test('should handle arrays', () => {
            const input = ['<b>test</b>', 'normal', '<script>bad</script>'];
            const result = sanitizeInput(input);
            expect(Array.isArray(result)).toBe(true);
            expect(result[0]).toBe('btest/b');
            expect(result[1]).toBe('normal');
        });

        test('should pass through numbers unchanged', () => {
            expect(sanitizeInput(123)).toBe(123);
            expect(sanitizeInput(45.67)).toBe(45.67);
        });

        test('should pass through null/undefined', () => {
            expect(sanitizeInput(null)).toBe(null);
            expect(sanitizeInput(undefined)).toBe(undefined);
        });
    });

    describe('STATUS_TRANSITIONS', () => {
        test('should have all expected statuses', () => {
            expect(STATUS_TRANSITIONS).toHaveProperty('draft');
            expect(STATUS_TRANSITIONS).toHaveProperty('submitted');
            expect(STATUS_TRANSITIONS).toHaveProperty('approved');
            expect(STATUS_TRANSITIONS).toHaveProperty('partially_shipped');
            expect(STATUS_TRANSITIONS).toHaveProperty('fully_shipped');
            expect(STATUS_TRANSITIONS).toHaveProperty('cancelled');
        });

        test('terminal states should have no transitions', () => {
            expect(STATUS_TRANSITIONS.fully_shipped).toEqual([]);
            expect(STATUS_TRANSITIONS.cancelled).toEqual([]);
        });
    });
});
