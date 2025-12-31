// pages/activity.js
// Recent Activity & Audit Trail Page

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout/Layout';
import apiClient from '../lib/api-client';
import { Activity, Clock, User, Package, Truck, Calendar, Filter } from 'lucide-react';
import { ActivitySkeleton } from '../components/Common/LoadingSkeleton';

export default function ActivityPage() {
    const router = useRouter();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [limit, setLimit] = useState(50);

    const fetchActivities = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiClient.getRecentActivities({ limit, _t: Date.now() });
            if (response.success) {
                setActivities(response.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch activities:', error);
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        fetchActivities();
    }, [fetchActivities, filter]);

    // Refetch when page becomes visible
    useEffect(() => {
        const handleFocus = () => fetchActivities();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [fetchActivities]);

    const getActivityIcon = (type) => {
        switch (type) {
            case 'po_created':
            case 'po_updated':
            case 'po_approved':
                return <Package className="w-5 h-5 text-blue-600" />;
            case 'shipment_created':
            case 'shipment_delivered':
                return <Truck className="w-5 h-5 text-green-600" />;
            case 'user_login':
            case 'user_created':
                return <User className="w-5 h-5 text-purple-600" />;
            default:
                return <Activity className="w-5 h-5 text-gray-600" />;
        }
    };

    const getActivityColor = (type) => {
        if (type?.includes('created')) return 'bg-blue-50 border-blue-200';
        if (type?.includes('updated')) return 'bg-yellow-50 border-yellow-200';
        if (type?.includes('approved')) return 'bg-green-50 border-green-200';
        if (type?.includes('cancelled')) return 'bg-red-50 border-red-200';
        return 'bg-gray-50 border-gray-200';
    };

    const filteredActivities = filter === 'all' 
        ? activities 
        : activities.filter(a => a.type?.includes(filter));

    return (
        <Layout>
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                            <Activity className="w-8 h-8 text-indigo-600" />
                            <span>Activity Log</span>
                        </h1>
                        <p className="text-gray-600 mt-1">Recent activities and audit trail</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center space-x-4">
                        <Filter className="w-5 h-5 text-gray-400" />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">All Activities</option>
                            <option value="po">Purchase Orders</option>
                            <option value="shipment">Shipments</option>
                            <option value="user">Users</option>
                            <option value="vendor">Vendors</option>
                        </select>
                        <select
                            value={limit}
                            onChange={(e) => setLimit(parseInt(e.target.value, 10))}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="25">Last 25</option>
                            <option value="50">Last 50</option>
                            <option value="100">Last 100</option>
                            <option value="200">Last 200</option>
                        </select>
                    </div>
                </div>

                {/* Activity List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    {loading ? (
                        <div className="p-6">
                            <ActivitySkeleton rows={8} />
                        </div>
                    ) : filteredActivities.length === 0 ? (
                        <div className="text-center py-12">
                            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
                            <p className="text-gray-500">Activities will appear here as actions are performed</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {filteredActivities.map((activity, index) => (
                                <div
                                    key={activity.id || index}
                                    className={`p-6 hover:bg-gray-50 transition ${getActivityColor(activity.type)}`}
                                >
                                    <div className="flex items-start space-x-4">
                                        <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-gray-200">
                                            {getActivityIcon(activity.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {activity.description || activity.message || 'Activity performed'}
                                                    </p>
                                                    {activity.details && (
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {activity.details}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                                        {(activity.userName || activity.user) && (
                                                            <span className="flex items-center space-x-1">
                                                                <User className="w-3 h-3" />
                                                                <span>{activity.userName || activity.user}</span>
                                                            </span>
                                                        )}
                                                        {activity.timestamp && (
                                                            <span className="flex items-center space-x-1">
                                                                <Clock className="w-3 h-3" />
                                                                <span>{new Date(activity.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                                            </span>
                                                        )}
                                                        {activity.type && (
                                                            <span className="px-2 py-0.5 bg-gray-200 rounded text-gray-700">
                                                                {activity.type}
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
                    )}
                </div>

                {/* Stats */}
                {!loading && filteredActivities.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{filteredActivities.length}</p>
                                <p className="text-sm text-gray-600">Total Activities</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-blue-600">
                                    {filteredActivities.filter(a => a.type?.includes('created')).length}
                                </p>
                                <p className="text-sm text-gray-600">Created</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-yellow-600">
                                    {filteredActivities.filter(a => a.type?.includes('updated')).length}
                                </p>
                                <p className="text-sm text-gray-600">Updated</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-green-600">
                                    {filteredActivities.filter(a => a.type?.includes('approved') || a.type?.includes('completed')).length}
                                </p>
                                <p className="text-sm text-gray-600">Completed</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
