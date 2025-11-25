// components/PurchaseOrders/POForm.js
// FIXED: Comprehensive validation, better UX
import { useState, useEffect } from 'react';
import { Building2, Calendar, FileText, Plus, Trash2, AlertCircle } from 'lucide-react';

export default function POForm({ formData, onChange, onSubmit, loading, error, submitText = 'Save' }) {
    const [fieldErrors, setFieldErrors] = useState({});
    const [touched, setTouched] = useState({});

    // Validate form on change
    useEffect(() => {
        if (Object.keys(touched).length > 0) {
            validateForm();
        }
    }, [formData, touched]);

    const validateForm = () => {
        const errors = {};

        // PO Number validation
        if (touched.poNumber && !formData.poNumber) {
            errors.poNumber = 'PO number is required';
        } else if (touched.poNumber && !/^PO\d{7,10}$/.test(formData.poNumber)) {
            errors.poNumber = 'PO number must start with PO followed by 7-10 digits';
        }

        // Vendor validation
        if (touched.vendorId && !formData.vendorId) {
            errors.vendorId = 'Vendor is required';
        }

        // Warehouse validation
        if (touched.vendorWarehouseId && !formData.vendorWarehouseId) {
            errors.vendorWarehouseId = 'Warehouse is required';
        }

        // Date validations
        if (touched.poDate && !formData.poDate) {
            errors.poDate = 'PO date is required';
        } else if (touched.poDate && new Date(formData.poDate) > new Date()) {
            errors.poDate = 'PO date cannot be in the future';
        }

        if (touched.expectedDelivery && !formData.expectedDelivery) {
            errors.expectedDelivery = 'Expected delivery date is required';
        } else if (touched.expectedDelivery && formData.poDate && 
                   new Date(formData.expectedDelivery) < new Date(formData.poDate)) {
            errors.expectedDelivery = 'Expected delivery must be after PO date';
        }

        // Items validation
        if (touched.items && formData.items.length === 0) {
            errors.items = 'At least one item is required';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleBlur = (field) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };
    const handleChange = (e) => {
        const { name, value } = e.target;
        onChange({ ...formData, [name]: value });
        setTouched(prev => ({ ...prev, [name]: true }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        
        // Calculate total for item
        if (field === 'poQty' || field === 'price') {
            const qty = field === 'poQty' ? parseFloat(value) : parseFloat(newItems[index].poQty);
            const price = field === 'price' ? parseFloat(value) : parseFloat(newItems[index].price);
            
            // Validate both values are numbers
            if (!isNaN(qty) && !isNaN(price) && qty >= 0 && price >= 0) {
                newItems[index].totalPrice = qty * price;
            } else {
                newItems[index].totalPrice = 0;
            }
        }
        
        // Auto-calculate qtyPending
        if (field === 'poQty' || field === 'qtySent') {
            const poQty = field === 'poQty' ? parseFloat(value) : parseFloat(newItems[index].poQty || 0);
            const qtySent = field === 'qtySent' ? parseFloat(value) : parseFloat(newItems[index].qtySent || 0);
            
            // Validate both values are numbers
            if (!isNaN(poQty) && !isNaN(qtySent) && poQty >= 0 && qtySent >= 0) {
                newItems[index].qtyPending = Math.max(0, poQty - qtySent);
            } else {
                newItems[index].qtyPending = 0;
            }
        }
        
        onChange({ ...formData, items: newItems });
        setTouched(prev => ({ ...prev, items: true }));
    };

    const addItem = () => {
        onChange({
            ...formData,
            items: [...formData.items, { 
                sku: '', 
                itemName: '',
                mrp: 0, 
                poQty: 1, 
                qtySent: 0, 
                qtyPending: 1, 
                price: 0,
                gstRate: 18, // Default GST rate
                totalPrice: 0 
            }]
        });
    };

    const removeItem = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        onChange({ ...formData, items: newItems });
    };

    const totalAmount = formData.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Basic Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Purchase Order Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">PO Number *</label>
                        <input 
                            type="text" 
                            name="poNumber" 
                            value={formData.poNumber} 
                            onChange={handleChange}
                            onBlur={() => handleBlur('poNumber')}
                            required
                            placeholder="PO20250001"
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                                fieldErrors.poNumber ? 'border-red-500' : 'border-gray-300'
                            }`} 
                        />
                        {fieldErrors.poNumber && (
                            <p className="mt-1 text-sm text-red-600 flex items-center">
                                <AlertCircle className="w-4 h-4 mr-1" />
                                {fieldErrors.poNumber}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vendor ID *</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input 
                                type="text" 
                                name="vendorId" 
                                value={formData.vendorId} 
                                onChange={handleChange}
                                onBlur={() => handleBlur('vendorId')}
                                required
                                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                                    fieldErrors.vendorId ? 'border-red-500' : 'border-gray-300'
                                }`} 
                            />
                        </div>
                        {fieldErrors.vendorId && (
                            <p className="mt-1 text-sm text-red-600 flex items-center">
                                <AlertCircle className="w-4 h-4 mr-1" />
                                {fieldErrors.vendorId}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Warehouse ID *</label>
                        <input type="text" name="vendorWarehouseId" value={formData.vendorWarehouseId} onChange={handleChange} required
                            placeholder="warehouse1"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">PO Date *</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input type="date" name="poDate" value={formData.poDate} onChange={handleChange} required
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Expected Delivery *</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input type="date" name="expectedDelivery" value={formData.expectedDelivery} onChange={handleChange} required
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Cancelled Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input type="date" name="cancelledDate" value={formData.cancelledDate || ''} onChange={handleChange}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select name="status" value={formData.status} onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                            <option value="draft">Draft</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <textarea name="notes" value={formData.notes || ''} onChange={handleChange} rows="2"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"></textarea>
                        </div>
                    </div>
                </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Items</h3>
                    <button type="button" onClick={addItem}
                        className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                        <Plus className="w-4 h-4" />
                        <span>Add Item</span>
                    </button>
                </div>

                <div className="space-y-4">
                    {formData.items.map((item, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-4">
                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-12 md:col-span-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">SKU *</label>
                                    <input type="text" value={item.sku} onChange={(e) => handleItemChange(index, 'sku', e.target.value)} required
                                        placeholder="SKU001"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div className="col-span-12 md:col-span-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Item Name *</label>
                                    <input type="text" value={item.itemName || item.sku} onChange={(e) => handleItemChange(index, 'itemName', e.target.value)} required
                                        placeholder="Product Name"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div className="col-span-6 md:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">MRP</label>
                                    <input type="number" value={item.mrp} onChange={(e) => handleItemChange(index, 'mrp', e.target.value)} min="0" step="0.01"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div className="col-span-6 md:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Price *</label>
                                    <input type="number" value={item.price} onChange={(e) => handleItemChange(index, 'price', e.target.value)} required min="0" step="0.01"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div className="col-span-6 md:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">GST Rate (%) *</label>
                                    <input type="number" value={item.gstRate || 18} onChange={(e) => handleItemChange(index, 'gstRate', e.target.value)} required min="0" max="100" step="0.01"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div className="col-span-6 md:col-span-3">
                                    {/* Spacer for alignment */}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-12 gap-4 items-end">
                                <div className="col-span-6 md:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">PO Qty *</label>
                                    <input type="number" value={item.poQty} onChange={(e) => handleItemChange(index, 'poQty', e.target.value)} required min="1"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div className="col-span-6 md:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Qty Sent</label>
                                    <input type="number" value={item.qtySent} onChange={(e) => handleItemChange(index, 'qtySent', e.target.value)} min="0"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div className="col-span-6 md:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Qty Pending</label>
                                    <input type="number" value={item.qtyPending} readOnly
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100" />
                                </div>
                                <div className="col-span-4 md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Total</label>
                                    <input type="number" value={item.totalPrice} readOnly
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100" />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <button type="button" onClick={() => removeItem(index)}
                                        className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                        <Trash2 className="w-5 h-5 mx-auto" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {formData.items.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No items added. Click "Add Item" to start.
                    </div>
                )}

                {formData.items.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Total Amount</p>
                            <p className="text-2xl font-bold text-gray-900">₹{totalAmount.toFixed(2)}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end">
                <button type="submit" disabled={loading || formData.items.length === 0}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
                    {loading ? 'Saving...' : submitText}
                </button>
            </div>
        </form>
    );
}
