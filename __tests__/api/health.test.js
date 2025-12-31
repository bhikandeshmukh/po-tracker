// __tests__/api/health.test.js
import { createMocks } from 'node-mocks-http';

// Mock firebase-admin before importing handler
jest.mock('../../lib/firebase-admin', () => ({
    db: {
        collection: jest.fn(() => ({
            limit: jest.fn(() => ({
                get: jest.fn(() => Promise.resolve({ docs: [] }))
            })),
            doc: jest.fn(() => ({
                get: jest.fn(() => Promise.resolve({ exists: true }))
            }))
        }))
    }
}));

import handler from '../../pages/api/health';

describe('/api/health', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return 200 for GET request', async () => {
        const { req, res } = createMocks({
            method: 'GET'
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const data = JSON.parse(res._getData());
        expect(data.success).toBe(true);
    });

    test('should include status in response', async () => {
        const { req, res } = createMocks({
            method: 'GET'
        });

        await handler(req, res);

        const data = JSON.parse(res._getData());
        expect(data.status).toBe('healthy');
    });

    test('should include timestamp', async () => {
        const { req, res } = createMocks({
            method: 'GET'
        });

        await handler(req, res);

        const data = JSON.parse(res._getData());
        expect(data.timestamp).toBeDefined();
    });

    test('should include services status', async () => {
        const { req, res } = createMocks({
            method: 'GET'
        });

        await handler(req, res);

        const data = JSON.parse(res._getData());
        expect(data.services).toBeDefined();
        expect(data.services.firestore).toBeDefined();
        expect(data.services.api).toBeDefined();
    });

    test('should return 405 for non-GET methods', async () => {
        const { req, res } = createMocks({
            method: 'POST'
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(405);
    });

    test('should return 503 when Firestore fails', async () => {
        // Re-mock to simulate failure
        const { db } = require('../../lib/firebase-admin');
        db.collection.mockImplementationOnce(() => ({
            limit: jest.fn(() => ({
                get: jest.fn(() => Promise.reject(new Error('Connection failed')))
            }))
        }));

        const { req, res } = createMocks({
            method: 'GET'
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(503);
        const data = JSON.parse(res._getData());
        expect(data.status).toBe('unhealthy');
    });
});
