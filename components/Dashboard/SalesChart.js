// components/Dashboard/SalesChart.js
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import apiClient from '../../lib/api-client';

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                <p className="text-sm font-semibold text-gray-900">{payload[0].payload.month}</p>
                <p className="text-sm text-indigo-600">Value: ₹{(payload[0].value / 1000).toFixed(1)}K</p>
                <p className="text-sm text-gray-600">Orders: {payload[0].payload.orders || 0}</p>
            </div>
        );
    }
    return null;
};

export default function SalesChart({ period = '6months' }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChartData = async () => {
            try {
                setLoading(true);
                const response = await apiClient.getChartData({ period, type: 'po' });
                if (response.success && response.data) {
                    setData(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch chart data:', error);
                // Fallback to empty data
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchChartData();
    }, [period]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
                No data available
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
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
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    fill="url(#colorValue)" 
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
