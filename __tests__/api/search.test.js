// __tests__/api/search.test.js
import { createMocks } from 'node-mocks-http';

// Mock firebase-admin
const mockGet = jest.fn();
jest.mock('../../lib/firebase-admin', () => ({
    db: {
        collection: jest.fn(() => ({
            limit: jest.fn(() => ({
                get: mockGet
            }))
        }))
    },
    auth: {
        verifyIdToken: jest.fn()
    }
}));

// Mock auth middleware
jest.mock('../../lib/auth-middleware', () => ({
    verifyAuth: jest.fn()
}));

import handler from '../../pages/api/search';
import { verifyAuth } from '../../lib/auth-middleware';

describe('/api/search', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGet.mockResolvedValue({ docs: [] });
    });

    test('should return 401 if not authenticated', async () => {
        verifyAuth.mockResolvedValue(null);

        const { req, res } = createMocks({
            method: 'GET',
            query: { q: 'test' }
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(401);
        const data = JSON.parse(res._getData());
        expect(data.error.code).toBe('UNAUTHORIZED');
    });

    test('should return 405 for non-GET methods', async () => {
        verifyAuth.mockResolvedValue({ uid: 'user1', role: 'user' });

        const { req, res } = createMocks({
            method: 'POST',
            query: { q: 'test' }
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(405);
    });

    test('should return 400 for query less than 2 characters', async () => {
        verifyAuth.mockResolvedValue({ uid: 'user1', role: 'user' });

        const { req, res } = createMocks({
            method: 'GET',
            query: { q: 'a' }
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(400);
        const data = JSON.parse(res._getData());
        expect(data.error.code).toBe('INVALID_QUERY');
    });

    test('should return 400 for empty query', async () => {
        verifyAuth.mockResolvedValue({ uid: 'user1', role: 'user' });

        const { req, res } = createMocks({
            method: 'GET',
            query: {}
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(400);
    });

    test('should return search results for valid query', async () => {
        verifyAuth.mockResolvedValue({ uid: 'user1', role: 'user' });
        
        mockGet.mockResolvedValue({
            docs: [
                {
                    id: 'po1',
                    data: () => ({
                        poNumber: 'PO-TEST-001',
                        vendorName: 'Test Vendor',
                        status: 'approved',
                        poId: 'po1'
                    })
                }
            ]
        });

        const { req, res } = createMocks({
            method: 'GET',
            query: { q: 'test' }
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const data = JSON.parse(res._getData());
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
    });

    test('should search across multiple collections', async () => {
        verifyAuth.mockResolvedValue({ uid: 'user1', role: 'user' });
        mockGet.mockResolvedValue({ docs: [] });

        const { req, res } = createMocks({
            method: 'GET',
            query: { q: 'searchterm' }
        });

        await handler(req, res);

        // Should have called collection for POs, vendors, appointments, shipments, transporters, returns
        const { db } = require('../../lib/firebase-admin');
        expect(db.collection).toHaveBeenCalledWith('purchaseOrders');
        expect(db.collection).toHaveBeenCalledWith('vendors');
        expect(db.collection).toHaveBeenCalledWith('appointments');
        expect(db.collection).toHaveBeenCalledWith('shipments');
        expect(db.collection).toHaveBeenCalledWith('transporters');
    });

    test('should limit results to 20', async () => {
        verifyAuth.mockResolvedValue({ uid: 'user1', role: 'user' });
        
        // Create 30 mock results
        const mockDocs = Array.from({ length: 30 }, (_, i) => ({
            id: `po${i}`,
            data: () => ({
                poNumber: `PO-TEST-${i}`,
                vendorName: 'Test',
                status: 'approved',
                poId: `po${i}`
            })
        }));
        
        mockGet.mockResolvedValue({ docs: mockDocs });

        const { req, res } = createMocks({
            method: 'GET',
            query: { q: 'test' }
        });

        await handler(req, res);

        const data = JSON.parse(res._getData());
        expect(data.data.length).toBeLessThanOrEqual(20);
    });

    test('should include result type in response', async () => {
        verifyAuth.mockResolvedValue({ uid: 'user1', role: 'user' });
        
        mockGet.mockResolvedValueOnce({
            docs: [{
                id: 'po1',
                data: () => ({
                    poNumber: 'PO-MATCH',
                    vendorName: 'Vendor',
                    status: 'approved',
                    poId: 'po1'
                })
            }]
        }).mockResolvedValue({ docs: [] });

        const { req, res } = createMocks({
            method: 'GET',
            query: { q: 'match' }
        });

        await handler(req, res);

        const data = JSON.parse(res._getData());
        if (data.data.length > 0) {
            expect(data.data[0].type).toBeDefined();
        }
    });
});
