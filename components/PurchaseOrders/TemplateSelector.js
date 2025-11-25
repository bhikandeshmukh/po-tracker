// components/PurchaseOrders/TemplateSelector.js
import { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Download, Upload, X } from 'lucide-react';
import { 
    getPOTemplates, 
    savePOTemplate, 
    deletePOTemplate, 
    loadPOTemplate,
    exportTemplate,
    importTemplate 
} from '../../lib/po-templates';

export default function TemplateSelector({ onLoadTemplate, currentFormData }) {
    const [templates, setTemplates] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [templateName, setTemplateName] = useState('');

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = () => {
        setTemplates(getPOTemplates());
    };

    const handleLoadTemplate = (templateId) => {
        const formData = loadPOTemplate(templateId);
        if (formData) {
            onLoadTemplate(formData);
            setShowModal(false);
        }
    };

    const handleSaveTemplate = () => {
        if (!templateName.trim()) {
            alert('Please enter a template name');
            return;
        }

        const success = savePOTemplate(templateName, currentFormData);
        if (success) {
            setTemplateName('');
            setShowSaveModal(false);
            loadTemplates();
            alert('Template saved successfully!');
        } else {
            alert('Failed to save template');
        }
    };

    const handleDeleteTemplate = (templateId) => {
        if (confirm('Are you sure you want to delete this template?')) {
            deletePOTemplate(templateId);
            loadTemplates();
        }
    };

    const handleExportTemplate = (template) => {
        exportTemplate(template);
    };

    const handleImportTemplate = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        importTemplate(file)
            .then(() => {
                loadTemplates();
                alert('Template imported successfully!');
            })
            .catch((error) => {
                alert(`Failed to import template: ${error.message}`);
            });
    };

    return (
        <>
            <div className="flex items-center space-x-2">
                <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                    <FileText className="w-4 h-4" />
                    <span>Load Template</span>
                </button>
                <button
                    type="button"
                    onClick={() => setShowSaveModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                    <Plus className="w-4 h-4" />
                    <span>Save as Template</span>
                </button>
            </div>

            {/* Load Template Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-xl font-semibold text-gray-900">Load PO Template</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {templates.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">No templates saved yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {templates.map((template) => (
                                        <div
                                            key={template.id}
                                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                                        >
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-900">{template.name}</h4>
                                                <p className="text-sm text-gray-500">
                                                    {template.data.items.length} items • Created {new Date(template.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handleLoadTemplate(template.id)}
                                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                                                >
                                                    Load
                                                </button>
                                                <button
                                                    onClick={() => handleExportTemplate(template)}
                                                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                                    title="Export"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTemplate(template.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-200 bg-gray-50">
                            <label className="flex items-center justify-center space-x-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer">
                                <Upload className="w-4 h-4 text-gray-600" />
                                <span className="text-gray-600">Import Template</span>
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleImportTemplate}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Template Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-xl font-semibold text-gray-900">Save as Template</h3>
                            <button onClick={() => setShowSaveModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Template Name
                            </label>
                            <input
                                type="text"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="e.g., Weekly Vendor Order"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                autoFocus
                            />
                            <p className="mt-2 text-sm text-gray-500">
                                This will save the vendor, warehouse, and items for quick reuse.
                            </p>
                        </div>

                        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setShowSaveModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveTemplate}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                Save Template
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
