// __tests__/lib/cache.test.js
import cache, { cacheKeys } from '../../lib/cache';

describe('Cache', () => {
    beforeEach(() => {
        cache.clear();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('basic operations', () => {
        test('should set and get values', () => {
            cache.set('key1', { data: 'test' });
            expect(cache.get('key1')).toEqual({ data: 'test' });
        });

        test('should return undefined for non-existent keys', () => {
            expect(cache.get('nonexistent')).toBeUndefined();
        });

        test('should check if key exists', () => {
            cache.set('exists', 'value');
            expect(cache.has('exists')).toBe(true);
            expect(cache.has('notexists')).toBe(false);
        });

        test('should delete keys', () => {
            cache.set('toDelete', 'value');
            expect(cache.has('toDelete')).toBe(true);
            cache.delete('toDelete');
            expect(cache.has('toDelete')).toBe(false);
        });

        test('should clear all entries', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            expect(cache.size()).toBe(2);
            cache.clear();
            expect(cache.size()).toBe(0);
        });

        test('should return correct size', () => {
            expect(cache.size()).toBe(0);
            cache.set('key1', 'value1');
            expect(cache.size()).toBe(1);
            cache.set('key2', 'value2');
            expect(cache.size()).toBe(2);
        });
    });

    describe('TTL expiration', () => {
        test('should expire entries after TTL', () => {
            cache.set('expiring', 'value', 1000); // 1 second TTL
            expect(cache.get('expiring')).toBe('value');
            
            jest.advanceTimersByTime(1001);
            expect(cache.get('expiring')).toBeUndefined();
        });

        test('should use default TTL of 5 minutes', () => {
            cache.set('defaultTTL', 'value');
            expect(cache.get('defaultTTL')).toBe('value');
            
            jest.advanceTimersByTime(299999); // Just under 5 minutes
            expect(cache.get('defaultTTL')).toBe('value');
            
            jest.advanceTimersByTime(2); // Push past 5 minutes
            expect(cache.get('defaultTTL')).toBeUndefined();
        });

        test('should reset TTL when overwriting key', () => {
            cache.set('resetTTL', 'value1', 1000);
            jest.advanceTimersByTime(500);
            cache.set('resetTTL', 'value2', 1000);
            jest.advanceTimersByTime(600);
            expect(cache.get('resetTTL')).toBe('value2');
        });
    });

    describe('cacheKeys helpers', () => {
        test('should generate dashboard metrics key', () => {
            expect(cacheKeys.dashboardMetrics).toBe('dashboard:metrics');
        });

        test('should generate vendor keys with params', () => {
            expect(cacheKeys.vendors({ status: 'active' })).toBe('vendors:{"status":"active"}');
            expect(cacheKeys.vendor('v123')).toBe('vendor:v123');
        });

        test('should generate PO keys', () => {
            expect(cacheKeys.purchaseOrders({ status: 'draft' })).toBe('pos:{"status":"draft"}');
            expect(cacheKeys.purchaseOrder('PO-001')).toBe('po:PO-001');
        });

        test('should generate shipment keys', () => {
            expect(cacheKeys.shipments({ poId: 'PO-001' })).toBe('shipments:{"poId":"PO-001"}');
        });

        test('should generate activity keys', () => {
            expect(cacheKeys.recentActivities(10)).toBe('activities:10');
        });
    });
});
