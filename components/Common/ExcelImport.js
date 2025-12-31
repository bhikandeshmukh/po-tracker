// components/Common/ExcelImport.js
// Reusable Excel import component
// Migrated from xlsx to ExcelJS for security

import { useState } from 'react';
import ExcelJS from 'exceljs';
import { Upload, Download, FileSpreadsheet, X, CheckCircle, AlertCircle } from 'lucide-react';

export default function ExcelImport({ 
    onImport, 
    templateColumns, 
    moduleName = 'Data',
    sampleData = []
}) {
    const [showModal, setShowModal] = useState(false);
    const [file, setFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [preview, setPreview] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/)) {
            setError('Please upload a valid Excel file (.xlsx, .xls, or .csv)');
            return;
        }

        setFile(selectedFile);
        setError('');
        parseExcel(selectedFile);
    };

    const parseExcel = async (file) => {
        try {
            const buffer = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);
            
            const worksheet = workbook.worksheets[0];
            if (!worksheet) {
                setError('Excel file is empty');
                return;
            }

            const jsonData = worksheetToJSON(worksheet);
            
            if (jsonData.length === 0) {
                setError('Excel file is empty');
                return;
            }

            setPreview(jsonData.slice(0, 5)); // Show first 5 rows
            setError('');
        } catch (err) {
            setError('Failed to parse Excel file: ' + err.message);
        }
    };

    const worksheetToJSON = (worksheet) => {
        const json = [];
        const headers = [];

        // Get headers from first row
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
            headers[colNumber] = cell.value?.toString() || `Column${colNumber}`;
        });

        // Get data rows
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            const rowData = {};
            row.eachCell((cell, colNumber) => {
                const header = headers[colNumber];
                if (header) {
                    let value = cell.value;
                    if (value && typeof value === 'object') {
                        if (value.result !== undefined) value = value.result;
                        else if (value.text) value = value.text;
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

        return json;
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
            const buffer = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer);
            
            const worksheet = workbook.worksheets[0];
            const jsonData = worksheetToJSON(worksheet);

            const result = await onImport(jsonData);
            
            if (result.success) {
                setSuccess(`Successfully imported ${jsonData.length} records!`);
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
        }
        setImporting(false);
    };

    const downloadTemplate = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Template');

            const data = sampleData.length > 0 ? sampleData : [templateColumns];
            
            if (data.length > 0) {
                const headers = Object.keys(data[0]);
                worksheet.columns = headers.map(header => ({
                    header,
                    key: header,
                    width: 20
                }));

                worksheet.getRow(1).font = { bold: true };
                worksheet.getRow(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE0E0E0' }
                };

                if (sampleData.length > 0) {
                    sampleData.forEach(row => worksheet.addRow(row));
                }
            }

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${moduleName}_Import_Template.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            setError('Failed to download template: ' + err.message);
        }
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
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <div className="flex items-center space-x-3">
                                <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                                <h2 className="text-xl font-bold text-gray-900">Import {moduleName} from Excel</h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Download Template */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-blue-900 mb-1">Step 1: Download Template</h3>
                                        <p className="text-sm text-blue-700">Download the Excel template with the correct column format</p>
                                    </div>
                                    <button
                                        onClick={downloadTemplate}
                                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span>Download Template</span>
                                    </button>
                                </div>
                            </div>

                            {/* Upload File */}
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

                            {/* Error Message */}
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm text-red-800">{error}</p>
                                    </div>
                                </div>
                            )}

                            {/* Success Message */}
                            {success && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm text-green-800">{success}</p>
                                    </div>
                                </div>
                            )}

                            {/* Preview */}
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

                        {/* Footer */}
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
