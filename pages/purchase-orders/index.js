// pages/purchase-orders/index.js
// Purchase Orders List Page

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import ProtectedRoute from '../../components/ProtectedRoute';
import apiClient from '../../lib/api-client';
import POExcelImport from '../../components/PurchaseOrders/POExcelImport';
import { TableSkeleton } from '../../components/Common/LoadingSkeleton';
import { exportPOsToCSV } from '../../lib/pdf-export';
import { formatDate } from '../../lib/date-utils';
import { 
    Package, 
    Plus, 
    Search, 
    Filter, 
    Download,
    Eye,
    Edit,
    Trash2,
    CheckCircle,
    Clock,
    XCircle,
    FileDown,
    Upload
} from 'lucide-react';

const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    submitted: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    partial_sent: 'bg-yellow-100 text-yellow-800',
    partial_completed: 'bg-orange-100 text-orange-800',
    completed: 'bg-purple-100 text-purple-800',
    fully_shipped: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800',
    closed: 'bg-red-100 text-red-800',
};

const statusIcons = {
    draft: Clock,
    submitted: Clock,
    approved: CheckCircle,
    partial_sent: Package,
    partial_completed: Package,
    fully_shipped: CheckCircle,
    completed: CheckCircle,
    cancelled: XCircle,
    closed: XCircle,
};

