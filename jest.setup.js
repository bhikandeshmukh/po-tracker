// jest.setup.js
// Jest setup file

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
process.env.FIREBASE_PRIVATE_KEY = 'test-key';

// Mock Firebase Admin
jest.mock('./lib/firebase-admin', () => ({
    db: {
        collection: jest.fn(() => ({
            limit: jest.fn(() => ({
                get: jest.fn(() => Promise.resolve({ docs: [] }))
            }))
        }))
    },
    auth: {
        verifyIdToken: jest.fn()
    }
}));

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
};
