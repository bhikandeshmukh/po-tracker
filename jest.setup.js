// jest.setup.js
// Jest setup file

import '@testing-library/jest-dom';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';
process.env.FIREBASE_PRIVATE_KEY = 'test-key';
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';

// Mock Firebase Admin
jest.mock('./lib/firebase-admin', () => ({
    db: {
        collection: jest.fn(() => ({
            doc: jest.fn(() => ({
                get: jest.fn(() => Promise.resolve({ exists: true, data: () => ({}) })),
                set: jest.fn(() => Promise.resolve()),
                update: jest.fn(() => Promise.resolve())
            })),
            limit: jest.fn(() => ({
                get: jest.fn(() => Promise.resolve({ docs: [] }))
            })),
            where: jest.fn(() => ({
                get: jest.fn(() => Promise.resolve({ docs: [] })),
                limit: jest.fn(() => ({
                    get: jest.fn(() => Promise.resolve({ docs: [] }))
                }))
            })),
            orderBy: jest.fn(() => ({
                limit: jest.fn(() => ({
                    get: jest.fn(() => Promise.resolve({ docs: [] }))
                }))
            })),
            get: jest.fn(() => Promise.resolve({ docs: [] }))
        })),
        runTransaction: jest.fn((fn) => fn({
            get: jest.fn(),
            set: jest.fn(),
            update: jest.fn()
        }))
    },
    auth: {
        verifyIdToken: jest.fn(() => Promise.resolve({ uid: 'test-user' }))
    }
}));

// Mock Firebase client
jest.mock('./lib/firebase', () => ({
    app: {},
    auth: {},
    db: {},
    messaging: null
}));

// Mock window.location
Object.defineProperty(window, 'location', {
    value: {
        href: 'http://localhost:3000',
        reload: jest.fn(),
        assign: jest.fn()
    },
    writable: true
});

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
        headers: { get: () => 'application/json' }
    })
);

// Suppress console noise in tests (optional - comment out for debugging)
const originalConsole = { ...console };
global.console = {
    ...console,
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
    // Uncomment below to see logs during debugging
    // error: originalConsole.error,
    // warn: originalConsole.warn,
    // log: originalConsole.log,
};
