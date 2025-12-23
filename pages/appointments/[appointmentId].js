// pages/appointments/[appointmentId].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import apiClient from '../../lib/api-client';
import { ArrowLeft, Truck, MapPin, Calendar, Package, Edit } from 'lucide-react';

export default function AppointmentDetail() {
    const router = useRouter();
    const { appointmentId } = router.query;
    const [appointment, setAppointment] = useState(null);
    const [shipment, setShipment] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [showAllItems, setShowAllItems] = useState(false);

    const fetchAppointment = async () => {
        try {
            setLoading(true);
            const response = await apiClient.getAppointmentById(appointmentId);
            if (response.success) {
                const appointmentData = response.data;
                setAppointment(appointmentData);
                
                // Fetch PO data to get warehouse info
                if (appointmentData.poId) {
                    try {
                        const poResponse = await apiClient.getPOById(appointmentData.poId);
                        if (poResponse.success) {
                            appointmentData.vendorWarehouseName = poResponse.data.vendorWarehouseName;
                            appointmentData.vendorWarehouseId = poResponse.data.vendorWarehouseId;
                            setAppointment({...appointmentData});
                        }
                    } catch (err) {
                        console.error('Failed to fetch PO:', err);
                    }
                }
                
                // Fetch shipment data to get all details
                if (appointmentData.shipmentId) {
                    try {
                        const shipmentResponse = await apiClient.getShipmentById(appointmentData.shipmentId);
                        if (shipmentResponse.success) {
                            const shipmentData = shipmentResponse.data;
                            // Also get warehouse from shipment's PO if not already set
                            if (!appointmentData.vendorWarehouseName && shipmentData.poId) {
                                try {
                                    const poResponse = await apiClient.getPOById(shipmentData.poId);
                                    if (poResponse.success) {
                                        shipmentData.vendorWarehouseName = poResponse.data.vendorWarehouseName;
                                        shipmentData.vendorWarehouseId = poResponse.data.vendorWarehouseId;
                                    }
                                } catch (err) {
                                    console.error('Failed to fetch PO for warehouse:', err);
                                }
                            }
                            setShipment(shipmentData);
                            if (shipmentData.items) {
                                setItems(shipmentData.items);
                            }
                        }
                    } catch (err) {
                        console.error('Failed to fetch shipment:', err);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch appointment:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (appointmentId) fetchAppointment();
    }, [appointmentId]);

    const handleStatusUpdate = async (newStatus) => {
        if (!confirm(`Update status to ${newStatus}?`)) return;
        
        setUpdating(true);
        try {
            // Update shipment status (which will sync to appointment)
            if (appointment.shipmentId) {
                const response = await apiClient.updateShipmentStatus(appointment.shipmentId, { status: newStatus });
                if (response?.success) {
                    await fetchAppointment();
                }
            } else {
                // Fallback to appointment update if no shipment linked
                const response = await apiClient.updateAppointment(appointmentId, { status: newStatus });
                if (response?.success) {
                    await fetchAppointment();
                }
            }
        } catch (error) {
            console.error('Failed to update status:', error);
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

    if (!appointment) {
        return (
            <Layout>
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900">Appointment not found</h2>
                </div>
            </Layout>
        );
    }

    const statusColors = {
        created: 'bg-purple-100 text-purple-800',
        pending: 'bg-yellow-100 text-yellow-800',
        in_transit: 'bg-blue-100 text-blue-800',
        delivered: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
        // Legacy status mapping
        scheduled: 'bg-blue-100 text-blue-800',
        confirmed: 'bg-indigo-100 text-indigo-800',
        completed: 'bg-green-100 text-green-800'
    };

    // Merge data from appointment and shipment - use shipment status as primary
    const data = {
        ...appointment,
        ...shipment,
        // Use shipment status if available, otherwise appointment status
        status: shipment?.status || appointment.status,
        appointmentNumber: appointment.appointmentNumber,
        lrDocketNumber: shipment?.lrDocketNumber || appointment.lrDocketNumber,
        invoiceNumber: shipment?.invoiceNumber || appointment.invoiceNumber
    };

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => router.push(`/purchase-orders/${data.poId}`)} className="p-2 hover:bg-gray-100 rounded-lg">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{data.appointmentNumber}</h1>
                            <p className="text-gray-600 mt-1">Appointment Details • PO: {data.poNumber}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[data.status]}`}>
                            {data.status}
                        </span>
                        <button
                            onClick={() => router.push(`/appointments/${appointmentId}/edit`)}
                            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-start space-x-3">
                            <Truck className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Transporter</p>
                                <p className="font-medium">{data.transporterName || data.transporterId || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Warehouse</p>
                                <p className="font-medium">{data.vendorWarehouseName || data.vendorWarehouseId || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Scheduled Date</p>
                                <p className="font-medium">
                                    {data.scheduledDate 
                                        ? new Date(data.scheduledDate).toLocaleDateString('en-IN', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                        })
                                        : '-'
                                    }
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Invoice Number</p>
                                <p className="font-medium">{data.invoiceNumber || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">LR Docket Number</p>
                                <p className="font-medium">{data.lrDocketNumber || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Total Qty</p>
                                <p className="font-medium">{data.totalQuantity || 0}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Time Slot</p>
                                <p className="font-medium">{data.scheduledTimeSlot || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Vendor</p>
                                <p className="font-medium">{data.vendorName || data.vendorId || '-'}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Shipment</p>
                                <button
                                    onClick={() => router.push(`/shipments/${data.shipmentId}`)}
                                    className="font-medium text-indigo-600 hover:text-indigo-700"
                                >
                                    {data.shipmentNumber || data.shipmentId} →
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Appointment Progress - Same as Shipment */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Shipment Progress</h3>
                    
                    {/* Progress Bar */}
                    <div className="relative mb-8">
                        <div className="flex items-center justify-between">
                            {/* Created */}
                            <div className="flex flex-col items-center flex-1">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                    ['created', 'pending', 'in_transit', 'delivered', 'scheduled', 'confirmed', 'completed'].includes(data.status)
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-200 text-gray-400'
                                }`}>
                                    <Package className="w-6 h-6" />
                                </div>
                                <p className="text-xs font-medium mt-2 text-center">Created</p>
                                {data.status === 'created' && (
                                    <span className="text-xs text-indigo-600 font-semibold mt-1">Current</span>
                                )}
                            </div>

                            {/* Line 1 */}
                            <div className={`flex-1 h-1 -mx-2 ${
                                ['pending', 'in_transit', 'delivered', 'confirmed', 'completed'].includes(data.status)
                                    ? 'bg-indigo-600'
                                    : 'bg-gray-200'
                            }`}></div>

                            {/* Pending */}
                            <div className="flex flex-col items-center flex-1">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                    ['pending', 'in_transit', 'delivered', 'confirmed', 'completed'].includes(data.status)
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-200 text-gray-400'
                                }`}>
                                    <Truck className="w-6 h-6" />
                                </div>
                                <p className="text-xs font-medium mt-2 text-center">Pending</p>
                                {data.status === 'pending' && (
                                    <span className="text-xs text-indigo-600 font-semibold mt-1">Current</span>
                                )}
                            </div>

                            {/* Line 2 */}
                            <div className={`flex-1 h-1 -mx-2 ${
                                ['in_transit', 'delivered', 'completed'].includes(data.status)
                                    ? 'bg-indigo-600'
                                    : 'bg-gray-200'
                            }`}></div>

                            {/* In Transit */}
                            <div className="flex flex-col items-center flex-1">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                    ['in_transit', 'delivered', 'completed'].includes(data.status)
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-200 text-gray-400'
                                }`}>
                                    <Truck className="w-6 h-6" />
                                </div>
                                <p className="text-xs font-medium mt-2 text-center">In Transit</p>
                                {data.status === 'in_transit' && (
                                    <span className="text-xs text-indigo-600 font-semibold mt-1">Current</span>
                                )}
                            </div>

                            {/* Line 3 */}
                            <div className={`flex-1 h-1 -mx-2 ${
                                ['delivered', 'completed'].includes(data.status)
                                    ? 'bg-indigo-600'
                                    : 'bg-gray-200'
                            }`}></div>

                            {/* Delivered */}
                            <div className="flex flex-col items-center flex-1">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                    ['delivered', 'completed'].includes(data.status)
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-200 text-gray-400'
                                }`}>
                                    <MapPin className="w-6 h-6" />
                                </div>
                                <p className="text-xs font-medium mt-2 text-center">Delivered</p>
                                {['delivered', 'completed'].includes(data.status) && (
                                    <span className="text-xs text-green-600 font-semibold mt-1">Current</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Status Update Buttons - Same as Shipment */}
                    <div className="border-t pt-6">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Update Status</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <button 
                                onClick={() => handleStatusUpdate('pending')} 
                                disabled={updating || data.status === 'pending'}
                                className={`px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                                    data.status === 'pending'
                                        ? 'bg-yellow-600 text-white'
                                        : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                                }`}
                            >
                                Pending
                            </button>
                            <button 
                                onClick={() => handleStatusUpdate('in_transit')} 
                                disabled={updating || data.status === 'in_transit'}
                                className={`px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                                    data.status === 'in_transit'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                                }`}
                            >
                                In Transit
                            </button>
                            <button 
                                onClick={() => handleStatusUpdate('delivered')} 
                                disabled={updating || ['delivered', 'completed'].includes(data.status)}
                                className={`px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                                    ['delivered', 'completed'].includes(data.status)
                                        ? 'bg-green-600 text-white'
                                        : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                }`}
                            >
                                Delivered
                            </button>
                            <button 
                                onClick={() => handleStatusUpdate('cancelled')} 
                                disabled={updating || data.status === 'cancelled'}
                                className={`px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                                    data.status === 'cancelled'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                }`}
                            >
                                Cancelled
                            </button>
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Items ({items.length})</h3>
                    {items.length === 0 ? (
                        <div className="text-center py-8">
                            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No items</p>
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
                                                <td className="px-4 py-3 text-sm text-gray-900">{data.invoiceNumber || '-'}</td>
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
                                        {showAllItems ? `Show Less` : `Show More (${items.length - 5} more)`}
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
                                    <p className="text-sm text-gray-500">Total Qty</p>
                                    <p className="text-2xl font-bold text-indigo-600">{data.totalQuantity || 0}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
