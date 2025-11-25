// pages/returns/index.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import apiClient from '../../lib/api-client';
import ExcelImport from '../../components/Common/ExcelImport';
import { RotateCcw, Plus, AlertCircle, Package } from 'lucide-react';

const statusColors = {
    created: 'bg-gray-100 text-gray-800',
    approved: 'bg-blue-100 text-blue-800',
    in_transit: 'bg-yellow-100 text-yellow-800',
    received: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-red-100 text-red-800',
};

export default function Returns() {
    const router = useRouter();
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReturns();
    }, []);

    const fetchReturns = async () => {
        try {
            const response = await apiClient.getReturns({ limit: 50 });
            if (response.success) setReturns(response.data);
        } catch (error) {
            console.error('Failed to fetch returns:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkImport = async (data) => {
        try {
            const results = [];
            for (const row of data) {
                try {
                    const response = await apiClient.createReturn({
                        poId: row.poId,
                        returnDate: row.returnDate,
                        quantity: parseInt(row.quantity, 10) || 0,
                        reason: row.reason,
                        description: row.description,
                        status: row.status || 'pending'
                    });
                    results.push({ success: response.success });
                } catch (err) {
                    results.push({ success: false });
                }
            }
            const successCount = results.filter(r => r.success).length;
            await fetchReturns();
            return { success: true, message: `Imported ${successCount} out of ${data.length} returns` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Return Orders</h1>
                        <p className="text-gray-600 mt-1">Manage product returns and refunds</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <ExcelImport
                            onImport={handleBulkImport}
                            moduleName="Returns"
                            templateColumns={{
                                poId: 'PO123',
                                returnDate: '2025-01-20',
                                quantity: '10',
                                reason: 'damaged',
                                description: 'Items damaged during shipping',
                                status: 'pending'
                            }}
                            sampleData={[{
                                poId: 'PO123',
                                returnDate: '2025-01-20',
                                quantity: '10',
                                reason: 'damaged',
                                description: 'Items damaged during shipping',
                                status: 'pending'
                            }]}
                        />
                        <button
                            onClick={() => router.push('/returns/create')}
                            className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Create Return</span>
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : returns.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <RotateCcw className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No returns found</h3>
                        <p className="text-gray-500">Return orders will appear here</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {returns.map((returnOrder) => (
                            <div
                                key={returnOrder.returnId}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer"
                                onClick={() => router.push(`/returns/${returnOrder.returnId}`)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-4 flex-1">
                                        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg flex items-center justify-center">
                                            <RotateCcw className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {returnOrder.returnNumber}
                                                </h3>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[returnOrder.status]}`}>
                                                    {returnOrder.status.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                                <div className="flex items-center space-x-2">
                                                    <Package className="w-4 h-4" />
                                                    <span>PO: {returnOrder.poNumber}</span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <AlertCircle className="w-4 h-4" />
                                                    <span className="capitalize">{returnOrder.returnType.replace('_', ' ')}</span>
                                                </div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    ₹{returnOrder.totalAmount?.toLocaleString()}
                                                </div>
                                            </div>
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
