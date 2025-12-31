// pages/shipments/index.js
// Shipments List Page

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import apiClient from '../../lib/api-client';
import ExcelImport from '../../components/Common/ExcelImport';
import { Truck, Plus, Search, MapPin, Package, Calendar } from 'lucide-react';
import { formatDate } from '../../lib/date-utils';
import { ListSkeleton } from '../../components/Common/LoadingSkeleton';

const statusColors = {
    created: 'bg-gray-100 text-gray-800',
    dispatched: 'bg-blue-100 text-blue-800',
    in_transit: 'bg-yellow-100 text-yellow-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
};

export default function Shipments() {
    const router = useRouter();
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        fetchShipments();
    }, [statusFilter]);

    const fetchShipments = async () => {
        try {
            setLoading(true);
            const params = { limit: 50 };
            if (statusFilter !== 'all') params.status = statusFilter;

            const response = await apiClient.getShipments(params);
            if (response.success) {
                setShipments(response.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch shipments:', error);
            // Set empty array on error to show empty state
            setShipments([]);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkImport = async (data) => {
        try {
            const results = [];
            for (const row of data) {
                try {
                    const response = await apiClient.createShipment({
                        trackingNumber: row.trackingNumber,
                        transporterId: row.transporterId,
                        origin: row.origin,
                        destination: row.destination,
                        expectedDelivery: row.expectedDelivery,
                        status: row.status || 'pending'
                    });
                    results.push({ success: response.success });
                } catch (err) {
                    results.push({ success: false });
                }
            }
            const successCount = results.filter(r => r.success).length;
            await fetchShipments();
            return { success: true, message: `Imported ${successCount} out of ${data.length} shipments` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Shipments</h1>
                        <p className="text-gray-600 mt-1">Track all shipments and deliveries</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <ExcelImport
                            onImport={handleBulkImport}
                            moduleName="Shipments"
                            templateColumns={{
                                trackingNumber: 'TRACK123456',
                                transporterId: 'trans123',
                                origin: 'Mumbai',
                                destination: 'Delhi',
                                expectedDelivery: '2025-01-30',
                                status: 'pending'
                            }}
                            sampleData={[{
                                trackingNumber: 'TRACK123456',
                                transporterId: 'trans123',
                                origin: 'Mumbai',
                                destination: 'Delhi',
                                expectedDelivery: '2025-01-30',
                                status: 'pending'
                            }]}
                        />
                        <button
                            onClick={() => router.push('/shipments/create')}
                            className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Create Shipment</span>
                        </button>
                    </div>
                </div>

                {/* Filter */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        <option value="all">All Status</option>
                        <option value="created">Created</option>
                        <option value="dispatched">Dispatched</option>
                        <option value="in_transit">In Transit</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>

                {/* Shipments List */}
                {loading ? (
                    <ListSkeleton rows={6} />
                ) : shipments.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No shipments found</h3>
                        <p className="text-gray-500">Shipments will appear here once created</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {shipments.map((shipment) => (
                            <div
                                key={shipment.shipmentId}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer"
                                onClick={() => router.push(`/shipments/${shipment.shipmentId}`)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-4 flex-1">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                            <Truck className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {shipment.shipmentNumber}
                                                </h3>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[shipment.status]}`}>
                                                    {shipment.status.replace('_', ' ').toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                                <div className="flex items-center space-x-2">
                                                    <Package className="w-4 h-4" />
                                                    <span>PO: {shipment.poNumber}</span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <MapPin className="w-4 h-4" />
                                                    <span>{shipment.transporterName}</span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>{formatDate(shipment.shipmentDate)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-medium text-gray-900">
                                            {shipment.totalQuantity} items
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}
