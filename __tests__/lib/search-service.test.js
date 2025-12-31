// __tests__/lib/search-service.test.js

// Mock firebase-admin before importing
jest.mock('../../lib/firebase-admin', () => ({
    db: {
        collection: jest.fn(() => ({
            doc: jest.fn(() => ({
                set: jest.fn(() => Promise.resolve()),
                delete: jest.fn(() => Promise.resolve())
            })),
            where: jest.fn(() => ({
                where: jest.fn(() => ({
                    limit: jest.fn(() => ({
                        get: jest.fn(() => Promise.resolve({ docs: [] }))
                    }))
                })),
                limit: jest.fn(() => ({
                    get: jest.fn(() => Promise.resolve({ docs: [] }))
                }))
            })),
            limit: jest.fn(() => ({
                get: jest.fn(() => Promise.resolve({ docs: [] }))
            })),
            get: jest.fn(() => Promise.resolve({ docs: [] }))
        }))
    }
}));

import { generateSearchTokens, SEARCH_CONFIG } from '../../lib/search-service';

describe('Search Service', () => {
    describe('generateSearchTokens', () => {
        test('should generate tokens from single word', () => {
            const tokens = generateSearchTokens('hello');
            expect(tokens).toContain('hello');
            expect(tokens).toContain('he');
            expect(tokens).toContain('hel');
            expect(tokens).toContain('hell');
        });

        test('should generate tokens from multiple words', () => {
            const tokens = generateSearchTokens('hello world');
            expect(tokens).toContain('hello');
            expect(tokens).toContain('world');
            expect(tokens).toContain('wo');
            expect(tokens).toContain('wor');
        });

        test('should convert to lowercase', () => {
            const tokens = generateSearchTokens('HELLO World');
            expect(tokens).toContain('hello');
            expect(tokens).toContain('world');
            expect(tokens).not.toContain('HELLO');
        });

        test('should handle empty string', () => {
            const tokens = generateSearchTokens('');
            expect(tokens).toEqual([]);
        });

        test('should handle null/undefined', () => {
            expect(generateSearchTokens(null)).toEqual([]);
            expect(generateSearchTokens(undefined)).toEqual([]);
        });

        test('should not create prefix tokens shorter than 2 chars', () => {
            const tokens = generateSearchTokens('hello');
            // Should have 'he', 'hel', 'hell', 'hello' but not 'h'
            expect(tokens).not.toContain('h');
            expect(tokens).toContain('he');
        });

        test('should handle special characters in words', () => {
            const tokens = generateSearchTokens('PO-2024-001');
            expect(tokens).toContain('po-2024-001');
        });
    });

    describe('SEARCH_CONFIG', () => {
        test('should have configuration for all entity types', () => {
            expect(SEARCH_CONFIG).toHaveProperty('purchaseOrder');
            expect(SEARCH_CONFIG).toHaveProperty('vendor');
            expect(SEARCH_CONFIG).toHaveProperty('appointment');
            expect(SEARCH_CONFIG).toHaveProperty('shipment');
            expect(SEARCH_CONFIG).toHaveProperty('transporter');
            expect(SEARCH_CONFIG).toHaveProperty('returnOrder');
        });

        test('each config should have required fields', () => {
            Object.values(SEARCH_CONFIG).forEach(config => {
                expect(config).toHaveProperty('collection');
                expect(config).toHaveProperty('searchFields');
                expect(config).toHaveProperty('displayFields');
                expect(Array.isArray(config.searchFields)).toBe(true);
            });
        });

        test('displayFields should have title, subtitle, and link', () => {
            Object.values(SEARCH_CONFIG).forEach(config => {
                expect(config.displayFields).toHaveProperty('title');
                expect(config.displayFields).toHaveProperty('subtitle');
                expect(config.displayFields).toHaveProperty('link');
            });
        });

        test('subtitle and link should be functions', () => {
            Object.values(SEARCH_CONFIG).forEach(config => {
                expect(typeof config.displayFields.subtitle).toBe('function');
                expect(typeof config.displayFields.link).toBe('function');
            });
        });

        test('purchaseOrder config should search correct fields', () => {
            const poConfig = SEARCH_CONFIG.purchaseOrder;
            expect(poConfig.searchFields).toContain('poNumber');
            expect(poConfig.searchFields).toContain('vendorName');
            expect(poConfig.collection).toBe('purchaseOrders');
        });

        test('vendor config should search correct fields', () => {
            const vendorConfig = SEARCH_CONFIG.vendor;
            expect(vendorConfig.searchFields).toContain('vendorName');
            expect(vendorConfig.searchFields).toContain('email');
            expect(vendorConfig.collection).toBe('vendors');
        });
    });

    describe('displayFields functions', () => {
        test('purchaseOrder subtitle should format correctly', () => {
            const config = SEARCH_CONFIG.purchaseOrder;
            const data = { vendorName: 'Test Vendor', status: 'approved' };
            expect(config.displayFields.subtitle(data)).toBe('Test Vendor - approved');
        });

        test('purchaseOrder link should format correctly', () => {
            const config = SEARCH_CONFIG.purchaseOrder;
            const data = { poId: 'PO-001' };
            expect(config.displayFields.link(data)).toBe('/purchase-orders/PO-001');
        });

        test('vendor subtitle should handle missing fields', () => {
            const config = SEARCH_CONFIG.vendor;
            const data = {};
            expect(config.displayFields.subtitle(data)).toBe('');
        });

        test('shipment link should use shipmentId', () => {
            const config = SEARCH_CONFIG.shipment;
            const data = { shipmentId: 'SH-001' };
            expect(config.displayFields.link(data)).toBe('/shipments/SH-001');
        });
    });
});
