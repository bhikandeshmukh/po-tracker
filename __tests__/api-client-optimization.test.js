// __tests__/api-client-optimization.test.js
import apiClient from '../lib/api-client';
import cache from '../lib/cache';
import deduplicator from '../lib/request-deduplicator';

// Mock fetch
global.fetch = jest.fn();

// Mock console.error to keep test output clean
console.error = jest.fn();

describe('APIClient Optimization', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        cache.clear();
        deduplicator.clear();

        // Default success response
        global.fetch.mockResolvedValue({
            ok: true,
            headers: {
                get: () => 'application/json'
            },
            json: () => Promise.resolve({ success: true, data: { id: 1, name: 'Test' } })
        });
    });

    test('should cache successful GET requests', async () => {
        const endpoint = '/test-cache';

        // First request - should fetch
        await apiClient.get(endpoint);
        expect(global.fetch).toHaveBeenCalledTimes(1);

        // Second request - should use cache
        await apiClient.get(endpoint);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('should NOT cache if force refresh is requested', async () => {
        const endpoint = '/test-refresh';

        // First request
        await apiClient.get(endpoint);
        expect(global.fetch).toHaveBeenCalledTimes(1);

        // Second request with refresh param
        await apiClient.get(endpoint, { refresh: 'true' });
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('should NOT cache if timestamp param is present', async () => {
        const endpoint = '/test-timestamp';

        // First request
        await apiClient.get(endpoint);
        expect(global.fetch).toHaveBeenCalledTimes(1);

        // Second request with timestamp
        await apiClient.get(endpoint, { _t: Date.now() });
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('should deduplicate parallel GET requests', async () => {
        const endpoint = '/test-dedup';

        // Simulate slow network
        global.fetch.mockImplementation(() => new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    ok: true,
                    headers: { get: () => 'application/json' },
                    json: () => Promise.resolve({ success: true, data: 'delayed' })
                });
            }, 100);
        }));

        // Fire two requests simultaneously
        const p1 = apiClient.get(endpoint);
        const p2 = apiClient.get(endpoint);

        await Promise.all([p1, p2]);

        // Should only fetch once
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('should handle concurrent requests for DIFFERENT endpoints separately', async () => {
        // Fire two requests for different endpoints
        const p1 = apiClient.get('/endpoint-1');
        const p2 = apiClient.get('/endpoint-2');

        await Promise.all([p1, p2]);

        // Should fetch twice
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });
});
