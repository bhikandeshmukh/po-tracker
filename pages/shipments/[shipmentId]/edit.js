// pages/shipments/[shipmentId]/edit.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout/Layout';
import apiClient from '../../../lib/api-client';
import { ArrowLeft, Save } from 'lucide-react';

export default function EditShipment() {
    const router = useRouter();
    const { shipmentId } = router.query;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        newShipmentId: '',
        shipmentDate: '',
        expectedDeliveryDate: '',
        notes: '',
        items: []
    });

    useEffect(() => {
        const fetchShipment = async () => {
            try {
                setLoading(true);
                const response = await apiClient.getShipmentById(shipmentId);
                
                if (response.success) {
                    const shipment = response.data;
                    setFormData({
                        newShipmentId: shipment.shipmentId || shipmentId,
                        shipmentDate: shipment.shipmentDate?.split('T')[0] || '',
                        expectedDeliveryDate: shipment.expectedDeliveryDate?.split('T')[0] || '',
                        notes: shipment.notes || '',
                        items: shipment.items || []
                    });
                }
            } catch (err) {
                setError('Failed to load shipment');
            } finally {
                setLoading(false);
            }
        };

        if (shipmentId) fetchShipment();
    }, [shipmentId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const updateData = {
                shipmentDate: formData.shipmentDate,
                expectedDeliveryDate: formData.expectedDeliveryDate,
                notes: formData.notes
            };

            // If shipment ID changed, include it
            if (formData.newShipmentId !== shipmentId) {
                updateData.newShipmentId = formData.newShipmentId;
            }

            const response = await apiClient.updateShipment(shipmentId, updateData);

            if (response.success) {
                // Always redirect to original shipment ID (document ID doesn't change)
                router.push(`/shipments/${shipmentId}`);
            } else {
                setError(response.error?.message || 'Failed to update shipment');
            }
        } catch (err) {
            setError(err.message || 'Failed to update shipment');
        } finally {
            setSaving(false);
        }
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData({ ...formData, items: newItems });
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center space-x-4">
                    <button onClick={() => router.push(`/shipments/${shipmentId}`)} className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Edit Shipment</h1>
                        <p className="text-gray-600 mt-1">Update shipment details</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                    {/* Shipment ID */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Shipment ID *
                        </label>
                        <input
                            type="text"
                            value={formData.newShipmentId}
                            onChange={(e) => setFormData({ ...formData, newShipmentId: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="Enter new shipment ID"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            ⚠️ Changing shipment ID will update all related records (appointments, audit logs, etc.)
                        </p>
                    </div>

                    {/* Shipment Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Shipment Date *
                            </label>
                            <input
                                type="date"
                                value={formData.shipmentDate}
                                onChange={(e) => setFormData({ ...formData, shipmentDate: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Expected Delivery Date *
                            </label>
                            <input
                                type="date"
                                value={formData.expectedDeliveryDate}
                                onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="Add any notes about this shipment..."
                        />
                    </div>

                    {/* Items */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Items ({formData.items.length})</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Shipped Qty</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {formData.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-3 text-sm text-gray-900">{item.sku}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900">{item.itemName}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                                <input
                                                    type="number"
                                                    value={item.shippedQuantity}
                                                    onChange={(e) => handleItemChange(idx, 'shippedQuantity', parseInt(e.target.value) || 0)}
                                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
                                                    min="0"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 text-right">₹{item.unitPrice}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={() => router.push(`/shipments/${shipmentId}`)}
                            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center space-x-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}
