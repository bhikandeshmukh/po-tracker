// pages/purchase-orders/[poId]/activity.js
// PO-specific Activity Log

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout/Layout';
import apiClient from '../../../lib/api-client';
import { ArrowLeft, Activity, Clock, User, CheckCircle, XCircle, Edit, Package } from 'lucide-react';

export default function POActivityLog() {
    const router = useRouter();
    const { poId } = router.query;
    const [activityLog, setActivityLog] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchActivityLog = async () => {
            try {
                const response = await apiClient.getPOActivityLog(poId);
                if (isMounted && response.success) {
                    setActivityLog(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch activity log:', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        if (poId) fetchActivityLog();

        return () => {
            isMounted = false;
        };
    }, [poId]);

    const getActionIcon = (action) => {
        switch (action) {
            case 'created':
                return <Package className="w-5 h-5 text-blue-600" />;
            case 'updated':
                return <Edit className="w-5 h-5 text-yellow-600" />;
            case 'approved':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'cancelled':
                return <XCircle className="w-5 h-5 text-red-600" />;
            default:
                return <Activity className="w-5 h-5 text-gray-600" />;
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

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center space-x-4">
                    <button onClick={() => router.push(`/purchase-orders/${poId}`)} className="p-2 hover:bg-gray-100 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                            <Activity className="w-8 h-8 text-indigo-600" />
                            <span>Activity Log</span>
                        </h1>
                        <p className="text-gray-600 mt-1">PO #{activityLog?.poNumber || poId}</p>
                    </div>
                </div>

                {/* Activity Timeline */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    {!activityLog || !activityLog.activities || activityLog.activities.length === 0 ? (
                        <div className="text-center py-12">
                            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
                            <p className="text-gray-500">Activity will be logged as actions are performed</p>
                        </div>
                    ) : (
                        <div className="p-6">
                            <div className="space-y-6">
                                {activityLog.activities.map((action, index) => (
                                    <div key={action.actionId || index} className="relative">
                                        {/* Timeline line */}
                                        {index < activityLog.activities.length - 1 && (
                                            <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gray-200"></div>
                                        )}
                                        
                                        <div className="flex items-start space-x-4">
                                            <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-gray-200 relative z-10">
                                                {getActionIcon(action.action)}
                                            </div>
                                            <div className="flex-1 bg-gray-50 rounded-lg p-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-900 capitalize">
                                                            {action.action?.replace('_', ' ')}
                                                        </p>
                                                        {action.description && (
                                                            <p className="text-sm text-gray-600 mt-1">
                                                                {action.description}
                                                            </p>
                                                        )}
                                                        {action.changes && action.changes.length > 0 && (
                                                            <div className="text-sm text-gray-600 mt-2">
                                                                {action.changes.map((change, idx) => (
                                                                    <div key={idx}>
                                                                        <span className="font-medium">{change.field}:</span>{' '}
                                                                        <span className="text-red-600">{change.oldValue}</span>
                                                                        {' → '}
                                                                        <span className="text-green-600">{change.newValue}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {action.metadata?.notes && (
                                                            <p className="text-sm text-gray-500 mt-2 italic">
                                                                "{action.metadata.notes}"
                                                            </p>
                                                        )}
                                                        <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                                                            {(action.performedByName || action.performedBy) && (
                                                                <span className="flex items-center space-x-1">
                                                                    <User className="w-3 h-3" />
                                                                    <span>{action.performedByName || action.performedBy}</span>
                                                                </span>
                                                            )}
                                                            {action.timestamp && (
                                                                <span className="flex items-center space-x-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    <span>{new Date(action.timestamp).toLocaleString()}</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Summary */}
                {activityLog && activityLog.activities && activityLog.activities.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">{activityLog.activities.length}</p>
                                <p className="text-sm text-gray-600">Total Actions</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-blue-600">
                                    {activityLog.activities.filter(a => a.action === 'created').length}
                                </p>
                                <p className="text-sm text-gray-600">Created</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-yellow-600">
                                    {activityLog.activities.filter(a => a.action === 'updated').length}
                                </p>
                                <p className="text-sm text-gray-600">Updated</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-green-600">
                                    {activityLog.activities.filter(a => a.action === 'approved').length}
                                </p>
                                <p className="text-sm text-gray-600">Approved</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
