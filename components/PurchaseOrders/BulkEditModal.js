// components/PurchaseOrders/BulkEditModal.js
import { useState } from 'react';
import { X, CheckSquare } from 'lucide-react';

export default function BulkEditModal({ selectedPOs, onClose, onUpdate }) {
    const [bulkAction, setBulkAction] = useState('');
    const [newStatus, setNewStatus] = useState('');
    const [loading, setLoading] = useState(false);

    const handleBulkUpdate = async () => {
        if (!bulkAction) {
            alert('Please select an action');
            return;
        }

        if (bulkAction === 'status' && !newStatus) {
            alert('Please select a status');
            return;
        }

        setLoading(true);

        try {
            const updates = selectedPOs.map(poId => {
                const updateData = {};
                
                if (bulkAction === 'status') {
                    updateData.status = newStatus;
                }
                
                return { poId, updateData };
            });

            await onUpdate(updates);
            onClose();
        } catch (error) {
            alert(`Bulk update failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <CheckSquare className="w-6 h-6 text-indigo-600" />
                        <h3 className="text-xl font-semibold text-gray-900">
                            Bulk Edit ({selectedPOs.length} POs)
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Action
                        </label>
                        <select
                            value={bulkAction}
                            onChange={(e) => setBulkAction(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Choose an action...</option>
                            <option value="status">Update Status</option>
                            <option value="approve">Approve All</option>
                            <option value="cancel">Cancel All</option>
                        </select>
                    </div>

                    {bulkAction === 'status' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                New Status
                            </label>
                            <select
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Select status...</option>
                                <option value="draft">Draft</option>
                                <option value="submitted">Submitted</option>
                                <option value="approved">Approved</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    )}

                    {bulkAction === 'approve' && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-800">
                                This will approve all {selectedPOs.length} selected purchase orders.
                            </p>
                        </div>
                    )}

                    {bulkAction === 'cancel' && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">
                                This will cancel all {selectedPOs.length} selected purchase orders.
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleBulkUpdate}
                        disabled={loading || !bulkAction}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? 'Updating...' : 'Apply Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
