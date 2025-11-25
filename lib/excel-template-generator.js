// lib/excel-template-generator.js
// Generate Excel templates with dropdowns and validation

import * as XLSX from 'xlsx';

/**
 * Create Excel template with data validation dropdowns
 */
export function createTemplateWithDropdowns(options) {
    const {
        templateData = [],
        templateFields = [],
        dropdownFields = {}, // { fieldName: [options] }
        sheetName = 'Template',
        fileName = 'template.xlsx'
    } = options;

    try {
        // Prepare template rows
        let templateRows = [];
        
        if (templateData.length > 0) {
            templateRows = templateData.map(item => {
                const row = {};
                templateFields.forEach(field => {
                    if (field.includes('.')) {
                        const parts = field.split('.');
                        row[field] = parts.reduce((obj, key) => obj?.[key], item) || '';
                    } else {
                        row[field] = item[field] || '';
                    }
                });
                return row;
            });
        } else {
            // Create empty template with field names
            const emptyRow = {};
            templateFields.forEach(field => {
                emptyRow[field] = '';
            });
            templateRows = [emptyRow];
        }

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(templateRows);

        // Add data validation (dropdowns) for specified fields
        if (Object.keys(dropdownFields).length > 0) {
            addDataValidation(ws, dropdownFields, templateFields, templateRows.length);
        }

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        // Add reference sheets for dropdown data
        addReferenceSheets(wb, dropdownFields);

        // Write file
        XLSX.writeFile(wb, fileName);

        return { success: true };
    } catch (error) {
        console.error('Failed to create template:', error);
        throw new Error(`Failed to create template: ${error.message}`);
    }
}

/**
 * Add data validation (dropdowns) to worksheet
 * Note: xlsx library has limited support for data validation
 * We add comments to guide users instead
 */
function addDataValidation(ws, dropdownFields, templateFields, rowCount) {
    // Get column letters for each field
    const fieldColumns = {};
    templateFields.forEach((field, index) => {
        fieldColumns[field] = XLSX.utils.encode_col(index);
    });

    // Add comments/notes to header cells for dropdown fields
    if (!ws['!comments']) {
        ws['!comments'] = [];
    }

    Object.entries(dropdownFields).forEach(([fieldName, options]) => {
        const column = fieldColumns[fieldName];
        if (!column || !options || options.length === 0) return;

        const headerCell = `${column}1`;
        
        // Add a note to the header cell
        const optionsText = options.length > 10 
            ? `${options.slice(0, 10).join(', ')}... (${options.length} total options - see ${fieldName}_Options sheet)`
            : options.join(', ');
        
        // Add comment to header
        ws['!comments'].push({
            ref: headerCell,
            author: 'System',
            text: `Valid options:\n${optionsText}\n\nSee ${fieldName}_Options sheet for full list.`
        });
        
        // Add visual indicator in header
        if (ws[headerCell]) {
            ws[headerCell].v = `${fieldName} ⬇️`;
        }
    });
}

/**
 * Add reference sheets with dropdown data
 */
function addReferenceSheets(wb, dropdownFields) {
    Object.entries(dropdownFields).forEach(([fieldName, options]) => {
        if (!options || options.length === 0) return;

        // Create reference sheet
        const refData = options.map(opt => ({ [fieldName]: opt }));
        const refWs = XLSX.utils.json_to_sheet(refData);
        
        // Add sheet with descriptive name
        const sheetName = `${fieldName}_Options`.substring(0, 31); // Excel limit
        XLSX.utils.book_append_sheet(wb, refWs, sheetName);
    });
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
        
        // Fetch warehouses for each vendor
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
        // Fetch vendors and warehouses
        const vendors = await fetchVendorOptions(apiClient);
        const warehouses = await fetchAllWarehouseOptions(apiClient);

        // Prepare dropdown options
        const dropdownFields = {
            vendorId: vendors.map(v => v.id),
            vendorWarehouseId: warehouses.map(w => w.id)
        };

        // Template fields
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

        // Create template
        createTemplateWithDropdowns({
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
