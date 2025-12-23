// pages/purchase-orders/[poId].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import apiClient from '../../lib/api-client';
import { DetailSkeleton } from '../../components/Common/LoadingSkeleton';
import { exportPOToPDF } from '../../lib/pdf-export';
import { ArrowLeft, Edit, CheckCircle, XCircle, Package, Calendar, Building2, Truck, Activity, FileDown, Upload, MessageSquare, Send, User } from 'lucide-react';
import ShipmentExcelImport from '../../components/Shipments/ShipmentExcelImport';
import { formatDate } from '../../lib/date-utils';

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
    const [transporters, setTransporters] = useState([]);
    const [newShipment, setNewShipment] = useState({
        shipmentNumber: '',
        transporterId: '',
        shipmentDate: new Date().toISOString().split('T')[0],
        shippedQty: '',
        docketNumber: '',
        invoiceNumber: '',
        notes: ''
    });
    const [createShipmentLoading, setCreateShipmentLoading] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);

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
                
                // Auto-sync: Update PO items shipped quantity from shipments
                if (poData.shippedQuantity > 0 && poData.items) {
                    const needsSync = poData.items.some(item => (item.shippedQuantity || 0) === 0);
                    if (needsSync) {
                        console.log('Auto-syncing PO items shipped quantity...');
                        try {
                            await apiClient.post('/admin/sync-po-items', { poId });
                            // Refetch to get updated items
                            const refreshResponse = await apiClient.getPOById(poId);
                            if (refreshResponse.success && refreshResponse.data.items) {
                                setItems(refreshResponse.data.items);
                            }
                        } catch (err) {
                            console.error('Failed to auto-sync PO items:', err);
                        }
                    }
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
                
                // Auto-sync: Create missing appointments for shipments
                for (const shipment of shipmentsData) {
                    try {
                        const appointmentResponse = await apiClient.getAppointmentById(shipment.shipmentId);
                        if (!appointmentResponse.success) {
                            // Appointment doesn't exist, create it
                            console.log('Creating missing appointment for shipment:', shipment.shipmentId);
                            await apiClient.post('/admin/sync-appointments', { shipmentId: shipment.shipmentId });
                        }
                    } catch (err) {
                        // Appointment doesn't exist, create it
                        console.log('Creating missing appointment for shipment:', shipment.shipmentId);
                        try {
                            await apiClient.post('/admin/sync-appointments', { shipmentId: shipment.shipmentId });
                        } catch (syncErr) {
                            console.error('Failed to sync appointment:', syncErr);
                        }
                    }
                }
                
                // Fetch appointment data for each shipment to get LR docket number
                const shipmentsWithAppointments = await Promise.all(
                    shipmentsData.map(async (shipment) => {
                        try {
                            const appointmentResponse = await apiClient.getAppointmentById(shipment.shipmentId);
                            if (appointmentResponse.success) {
                                // Merge appointment data (LR docket number, etc.)
                                return {
                                    ...shipment,
                                    lrDocketNumber: shipment.lrDocketNumber || appointmentResponse.data.lrDocketNumber,
                                    invoiceNumber: shipment.invoiceNumber || appointmentResponse.data.invoiceNumber,
                                    scheduledTimeSlot: appointmentResponse.data.scheduledTimeSlot
                                };
                            }
                        } catch (err) {
                            console.error(`Failed to fetch appointment ${shipment.shipmentId}:`, err);
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

    const fetchComments = async () => {
        try {
            const response = await apiClient.get(`/purchase-orders/${poId}/comments`);
            if (response.success) {
                setComments(response.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setCommentLoading(true);
        try {
            const response = await apiClient.post(`/purchase-orders/${poId}/comments`, {
                text: newComment.trim(),
                createdAt: new Date().toISOString(),
                createdBy: 'User' // Can be replaced with actual user name
            });

            if (response.success) {
                setNewComment('');
                await fetchComments();
            }
        } catch (error) {
            console.error('Failed to add comment:', error);
            alert('Failed to add comment');
        } finally {
            setCommentLoading(false);
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
            // Keep data as-is from Excel - no modifications
            const cleanedData = data.map((row, index) => {
                return {
                    ...row,
                    // Parse sentQty as number
                    sentQty: parseInt(row.sentQty) || 0,
                    rowIndex: index + 1
                };
            });

            // Validate cleaned data
            const validationErrors = [];
            cleanedData.forEach((row) => {
                if (!row.shipmentNumber) validationErrors.push(`Row ${row.rowIndex}: Missing shipmentNumber`);
                if (!row.poNumber) validationErrors.push(`Row ${row.rowIndex}: Missing poNumber`);
                if (!row.transporterId) validationErrors.push(`Row ${row.rowIndex}: Missing transporterId`);
                if (!row.sentQty || row.sentQty <= 0) validationErrors.push(`Row ${row.rowIndex}: Invalid sentQty (${row.sentQty})`);
            });

            if (validationErrors.length > 0) {
                alert('Validation errors:\n' + validationErrors.slice(0, 5).join('\n') + 
                      (validationErrors.length > 5 ? `\n...and ${validationErrors.length - 5} more errors` : ''));
                return { success: false, error: validationErrors.join('; ') };
            }

            // Group by shipment number
            const shipmentGroups = {};
            
            cleanedData.forEach(row => {
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
                    sentQty: row.sentQty
                });
            });
            
            // Create shipments (API will handle updating PO sent qty)
            const results = [];
            for (const shipment of Object.values(shipmentGroups)) {
                try {
                    console.log('Creating shipment:', shipment);
                    
                    let actualPoId, poData, poItems;
                    
                    // Check if this shipment is for the current PO
                    if (po && po.poNumber === shipment.poNumber) {
                        // Use current PO data
                        actualPoId = poId;
                        poData = po;
                        poItems = items;
                        console.log('Using current PO data:', actualPoId);
                    } else {
                        // Find the PO by poNumber to get the actual poId
                        const posResponse = await apiClient.getPurchaseOrders({ limit: 1000 });
                        if (!posResponse.success) {
                            throw new Error('Failed to fetch POs');
                        }
                        
                        const matchingPO = posResponse.data.find(p => p.poNumber === shipment.poNumber);
                        if (!matchingPO) {
                            throw new Error(`PO ${shipment.poNumber} not found`);
                        }
                        
                        actualPoId = matchingPO.id || matchingPO.poId;
                        
                        // Get PO details and items using the actual poId
                        const [poResponse, poItemsResponse] = await Promise.all([
                            apiClient.getPOById(actualPoId),
                            apiClient.getPOItems(actualPoId)
                        ]);
                        
                        if (!poResponse.success) {
                            throw new Error('PO not found');
                        }
                        
                        poData = poResponse.data;
                        poItems = poItemsResponse.success ? poItemsResponse.data : [];
                    }
                    
                    // Create a map of PO items for quick lookup
                    const poItemsMap = {};
                    poItems.forEach(item => {
                        poItemsMap[item.sku || item.itemId] = item;
                    });
                    
                    // Auto-fetch expected delivery from PO
                    const expectedDeliveryDate = poData.expectedDeliveryDate || shipment.shipmentDate;
                    
                    // Prepare shipment data for API with proper item details
                    const validItems = shipment.items.filter(item => item.sentQty > 0);

                    if (validItems.length === 0) {
                        throw new Error(`Shipment ${shipment.shipmentNumber} has no valid items`);
                    }

                    const shipmentData = {
                        appointmentNumber: shipment.shipmentNumber,
                        poId: actualPoId, // Use the actual document ID, not poNumber
                        transporterId: shipment.transporterId,
                        invoiceNumber: shipment.invoiceNumber,
                        shipmentDate: shipment.shipmentDate,
                        expectedDeliveryDate: expectedDeliveryDate,
                        shippingAddress: {},
                        notes: shipment.notes,
                        items: validItems.map(item => {
                            return {
                                shippedQuantity: item.sentQty,
                                deliveredQuantity: 0
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
        if (poId) {
            fetchPODetails();
            fetchComments();
        }
    }, [poId]);

    // Fetch transporters for dropdown
    useEffect(() => {
        const fetchTransporters = async () => {
            try {
                const response = await apiClient.getTransporters();
                if (response.success) {
                    setTransporters(response.data || []);
                }
            } catch (error) {
                console.error('Failed to fetch transporters:', error);
            }
        };
        fetchTransporters();
    }, []);

    const handleCreateShipment = async (e) => {
        e.preventDefault();
        
        if (!newShipment.shipmentNumber || !newShipment.transporterId || !newShipment.shippedQty) {
            alert('Please fill all required fields');
            return;
        }

        const shippedQty = parseInt(newShipment.shippedQty);
        if (shippedQty <= 0) {
            alert('Shipped Qty must be greater than 0');
            return;
        }

        setCreateShipmentLoading(true);
        try {
            const shipmentData = {
                appointmentNumber: newShipment.shipmentNumber,
                shipmentNumber: newShipment.shipmentNumber,
                poId: poId,
                transporterId: newShipment.transporterId,
                shipmentDate: new Date(newShipment.shipmentDate).toISOString(),
                expectedDeliveryDate: po.expectedDeliveryDate,
                lrDocketNumber: newShipment.docketNumber,
                invoiceNumber: newShipment.invoiceNumber,
                notes: newShipment.notes,
                items: [{
                    shippedQuantity: shippedQty,
                    deliveredQuantity: 0
                }]
            };

            const response = await apiClient.createShipment(shipmentData);
            
            if (response.success) {
                // Reset form
                setNewShipment({
                    shipmentNumber: '',
                    transporterId: '',
                    shipmentDate: new Date().toISOString().split('T')[0],
                    shippedQty: '',
                    docketNumber: '',
                    invoiceNumber: '',
                    notes: ''
                });
                setShowCreateShipment(false);
                // Refresh data
                await fetchPODetails();
                await fetchShipments();
            } else {
                alert('Failed to create shipment');
            }
        } catch (error) {
            console.error('Failed to create shipment:', error);
            alert(error.message || 'Failed to create shipment');
        } finally {
            setCreateShipmentLoading(false);
        }
    };

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
                                <span className="font-medium">{formatDate(po.poDate)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Expected Delivery</span>
                                <span className="font-medium">{formatDate(po.expectedDeliveryDate)}</span>
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
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Order Qty</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Shipped Qty</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pending Qty</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {(showAllItems ? items : items.slice(0, 5)).map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.poQuantity}</td>
                                        <td className="px-4 py-3 text-sm text-green-600 text-right">{item.shippedQuantity || 0}</td>
                                        <td className="px-4 py-3 text-sm text-orange-600 text-right">{item.pendingQuantity || item.poQuantity}</td>
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
                </div>

                {/* Shipments Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Shipments ({shipments.length})</h3>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={async () => {
                                    try {
                                        const response = await apiClient.post('/admin/sync-appointments', {});
                                        if (response.success) {
                                            alert(`Synced! Created: ${response.createdCount}, Updated: ${response.updatedCount}`);
                                            await fetchShipments();
                                        }
                                    } catch (err) {
                                        console.error('Sync failed:', err);
                                        alert('Sync failed: ' + err.message);
                                    }
                                }}
                                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
                                title="Sync missing appointments"
                            >
                                <Calendar className="w-4 h-4" />
                                <span>Sync Appointments</span>
                            </button>
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
                            <h4 className="font-medium text-gray-900 mb-4">Create New Shipment</h4>
                            <form onSubmit={handleCreateShipment} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Shipment ID <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={newShipment.shipmentNumber}
                                            onChange={(e) => setNewShipment({...newShipment, shipmentNumber: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="Enter Shipment ID"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Transporter <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={newShipment.transporterId}
                                            onChange={(e) => setNewShipment({...newShipment, transporterId: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            required
                                        >
                                            <option value="">Select Transporter</option>
                                            {transporters.map((t) => (
                                                <option key={t.transporterId || t.id} value={t.transporterId || t.id}>
                                                    {t.name || t.transporterName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Shipment Date <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={newShipment.shipmentDate}
                                            onChange={(e) => setNewShipment({...newShipment, shipmentDate: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Shipped Qty <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={newShipment.shippedQty}
                                            onChange={(e) => setNewShipment({...newShipment, shippedQty: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="Enter quantity"
                                            min="1"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Docket No (LR)
                                        </label>
                                        <input
                                            type="text"
                                            value={newShipment.docketNumber}
                                            onChange={(e) => setNewShipment({...newShipment, docketNumber: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="Enter LR/Docket number"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Invoice No
                                        </label>
                                        <input
                                            type="text"
                                            value={newShipment.invoiceNumber}
                                            onChange={(e) => setNewShipment({...newShipment, invoiceNumber: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="Enter invoice number"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                    <textarea
                                        value={newShipment.notes}
                                        onChange={(e) => setNewShipment({...newShipment, notes: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        rows="2"
                                        placeholder="Optional notes"
                                    />
                                </div>
                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateShipment(false)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createShipmentLoading}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {createShipmentLoading ? 'Creating...' : 'Create Shipment'}
                                    </button>
                                </div>
                            </form>
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

                {/* Comments/Logs Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center space-x-2 mb-4">
                        <MessageSquare className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Comments & Logs ({comments.length})</h3>
                    </div>
                    
                    {/* Add Comment Form */}
                    <form onSubmit={handleAddComment} className="mb-6">
                        <div className="flex space-x-3">
                            <div className="flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <User className="w-5 h-5 text-indigo-600" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Add a comment or log... (e.g., 'Called vendor for update', 'Shipment delayed due to weather')"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                                    rows="2"
                                />
                                <div className="flex justify-end mt-2">
                                    <button
                                        type="submit"
                                        disabled={commentLoading || !newComment.trim()}
                                        className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send className="w-4 h-4" />
                                        <span>{commentLoading ? 'Adding...' : 'Add Comment'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* Comments List */}
                    {comments.length === 0 ? (
                        <div className="text-center py-8 border-t border-gray-200">
                            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No comments yet</p>
                            <p className="text-sm text-gray-400 mt-1">Add comments to track work done on this PO</p>
                        </div>
                    ) : (
                        <div className="space-y-4 border-t border-gray-200 pt-4">
                            {comments.map((comment, idx) => (
                                <div key={comment.id || idx} className="flex space-x-3">
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                            <User className="w-5 h-5 text-gray-500" />
                                        </div>
                                    </div>
                                    <div className="flex-1 bg-gray-50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-gray-900">{comment.createdBy || 'User'}</span>
                                            <span className="text-sm text-gray-500">
                                                {comment.createdAt ? new Date(comment.createdAt).toLocaleString('en-IN', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: true
                                                }) : ''}
                                            </span>
                                        </div>
                                        <p className="text-gray-700 whitespace-pre-wrap">{comment.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
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
