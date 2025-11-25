// pages/dashboard.js
// Modern dashboard with metrics and charts

import { useState, useEffect } from 'react';
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
    IndianRupee,
    Users
} from 'lucide-react';

export default function Dashboard() {
    const router = useRouter();
    const { user } = useAuth();
    const [metrics, setMetrics] = useState(null);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        let refreshInterval;

        const fetchDashboardData = async () => {
            try {
                if (isMounted) setError(null);
                
                console.log('Fetching dashboard data...');
                const [metricsRes, activitiesRes] = await Promise.all([
                    apiClient.getDashboardMetrics(),
                    apiClient.getRecentActivities({ limit: 10 })
                ]);

                console.log('Metrics response:', metricsRes);
                console.log('Activities response:', activitiesRes);

                if (isMounted) {
                    if (metricsRes.success) {
                        setMetrics(metricsRes.data);
                        console.log('Metrics set:', metricsRes.data);
                    } else {
                        console.error('Metrics fetch failed:', metricsRes.error);
                    }
                    
                    if (activitiesRes.success) {
                        setActivities(activitiesRes.data);
                    } else {
                        console.error('Activities fetch failed:', activitiesRes.error);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
                if (isMounted) setError(error.message);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        if (user) {
            fetchDashboardData();
            
            // Auto-refresh every 30 seconds
            refreshInterval = setInterval(() => {
                fetchDashboardData();
            }, 30000);
        }

        return () => {
            isMounted = false;
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        };
    }, [user]);

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
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
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Welcome back, {user?.name || 'User'}!
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Here's what's happening with your purchase orders today.
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Purchase Orders"
                        value={metrics?.totalPOs || 0}
                        change="+12.5%"
                        trend="up"
                        icon={Package}
                        color="blue"
                    />
                    <StatCard
                        title="Active Shipments"
                        value={metrics?.inTransitShipments || 0}
                        change="+8.2%"
                        trend="up"
                        icon={Truck}
                        color="green"
                    />
                    <StatCard
                        title="Pending Approvals"
                        value={metrics?.pendingApprovalPOs || 0}
                        change="-3.1%"
                        trend="down"
                        icon={Clock}
                        color="yellow"
                    />
                    <StatCard
                        title="Total Value"
                        value={`₹${(metrics?.totalPOAmount / 100000 || 0).toFixed(1)}L`}
                        change="+15.3%"
                        trend="up"
                        icon={IndianRupee}
                        color="purple"
                    />
                </div>

                {/* Charts and Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sales Chart */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-[500px] flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        Purchase Order Trends
                                    </h2>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Monthly overview of PO values
                                    </p>
                                </div>
                                <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                                    <option>Last 6 months</option>
                                    <option>Last 12 months</option>
                                    <option>This year</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <SalesChart />
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
                                <span className="text-sm text-gray-600">Active</span>
                                <span className="font-semibold text-blue-600">{metrics?.activePOs || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Pending Approval</span>
                                <span className="font-semibold text-yellow-600">{metrics?.pendingApprovalPOs || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Completed</span>
                                <span className="font-semibold text-green-600">{(metrics?.totalPOs || 0) - (metrics?.activePOs || 0)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900">Returns</h3>
                            <AlertCircle className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Pending</span>
                                <span className="font-semibold text-yellow-600">{metrics?.pendingReturns || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Completed</span>
                                <span className="font-semibold text-green-600">{metrics?.completedReturns || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Total Value</span>
                                <span className="font-semibold text-red-600">₹{((metrics?.totalReturnAmount || 0) / 1000).toFixed(0)}K</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
