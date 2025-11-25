// pages/purchase-orders/[poId].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import apiClient from '../../lib/api-client';
import { DetailSkeleton } from '../../components/Common/LoadingSkeleton';
import { exportPOToPDF } from '../../lib/pdf-export';
import { ArrowLeft, Edit, CheckCircle, XCircle, Package, Calendar, Building2, Truck, Activity, FileDown, Upload } from 'lucide-react';
import ShipmentExcelImport from '../../components/Shipments/ShipmentExcelImport';

export default function PODetail() {
    const router = useRouter();
    const { poId } = router.query;
    const [po, setPO] = useState(null);
    const [items, setItems] = useState([]);
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showAllItems, setShowAllItems] = useState(false);
    const [showCreateShipment, setShowCreateShipment] = useState(false);
    const [showImportShipment, setShowImportShipment] = useState(false);

    const fetchPODetails = async () => {
        try {
            setLoading(true);
            // API returns items in the PO detail response
            const poResponse = await apiClient.getPOById(poId);
            
            if (poResponse.success) {
                const poData = poResponse.data;
                
                // Auto-fix: Update PO status based on shipped quantity
                const totalQty = poData.totalQuantity || 0;
                const shippedQty = poData.shippedQuantity || 0;
                const currentStatus = poData.status;
                
                if (totalQty > 0 && shippedQty > 0) {
                    let correctStatus = currentStatus;
                    const expectedDeliveryDate = poData.expectedDeliveryDate ? new Date(poData.expectedDeliveryDate) : null;
                    const isExpired = expectedDeliveryDate && new Date() > expectedDeliveryDate;
                    
                    if (shippedQty >= totalQty) {
                        correctStatus = 'completed';
                    } else if (shippedQty > 0) {
                        correctStatus = isExpired ? 'partial_completed' : 'partial_sent';
                    }
                    
                    // Update if status is incorrect
                    if (correctStatus !== currentStatus && ['approved', 'partial_sent', 'partial_completed'].includes(currentStatus)) {
                        console.log(`Auto-fixing PO status: ${currentStatus} → ${correctStatus}`);
                        try {
                            await apiClient.put(`/purchase-orders/${poId}`, { status: correctStatus });
                            poData.status = correctStatus;
                        } catch (err) {
                            console.error('Failed to auto-fix PO status:', err);
                        }
                    }
                }
                
                setPO(poData);
                // Items are included in the PO response
                if (poData.items) {
                    setItems(poData.items);
                }
            }
            
            // Fetch shipments for this PO
            await fetchShipments();
        } catch (error) {
            console.error('Failed to fetch PO:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const fetchShipments = async () => {
        try {
            const response = await apiClient.getShipments({ poId });
            if (response.success) {
                const shipmentsData = response.data || [];
                
                // Fetch appointment data for each shipment to get LR docket number
                const shipmentsWithAppointments = await Promise.all(
                    shipmentsData.map(async (shipment) => {
                        if (shipment.appointmentId) {
                            try {
                                const appointmentResponse = await apiClient.getAppointmentById(shipment.appointmentId);
                                if (appointmentResponse.success) {
                                    // Merge appointment data (LR docket number, etc.)
                                    return {
                                        ...shipment,
                                        lrDocketNumber: appointmentResponse.data.lrDocketNumber,
                                        scheduledTimeSlot: appointmentResponse.data.scheduledTimeSlot
                                    };
                                }
                            } catch (err) {
                                console.error(`Failed to fetch appointment ${shipment.appointmentId}:`, err);
                            }
                        }
                        return shipment;
                    })
                );
                
                setShipments(shipmentsWithAppointments);
            }
        } catch (error) {
            console.error('Failed to fetch shipments:', error);
        }
    };
    
    // Helper to convert Excel date to ISO
    const excelDateToISO = (excelDate) => {
        if (!excelDate) return null;
        if (typeof excelDate === 'string') {
            const date = new Date(excelDate);
            return date.toISOString();
        }
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        return date.toISOString();
    };
    
    const handleShipmentImport = async (data) => {
        try {
            // Group by shipment number
            const shipmentGroups = {};
            
            data.forEach(row => {
                if (!shipmentGroups[row.shipmentNumber]) {
                    shipmentGroups[row.shipmentNumber] = {
                        shipmentNumber: row.shipmentNumber,
                        poNumber: row.poNumber,
                        transporterId: row.transporterId,
                        invoiceNumber: row.invoiceNumber || '',
                        shipmentDate: excelDateToISO(row.shipmentDate),
                        expectedDeliveryDate: null, // Will be fetched from PO
                        notes: row.notes || '',
                        items: []
                    };
                }
                
                shipmentGroups[row.shipmentNumber].items.push({
                    sku: row.sku,
                    sentQty: parseInt(row.sentQty) || 0
                });
            });
            
            // Create shipments (API will handle updating PO sent qty)
            const results = [];
            for (const shipment of Object.values(shipmentGroups)) {
                try {
                    console.log('Creating shipment:', shipment);
                    
                    // Get PO details and items
                    const [poResponse, poItemsResponse] = await Promise.all([
                        apiClient.getPOById(shipment.poNumber),
                        apiClient.getPOItems(shipment.poNumber)
                    ]);
                    
                    if (!poResponse.success) {
                        throw new Error('PO not found');
                    }
                    
                    const poData = poResponse.data;
                    const poItems = poItemsResponse.success ? poItemsResponse.data : [];
                    
                    // Create a map of PO items for quick lookup
                    const poItemsMap = {};
                    poItems.forEach(item => {
                        poItemsMap[item.sku || item.itemId] = item;
                    });
                    
                    // Auto-fetch expected delivery from PO
                    const expectedDeliveryDate = poData.expectedDeliveryDate || shipment.shipmentDate;
                    
                    // Prepare shipment data for API with proper item details
                    const shipmentData = {
                        appointmentNumber: shipment.shipmentNumber,
                        poId: shipment.poNumber,
                        transporterId: shipment.transporterId,
                        invoiceNumber: shipment.invoiceNumber,
                        shipmentDate: shipment.shipmentDate,
                        expectedDeliveryDate: expectedDeliveryDate,
                        shippingAddress: {},
                        notes: shipment.notes,
                        items: shipment.items.map(item => {
                            const poItem = poItemsMap[item.sku] || {};
                            return {
                                sku: item.sku,
                                itemName: poItem.itemName || item.sku,
                                shippedQuantity: item.sentQty,
                                unitPrice: poItem.unitPrice || 0,
                                gstRate: poItem.gstRate || 18,
                                poQuantity: poItem.poQuantity || item.sentQty
                            };
                        })
                    };
                    
                    const response = await apiClient.createShipment(shipmentData);
                    results.push({ success: response.success, shipmentNumber: shipment.shipmentNumber });
                } catch (err) {
                    console.error('Failed to create shipment:', err);
                    results.push({ success: false, shipmentNumber: shipment.shipmentNumber, error: err.message });
                }
            }
            
            const successCount = results.filter(r => r.success).length;
            await fetchShipments();
            await fetchPODetails(); // Refresh PO to show updated sent qty
            
            return {
                success: true,
                message: `Imported ${successCount} shipment(s)`
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    useEffect(() => {
        if (poId) fetchPODetails();
    }, [poId]);

    const handleApprove = async () => {
        if (!confirm('Are you sure you want to approve this PO?')) return;
        
        setActionLoading(true);
        try {
            const response = await apiClient.approvePO(poId, {
                approvedBy: 'current-user',
                approvalNotes: 'Approved'
            });
            
            if (response.success) {
                fetchPODetails();
            } else {
                console.error('Failed to approve PO');
            }
        } catch (error) {
            console.error('Failed to approve PO:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancel = async () => {
        const reason = prompt('Enter cancellation reason:');
        if (!reason) return;
        
        setActionLoading(true);
        try {
            const response = await apiClient.cancelPO(poId, {
                cancelledBy: 'current-user',
                cancellationReason: reason
            });
            
            if (response.success) {
                fetchPODetails();
            } else {
                console.error('Failed to cancel PO');
            }
        } catch (error) {
            console.error('Failed to cancel PO:', error);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <DetailSkeleton />
            </Layout>
        );
    }

    if (!po) {
        return (
            <Layout>
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900">PO not found</h2>
                </div>
            </Layout>
        );
    }

    const statusColors = {
        draft: 'bg-gray-100 text-gray-800',
        pending: 'bg-yellow-100 text-yellow-800',
        approved: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800'
    };

    return (
        <Layout>
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => router.push('/purchase-orders')} className="p-2 hover:bg-gray-100 rounded-lg">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{po.poNumber}</h1>
                            <p className="text-gray-600 mt-1">Purchase Order Details</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button 
                            onClick={() => exportPOToPDF(po, items)}
                            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            <FileDown className="w-4 h-4" />
                            <span>Export PDF</span>
                        </button>
                        {po.status === 'draft' && (
                            <>
                                <button onClick={handleApprove} disabled={actionLoading}
                                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Approve</span>
                                </button>
                                <button onClick={handleCancel} disabled={actionLoading}
                                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                                    <XCircle className="w-4 h-4" />
                                    <span>Cancel</span>
                                </button>
                            </>
                        )}
                        <button onClick={() => router.push(`/purchase-orders/${poId}/edit`)}
                            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                        </button>
                        <button onClick={() => router.push(`/purchase-orders/${poId}/activity`)}
                            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                            <Activity className="w-4 h-4" />
                            <span>Activity Log</span>
                        </button>
                    </div>
                </div>

                {/* PO Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Status</span>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[po.status]}`}>
                                    {po.status}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">PO Date</span>
                                <span className="font-medium">{new Date(po.poDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Expected Delivery</span>
                                <span className="font-medium">{new Date(po.expectedDeliveryDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Total Items</span>
                                <span className="font-medium">{po.totalItems || items.length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Information</h3>
                        <div className="space-y-3">
                            <div className="flex items-start space-x-3">
                                <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-500">Vendor</p>
                                    <p className="font-medium">{po.vendorName || po.vendorId}</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <Truck className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm text-gray-500">Warehouse</p>
                                    <p className="font-medium">{po.vendorWarehouseName || po.vendorWarehouseId}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quantity Summary</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Total Qty</span>
                                <span className="text-2xl font-bold text-gray-900">{po.totalQuantity || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Sent Qty</span>
                                <span className="text-2xl font-bold text-blue-600">{po.shippedQuantity || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Pending Qty</span>
                                <span className="text-2xl font-bold text-orange-600">{(po.totalQuantity || 0) - (po.shippedQuantity || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Items</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">PO Qty</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Shipped</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pending</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {(showAllItems ? items : items.slice(0, 5)).map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="px-4 py-3 text-sm text-gray-900">{item.sku || item.itemId}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{item.itemName}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.poQuantity}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.shippedQuantity || 0}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.pendingQuantity || item.poQuantity}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 text-right">₹{item.unitPrice}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                                            ₹{(item.poQuantity * item.unitPrice).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Show More Button */}
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

                    {/* Totals */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="flex justify-end space-x-12">
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Subtotal</p>
                                <p className="text-lg font-semibold text-gray-900">₹{po.totalAmount?.toFixed(2) || '0.00'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">GST</p>
                                <p className="text-lg font-semibold text-gray-900">₹{po.totalGST?.toFixed(2) || '0.00'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Grand Total</p>
                                <p className="text-2xl font-bold text-indigo-600">₹{po.grandTotal?.toFixed(2) || '0.00'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Shipments Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Shipments ({shipments.length})</h3>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={() => setShowImportShipment(true)}
                                className="flex items-center space-x-2 px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50"
                            >
                                <Upload className="w-4 h-4" />
                                <span>Import Excel</span>
                            </button>
                            <button
                                onClick={() => setShowCreateShipment(!showCreateShipment)}
                                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                <Package className="w-4 h-4" />
                                <span>{showCreateShipment ? 'Cancel' : 'Create Shipment'}</span>
                            </button>
                        </div>
                    </div>
                    
                    {showCreateShipment && (
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <h4 className="font-medium text-gray-900 mb-3">Create New Shipment</h4>
                            <p className="text-sm text-gray-600">Shipment creation form will be added here</p>
                        </div>
                    )}
                    
                    {shipments.length === 0 ? (
                        <div className="text-center py-8">
                            <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No shipments created yet</p>
                            <p className="text-sm text-gray-400 mt-1">Create a shipment to track delivery</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {shipments.map((shipment) => (
                                <div 
                                    key={shipment.shipmentId} 
                                    className="border border-gray-200 rounded-lg p-5 hover:bg-gray-50 transition cursor-pointer"
                                    onClick={() => router.push(`/shipments/${shipment.shipmentId}`)}
                                >
                                    <div className="flex items-center space-x-3 mb-2">
                                        <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600">
                                            <Truck className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        {shipment.shipmentNumber || shipment.shipmentId}
                                                    </h3>
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                                        shipment.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                                        shipment.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                                                        shipment.status === 'created' ? 'bg-purple-100 text-purple-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {shipment.status?.replace('_', ' ').toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-2">
                                                {shipment.lrDocketNumber && (
                                                    <span className="font-medium">LR: {shipment.lrDocketNumber}</span>
                                                )}
                                                {shipment.vendorName && (
                                                    <span className="flex items-center">
                                                        <Building2 className="w-3 h-3 mr-1" />{shipment.vendorName}
                                                    </span>
                                                )}
                                                {shipment.invoiceNumber && (
                                                    <span className="font-medium">Invoice: {shipment.invoiceNumber}</span>
                                                )}
                                                {shipment.totalQuantity && (
                                                    <span className="flex items-center font-medium text-indigo-600">
                                                        <Package className="w-3 h-3 mr-1" />
                                                        Qty: {shipment.totalQuantity}
                                                    </span>
                                                )}
                                                <span className="flex items-center">
                                                    <Calendar className="w-3 h-3 mr-1" />
                                                    {new Date(shipment.shipmentDate).toLocaleDateString('en-IN', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </span>
                                                {shipment.transporterName && (
                                                    <span className="flex items-center">
                                                        <Truck className="w-3 h-3 mr-1" />
                                                        {shipment.transporterName}
                                                    </span>
                                                )}
                                                {shipment.appointmentId && (
                                                    <span className="flex items-center">
                                                        <Calendar className="w-3 h-3 mr-1" />
                                                        Appointment: {shipment.appointmentId}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Notes */}
                {po.notes && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
                        <p className="text-gray-700">{po.notes}</p>
                    </div>
                )}
            </div>
            
            {/* Shipment Import Modal */}
            {showImportShipment && (
                <ShipmentExcelImport
                    onImport={handleShipmentImport}
                    onClose={() => setShowImportShipment(false)}
                />
            )}
        </Layout>
    );
}
