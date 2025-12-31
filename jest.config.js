// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
    dir: './',
});

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
        '!**/*.config.js',
        '!**/node_modules/**',
        '!**/.next/**',
        '!**/coverage/**'
    ],
    coverageThreshold: {
        global: {
            branches: 4,
            functions: 5,
            lines: 6,
            statements: 6
        }
    },
    testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/.next/'
    ],
    transformIgnorePatterns: [
        '/node_modules/',
        '^.+\\.module\\.(css|sass|scss)$'
    ]
};

module.exports = createJestConfig(customJestConfig);
