// pages/dashboard.js
// Modern dashboard with metrics and charts

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth-client';
import apiClient from '../lib/api-client';
import Layout from '../components/Layout/Layout';
import StatCard from '../components/Dashboard/StatCard';
import SalesChart from '../components/Dashboard/SalesChart';
import ActivityFeed from '../components/Dashboard/ActivityFeed';
import {
    Package,
    TrendingUp,
    Truck,
    AlertCircle,
    Clock,
    Users,
    RefreshCw
} from 'lucide-react';
import { DashboardSkeleton } from '../components/Common/LoadingSkeleton';

export default function Dashboard() {
    const router = useRouter();
    const { user } = useAuth();
    const [metrics, setMetrics] = useState(null);
    const [activities, setActivities] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [period, setPeriod] = useState('6months');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const fetchDashboardData = useCallback(async (forceRefresh = false) => {
        try {
            setError(null);
            if (forceRefresh && !loading) setRefreshing(true);

            console.log('Fetching dashboard data...', forceRefresh ? '(forced refresh)' : '');

            // Pass forceRefresh and timestamp to all calls
            const params = forceRefresh ? { refresh: 'true', _t: Date.now() } : { _t: Date.now() };

            const [metricsRes, activitiesRes, chartRes] = await Promise.all([
                apiClient.getDashboardMetrics(forceRefresh),
                apiClient.getRecentActivities(params),
                apiClient.getChartData({ period, ...params, type: 'quantity' })
            ]);

            console.log('Metrics response:', metricsRes);
            console.log('Activities response:', activitiesRes);
            console.log('Chart response:', chartRes);

            if (metricsRes.success) {
                setMetrics(metricsRes.data);
            } else {
                console.error('Metrics fetch failed:', metricsRes.error);
            }

            if (activitiesRes.success) {
                setActivities(activitiesRes.data);
            } else {
                console.error('Activities fetch failed:', activitiesRes.error);
            }

            if (chartRes.success) {
                setChartData(chartRes.data || []);
            } else {
                console.error('Chart fetch failed:', chartRes.error);
                setChartData([]);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            setError(error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [loading, period]);

    useEffect(() => {
        let refreshInterval;

        if (user) {
            // Force refresh on initial load
            fetchDashboardData(false); // Use cache first

            // Auto-refresh every 60s
            refreshInterval = setInterval(() => {
                fetchDashboardData(true);
            }, 60000);
        }

        return () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        };
    }, [user, period, fetchDashboardData]);

    // Refetch when page becomes visible
    useEffect(() => {
        const handleFocus = () => {
            if (user) fetchDashboardData(true);
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [user, fetchDashboardData]);

    if (loading) {
        return (
            <Layout>
                <DashboardSkeleton />
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center h-96">
                    <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load dashboard</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        Retry
                    </button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Welcome back, {user?.name || 'User'}!
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Here's what's happening with your purchase orders today.
                        </p>
                    </div>
                    <button
                        onClick={() => fetchDashboardData(true)}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Order Qty"
                        value={metrics?.totalOrderQty || 0}
                        change="+12.5%"
                        trend="up"
                        icon={Package}
                        color="blue"
                    />
                    <StatCard
                        title="Shipped Qty"
                        value={metrics?.totalShippedQty || 0}
                        change="+8.2%"
                        trend="up"
                        icon={Truck}
                        color="green"
                    />
                    <StatCard
                        title="Pending Qty"
                        value={metrics?.totalPendingQty || 0}
                        change="-3.1%"
                        trend="down"
                        icon={Clock}
                        color="yellow"
                    />
                    <StatCard
                        title="Delivered Qty"
                        value={metrics?.totalDeliveredQty || 0}
                        change="+15.3%"
                        trend="up"
                        icon={Package}
                        color="purple"
                    />
                </div>

                {/* Charts and Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Quantity Chart */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-[500px] flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        Quantity Trends
                                    </h2>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Monthly overview of Order vs Shipped vs Delivered
                                    </p>
                                </div>
                                <select
                                    value={period}
                                    onChange={(e) => setPeriod(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="6months">Last 6 months</option>
                                    <option value="12months">Last 12 months</option>
                                    <option value="thisYear">This year</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <SalesChart data={chartData} loading={loading && !metrics} />
                            </div>
                        </div>
                    </div>

                    {/* Activity Feed */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-[500px] flex flex-col">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Recent Activity
                            </h2>
                            <div className="flex-1 overflow-y-auto">
                                <ActivityFeed activities={activities} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                    <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <button
                            onClick={() => router.push('/purchase-orders')}
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 text-left transition"
                        >
                            <Package className="w-6 h-6 mb-2" />
                            <div className="font-medium">Create PO</div>
                            <div className="text-sm text-indigo-100">New purchase order</div>
                        </button>
                        <button
                            onClick={() => router.push('/shipments')}
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 text-left transition"
                        >
                            <Truck className="w-6 h-6 mb-2" />
                            <div className="font-medium">Track Shipment</div>
                            <div className="text-sm text-indigo-100">Monitor deliveries</div>
                        </button>
                        <button
                            onClick={() => router.push('/vendors')}
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 text-left transition"
                        >
                            <Users className="w-6 h-6 mb-2" />
                            <div className="font-medium">Manage Vendors</div>
                            <div className="text-sm text-indigo-100">View all vendors</div>
                        </button>
                        <button
                            onClick={() => router.push('/reports')}
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 text-left transition"
                        >
                            <TrendingUp className="w-6 h-6 mb-2" />
                            <div className="font-medium">View Reports</div>
                            <div className="text-sm text-indigo-100">Analytics & insights</div>
                        </button>
                    </div>
                </div>

                {/* Status Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900">Shipment Status</h3>
                            <Truck className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">In Transit</span>
                                <span className="font-semibold text-blue-600">{metrics?.inTransitShipments || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Delivered</span>
                                <span className="font-semibold text-green-600">{metrics?.deliveredShipments || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Pending</span>
                                <span className="font-semibold text-yellow-600">{metrics?.pendingShipments || 0}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900">PO Status</h3>
                            <Package className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Total POs</span>
                                <span className="font-semibold text-blue-600">{metrics?.totalPOs || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Active</span>
                                <span className="font-semibold text-yellow-600">{metrics?.activePOs || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Completed</span>
                                <span className="font-semibold text-green-600">{metrics?.completedPOs || 0}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900">Quantity Summary</h3>
                            <Package className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Total Ordered</span>
                                <span className="font-semibold text-blue-600">{metrics?.totalOrderQty || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Total Shipped</span>
                                <span className="font-semibold text-green-600">{metrics?.totalShippedQty || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Total Delivered</span>
                                <span className="font-semibold text-purple-600">{metrics?.totalDeliveredQty || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
