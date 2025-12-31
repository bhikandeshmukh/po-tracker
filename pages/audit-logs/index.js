// pages/audit-logs/index.js
// Audit Logs Viewer Page

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import apiClient from '../../lib/api-client';
import { useAuth } from '../../lib/auth-client';
import {
    Shield,
    Search,
    Filter,
    Download,
    Eye,
    RefreshCw,
    Calendar,
    User,
    FileText,
    Activity
} from 'lucide-react';
import { TableSkeleton } from '../../components/Common/LoadingSkeleton';

export default function AuditLogs() {
    const router = useRouter();
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        userId: '',
        action: '',
        resourceType: '',
        resourceId: '',
        startDate: '',
        endDate: ''
    });
    const [selectedLog, setSelectedLog] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.append('_t', Date.now().toString());

            Object.keys(filters).forEach(key => {
                if (filters[key]) {
                    params.append(key, filters[key]);
                }
            });

            const response = await apiClient.get(`/audit-logs?${params.toString()}`);
            if (response.success) {
                setLogs(response.data || []);
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    const fetchStats = useCallback(async () => {
        try {
            const response = await apiClient.get(`/audit-logs?stats=true&_t=${Date.now()}`);
            if (response.success) {
                setStats(response.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    }, []);

    useEffect(() => {
        if (user && (user.role === 'admin' || user.role === 'super_admin')) {
            fetchLogs();
            fetchStats();
        } else if (user) {
            router.push('/dashboard');
        }
    }, [user, fetchLogs, fetchStats, router]);

    // Refetch when page becomes visible
    useEffect(() => {
        const handleFocus = () => {
            if (user && (user.role === 'admin' || user.role === 'super_admin')) {
                fetchLogs();
                fetchStats();
            }
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [user, fetchLogs, fetchStats]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const applyFilters = () => {
        fetchLogs();
    };

    const clearFilters = () => {
        setFilters({
            userId: '',
            action: '',
            resourceType: '',
            resourceId: '',
            startDate: '',
            endDate: ''
        });
    };

    const getActionColor = (action) => {
        const colors = {
            CREATE: 'bg-green-100 text-green-800',
            UPDATE: 'bg-blue-100 text-blue-800',
            DELETE: 'bg-red-100 text-red-800',
            LOGIN: 'bg-purple-100 text-purple-800',
            LOGOUT: 'bg-gray-100 text-gray-800'
        };
        return colors[action] || 'bg-gray-100 text-gray-800';
    };

    const viewDetails = (log) => {
        setSelectedLog(log);
        setShowDetailModal(true);
    };

    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return null;
    }

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                            <Shield className="w-8 h-8 text-indigo-600" />
                            <span>Audit Logs</span>
                        </h1>
                        <p className="text-gray-600 mt-1">Track all system activities and user actions</p>
                    </div>
                    <button
                        onClick={() => { fetchLogs(); fetchStats(); }}
                        className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                        <RefreshCw className="w-5 h-5" />
                        <span>Refresh</span>
                    </button>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Logs</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalLogs}</p>
                                </div>
                                <Activity className="w-12 h-12 text-indigo-600 opacity-20" />
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Actions</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">
                                        {Object.keys(stats.actionBreakdown || {}).length}
                                    </p>
                                </div>
                                <FileText className="w-12 h-12 text-green-600 opacity-20" />
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Resources</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">
                                        {Object.keys(stats.resourceBreakdown || {}).length}
                                    </p>
                                </div>
                                <Shield className="w-12 h-12 text-blue-600 opacity-20" />
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Active Users</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">
                                        {Object.keys(stats.topUsers || {}).length}
                                    </p>
                                </div>
                                <User className="w-12 h-12 text-purple-600 opacity-20" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center space-x-2 mb-4">
                        <Filter className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                            <select
                                value={filters.action}
                                onChange={(e) => handleFilterChange('action', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                            >
                                <option value="">All</option>
                                <option value="CREATE">Create</option>
                                <option value="UPDATE">Update</option>
                                <option value="DELETE">Delete</option>
                                <option value="LOGIN">Login</option>
                                <option value="LOGOUT">Logout</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
                            <select
                                value={filters.resourceType}
                                onChange={(e) => handleFilterChange('resourceType', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                            >
                                <option value="">All</option>
                                <option value="PO">Purchase Order</option>
                                <option value="SHIPMENT">Shipment</option>
                                <option value="USER">User</option>
                                <option value="VENDOR">Vendor</option>
                                <option value="TRANSPORTER">Transporter</option>
                                <option value="APPOINTMENT">Appointment</option>
                                <option value="RETURN">Return</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Resource ID</label>
                            <input
                                type="text"
                                value={filters.resourceId}
                                onChange={(e) => handleFilterChange('resourceId', e.target.value)}
                                placeholder="e.g., PO-001"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                            />
                        </div>
                        <div className="flex items-end space-x-2">
                            <button
                                onClick={applyFilters}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm"
                            >
                                Apply
                            </button>
                            <button
                                onClick={clearFilters}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Timestamp
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Action
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Resource
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Resource ID
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        IP Address
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center">
                                            <TableSkeleton rows={8} columns={7} />
                                        </td>
                                    </tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                            No audit logs found
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(log.timestamp).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div>
                                                    <div className="font-medium">{log.userName}</div>
                                                    <div className="text-xs text-gray-500">{log.userEmail}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {log.entityType || log.resourceType}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                                                {log.entityId || log.resourceId}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                                {log.ipAddress}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <button
                                                    onClick={() => viewDetails(log)}
                                                    className="text-indigo-600 hover:text-indigo-900 flex items-center space-x-1"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    <span>View</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedLog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-gray-900">Audit Log Details</h3>
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                                        <p className="mt-1 text-sm text-gray-900">{new Date(selectedLog.timestamp).toLocaleString('en-IN')}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Action</label>
                                        <p className="mt-1">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getActionColor(selectedLog.action)}`}>
                                                {selectedLog.action}
                                            </span>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">User</label>
                                        <p className="mt-1 text-sm text-gray-900">{selectedLog.userName}</p>
                                        <p className="text-xs text-gray-500">{selectedLog.userEmail}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">IP Address</label>
                                        <p className="mt-1 text-sm text-gray-900 font-mono">{selectedLog.ipAddress}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Resource Type</label>
                                        <p className="mt-1 text-sm text-gray-900">{selectedLog.entityType || selectedLog.resourceType}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Resource ID</label>
                                        <p className="mt-1 text-sm text-gray-900 font-mono">{selectedLog.entityId || selectedLog.resourceId}</p>
                                    </div>
                                </div>

                                {selectedLog.changes && (selectedLog.changes.before || selectedLog.changes.after) && (
                                    <div className="mt-6">
                                        <h4 className="text-sm font-medium text-gray-700 mb-3">Changes</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-2">Before</label>
                                                <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-auto max-h-64">
                                                    {JSON.stringify(selectedLog.changes.before, null, 2)}
                                                </pre>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-2">After</label>
                                                <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-auto max-h-64">
                                                    {JSON.stringify(selectedLog.changes.after, null, 2)}
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Device Info Section */}
                                <div className="mt-6">
                                    <h4 className="text-sm font-medium text-gray-700 mb-3">Device Information</h4>
                                    <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500">Browser</label>
                                            <p className="mt-1 text-sm text-gray-900">{selectedLog.browser || 'Unknown'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500">Operating System</label>
                                            <p className="mt-1 text-sm text-gray-900">{selectedLog.os || 'Unknown'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500">Device Type</label>
                                            <p className="mt-1 text-sm text-gray-900">{selectedLog.device || 'Unknown'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">User Agent</label>
                                    <p className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded break-all">{selectedLog.userAgent || 'Unknown'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
