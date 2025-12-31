// components/PurchaseOrders/POExcelImport.js
// Excel import specifically for Purchase Orders with vendor/warehouse dropdowns

import { useState, useEffect } from 'react';
import { 
    safeParseExcel, 
    safeSheetToJSON, 
    validateExcelFile,
    validateParsedData,
    EXCEL_CONFIG
} from '../../lib/secure-excel';
import apiClient from '../../lib/api-client';
import { Upload, Download, FileSpreadsheet, X, CheckCircle, AlertCircle, Shield, List, Info } from 'lucide-react';

export default function POExcelImport({ onImport, onClose }) {
    const [file, setFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [preview, setPreview] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [vendors, setVendors] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loadingDropdowns, setLoadingDropdowns] = useState(false);

    useEffect(() => {
        loadDropdownData();
    }, []);

    const loadDropdownData = async () => {
        setLoadingDropdowns(true);
        try {
            // Fetch vendors
            const vendorsResponse = await apiClient.getVendors({ limit: 1000 });
            if (vendorsResponse.success && vendorsResponse.data) {
                setVendors(vendorsResponse.data);
            }

            // Fetch all warehouses
            const allWarehouses = [];
            if (vendorsResponse.success && vendorsResponse.data) {
                for (const vendor of vendorsResponse.data) {
                    const vendorId = vendor.vendorId || vendor.id;
                    const warehousesResponse = await apiClient.getVendorWarehouses(vendorId);
                    
                    if (warehousesResponse.success && warehousesResponse.data) {
                        warehousesResponse.data.forEach(warehouse => {
                            allWarehouses.push({
                                ...warehouse,
                                vendorId: vendorId,
                                vendorName: vendor.vendorName || vendor.name
                            });
                        });
                    }
                }
            }
            setWarehouses(allWarehouses);
        } catch (err) {
            console.error('Failed to load dropdown data:', err);
        } finally {
            setLoadingDropdowns(false);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

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
            const workbook = await safeParseExcel(file, { timeout: 10000 });
            
            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                setError('Excel file has no sheets');
                return;
            }

            // Find the PO_Template sheet or use first sheet
            const templateSheetName = workbook.SheetNames.find(name => name.includes('Template') || name.includes('PO')) || workbook.SheetNames[0];
            console.log('Reading sheet:', templateSheetName, 'Available sheets:', workbook.SheetNames);
            
            const firstSheet = workbook.Sheets[templateSheetName];
            const jsonData = safeSheetToJSON(firstSheet);
            
            if (jsonData.length === 0) {
                setError('Excel file is empty');
                return;
            }

            // Log parsed data for debugging
            console.log('Parsed Excel data:', jsonData.slice(0, 2));
            console.log('First row keys:', Object.keys(jsonData[0] || {}));

            const requiredFields = ['poNumber', 'vendorId', 'vendorWarehouseId', 'poDate', 'expectedDeliveryDate', 'poQty'];
            const dataValidation = validateParsedData(jsonData, requiredFields);
            if (!dataValidation.valid) {
                // Show more detailed error
                const firstRow = jsonData[0] || {};
                const availableFields = Object.keys(firstRow).join(', ');
                setError(`${dataValidation.errors.join('. ')}. Available fields: ${availableFields || 'none'}`);
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
            const workbook = await safeParseExcel(file);
            
            // Find the PO_Template sheet or use first sheet (same logic as parseExcel)
            const templateSheetName = workbook.SheetNames.find(name => name.includes('Template') || name.includes('PO')) || workbook.SheetNames[0];
            console.log('Importing from sheet:', templateSheetName);
            
            const firstSheet = workbook.Sheets[templateSheetName];
            const jsonData = safeSheetToJSON(firstSheet);

            const result = await onImport(jsonData);
            
            if (result.success) {
                setSuccess(result.message || `Successfully imported ${jsonData.length} records!`);
                setTimeout(() => {
                    onClose();
                }, 2000);
            } else {
                setError(result.error || 'Import failed');
            }
        } catch (err) {
            console.error('Import error full:', err);
            console.error('Import error response:', err.response);
            console.error('Import error details:', err.details);
            
            // Extract detailed error information
            let errorMessage = 'Import failed';
            let errorDetails = '';
            
            if (err.details) {
                // Error from our own code with details
                errorDetails = JSON.stringify(err.details, null, 2);
                errorMessage = err.message || errorMessage;
            } else if (err.response?.data) {
                const errorData = err.response.data;
                errorMessage = errorData.error?.message || errorData.message || errorMessage;
                
                if (errorData.error?.details) {
                    errorDetails = JSON.stringify(errorData.error.details, null, 2);
                    console.error('Validation details:', errorData.error.details);
                }
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            setError(`${errorMessage}${errorDetails ? '\n\nDetails:\n' + errorDetails : ''}`);
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = async () => {
        try {
            setLoadingDropdowns(true);

            // Use ExcelJS-based template generator with REAL dropdowns
            // Pass empty array for templateData to create EMPTY template
            const { createPOTemplateWithValidation } = await import('../../lib/excel-template-with-validation');
            
            await createPOTemplateWithValidation(vendors, warehouses, []); // Empty template - no existing data

        } catch (err) {
            console.error('Failed to create template:', err);
            alert('Failed to create template: ' + err.message);
        } finally {
            setLoadingDropdowns(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                        <h2 className="text-xl font-bold text-gray-900">Import Purchase Orders from Excel</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Step 1: Download Template */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <h3 className="font-semibold text-blue-900 mb-1">Step 1: Download Template with Dropdowns</h3>
                                <p className="text-sm text-blue-700">
                                    {loadingDropdowns ? 'Loading vendor and warehouse data...' : 
                                     `Template includes ${vendors.length} vendors and ${warehouses.length} warehouses as dropdown options`}
                                </p>
                            </div>
                            <button
                                onClick={downloadTemplate}
                                disabled={loadingDropdowns}
                                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                            >
                                <Download className="w-4 h-4" />
                                <span>{loadingDropdowns ? 'Loading...' : 'Download'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Step 2: Upload File */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">Step 2: Upload Filled Template</h3>
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:bg-gray-100 transition">
                            <Upload className="w-12 h-12 text-gray-400 mb-3" />
                            <span className="text-sm text-gray-600 mb-2">Click to upload or drag and drop</span>
                            <span className="text-xs text-gray-500">Excel files only (.xlsx, .xls)</span>
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>
                        {file && (
                            <div className="mt-3 flex items-center space-x-2 text-sm text-gray-700">
                                <FileSpreadsheet className="w-4 h-4" />
                                <span>{file.name}</span>
                                <span className="text-gray-500">({(file.size / 1024).toFixed(2)} KB)</span>
                            </div>
                        )}
                    </div>

                    {/* Dropdown Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start space-x-2">
                        <List className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <strong>Smart Template with Real Dropdowns:</strong> The template includes working Excel dropdown lists for Vendor ID ({vendors.length} vendors) and Warehouse ID ({warehouses.length} warehouses). Click cells to see dropdown arrows!
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start space-x-2">
                        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800">
                            <strong>How to use:</strong> Download template → Open in Excel → Click dropdown cells (marked with ⬇️) → Select from list → Fill other fields → Save → Upload
                        </div>
                    </div>

                    {/* Security Notice */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start space-x-2">
                        <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-green-800">
                            <strong>Secure Upload:</strong> Files are validated (max {EXCEL_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB, {EXCEL_CONFIG.MAX_ROWS.toLocaleString()} rows) and processed with security protections.
                        </div>
                    </div>

                    {/* Preview */}
                    {preview.length > 0 && (
                        <div className="border border-gray-200 rounded-lg p-4">
                            <h3 className="font-semibold text-gray-900 mb-3">Preview (First 5 rows)</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {Object.keys(preview[0]).map(key => (
                                                <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                    {key}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {preview.map((row, idx) => (
                                            <tr key={idx}>
                                                {Object.values(row).map((val, i) => (
                                                    <td key={i} className="px-3 py-2 text-gray-700">
                                                        {String(val)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-red-800">{error}</div>
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-2">
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-green-800">{success}</div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                        disabled={importing}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!file || importing}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {importing ? 'Importing...' : 'Import Purchase Orders'}
                    </button>
                </div>
            </div>
        </div>
    );
}
