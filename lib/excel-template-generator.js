// lib/excel-template-generator.js
// Generate Excel templates with dropdowns and validation
// Migrated from xlsx to ExcelJS for security

import ExcelJS from 'exceljs';

/**
 * Create Excel template with data validation dropdowns
 */
export async function createTemplateWithDropdowns(options) {
    const {
        templateData = [],
        templateFields = [],
        dropdownFields = {}, // { fieldName: [options] }
        sheetName = 'Template',
        fileName = 'template.xlsx'
    } = options;

    try {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'PO Tracking System';
        workbook.created = new Date();

        // Create main template sheet
        const worksheet = workbook.addWorksheet(sheetName);

        // Add headers
        worksheet.columns = templateFields.map(field => ({
            header: field,
            key: field,
            width: 20
        }));

        // Style headers
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add data rows
        if (templateData.length > 0) {
            templateData.forEach(item => {
                const row = {};
                templateFields.forEach(field => {
                    if (field.includes('.')) {
                        const parts = field.split('.');
                        row[field] = parts.reduce((obj, key) => obj?.[key], item) || '';
                    } else {
                        row[field] = item[field] || '';
                    }
                });
                worksheet.addRow(row);
            });
        } else {
            // Add empty row for template
            const emptyRow = {};
            templateFields.forEach(field => {
                emptyRow[field] = '';
            });
            worksheet.addRow(emptyRow);
        }

        // Add data validation (dropdowns) for specified fields
        if (Object.keys(dropdownFields).length > 0) {
            await addDataValidation(workbook, worksheet, dropdownFields, templateFields, templateData.length || 1);
        }

        // Write to buffer and trigger download (browser) or save (Node)
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
        console.error('Failed to create template:', error);
        throw new Error(`Failed to create template: ${error.message}`);
    }
}

/**
 * Add data validation (dropdowns) to worksheet
 */
async function addDataValidation(workbook, worksheet, dropdownFields, templateFields, rowCount) {
    // Get column index for each field
    const fieldColumns = {};
    templateFields.forEach((field, index) => {
        fieldColumns[field] = index + 1; // ExcelJS uses 1-based index
    });

    // Add reference sheets and data validation
    for (const [fieldName, options] of Object.entries(dropdownFields)) {
        const colIndex = fieldColumns[fieldName];
        if (!colIndex || !options || options.length === 0) continue;

        // Create reference sheet for dropdown options
        const refSheetName = `${fieldName}_Options`.substring(0, 31);
        const refSheet = workbook.addWorksheet(refSheetName);
        refSheet.getColumn(1).values = [fieldName, ...options];
        refSheet.getRow(1).font = { bold: true };

        // Add data validation to cells (rows 2 onwards)
        for (let row = 2; row <= rowCount + 100; row++) { // Add validation for extra rows
            const cell = worksheet.getCell(row, colIndex);
            cell.dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`'${refSheetName}'!$A$2:$A$${options.length + 1}`],
                showErrorMessage: true,
                errorTitle: 'Invalid Value',
                error: `Please select a value from the dropdown list`
            };
        }

        // Add dropdown indicator to header
        const headerCell = worksheet.getCell(1, colIndex);
        headerCell.value = `${fieldName} ⬇️`;
        headerCell.note = `Valid options available in ${refSheetName} sheet`;
    }
}

/**
 * Fetch vendors for dropdown
 */
export async function fetchVendorOptions(apiClient) {
    try {
        const response = await apiClient.getVendors({ limit: 1000 });
        if (response.success && response.data) {
            return response.data.map(vendor => ({
                id: vendor.vendorId || vendor.id,
                name: vendor.vendorName || vendor.name,
                display: `${vendor.vendorId || vendor.id} - ${vendor.vendorName || vendor.name}`
            }));
        }
        return [];
    } catch (error) {
        console.error('Failed to fetch vendors:', error);
        return [];
    }
}

/**
 * Fetch warehouses for a vendor
 */
export async function fetchWarehouseOptions(apiClient, vendorId) {
    try {
        const response = await apiClient.getVendorWarehouses(vendorId);
        if (response.success && response.data) {
            return response.data.map(warehouse => ({
                id: warehouse.warehouseId || warehouse.id,
                name: warehouse.warehouseName || warehouse.name,
                display: `${warehouse.warehouseId || warehouse.id} - ${warehouse.warehouseName || warehouse.name}`
            }));
        }
        return [];
    } catch (error) {
        console.error('Failed to fetch warehouses:', error);
        return [];
    }
}

/**
 * Fetch all warehouses for all vendors (for template)
 */
export async function fetchAllWarehouseOptions(apiClient) {
    try {
        const vendorsResponse = await apiClient.getVendors({ limit: 1000 });
        if (!vendorsResponse.success || !vendorsResponse.data) {
            return [];
        }

        const allWarehouses = [];
        
        for (const vendor of vendorsResponse.data) {
            const vendorId = vendor.vendorId || vendor.id;
            const warehousesResponse = await apiClient.getVendorWarehouses(vendorId);
            
            if (warehousesResponse.success && warehousesResponse.data) {
                warehousesResponse.data.forEach(warehouse => {
                    allWarehouses.push({
                        id: warehouse.warehouseId || warehouse.id,
                        name: warehouse.warehouseName || warehouse.name,
                        vendorId: vendorId,
                        display: `${warehouse.warehouseId || warehouse.id} - ${warehouse.warehouseName || warehouse.name} (${vendorId})`
                    });
                });
            }
        }

        return allWarehouses;
    } catch (error) {
        console.error('Failed to fetch all warehouses:', error);
        return [];
    }
}

/**
 * Create PO template with vendor and warehouse dropdowns
 */
export async function createPOTemplateWithDropdowns(apiClient, templateData = []) {
    try {
        const vendors = await fetchVendorOptions(apiClient);
        const warehouses = await fetchAllWarehouseOptions(apiClient);

        const dropdownFields = {
            vendorId: vendors.map(v => v.id),
            vendorWarehouseId: warehouses.map(w => w.id)
        };

        const templateFields = [
            'poNumber',
            'vendorId',
            'vendorWarehouseId',
            'poDate',
            'cancelledDate',
            'sku',
            'mrp',
            'poQty',
            'qtySent',
            'qtyPending',
            'price'
        ];

        await createTemplateWithDropdowns({
            templateData,
            templateFields,
            dropdownFields,
            sheetName: 'PO_Template',
            fileName: 'Purchase_Order_Import_Template.xlsx'
        });

        return { success: true, vendors, warehouses };
    } catch (error) {
        console.error('Failed to create PO template:', error);
        throw error;
    }
}
