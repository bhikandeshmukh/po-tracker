// components/Common/DeliveryConfirmModal.js
// Modal for confirming delivery with actual quantity

import { useState } from 'react';
import { Package, AlertTriangle, Check, X } from 'lucide-react';

export default function DeliveryConfirmModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    totalQuantity = 0,
    itemName = 'Items'
}) {
    const [deliveredQty, setDeliveredQty] = useState(totalQuantity);
    const [shortageReason, setShortageReason] = useState('');
    const [loading, setLoading] = useState(false);

    const shortage = totalQuantity - deliveredQty;
    const hasShortage = shortage > 0;
    const isOverDelivery = shortage < 0;

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm({
                deliveredQuantity: parseInt(deliveredQty) || 0,
                shortageQuantity: hasShortage ? shortage : 0,
                shortageReason: hasShortage ? shortageReason : '',
                overDeliveryQuantity: isOverDelivery ? Math.abs(shortage) : 0
            });
            onClose();
        } catch (error) {
            console.error('Error confirming delivery:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                <Package className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900">Confirm Delivery</h3>
                                <p className="text-sm text-gray-500">Enter actual delivered quantity</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Expected Quantity */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Expected Quantity</span>
                            <span className="text-lg font-bold text-gray-900">{totalQuantity} {itemName}</span>
                        </div>
                    </div>

                    {/* Delivered Quantity Input */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Actual Delivered Quantity
                        </label>
                        <input
                            type="number"
                            value={deliveredQty}
                            onChange={(e) => setDeliveredQty(e.target.value)}
                            min="0"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-semibold text-center"
                            placeholder="Enter quantity"
                        />
                    </div>

                    {/* Shortage Warning */}
                    {hasShortage && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                            <div className="flex items-start space-x-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-yellow-800">
                                        Shortage Detected: {shortage} {itemName}
                                    </p>
                                    <input
                                        type="text"
                                        value={shortageReason}
                                        onChange={(e) => setShortageReason(e.target.value)}
                                        placeholder="Reason (e.g., Damaged, Short delivery)"
                                        className="mt-2 w-full px-3 py-2 border border-yellow-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Over Delivery Info */}
                    {isOverDelivery && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <div className="flex items-center space-x-3">
                                <Check className="w-5 h-5 text-blue-600" />
                                <p className="text-sm font-medium text-blue-800">
                                    Over Delivery: +{Math.abs(shortage)} {itemName} extra
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Summary */}
                    <div className="bg-green-50 rounded-lg p-4 mb-6">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-green-800">Final Delivered</span>
                            <span className="text-xl font-bold text-green-700">
                                {deliveredQty || 0} / {totalQuantity}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <Check className="w-5 h-5" />
                                    <span>Confirm Delivery</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
