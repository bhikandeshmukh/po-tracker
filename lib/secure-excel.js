// lib/secure-excel.js
// Secure wrapper for Excel file operations with validation and protection

import * as XLSX from 'xlsx';

// Configuration
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const PARSE_TIMEOUT = 10000; // 10 seconds
const MAX_ROWS = 10000; // Maximum rows to process
const MAX_SHEETS = 10; // Maximum sheets to process

const VALID_MIME_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv' // .csv
];

/**
 * Validate Excel file before processing
 */
export function validateExcelFile(file) {
    const errors = [];

    // Check if file exists
    if (!file) {
        errors.push('No file provided');
        return { valid: false, errors };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        errors.push(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Check file type
    if (file.type && !VALID_MIME_TYPES.includes(file.type)) {
        errors.push('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed');
    }

    // Check file name extension
    const fileName = file.name || '';
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(extension)) {
        errors.push('Invalid file extension. Only .xlsx, .xls, and .csv files are allowed');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Safely parse Excel file with timeout and error handling
 */
export async function safeParseExcel(file, options = {}) {
    // Validate file first
    const validation = validateExcelFile(file);
    if (!validation.valid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
    }

    const timeout = options.timeout || PARSE_TIMEOUT;

    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error('Excel parsing timeout - file may be too large or corrupted'));
        }, timeout);

        try {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    clearTimeout(timeoutId);
                    
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { 
                        type: 'array',
                        // Security options
                        cellFormula: false, // Don't parse formulas
                        cellHTML: false, // Don't parse HTML
                        cellNF: false, // Don't parse number formats
                        cellStyles: false, // Don't parse styles
                        sheetStubs: false, // Don't create stubs for empty cells
                        ...options
                    });

                    // Validate workbook
                    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                        reject(new Error('Invalid Excel file - no sheets found'));
                        return;
                    }

                    // Limit number of sheets
                    if (workbook.SheetNames.length > MAX_SHEETS) {
                        reject(new Error(`Too many sheets. Maximum ${MAX_SHEETS} sheets allowed`));
                        return;
                    }

                    resolve(workbook);
                } catch (error) {
                    clearTimeout(timeoutId);
                    reject(new Error(`Failed to parse Excel file: ${error.message}`));
                }
            };

            reader.onerror = () => {
                clearTimeout(timeoutId);
                reject(new Error('Failed to read file'));
            };

            reader.readAsArrayBuffer(file);
        } catch (error) {
            clearTimeout(timeoutId);
            reject(new Error(`File reading error: ${error.message}`));
        }
    });
}

/**
 * Safely convert sheet to JSON with row limit
 */
export function safeSheetToJSON(sheet, options = {}) {
    try {
        if (!sheet) {
            throw new Error('No sheet provided');
        }

        // Convert to JSON
        const json = XLSX.utils.sheet_to_json(sheet, {
            defval: '', // Default value for empty cells
            blankrows: false, // Skip blank rows
            ...options
        });

        // Limit number of rows
        if (json.length > MAX_ROWS) {
            throw new Error(`Too many rows. Maximum ${MAX_ROWS} rows allowed`);
        }

        // Sanitize data - remove any potential prototype pollution
        return json.map(row => {
            const sanitized = {};
            for (const [key, value] of Object.entries(row)) {
                // Skip __proto__, constructor, prototype
                if (['__proto__', 'constructor', 'prototype'].includes(key)) {
                    continue;
                }
                
                // Only allow string, number, boolean, null
                if (typeof value === 'string' || 
                    typeof value === 'number' || 
                    typeof value === 'boolean' || 
                    value === null) {
                    sanitized[key] = value;
                }
            }
            return sanitized;
        });
    } catch (error) {
        throw new Error(`Failed to convert sheet to JSON: ${error.message}`);
    }
}

/**
 * Safely create Excel file for download
 */
export function safeCreateExcel(data, sheetName = 'Sheet1', fileName = 'export.xlsx') {
    try {
        // Validate inputs
        if (!Array.isArray(data)) {
            throw new Error('Data must be an array');
        }

        if (data.length > MAX_ROWS) {
            throw new Error(`Too many rows. Maximum ${MAX_ROWS} rows allowed`);
        }

        // Sanitize sheet name
        const sanitizedSheetName = sheetName
            .replace(/[\\\/\?\*\[\]]/g, '') // Remove invalid characters
            .substring(0, 31); // Excel sheet name limit

        // Create workbook
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sanitizedSheetName);

        // Write file
        XLSX.writeFile(wb, fileName);

        return { success: true };
    } catch (error) {
        throw new Error(`Failed to create Excel file: ${error.message}`);
    }
}

/**
 * Get safe workbook info without parsing all data
 */
export function getWorkbookInfo(workbook) {
    try {
        return {
            sheetNames: workbook.SheetNames || [],
            sheetCount: workbook.SheetNames?.length || 0,
            sheets: workbook.SheetNames?.map(name => {
                const sheet = workbook.Sheets[name];
                const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
                return {
                    name,
                    rowCount: range.e.r - range.s.r + 1,
                    colCount: range.e.c - range.s.c + 1
                };
            }) || []
        };
    } catch (error) {
        throw new Error(`Failed to get workbook info: ${error.message}`);
    }
}

/**
 * Validate parsed data structure
 */
export function validateParsedData(data, requiredFields = []) {
    const errors = [];

    if (!Array.isArray(data)) {
        errors.push('Data must be an array');
        return { valid: false, errors };
    }

    if (data.length === 0) {
        errors.push('No data found in file');
        return { valid: false, errors };
    }

    // Check required fields in first row
    if (requiredFields.length > 0) {
        const firstRow = data[0];
        const missingFields = requiredFields.filter(field => !(field in firstRow));
        
        if (missingFields.length > 0) {
            errors.push(`Missing required fields: ${missingFields.join(', ')}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        rowCount: data.length
    };
}

// Export configuration for reference
export const EXCEL_CONFIG = {
    MAX_FILE_SIZE,
    PARSE_TIMEOUT,
    MAX_ROWS,
    MAX_SHEETS,
    VALID_MIME_TYPES
};
