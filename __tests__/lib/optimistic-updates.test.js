// __tests__/lib/optimistic-updates.test.js
import {
    withOptimisticUpdate,
    generateOptimisticId,
    isOptimisticId,
    createOptimisticPO,
    createOptimisticItem
} from '../../lib/optimistic-updates';

describe('Optimistic Updates', () => {
    describe('withOptimisticUpdate', () => {
        test('should apply optimistic update immediately', async () => {
            let state = 'initial';
            
            await withOptimisticUpdate({
                optimisticUpdate: () => { state = 'optimistic'; },
                apiCall: () => Promise.resolve({ data: 'success' }),
                onSuccess: () => { state = 'confirmed'; }
            });

            expect(state).toBe('confirmed');
        });

        test('should rollback on API failure', async () => {
            let state = 'initial';
            
            await withOptimisticUpdate({
                optimisticUpdate: () => { state = 'optimistic'; },
                apiCall: () => Promise.reject(new Error('API failed')),
                rollback: () => { state = 'rolled_back'; },
                onError: () => {}
            });

            expect(state).toBe('rolled_back');
        });

        test('should return success result on success', async () => {
            const result = await withOptimisticUpdate({
                optimisticUpdate: () => {},
                apiCall: () => Promise.resolve({ id: 123 })
            });

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ id: 123 });
        });

        test('should return error result on failure', async () => {
            const error = new Error('Test error');
            const result = await withOptimisticUpdate({
                optimisticUpdate: () => {},
                apiCall: () => Promise.reject(error),
                rollback: () => {}
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe(error);
        });

        test('should call onSuccess with API result', async () => {
            const onSuccess = jest.fn();
            
            await withOptimisticUpdate({
                optimisticUpdate: () => {},
                apiCall: () => Promise.resolve({ data: 'test' }),
                onSuccess
            });

            expect(onSuccess).toHaveBeenCalledWith({ data: 'test' });
        });

        test('should call onError with error', async () => {
            const onError = jest.fn();
            const error = new Error('Test');
            
            await withOptimisticUpdate({
                optimisticUpdate: () => {},
                apiCall: () => Promise.reject(error),
                rollback: () => {},
                onError
            });

            expect(onError).toHaveBeenCalledWith(error);
        });
    });

    describe('generateOptimisticId', () => {
        test('should generate unique IDs', () => {
            const id1 = generateOptimisticId();
            const id2 = generateOptimisticId();
            expect(id1).not.toBe(id2);
        });

        test('should start with optimistic_ prefix', () => {
            const id = generateOptimisticId();
            expect(id.startsWith('optimistic_')).toBe(true);
        });

        test('should contain timestamp', () => {
            const before = Date.now();
            const id = generateOptimisticId();
            const after = Date.now();
            
            const parts = id.split('_');
            const timestamp = parseInt(parts[1], 10);
            
            expect(timestamp).toBeGreaterThanOrEqual(before);
            expect(timestamp).toBeLessThanOrEqual(after);
        });
    });

    describe('isOptimisticId', () => {
        test('should return true for optimistic IDs', () => {
            expect(isOptimisticId('optimistic_123_abc')).toBe(true);
            expect(isOptimisticId(generateOptimisticId())).toBe(true);
        });

        test('should return false for regular IDs', () => {
            expect(isOptimisticId('PO-2024-001')).toBe(false);
            expect(isOptimisticId('abc123')).toBe(false);
            expect(isOptimisticId('123')).toBe(false);
        });

        test('should return false for non-strings', () => {
            expect(isOptimisticId(123)).toBe(false);
            expect(isOptimisticId(null)).toBe(false);
            expect(isOptimisticId(undefined)).toBe(false);
            expect(isOptimisticId({})).toBe(false);
        });
    });

    describe('createOptimisticPO', () => {
        const formData = {
            poNumber: 'PO-2024-001',
            vendorId: 'V001',
            vendorWarehouseId: 'WH001',
            poDate: '2024-01-15',
            expectedDelivery: '2024-01-20',
            notes: 'Test notes',
            items: [
                { totalPrice: 100 },
                { totalPrice: 200 }
            ]
        };

        const user = { uid: 'user123', name: 'Test User' };

        test('should create PO with optimistic ID', () => {
            const po = createOptimisticPO(formData, user);
            expect(isOptimisticId(po.id)).toBe(true);
        });

        test('should set status to draft', () => {
            const po = createOptimisticPO(formData, user);
            expect(po.status).toBe('draft');
        });

        test('should calculate grand total from items', () => {
            const po = createOptimisticPO(formData, user);
            expect(po.grandTotal).toBe(300);
        });

        test('should set totalItems count', () => {
            const po = createOptimisticPO(formData, user);
            expect(po.totalItems).toBe(2);
        });

        test('should mark as optimistic', () => {
            const po = createOptimisticPO(formData, user);
            expect(po._optimistic).toBe(true);
        });

        test('should include timestamps', () => {
            const po = createOptimisticPO(formData, user);
            expect(po.createdAt).toBeDefined();
            expect(po.updatedAt).toBeDefined();
        });
    });

    describe('createOptimisticItem', () => {
        const itemData = {
            sku: 'SKU-001',
            itemName: 'Test Item',
            poQuantity: 100,
            unitPrice: 50,
            gstRate: 18
        };

        test('should create item with optimistic ID', () => {
            const item = createOptimisticItem(itemData, 1);
            expect(isOptimisticId(item.id)).toBe(true);
        });

        test('should set line number', () => {
            const item = createOptimisticItem(itemData, 5);
            expect(item.lineNumber).toBe(5);
        });

        test('should initialize shipped quantity to 0', () => {
            const item = createOptimisticItem(itemData, 1);
            expect(item.shippedQuantity).toBe(0);
        });

        test('should set pending quantity equal to PO quantity', () => {
            const item = createOptimisticItem(itemData, 1);
            expect(item.pendingQuantity).toBe(100);
        });

        test('should calculate GST amount', () => {
            const item = createOptimisticItem(itemData, 1);
            // 100 * 50 = 5000, 18% GST = 900
            expect(item.gstAmount).toBe(900);
        });

        test('should calculate total amount with GST', () => {
            const item = createOptimisticItem(itemData, 1);
            // 5000 + 900 = 5900
            expect(item.totalAmount).toBe(5900);
        });

        test('should mark as optimistic', () => {
            const item = createOptimisticItem(itemData, 1);
            expect(item._optimistic).toBe(true);
        });
    });
});
