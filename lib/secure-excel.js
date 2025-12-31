// lib/secure-excel.js
// Secure wrapper for Excel file operations with validation and protection
// Migrated from xlsx to ExcelJS for security

import ExcelJS from 'exceljs';

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

    if (!file) {
        errors.push('No file provided');
        return { valid: false, errors };
    }

    if (file.size > MAX_FILE_SIZE) {
        errors.push(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    if (file.type && !VALID_MIME_TYPES.includes(file.type)) {
        errors.push('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed');
    }

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

            reader.onload = async (e) => {
                try {
                    clearTimeout(timeoutId);
                    
                    const buffer = e.target.result;
                    const workbook = new ExcelJS.Workbook();
                    // @ts-ignore - ExcelJS accepts ArrayBuffer in browser
                    await workbook.xlsx.load(buffer);

                    if (!workbook.worksheets || workbook.worksheets.length === 0) {
                        reject(new Error('Invalid Excel file - no sheets found'));
                        return;
                    }

                    if (workbook.worksheets.length > MAX_SHEETS) {
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
export function safeSheetToJSON(worksheet, options = {}) {
    try {
        if (!worksheet) {
            throw new Error('No sheet provided');
        }

        const json = [];
        const headers = [];

        // Get headers from first row
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
            headers[colNumber] = cell.value?.toString() || `Column${colNumber}`;
        });

        // Get data rows
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header row
            if (json.length >= MAX_ROWS) return; // Limit rows

            const rowData = {};
            row.eachCell((cell, colNumber) => {
                const header = headers[colNumber];
                if (header && !['__proto__', 'constructor', 'prototype'].includes(header)) {
                    let value = cell.value;
                    
                    // Handle different cell types
                    if (value && typeof value === 'object') {
                        if (value.result !== undefined) value = value.result; // Formula result
                        else if (value.text) value = value.text; // Rich text
                        else if (value instanceof Date) value = value.toISOString();
                        else value = String(value);
                    }
                    
                    rowData[header] = value ?? '';
                }
            });

            if (Object.keys(rowData).length > 0) {
                json.push(rowData);
            }
        });

        if (json.length > MAX_ROWS) {
            throw new Error(`Too many rows. Maximum ${MAX_ROWS} rows allowed`);
        }

        return json;
    } catch (error) {
        throw new Error(`Failed to convert sheet to JSON: ${error.message}`);
    }
}

/**
 * Safely create Excel file for download
 */
export async function safeCreateExcel(data, sheetName = 'Sheet1', fileName = 'export.xlsx') {
    try {
        if (!Array.isArray(data)) {
            throw new Error('Data must be an array');
        }

        if (data.length > MAX_ROWS) {
            throw new Error(`Too many rows. Maximum ${MAX_ROWS} rows allowed`);
        }

        const sanitizedSheetName = sheetName
            .replace(/[\\\/\?\*\[\]]/g, '')
            .substring(0, 31);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(sanitizedSheetName);

        if (data.length > 0) {
            // Add headers
            const headers = Object.keys(data[0]);
            worksheet.columns = headers.map(header => ({
                header,
                key: header,
                width: 15
            }));

            // Style headers
            worksheet.getRow(1).font = { bold: true };

            // Add data
            data.forEach(row => worksheet.addRow(row));
        }

        // Download in browser
        if (typeof window !== 'undefined') {
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            await workbook.xlsx.writeFile(fileName);
        }

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
        const sheets = workbook.worksheets.map(ws => ({
            name: ws.name,
            rowCount: ws.rowCount || 0,
            colCount: ws.columnCount || 0
        }));

        return {
            sheetNames: sheets.map(s => s.name),
            sheetCount: sheets.length,
            sheets
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

export const EXCEL_CONFIG = {
    MAX_FILE_SIZE,
    PARSE_TIMEOUT,
    MAX_ROWS,
    MAX_SHEETS,
    VALID_MIME_TYPES
};
