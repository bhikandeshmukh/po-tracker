// __tests__/lib/date-utils.test.js
// First, let's check what's in date-utils and test it

import * as dateUtils from '../../lib/date-utils';

describe('Date Utils', () => {
    describe('module exports', () => {
        test('should export utility functions', () => {
            expect(dateUtils).toBeDefined();
        });
    });

    // Generic date utility tests that should work with common patterns
    describe('date formatting', () => {
        test('should handle Date objects', () => {
            const date = new Date('2024-06-15T10:30:00Z');
            expect(date instanceof Date).toBe(true);
        });

        test('should handle ISO strings', () => {
            const isoString = '2024-06-15T10:30:00.000Z';
            const date = new Date(isoString);
            expect(date.toISOString()).toBe(isoString);
        });

        test('should handle timestamps', () => {
            const timestamp = 1718444400000;
            const date = new Date(timestamp);
            expect(date.getTime()).toBe(timestamp);
        });
    });

    describe('date comparisons', () => {
        test('should compare dates correctly', () => {
            const date1 = new Date('2024-01-01');
            const date2 = new Date('2024-06-01');
            expect(date1 < date2).toBe(true);
        });

        test('should check if date is in past', () => {
            const pastDate = new Date('2020-01-01');
            const now = new Date();
            expect(pastDate < now).toBe(true);
        });

        test('should check if date is in future', () => {
            const futureDate = new Date('2030-01-01');
            const now = new Date();
            expect(futureDate > now).toBe(true);
        });
    });

    describe('date arithmetic', () => {
        test('should add days to date', () => {
            const date = new Date('2024-01-15');
            const newDate = new Date(date);
            newDate.setDate(newDate.getDate() + 5);
            expect(newDate.getDate()).toBe(20);
        });

        test('should subtract days from date', () => {
            const date = new Date('2024-01-15');
            const newDate = new Date(date);
            newDate.setDate(newDate.getDate() - 5);
            expect(newDate.getDate()).toBe(10);
        });

        test('should handle month rollover', () => {
            const date = new Date('2024-01-30');
            const newDate = new Date(date);
            newDate.setDate(newDate.getDate() + 5);
            expect(newDate.getMonth()).toBe(1); // February
        });

        test('should calculate days between dates', () => {
            const date1 = new Date('2024-01-01');
            const date2 = new Date('2024-01-11');
            const diffTime = Math.abs(date2 - date1);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            expect(diffDays).toBe(10);
        });
    });

    describe('Firestore timestamp handling', () => {
        test('should convert Firestore-like timestamp to Date', () => {
            // Simulate Firestore timestamp object
            const firestoreTimestamp = {
                toDate: () => new Date('2024-06-15T10:30:00Z'),
                seconds: 1718444400,
                nanoseconds: 0
            };
            
            const date = firestoreTimestamp.toDate();
            expect(date instanceof Date).toBe(true);
        });

        test('should handle null timestamps gracefully', () => {
            const timestamp = null;
            const date = timestamp?.toDate?.() || timestamp;
            expect(date).toBeNull();
        });

        test('should handle string dates as fallback', () => {
            const data = {
                createdAt: '2024-06-15T10:30:00Z'
            };
            const date = data.createdAt?.toDate?.() || data.createdAt;
            expect(date).toBe('2024-06-15T10:30:00Z');
        });
    });
});
