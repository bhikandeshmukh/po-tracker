// __tests__/lib/request-deduplicator.test.js
import deduplicator from '../../lib/request-deduplicator';

describe('RequestDeduplicator', () => {
    beforeEach(() => {
        deduplicator.clear();
    });

    test('should execute request and return result', async () => {
        const mockFn = jest.fn().mockResolvedValue({ data: 'test' });
        const result = await deduplicator.execute('key1', mockFn);
        
        expect(result).toEqual({ data: 'test' });
        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('should deduplicate parallel requests with same key', async () => {
        let resolveRequest;
        const mockFn = jest.fn().mockImplementation(() => 
            new Promise(resolve => { resolveRequest = resolve; })
        );

        const p1 = deduplicator.execute('sameKey', mockFn);
        const p2 = deduplicator.execute('sameKey', mockFn);
        const p3 = deduplicator.execute('sameKey', mockFn);

        resolveRequest({ data: 'shared' });

        const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(r1).toEqual({ data: 'shared' });
        expect(r2).toEqual({ data: 'shared' });
        expect(r3).toEqual({ data: 'shared' });
    });

    test('should NOT deduplicate requests with different keys', async () => {
        const mockFn = jest.fn().mockResolvedValue({ data: 'test' });

        await Promise.all([
            deduplicator.execute('key1', mockFn),
            deduplicator.execute('key2', mockFn),
            deduplicator.execute('key3', mockFn)
        ]);

        expect(mockFn).toHaveBeenCalledTimes(3);
    });

    test('should allow new request after previous completes', async () => {
        const mockFn = jest.fn()
            .mockResolvedValueOnce({ data: 'first' })
            .mockResolvedValueOnce({ data: 'second' });

        const r1 = await deduplicator.execute('key', mockFn);
        const r2 = await deduplicator.execute('key', mockFn);

        expect(mockFn).toHaveBeenCalledTimes(2);
        expect(r1).toEqual({ data: 'first' });
        expect(r2).toEqual({ data: 'second' });
    });

    test('should handle rejected promises', async () => {
        const mockFn = jest.fn().mockRejectedValue(new Error('Failed'));

        await expect(deduplicator.execute('failKey', mockFn)).rejects.toThrow('Failed');
        expect(deduplicator.getPendingCount()).toBe(0);
    });

    test('should share rejection across deduplicated requests', async () => {
        let rejectRequest;
        const mockFn = jest.fn().mockImplementation(() => 
            new Promise((_, reject) => { rejectRequest = reject; })
        );

        const p1 = deduplicator.execute('rejectKey', mockFn);
        const p2 = deduplicator.execute('rejectKey', mockFn);

        rejectRequest(new Error('Shared failure'));

        await expect(p1).rejects.toThrow('Shared failure');
        await expect(p2).rejects.toThrow('Shared failure');
        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('should cancel pending request', () => {
        const mockFn = jest.fn().mockImplementation(() => new Promise(() => {}));
        deduplicator.execute('cancelKey', mockFn);
        
        expect(deduplicator.getPendingCount()).toBe(1);
        deduplicator.cancel('cancelKey');
        expect(deduplicator.getPendingCount()).toBe(0);
    });

    test('should clear all pending requests', () => {
        const mockFn = jest.fn().mockImplementation(() => new Promise(() => {}));
        
        deduplicator.execute('key1', mockFn);
        deduplicator.execute('key2', mockFn);
        deduplicator.execute('key3', mockFn);
        
        expect(deduplicator.getPendingCount()).toBe(3);
        deduplicator.clear();
        expect(deduplicator.getPendingCount()).toBe(0);
    });

    test('should return correct pending count', () => {
        const mockFn = jest.fn().mockImplementation(() => new Promise(() => {}));
        
        expect(deduplicator.getPendingCount()).toBe(0);
        deduplicator.execute('key1', mockFn);
        expect(deduplicator.getPendingCount()).toBe(1);
        deduplicator.execute('key2', mockFn);
        expect(deduplicator.getPendingCount()).toBe(2);
    });
});
