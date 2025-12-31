# Testing Guide

Comprehensive guide for testing the Purchase Order Tracking System.

---

## Overview

The project uses Jest and React Testing Library for testing. Tests are organized by type:
- **Unit tests** - Individual functions and utilities
- **Component tests** - React components
- **API tests** - API route handlers

---

## Test Structure

```
__tests__/
├── api/                    # API route tests
│   ├── health.test.js
│   └── search.test.js
├── components/             # Component tests
│   ├── ErrorBoundary.test.js
│   └── ProtectedRoute.test.js
└── lib/                    # Library/utility tests
    ├── cache.test.js
    ├── date-utils.test.js
    ├── optimistic-updates.test.js
    ├── request-deduplicator.test.js
    ├── search-service.test.js
    ├── types.test.js
    └── validation-schemas.test.js
```

---

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Watch mode (re-run on changes)
npm run test:watch

# Run specific test file
npm test -- cache.test.js

# Run tests matching pattern
npm test -- --testNamePattern="should validate"
```

### Coverage Report

```bash
npm run test:coverage
```

Coverage thresholds (configured in `jest.config.js`):
- Branches: 4%
- Functions: 5%
- Lines: 6%
- Statements: 6%

---

## Test Configuration

### jest.config.js

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const customJestConfig = {
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testEnvironment: 'jsdom',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },
    testMatch: [
        '**/__tests__/**/*.test.js',
        '**/?(*.)+(spec|test).js'
    ],
    collectCoverageFrom: [
        'pages/api/**/*.js',
        'lib/**/*.js',
        'components/**/*.js',
    ],
};

module.exports = createJestConfig(customJestConfig);
```

### jest.setup.js

The setup file:
- Imports `@testing-library/jest-dom`
- Sets test environment variables
- Mocks Firebase Admin SDK
- Mocks Firebase client SDK
- Mocks `window.location` and `localStorage`
- Mocks global `fetch`

---

## Writing Tests

### Testing Utilities

```javascript
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

    test('should set and get values', () => {
        cache.set('key1', { data: 'test' });
        expect(cache.get('key1')).toEqual({ data: 'test' });
    });

    test('should expire entries after TTL', () => {
        cache.set('expiring', 'value', 1000);
        expect(cache.get('expiring')).toBe('value');
        
        jest.advanceTimersByTime(1001);
        expect(cache.get('expiring')).toBeUndefined();
    });
});
```

### Testing Components

```javascript
// __tests__/components/ErrorBoundary.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../../components/Common/ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow }) => {
    if (shouldThrow) throw new Error('Test error');
    return <div>No error</div>;
};

describe('ErrorBoundary', () => {
    test('should render children when no error', () => {
        render(
            <ErrorBoundary>
                <div>Child content</div>
            </ErrorBoundary>
        );
        expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    test('should render error UI when child throws', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
});
```

### Testing API Routes

```javascript
// __tests__/api/search.test.js
import { createMocks } from 'node-mocks-http';

jest.mock('../../lib/firebase-admin', () => ({
    db: {
        collection: jest.fn(() => ({
            limit: jest.fn(() => ({
                get: jest.fn(() => Promise.resolve({ docs: [] }))
            }))
        }))
    }
}));

jest.mock('../../lib/auth-middleware', () => ({
    verifyAuth: jest.fn()
}));

import handler from '../../pages/api/search';
import { verifyAuth } from '../../lib/auth-middleware';

describe('/api/search', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return 401 if not authenticated', async () => {
        verifyAuth.mockResolvedValue(null);

        const { req, res } = createMocks({
            method: 'GET',
            query: { q: 'test' }
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(401);
    });

    test('should return search results for valid query', async () => {
        verifyAuth.mockResolvedValue({ uid: 'user1', role: 'user' });

        const { req, res } = createMocks({
            method: 'GET',
            query: { q: 'test' }
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const data = JSON.parse(res._getData());
        expect(data.success).toBe(true);
    });
});
```

### Testing Validation Schemas