export default function PurchaseOrders() {
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [nextCursor, setNextCursor] = useState(null);
    const [prevCursors, setPrevCursors] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => {
        fetchOrders();
    }, [statusFilter, rowsPerPage]);

    const fetchOrders = async (cursor = null, direction = 'next') => {
        try {
            setLoading(true);
            const params = { limit: rowsPerPage };
            if (statusFilter !== 'all') params.status = statusFilter;
            if (searchTerm) params.search = searchTerm;
            if (cursor) params.lastDocId = cursor;

            const response = await apiClient.getPurchaseOrders(params);
            if (response.success) {
                setOrders(response.data || []);
                setPagination(response.pagination);
                
                if (response.pagination?.nextCursor) {
                    setNextCursor(response.pagination.nextCursor);
                } else {
                    setNextCursor(null);
                }
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const handleNextPage = () => {
        if (nextCursor) {
            setPrevCursors([...prevCursors, orders[0]?.id]);
            fetchOrders(nextCursor, 'next');
        }
    };

    const handlePrevPage = () => {
        if (prevCursors.length > 0) {
            const newPrevCursors = [...prevCursors];
            const cursor = newPrevCursors.pop();
            setPrevCursors(newPrevCursors);
            fetchOrders(cursor, 'prev');
        }
    };

    // Helper to convert Excel date serial number to ISO date string
    const excelDateToISO = (excelDate) => {
        if (!excelDate) return null;
        // If already a string date, ensure it's in ISO format
        if (typeof excelDate === 'string') {
            // Parse and return full ISO string with time
            const date = new Date(excelDate);
            return date.toISOString();
        }
        // Convert Excel serial number to date
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        return date.toISOString();
    };

    const handleBulkImportWithItems = async (data) => {
        try {
            console.log('Import data received:', data.length, 'rows');
            console.log('All rows:', JSON.stringify(data, null, 2));
            
            // Group rows by poNumber
            const poGroups = {};
            
            data.forEach((row, index) => {
                console.log(`Processing row ${index}:`, row);
                if (!poGroups[row.poNumber]) {
                    poGroups[row.poNumber] = {
                        poNumber: row.poNumber,
                        vendorId: row.vendorId,
                        vendorWarehouseId: row.vendorWarehouseId,
                        poDate: excelDateToISO(row.poDate),
                        expectedDeliveryDate: excelDateToISO(row.expectedDeliveryDate || row.poDate),
                        notes: '',
                        termsAndConditions: '',
                        items: []
                    };
                }
                
                // Add item to PO
                poGroups[row.poNumber].items.push({
                    poQuantity: parseInt(row.poQty) || 0,
                    shippedQuantity: parseInt(row.qtySent) || 0,
                    pendingQuantity: parseInt(row.qtyPending) || 0,
                    deliveredQuantity: parseInt(row.deliveredQty) || 0
                });
            });
            
            // Create each PO
            const results = [];
            for (const po of Object.values(poGroups)) {
                try {
                    console.log('Creating PO with items count:', po.items?.length);
                    console.log('Items is array?', Array.isArray(po.items));
                    console.log('PO object type:', typeof po);
                    console.log('PO keys:', Object.keys(po));
                    
                    // Ensure items is an array
                    if (!Array.isArray(po.items)) {
                        console.error('Items is not an array!', po.items);
                        throw new Error('Items must be an array');
                    }
                    
                    const response = await apiClient.createPO(po);
                    results.push({ success: response.success, poNumber: po.poNumber });
                } catch (err) {
                    console.error('Failed to create PO:', po.poNumber, err);
                    console.error('Error message:', err.message);
                    console.error('Error details:', err.details);
                    console.error('Error status:', err.status);
                    console.error('Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
                    results.push({ success: false, poNumber: po.poNumber, error: err.message, details: err.details });
                }
            }
            
            const successCount = results.filter(r => r.success).length;
            const totalPOs = Object.keys(poGroups).length;
            const failedResults = results.filter(r => !r.success);
            
            await fetchOrders();
            
            if (failedResults.length > 0) {
                // Show detailed error for first failed PO
                const firstError = failedResults[0];
                const errorMsg = `Failed to import ${failedResults.length} PO(s). First error (${firstError.poNumber}): ${firstError.error}`;
                const errorDetails = firstError.details ? JSON.stringify(firstError.details, null, 2) : '';
                
                return {
                    success: false,
                    error: errorMsg,
                    details: firstError.details
                };
            }
            
            return { 
                success: true, 
                message: `Imported ${successCount} out of ${totalPOs} purchase orders with ${data.length} total items` 
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPrevCursors([]);
        setNextCursor(null);
        fetchOrders();
    };

    return (
        <ProtectedRoute>
            <Layout>
                <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
                        <p className="text-gray-600 mt-1">Manage and track all purchase orders</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPrevCursors([]);
                                setNextCursor(null);
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="all">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="submitted">Submitted</option>
                            <option value="approved">Approved</option>
                            <option value="partial_sent">Partial Sent</option>
                            <option value="partial_completed">Partial Completed</option>
                            <option value="completed">Completed</option>
                            <option value="closed">Closed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        {orders.length > 0 && (
                            <button
                                onClick={() => exportPOsToCSV(orders)}
                                className="flex items-center space-x-2 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
                            >
                                <FileDown className="w-4 h-4" />
                                <span>Export CSV</span>
                            </button>
                        )}
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="flex items-center space-x-2 border border-indigo-600 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 transition"
                        >
                            <Upload className="w-5 h-5" />
                            <span>Import Excel</span>
                        </button>
                        {/* Old import component - keeping as fallback
                        <ExcelImportWithAPI
                            onImport={handleBulkImportWithItems}
                            moduleName="Purchase Orders"
                            fetchTemplateData={async () => {
                                const response = await apiClient.getPurchaseOrders({ limit: 5 });
                                if (!response.success) return [];
                                
                                // Fetch items for each PO
                                const posWithItems = [];
                                for (const po of response.data) {
                                    try {
                                        const itemsResponse = await apiClient.getPOItems(po.poId);
                                        const items = itemsResponse.success ? itemsResponse.data : [];
                                        
                                        items.forEach(item => {
                                            posWithItems.push({
                                                poNumber: po.poNumber,
                                                vendorId: po.vendorId,
                                                vendorWarehouseId: po.vendorWarehouseId,
                                                poDate: po.poDate?.split('T')[0] || '',
                                                cancelledDate: po.cancelledDate?.split('T')[0] || '',
                                                sku: item.sku || item.itemId,
                                                mrp: item.unitPrice,
                                                poQty: item.poQuantity || 0,
                                                qtySent: item.shippedQuantity || 0,
                                                qtyPending: item.pendingQuantity || item.poQuantity,
                                                price: item.unitPrice
                                            });
                                        });
                                    } catch (err) {
                                        console.error('Error fetching items:', err);
                                    }
                                }
                                return posWithItems;
                            }}
                            templateFields={[
                                'poNumber',
                                'vendorId',
                                'vendorWarehouseId',
                                'poDate',
                                'cancelledDate',
                                'sku',
                                'mrp',
                                'poQty',
                                'qtySent',
                                'qtyPending',
                                'price'
                            ]}
                        /> */}
                        <button
                            onClick={() => router.push('/purchase-orders/create')}
                            className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Create PO</span>
                        </button>
                    </div>
                </div>



                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {loading ? (
                        <TableSkeleton rows={10} columns={6} />
                    ) : orders.length === 0 ? (
                        <div className="text-center py-12">
                            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No purchase orders found</h3>
                            <p className="text-gray-500 mb-6">Get started by creating your first purchase order</p>
                            <button
                                onClick={() => router.push('/purchase-orders/create')}
                                className="inline-flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
                            >
                                <Plus className="w-5 h-5" />
                                <span>Create Purchase Order</span>
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                PO Number
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Vendor
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Warehouse
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Total Qty
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Sent Qty
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Pending Qty
                                            </th>

                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {orders.map((order) => {
                                            const StatusIcon = statusIcons[order.status] || Clock;
                                            const statusColor = statusColors[order.status] || 'bg-gray-100 text-gray-800';
                                            
                                            return (
                                                <tr key={order.poId} className="hover:bg-gray-50 transition">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <Package className="w-5 h-5 text-gray-400 mr-2" />
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {order.poNumber}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="text-sm text-gray-900">{order.vendorName}</span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="text-sm text-gray-600">{order.vendorWarehouseName || 'N/A'}</span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="text-sm text-gray-500">
                                                            {formatDate(order.poDate)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <span className="text-sm font-medium text-gray-900">
                                                            {order.totalQuantity || 0}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <span className="text-sm font-medium text-green-600">
                                                            {order.shippedQuantity || 0}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <span className="text-sm font-medium text-orange-600">
                                                            {order.pendingQuantity || 0}
                                                        </span>
                                                    </td>

                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                                                            <StatusIcon className="w-3 h-3" />
                                                            <span className="capitalize">{order.status.replace('_', ' ')}</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <div className="flex items-center space-x-2">
                                                            <button
                                                                onClick={() => router.push(`/purchase-orders/${order.poId}`)}
                                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                                title="View"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => router.push(`/purchase-orders/${order.poId}/edit`)}
                                                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                                                title="Edit"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {pagination && (pagination.hasMore || prevCursors.length > 0) && (
                                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="text-sm text-gray-500">
                                            Showing {pagination.count} results
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <label htmlFor="rowsPerPage" className="text-sm text-gray-600">
                                                Rows per page:
                                            </label>
                                            <select
                                                id="rowsPerPage"
                                                value={rowsPerPage}
                                                onChange={(e) => {
                                                    setRowsPerPage(Number(e.target.value));
                                                    setPrevCursors([]);
                                                    setNextCursor(null);
                                                }}
                                                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            >
                                                <option value={10}>10</option>
                                                <option value={30}>30</option>
                                                <option value={50}>50</option>
                                                <option value={70}>70</option>
                                                <option value={100}>100</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={handlePrevPage}
                                            disabled={prevCursors.length === 0}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={handleNextPage}
                                            disabled={!pagination.hasMore}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Import Modal */}
            {showImportModal && (
                <POExcelImport
                    onImport={handleBulkImportWithItems}
                    onClose={() => setShowImportModal(false)}
                />
            )}
            </Layout>
        </ProtectedRoute>
    );
}
