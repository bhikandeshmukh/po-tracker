// components/Shipments/ShipmentExcelImport.js
// Excel import for Shipments with PO/Transporter dropdowns

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

export default function ShipmentExcelImport({ onImport, onClose }) {
    const [file, setFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [preview, setPreview] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [pos, setPOs] = useState([]);
    const [transporters, setTransporters] = useState([]);
    const [loadingDropdowns, setLoadingDropdowns] = useState(false);

    useEffect(() => {
        loadDropdownData();
    }, []);

    const loadDropdownData = async () => {
        setLoadingDropdowns(true);
        try {
            // Fetch POs
            const posResponse = await apiClient.getPurchaseOrders({ limit: 1000 });
            if (posResponse.success && posResponse.data) {
                setPOs(posResponse.data);
            }

            // Fetch transporters
            const transportersResponse = await apiClient.getTransporters({ limit: 1000 });
            if (transportersResponse.success && transportersResponse.data) {
                setTransporters(transportersResponse.data);
            }
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

            const templateSheetName = workbook.SheetNames.find(name => name.includes('Template') || name.includes('Shipment')) || workbook.SheetNames[0];
            const firstSheet = workbook.Sheets[templateSheetName];
            const jsonData = safeSheetToJSON(firstSheet);
            
            if (jsonData.length === 0) {
                setError('Excel file is empty');
                return;
            }

            const requiredFields = ['shipmentNumber', 'poNumber', 'transporterId', 'shipmentDate', 'sentQty'];
            const dataValidation = validateParsedData(jsonData, requiredFields);
            if (!dataValidation.valid) {
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
            const templateSheetName = workbook.SheetNames.find(name => name.includes('Template') || name.includes('Shipment')) || workbook.SheetNames[0];
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
            console.error('Import error:', err);
            setError(err.message || 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    const downloadTemplate = async () => {
        try {
            setLoadingDropdowns(true);

            const { createShipmentTemplateWithValidation } = await import('../../lib/excel-template-with-validation');
            await createShipmentTemplateWithValidation(pos, transporters, []);

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
                        <h2 className="text-xl font-bold text-gray-900">Import Shipments from Excel</h2>
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
                                    {loadingDropdowns ? 'Loading PO and transporter data...' : 
                                     `Template includes ${pos.length} POs and ${transporters.length} transporters as dropdown options`}
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
                            </div>
                        )}
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

                    {/* Error/Success Messages */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-red-800">{error}</div>
                        </div>
                    )}

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
                        {importing ? 'Importing...' : 'Import Shipments'}
                    </button>
                </div>
            </div>
        </div>
    );
}