```javascript
// __tests__/lib/types.test.js
import { validate, UserSchema, PurchaseOrderSchema } from '../../lib/types';

describe('UserSchema', () => {
    test('should validate valid user', () => {
        const user = {
            uid: 'user123',
            email: 'test@example.com',
            role: 'user'
        };
        const result = validate(UserSchema, user);
        expect(result.success).toBe(true);
    });

    test('should reject invalid email', () => {
        const user = {
            uid: 'user123',
            email: 'invalid-email',
            role: 'user'
        };
        const result = validate(UserSchema, user);
        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
    });
});
```

---

## Mocking Patterns

### Mocking Firebase

```javascript
// In jest.setup.js or test file
jest.mock('./lib/firebase-admin', () => ({
    db: {
        collection: jest.fn(() => ({
            doc: jest.fn(() => ({
                get: jest.fn(() => Promise.resolve({ 
                    exists: true, 
                    data: () => ({}) 
                })),
                set: jest.fn(() => Promise.resolve()),
                update: jest.fn(() => Promise.resolve())
            })),
            where: jest.fn(() => ({
                get: jest.fn(() => Promise.resolve({ docs: [] }))
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
```

### Mocking Next.js Router

```javascript
const mockPush = jest.fn();
jest.mock('next/router', () => ({
    useRouter: () => ({
        push: mockPush,
        pathname: '/dashboard'
    })
}));
```

### Mocking Auth Context

```javascript
const mockUseAuth = jest.fn();
jest.mock('../../lib/auth-client', () => ({
    useAuth: () => mockUseAuth()
}));

// In test
mockUseAuth.mockReturnValue({ 
    user: { uid: 'user1', name: 'Test User' }, 
    loading: false 
});
```

---

## Test Categories

### 1. Cache Tests (`cache.test.js`)
- Basic operations (set, get, delete, clear)
- TTL expiration
- Cache key helpers

### 2. Request Deduplicator Tests (`request-deduplicator.test.js`)
- Deduplication of parallel requests
- Different keys handled separately
- Error handling and cleanup

### 3. Validation Tests (`validation-schemas.test.js`)
- PO validation (create and update)
- Status transition validation
- Input sanitization (XSS prevention)

### 4. Optimistic Updates Tests (`optimistic-updates.test.js`)
- Optimistic update application
- Rollback on failure
- ID generation and detection

### 5. Search Service Tests (`search-service.test.js`)
- Token generation
- Search configuration
- Display field formatting

### 6. Type Schema Tests (`types.test.js`)
- User, Vendor, PO, Shipment schemas
- Validation helpers
- Partial schema creation

### 7. Component Tests
- ErrorBoundary error catching and recovery
- ProtectedRoute authentication flow

### 8. API Tests
- Health endpoint
- Search endpoint with auth

---

## Best Practices

### 1. Test Organization
```javascript
describe('ModuleName', () => {
    describe('functionName', () => {
        test('should do X when Y', () => {});
        test('should handle edge case Z', () => {});
    });
});
```

### 2. Setup and Teardown
```javascript
beforeEach(() => {
    jest.clearAllMocks();
    // Reset state
});

afterEach(() => {
    // Cleanup
});
```

### 3. Async Testing
```javascript
test('should handle async operation', async () => {
    const result = await asyncFunction();
    expect(result).toBeDefined();
});
```

### 4. Error Testing
```javascript
test('should throw on invalid input', () => {
    expect(() => {
        validateOrThrow(schema, invalidData);
    }).toThrow('Validation failed');
});
```

### 5. Mock Verification
```javascript
test('should call API with correct params', async () => {
    await performAction();
    expect(mockFn).toHaveBeenCalledWith(expectedParams);
    expect(mockFn).toHaveBeenCalledTimes(1);
});
```

---

## Debugging Tests

### Run Single Test
```bash
npm test -- --testNamePattern="should validate valid user"
```

### Verbose Output
```bash
npm test -- --verbose
```

### Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Enable Console Logs
In `jest.setup.js`, uncomment:
```javascript
// error: originalConsole.error,
// warn: originalConsole.warn,
// log: originalConsole.log,
```

---

## Adding New Tests

1. Create test file in appropriate `__tests__/` subdirectory
2. Follow naming convention: `*.test.js`
3. Import module under test
4. Mock dependencies as needed
5. Write descriptive test cases
6. Run tests to verify

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
```

---

**Happy Testing!** 🧪
