import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import apiClient from '../../lib/api-client';

export default function FixQuantities() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    const handleFix = async () => {
        if (!confirm('Are you sure you want to recalculate all PO quantities? This will update all purchase orders based on actual shipments.')) {
            return;
        }

        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const response = await apiClient.post('/admin/fix-po-quantities', {});
            setResults(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-6xl mx-auto p-6">
                <div className="mb-6">
                    <button
                        onClick={() => router.back()}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                    >
                        ← Back
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h1 className="text-2xl font-bold mb-4">Fix PO Quantities</h1>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
                        <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Warning</h3>
                        <p className="text-sm text-yellow-700">
                            This tool will recalculate all purchase order quantities based on actual shipments.
                            Use this if you manually deleted shipments from the database or if quantities are incorrect.
                        </p>
                    </div>

                    <button
                        onClick={handleFix}
                        disabled={loading}
                        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processing...' : 'Fix All PO Quantities'}
                    </button>

                    {error && (
                        <div className="mt-4 bg-red-50 border border-red-200 rounded p-4">
                            <p className="text-red-800 font-semibold">Error:</p>
                            <p className="text-red-700">{error}</p>
                        </div>
                    )}

                    {results && (
                        <div className="mt-6">
                            <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
                                <p className="text-green-800 font-semibold">
                                    ✓ Successfully updated {results.totalPOs} purchase orders
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Old Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shipped Qty</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Qty</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {results.results.map((result, index) => (
                                            <tr key={index} className={result.oldShippedQty !== result.newShippedQty ? 'bg-yellow-50' : ''}>
                                                <td className="px-4 py-3 text-sm">{result.poNumber}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className="px-2 py-1 text-xs rounded bg-gray-100">
                                                        {result.oldStatus}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`px-2 py-1 text-xs rounded ${
                                                        result.newStatus === 'completed' ? 'bg-green-100 text-green-800' :
                                                        result.newStatus === 'partial_sent' ? 'bg-blue-100 text-blue-800' :
                                                        result.newStatus === 'expired' ? 'bg-red-100 text-red-800' :
                                                        'bg-gray-100'
                                                    }`}>
                                                        {result.newStatus}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {result.oldShippedQty !== result.newShippedQty && (
                                                        <span className="text-red-600 line-through mr-2">{result.oldShippedQty}</span>
                                                    )}
                                                    <span className={result.oldShippedQty !== result.newShippedQty ? 'text-green-600 font-semibold' : ''}>
                                                        {result.newShippedQty}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm">{result.totalQuantity}</td>
                                                <td className="px-4 py-3 text-sm">{result.pendingQuantity}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
