// lib/excel-template-with-validation.js
// Excel template generator with REAL dropdown validation using ExcelJS

import ExcelJS from 'exceljs';

/**
 * Create Excel template with working dropdown validation
 * Uses ExcelJS library which properly supports data validation
 */
export async function createTemplateWithValidation(options) {
    const {
        templateData = [],
        templateFields = [],
        dropdownFields = {}, // { fieldName: [options] }
        sheetName = 'Template',
        fileName = 'template.xlsx'
    } = options;

    try {
        // Create workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(sheetName);

        // Add headers
        worksheet.columns = templateFields.map(field => ({
            header: field,
            key: field,
            width: 20
        }));

        // Style headers
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4F46E5' }
        };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

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
            // Add at least 10 empty rows
            for (let i = 0; i < 10; i++) {
                worksheet.addRow({});
            }
        }

        // Add data validation (dropdowns) for specified fields
        Object.entries(dropdownFields).forEach(([fieldName, options]) => {
            if (!options || options.length === 0) return;

            // Find column index
            const columnIndex = templateFields.indexOf(fieldName);
            if (columnIndex === -1) return;

            const columnLetter = String.fromCharCode(65 + columnIndex); // A, B, C, etc.

            // Create reference sheet for this dropdown
            const refSheetName = `${fieldName}_Options`.substring(0, 31);
            const refSheet = workbook.addWorksheet(refSheetName);
            
            // Add options to reference sheet
            refSheet.columns = [{ header: fieldName, key: 'value', width: 30 }];
            options.forEach(option => {
                refSheet.addRow({ value: option });
            });

            // Style reference sheet header
            refSheet.getRow(1).font = { bold: true };
            refSheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE5E7EB' }
            };

            // Add data validation to main sheet
            const maxRows = Math.max(templateData.length, 100);
            
            for (let row = 2; row <= maxRows + 1; row++) {
                const cell = worksheet.getCell(`${columnLetter}${row}`);
                
                // Add dropdown validation
                cell.dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: [`'${refSheetName}'!$A$2:$A$${options.length + 1}`],
                    showErrorMessage: true,
                    errorStyle: 'error',
                    errorTitle: 'Invalid Value',
                    error: `Please select a value from the dropdown list. See ${refSheetName} sheet for all options.`
                };
            }

            // Add visual indicator to header (keep field name clean for parsing)
            const headerCell = worksheet.getCell(`${columnLetter}1`);
            headerCell.value = fieldName;
            // Add note/comment with dropdown indicator (no emoji)
            headerCell.note = `DROPDOWN: Select from list. ${options.length} options available in ${refSheetName} sheet.`;
            // Add background color to indicate dropdown field
            headerCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E7FF' } // Light blue background for dropdown fields
            };
        });

        // Add instructions sheet
        const instructionsSheet = workbook.addWorksheet('Instructions');
        instructionsSheet.columns = [
            { header: 'Step', key: 'step', width: 10 },
            { header: 'Instructions', key: 'instructions', width: 80 }
        ];

        instructionsSheet.addRows([
            { step: '1', instructions: 'Fill in the data in the Template sheet' },
            { step: '2', instructions: 'For dropdown fields (marked with ⬇️), click the cell and select from the dropdown' },
            { step: '3', instructions: 'Reference sheets contain all available options for dropdown fields' },
            { step: '4', instructions: 'Do not modify the reference sheets' },
            { step: '5', instructions: 'Save the file and upload it to the system' }
        ]);

        instructionsSheet.getRow(1).font = { bold: true };
        instructionsSheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF10B981' }
        };

        // Write file
        const buffer = await workbook.xlsx.writeBuffer();
        
        // Create download link
        const blob = new Blob([buffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);

        return { success: true };
    } catch (error) {
        console.error('Failed to create template:', error);
        throw new Error(`Failed to create template: ${error.message}`);
    }
}

/**
 * Create PO template with vendor and warehouse dropdowns
 */
export async function createPOTemplateWithValidation(vendors, warehouses, templateData = []) {
    const vendorOptions = vendors.map(v => v.vendorId || v.id);
    const warehouseOptions = warehouses.map(w => w.warehouseId || w.id);

    const dropdownFields = {
        vendorId: vendorOptions,
        vendorWarehouseId: warehouseOptions
    };

    const templateFields = [
        'poNumber',
        'vendorId',
        'vendorWarehouseId',
        'poDate',
        'expectedDeliveryDate',
        'poQty',
        'qtySent',
        'qtyPending',
        'deliveredQty'
    ];

    return await createTemplateWithValidation({
        templateData: templateData.length > 0 ? templateData : [],
        templateFields,
        dropdownFields,
        sheetName: 'PO_Template',
        fileName: 'Purchase_Order_Import_Template.xlsx'
    });
}

/**
 * Create Shipment template with PO and Transporter dropdowns
 */
export async function createShipmentTemplateWithValidation(pos, transporters, templateData = []) {
    const poOptions = pos.map(po => po.poNumber);
    const transporterOptions = transporters.map(t => t.transporterId || t.id);

    const dropdownFields = {
        poNumber: poOptions,
        transporterId: transporterOptions
    };

    const templateFields = [
        'shipmentNumber',
        'poNumber',
        'transporterId',
        'invoiceNumber',
        'shipmentDate',
        'sentQty',
        'deliveredQty',
        'notes'
    ];

    return await createTemplateWithValidation({
        templateData: templateData.length > 0 ? templateData : [],
        templateFields,
        dropdownFields,
        sheetName: 'Shipment_Template',
        fileName: 'Shipment_Import_Template.xlsx'
    });
}
