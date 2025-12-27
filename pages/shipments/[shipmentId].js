// pages/shipments/[shipmentId].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import apiClient from '../../lib/api-client';
import DeliveryConfirmModal from '../../components/Common/DeliveryConfirmModal';
import { ArrowLeft, Truck, MapPin, Calendar, Package, Edit } from 'lucide-react';

export default function ShipmentDetail() {
    const router = useRouter();
    const { shipmentId } = router.query;
    const [shipment, setShipment] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [showAllItems, setShowAllItems] = useState(false);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);

    const fetchShipment = async () => {
        try {
            setLoading(true);
            const response = await apiClient.getShipmentById(shipmentId);
            if (response.success) {
                let shipmentData = response.data;

                // Fetch PO data to get warehouse info
                if (shipmentData.poId) {
                    try {
                        const poResponse = await apiClient.getPOById(shipmentData.poId);
                        if (poResponse.success) {
                            shipmentData.vendorWarehouseName = poResponse.data.vendorWarehouseName;
                            shipmentData.vendorWarehouseId = poResponse.data.vendorWarehouseId;
                        }
                    } catch (err) {
                        console.error('Failed to fetch PO:', err);
                    }
                }

                // Fetch appointment data to get any missing fields
                const appointmentId = shipmentData.appointmentId || shipmentId;
                try {
                    const appointmentResponse = await apiClient.getAppointmentById(appointmentId);
                    if (appointmentResponse.success) {
                        const appointmentData = appointmentResponse.data;
                        // Use shipment data first, fallback to appointment data
                        shipmentData = {
                            ...shipmentData,
                            lrDocketNumber: shipmentData.lrDocketNumber || appointmentData.lrDocketNumber,
                            invoiceNumber: shipmentData.invoiceNumber || appointmentData.invoiceNumber,
                            scheduledTimeSlot: shipmentData.scheduledTimeSlot || appointmentData.scheduledTimeSlot
                        };
                    }
                } catch (err) {
                    console.error('Failed to fetch appointment:', err);
                }

                setShipment(shipmentData);
                if (shipmentData.items) {
                    setItems(shipmentData.items);
                }
            }
        } catch (error) {
            console.error('Failed to fetch shipment:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (shipmentId) fetchShipment();
    }, [shipmentId]);

    const handleStatusUpdate = async (newStatus) => {
        // If marking as delivered, show the delivery confirmation modal
        if (newStatus === 'delivered') {
            setShowDeliveryModal(true);
            return;
        }

        if (!confirm(`Update shipment status to ${newStatus}?`)) return;

        setUpdating(true);
        try {
            const response = await apiClient.updateShipmentStatus(shipmentId, { status: newStatus });
            if (response.success) {
                fetchShipment();
            } else {
                console.error('Failed to update status');
            }
        } catch (error) {
            console.error('Failed to update status:', error);
        } finally {
            setUpdating(false);
        }
    };

    const handleDeliveryConfirm = async (deliveryData) => {
        setUpdating(true);
        try {
            const response = await apiClient.updateShipmentStatus(shipmentId, {
                status: 'delivered',
                deliveredQuantity: deliveryData.deliveredQuantity,
                shortageQuantity: deliveryData.shortageQuantity,
                shortageReason: deliveryData.shortageReason,
                deliveredAt: new Date().toISOString()
            });
            if (response.success) {
                fetchShipment();
            } else {
                console.error('Failed to update status');
            }
        } catch (error) {
            console.error('Failed to confirm delivery:', error);
        } finally {
            setUpdating(false);
        }
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

    if (!shipment) {
        return (
            <Layout>
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900">Shipment not found</h2>
                </div>
            </Layout>
        );
    }

    const statusColors = {
        pending: 'bg-yellow-100 text-yellow-800',
        in_transit: 'bg-blue-100 text-blue-800',
        delivered: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800'
    };

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => router.push(`/purchase-orders/${shipment.poId}`)} className="p-2 hover:bg-gray-100 rounded-lg">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{shipment.shipmentNumber || shipment.trackingNumber}</h1>
                            <p className="text-gray-600 mt-1">Shipment Details • PO: {shipment.poNumber}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[shipment.status]}`}>
                            {shipment.status}
                        </span>
                        <button
                            onClick={() => router.push(`/shipments/${shipmentId}/edit`)}
                            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipment Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-start space-x-3">
                            <Truck className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Transporter</p>
                                <p className="font-medium">{shipment.transporterName || shipment.transporterId}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Warehouse</p>
                                <p className="font-medium">{shipment.vendorWarehouseName || shipment.vendorWarehouseId || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Expected Delivery</p>
                                <p className="font-medium">
                                    {shipment.expectedDeliveryDate
                                        ? new Date(shipment.expectedDeliveryDate).toLocaleDateString('en-IN', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                        })
                                        : 'Not set'
                                    }
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Invoice Number</p>
                                <p className="font-medium">{shipment.invoiceNumber || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">LR Docket Number</p>
                                <p className="font-medium">{shipment.lrDocketNumber || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Total Shipped Qty</p>
                                <p className="font-medium">{shipment.totalQuantity || 0}</p>
                            </div>
                        </div>
                        {shipment.deliveredQuantity !== undefined && (
                            <div className="flex items-start space-x-3">
                                <Package className="w-5 h-5 text-green-500 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-500">Delivered Qty</p>
                                    <p className="font-medium text-green-600">
                                        {shipment.deliveredQuantity} / {shipment.totalQuantity}
                                        {shipment.shortageQuantity > 0 && (
                                            <span className="text-red-500 ml-2">(-{shipment.shortageQuantity})</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Shipment Progress */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Shipment Progress</h3>

                    {/* Progress Bar */}
                    <div className="relative mb-8">
                        <div className="flex items-center justify-between">
                            {/* Created */}
                            <div className="flex flex-col items-center flex-1">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${['created', 'pending', 'in_transit', 'delivered'].includes(shipment.status)
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-200 text-gray-400'
                                    }`}>
                                    <Package className="w-6 h-6" />
                                </div>
                                <p className="text-xs font-medium mt-2 text-center">Created</p>
                                {shipment.status === 'created' && (
                                    <span className="text-xs text-indigo-600 font-semibold mt-1">Current</span>
                                )}
                            </div>

                            {/* Line 1 */}
                            <div className={`flex-1 h-1 -mx-2 ${['pending', 'in_transit', 'delivered'].includes(shipment.status)
                                ? 'bg-indigo-600'
                                : 'bg-gray-200'
                                }`}></div>

                            {/* Pending */}
                            <div className="flex flex-col items-center flex-1">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${['pending', 'in_transit', 'delivered'].includes(shipment.status)
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-200 text-gray-400'
                                    }`}>
                                    <Truck className="w-6 h-6" />
                                </div>
                                <p className="text-xs font-medium mt-2 text-center">Pending</p>
                                {shipment.status === 'pending' && (
                                    <span className="text-xs text-indigo-600 font-semibold mt-1">Current</span>
                                )}
                            </div>

                            {/* Line 2 */}
                            <div className={`flex-1 h-1 -mx-2 ${['in_transit', 'delivered'].includes(shipment.status)
                                ? 'bg-indigo-600'
                                : 'bg-gray-200'
                                }`}></div>

                            {/* In Transit */}
                            <div className="flex flex-col items-center flex-1">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${['in_transit', 'delivered'].includes(shipment.status)
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-200 text-gray-400'
                                    }`}>
                                    <Truck className="w-6 h-6" />
                                </div>
                                <p className="text-xs font-medium mt-2 text-center">In Transit</p>
                                {shipment.status === 'in_transit' && (
                                    <span className="text-xs text-indigo-600 font-semibold mt-1">Current</span>
                                )}
                            </div>

                            {/* Line 3 */}
                            <div className={`flex-1 h-1 -mx-2 ${shipment.status === 'delivered'
                                ? 'bg-indigo-600'
                                : 'bg-gray-200'
                                }`}></div>

                            {/* Delivered */}
                            <div className="flex flex-col items-center flex-1">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${shipment.status === 'delivered'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-200 text-gray-400'
                                    }`}>
                                    <MapPin className="w-6 h-6" />
                                </div>
                                <p className="text-xs font-medium mt-2 text-center">Delivered</p>
                                {shipment.status === 'delivered' && (
                                    <span className="text-xs text-green-600 font-semibold mt-1">Current</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Status Update Buttons */}
                    <div className="border-t pt-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Update Status</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <button
                                onClick={() => handleStatusUpdate('pending')}
                                disabled={updating || shipment.status === 'pending'}
                                className={`px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${shipment.status === 'pending'
                                    ? 'bg-yellow-600 text-white'
                                    : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                                    }`}
                            >
                                Pending
                            </button>
                            <button
                                onClick={() => handleStatusUpdate('in_transit')}
                                disabled={updating || shipment.status === 'in_transit'}
                                className={`px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${shipment.status === 'in_transit'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                                    }`}
                            >
                                In Transit
                            </button>
                            <button
                                onClick={() => handleStatusUpdate('delivered')}
                                disabled={updating || shipment.status === 'delivered'}
                                className={`px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${shipment.status === 'delivered'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                    }`}
                            >
                                Delivered
                            </button>
                            <button
                                onClick={() => handleStatusUpdate('cancelled')}
                                disabled={updating || shipment.status === 'cancelled'}
                                className={`px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${shipment.status === 'cancelled'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                    }`}
                            >
                                Cancelled
                            </button>
                        </div>
                    </div>
                </div>

                {/* Shipment Items */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Items ({items.length})</h3>
                    {items.length === 0 ? (
                        <div className="text-center py-8">
                            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No items in this shipment</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice No</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Shipped Qty</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Delivered Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {(showAllItems ? items : items.slice(0, 5)).map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="px-4 py-3 text-sm text-gray-900">{shipment.invoiceNumber || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-green-600 text-right">{item.shippedQuantity}</td>
                                                <td className="px-4 py-3 text-sm text-blue-600 text-right">{item.deliveredQuantity || 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {items.length > 5 && (
                                <div className="mt-4 text-center">
                                    <button
                                        onClick={() => setShowAllItems(!showAllItems)}
                                        className="px-6 py-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm hover:bg-indigo-50 rounded-lg transition"
                                    >
                                        {showAllItems ? `Show Less (${items.length - 5} items hidden)` : `Show More (${items.length - 5} more items)`}
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* Totals */}
                    {items.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="flex justify-end">
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">Total Shipped Qty</p>
                                    <p className="text-2xl font-bold text-indigo-600">{shipment.totalQuantity || 0}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <DeliveryConfirmModal
                isOpen={showDeliveryModal}
                onClose={() => setShowDeliveryModal(false)}
                onConfirm={handleDeliveryConfirm}
                totalQuantity={shipment.totalQuantity}
                itemName="Units"
            />
        </Layout>
    );
}
