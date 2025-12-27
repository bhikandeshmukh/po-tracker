// components/Dashboard/SalesChart.js
// Quantity-based chart showing Order, Shipped, Delivered quantities
import { useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import apiClient from '../../lib/api-client';

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700">
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{payload[0].payload.month}</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Order Qty: {payload[0]?.value || 0}</p>
                <p className="text-sm text-green-600 dark:text-green-400">Shipped Qty: {payload[1]?.value || 0}</p>
                <p className="text-sm text-purple-600 dark:text-purple-400">Delivered Qty: {payload[2]?.value || 0}</p>
            </div>
        );
    }
    return null;
};

export default function SalesChart({ data = [], loading = false }) {
    // const [data, setData] = useState([]); // Removed internal state
    // const [loading, setLoading] = useState(true); // Removed internal loading

    // useEffect removed - data now comes from props

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="colorOrder" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorShipped" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                    dataKey="month"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                />
                <YAxis
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => value.toLocaleString()}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                    type="monotone"
                    dataKey="orderQty"
                    name="Order Qty"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorOrder)"
                />
                <Area
                    type="monotone"
                    dataKey="shippedQty"
                    name="Shipped Qty"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#colorShipped)"
                />
                <Area
                    type="monotone"
                    dataKey="deliveredQty"
                    name="Delivered Qty"
                    stroke="#a855f7"
                    strokeWidth={2}
                    fill="url(#colorDelivered)"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
