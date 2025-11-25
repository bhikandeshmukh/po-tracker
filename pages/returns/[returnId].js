// pages/returns/[returnId].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import apiClient from '../../lib/api-client';
import { ArrowLeft, CheckCircle, XCircle, Package, Calendar, AlertCircle } from 'lucide-react';

export default function ReturnDetail() {
    const router = useRouter();
    const { returnId } = router.query;
    const [returnData, setReturnData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const fetchReturn = async () => {
            try {
                const response = await apiClient.getReturnById(returnId);
                if (isMounted && response.success) setReturnData(response.data);
            } catch (error) {
                console.error('Failed to fetch return:', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        if (returnId) fetchReturn();

        return () => {
            isMounted = false;
        };
    }, [returnId]);

    const handleApprove = async () => {
        if (!confirm('Are you sure you want to approve this return?')) return;
        
        setActionLoading(true);
        try {
            const response = await apiClient.approveReturn(returnId, {
                approvedBy: 'current-user',
                approvalNotes: 'Approved'
            });
            
            if (response.success) {
                fetchReturn();
            } else {
                console.error('Failed to approve return');
            }
        } catch (error) {
            console.error('Failed to approve return:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;
        
        setActionLoading(true);
        try {
            const response = await apiClient.rejectReturn(returnId, {
                rejectedBy: 'current-user',
                rejectionReason: reason
            });
            
            if (response.success) {
                fetchReturn();
            } else {
                console.error('Failed to reject return');
            }
        } catch (error) {
            console.error('Failed to reject return:', error);
        } finally {
            setActionLoading(false);
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

    if (!returnData) {
        return (
            <Layout>
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900">Return not found</h2>
                </div>
            </Layout>
        );
    }

    const statusColors = {
        pending: 'bg-yellow-100 text-yellow-800',
        approved: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800',
        received: 'bg-blue-100 text-blue-800'
    };

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => router.push('/returns')} className="p-2 hover:bg-gray-100 rounded-lg">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Return #{returnData.returnId}</h1>
                            <p className="text-gray-600 mt-1">Return Details</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        {returnData.status === 'pending' && (
                            <>
                                <button onClick={handleApprove} disabled={actionLoading}
                                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Approve</span>
                                </button>
                                <button onClick={handleReject} disabled={actionLoading}
                                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                                    <XCircle className="w-4 h-4" />
                                    <span>Reject</span>
                                </button>
                            </>
                        )}
                        <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[returnData.status]}`}>
                            {returnData.status}
                        </span>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Return Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-start space-x-3">
                            <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">PO ID</p>
                                <p className="font-medium">{returnData.poId}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Return Date</p>
                                <p className="font-medium">{new Date(returnData.returnDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Quantity</p>
                                <p className="font-medium">{returnData.quantity}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Reason</p>
                                <p className="font-medium capitalize">{returnData.reason}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {returnData.description && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                        <p className="text-gray-700">{returnData.description}</p>
                    </div>
                )}
            </div>
        </Layout>
    );
}
