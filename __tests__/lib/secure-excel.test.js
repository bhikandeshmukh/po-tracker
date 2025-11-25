// __tests__/lib/secure-excel.test.js
// Tests for secure Excel wrapper

import {
    validateExcelFile,
    validateParsedData,
    EXCEL_CONFIG
} from '../../lib/secure-excel';

describe('Secure Excel Utilities', () => {
    describe('validateExcelFile', () => {
        it('should reject files that are too large', () => {
            const largeFile = {
                name: 'large.xlsx',
                size: EXCEL_CONFIG.MAX_FILE_SIZE + 1,
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            };

            const result = validateExcelFile(largeFile);
            expect(result.valid).toBe(false);
            expect(result.errors.some(err => err.includes('exceeds maximum'))).toBe(true);
        });

        it('should reject invalid file types', () => {
            const invalidFile = {
                name: 'malicious.exe',
                size: 1000,
                type: 'application/x-msdownload'
            };

            const result = validateExcelFile(invalidFile);
            expect(result.valid).toBe(false);
            expect(result.errors.some(err => err.includes('Invalid file type'))).toBe(true);
        });

        it('should reject invalid file extensions', () => {
            const invalidFile = {
                name: 'file.txt',
                size: 1000,
                type: 'text/plain'
            };

            const result = validateExcelFile(invalidFile);
            expect(result.valid).toBe(false);
            expect(result.errors.some(err => err.includes('Invalid file extension'))).toBe(true);
        });

        it('should accept valid Excel files', () => {
            const validFile = {
                name: 'data.xlsx',
                size: 1000,
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            };

            const result = validateExcelFile(validFile);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should accept CSV files', () => {
            const csvFile = {
                name: 'data.csv',
                size: 1000,
                type: 'text/csv'
            };

            const result = validateExcelFile(csvFile);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject null file', () => {
            const result = validateExcelFile(null);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('No file provided');
        });
    });

    describe('validateParsedData', () => {
        it('should reject non-array data', () => {
            const result = validateParsedData('not an array');
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Data must be an array');
        });

        it('should reject empty arrays', () => {
            const result = validateParsedData([]);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('No data found in file');
        });

        it('should validate required fields', () => {
            const data = [
                { name: 'John', age: 30 },
                { name: 'Jane', age: 25 }
            ];

            const result = validateParsedData(data, ['name', 'age', 'email']);
            expect(result.valid).toBe(false);
            expect(result.errors.some(err => err.includes('Missing required fields: email'))).toBe(true);
        });

        it('should accept valid data with all required fields', () => {
            const data = [
                { name: 'John', age: 30, email: 'john@example.com' },
                { name: 'Jane', age: 25, email: 'jane@example.com' }
            ];

            const result = validateParsedData(data, ['name', 'age', 'email']);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.rowCount).toBe(2);
        });

        it('should accept data without required fields check', () => {
            const data = [
                { name: 'John', age: 30 }
            ];

            const result = validateParsedData(data);
            expect(result.valid).toBe(true);
            expect(result.rowCount).toBe(1);
        });
    });

    describe('Security Configuration', () => {
        it('should have reasonable limits', () => {
            expect(EXCEL_CONFIG.MAX_FILE_SIZE).toBe(5 * 1024 * 1024); // 5MB
            expect(EXCEL_CONFIG.MAX_ROWS).toBe(10000);
            expect(EXCEL_CONFIG.MAX_SHEETS).toBe(10);
            expect(EXCEL_CONFIG.PARSE_TIMEOUT).toBe(10000); // 10 seconds
        });

        it('should only allow safe MIME types', () => {
            const allowedTypes = EXCEL_CONFIG.VALID_MIME_TYPES;
            expect(allowedTypes).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            expect(allowedTypes).toContain('application/vnd.ms-excel');
            expect(allowedTypes).toContain('text/csv');
            expect(allowedTypes).not.toContain('application/x-msdownload');
            expect(allowedTypes).not.toContain('text/html');
        });
    });
});
