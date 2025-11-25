// components/Common/ExcelImportWithAPI.js
// Excel import with API-connected templates
// SECURITY: Uses secure wrapper to mitigate xlsx vulnerabilities

import { useState, useEffect } from 'react';
import { 
    safeParseExcel, 
    safeSheetToJSON, 
    safeCreateExcel,
    validateExcelFile,
    validateParsedData,
    EXCEL_CONFIG
} from '../../lib/secure-excel';
import { Upload, Download, FileSpreadsheet, X, CheckCircle, AlertCircle, Shield } from 'lucide-react';

export default function ExcelImportWithAPI({ 
    onImport, 
    moduleName = 'Data',
    fetchTemplateData, // Function to fetch actual data from API
    templateFields = [] // Array of field names to include in template
}) {
    const [showModal, setShowModal] = useState(false);
    const [file, setFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [preview, setPreview] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [templateData, setTemplateData] = useState([]);
    const [loadingTemplate, setLoadingTemplate] = useState(false);

    useEffect(() => {
        if (showModal && fetchTemplateData) {
            loadTemplateData();
        }
    }, [showModal]);

    const loadTemplateData = async () => {
        setLoadingTemplate(true);
        try {
            const data = await fetchTemplateData();
            setTemplateData(data);
        } catch (err) {
            console.error('Failed to load template data:', err);
        } finally {
            setLoadingTemplate(false);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        // Validate file before processing
        const validation = validateExcelFile(selectedFile);
        if (!validation.valid) {
            setError(validation.errors.join('. '));
            return;
        }

        setFile(selectedFile);
        setError('');
        parseExcel(selectedFile);
    };

    const parseExcel = async (file) => {
        try {
            // Use secure parser with timeout protection
            const workbook = await safeParseExcel(file, { timeout: 10000 });
            
            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                setError('Excel file has no sheets');
                return;
            }

            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            
            // Use safe sheet to JSON conversion
            const jsonData = safeSheetToJSON(firstSheet);
            
            if (jsonData.length === 0) {
                setError('Excel file is empty');
                return;
            }

            // Validate parsed data
            const dataValidation = validateParsedData(jsonData, templateFields);
            if (!dataValidation.valid) {
                setError(dataValidation.errors.join('. '));
                return;
            }

            setPreview(jsonData.slice(0, 5));
            setError('');
        } catch (err) {
            setError('Failed to parse Excel file: ' + err.message);
            console.error('Excel parse error:', err);
        }
    };

    const handleImport = async () => {
        if (!file) {
            setError('Please select a file first');
            return;
        }

        setImporting(true);
        setError('');
        setSuccess('');

        try {
            // Use secure parser
            const workbook = await safeParseExcel(file);
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            
            // Use safe sheet to JSON conversion
            const jsonData = safeSheetToJSON(firstSheet);

            // Validate data before import
            const validation = validateParsedData(jsonData, templateFields);
            if (!validation.valid) {
                setError(validation.errors.join('. '));
                setImporting(false);
                return;
            }

            const result = await onImport(jsonData);
            
            if (result.success) {
                setSuccess(result.message || `Successfully imported ${jsonData.length} records!`);
                setTimeout(() => {
                    setShowModal(false);
                    setFile(null);
                    setPreview([]);
                    setSuccess('');
                }, 2000);
            } else {
                setError(result.error || 'Import failed');
            }
        } catch (err) {
            setError('Import failed: ' + err.message);
            console.error('Import error:', err);
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = async () => {
        try {
            setLoadingTemplate(true);
            
            // Check if this is a PO import (has vendor/warehouse fields)
            const hasVendorFields = templateFields.includes('vendorId') && 
                                   templateFields.includes('vendorWarehouseId');
            
            if (hasVendorFields && onImport.name === 'handleBulkImportWithItems') {
                // Use advanced template with dropdowns for PO import
                await createPOTemplateWithDropdowns(templateData, templateFields, moduleName);
            } else {
                // Use simple template for other imports
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
                    const emptyRow = {};
                    templateFields.forEach(field => {
                        emptyRow[field] = '';
                    });
                    templateRows = [emptyRow];
                }

                safeCreateExcel(templateRows, 'Template', `${moduleName}_Import_Template.xlsx`);
            }
        } catch (err) {
            console.error('Failed to create template:', err);
            alert('Failed to create template: ' + err.message);
        } finally {
            setLoadingTemplate(false);
        }
    };

    // Helper function to create PO template with dropdowns
    const createPOTemplateWithDropdowns = async (data, fields, moduleName) => {
        // Import dynamically to avoid circular dependencies
        const { createTemplateWithDropdowns } = await import('../../lib/excel-template-generator');
        
        // Extract unique vendors and warehouses from template data
        const vendors = [...new Set(data.map(item => item.vendorId).filter(Boolean))];
        const warehouses = [...new Set(data.map(item => item.vendorWarehouseId).filter(Boolean))];
        
        const dropdownFields = {};
        if (vendors.length > 0) {
            dropdownFields.vendorId = vendors;
        }
        if (warehouses.length > 0) {
            dropdownFields.vendorWarehouseId = warehouses;
        }
        
        createTemplateWithDropdowns({
            templateData: data,
            templateFields: fields,
            dropdownFields,
            sheetName: 'Template',
            fileName: `${moduleName}_Import_Template.xlsx`
        });
    };

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="flex items-center space-x-2 px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition"
            >
                <Upload className="w-5 h-5" />
                <span>Import Excel</span>
            </button>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <div className="flex items-center space-x-3">
                                <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                                <h2 className="text-xl font-bold text-gray-900">Import {moduleName} from Excel</h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Security Notice */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start space-x-2">
                                <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-green-800">
                                    <strong>Secure Upload:</strong> Files are validated (max {EXCEL_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB, {EXCEL_CONFIG.MAX_ROWS.toLocaleString()} rows) and processed with security protections.
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-blue-900 mb-1">Step 1: Download Template</h3>
                                        <p className="text-sm text-blue-700">
                                            {loadingTemplate ? 'Loading template data from API...' : 
                                             templateData.length > 0 ? `Template with ${templateData.length} sample records from your database` :
                                             'Download the Excel template with correct column format'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={downloadTemplate}
                                        disabled={loadingTemplate}
                                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span>{loadingTemplate ? 'Loading...' : 'Download Template'}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8">
                                <div className="text-center">
                                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="font-semibold text-gray-900 mb-2">Step 2: Upload Your Excel File</h3>
                                    <p className="text-sm text-gray-600 mb-4">Supports .xlsx, .xls, and .csv files</p>
                                    <label className="inline-flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer transition">
                                        <FileSpreadsheet className="w-5 h-5" />
                                        <span>Choose File</span>
                                        <input
                                            type="file"
                                            accept=".xlsx,.xls,.csv"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                    </label>
                                    {file && (
                                        <p className="mt-4 text-sm text-gray-600">
                                            Selected: <span className="font-medium">{file.name}</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                    <p className="text-sm text-red-800">{error}</p>
                                </div>
                            )}

                            {success && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                    <p className="text-sm text-green-800">{success}</p>
                                </div>
                            )}

                            {preview.length > 0 && (
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Preview (First 5 rows)</h3>
                                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    {Object.keys(preview[0]).map((key) => (
                                                        <th key={key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            {key}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {preview.map((row, idx) => (
                                                    <tr key={idx}>
                                                        {Object.values(row).map((value, i) => (
                                                            <td key={i} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                                {String(value)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={!file || importing}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {importing ? 'Importing...' : 'Import Data'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
