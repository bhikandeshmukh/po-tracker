// components/Dashboard/StatCard.js
import { TrendingUp, TrendingDown } from 'lucide-react';

const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    purple: 'from-purple-500 to-purple-600',
    red: 'from-red-500 to-red-600',
};

export default function StatCard({ title, value, change, trend, icon: Icon, color = 'blue' }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
                    {change && (
                        <div className="flex items-center mt-2 space-x-1">
                            {trend === 'up' ? (
                                <TrendingUp className="w-4 h-4 text-green-600" />
                            ) : (
                                <TrendingDown className="w-4 h-4 text-red-600" />
                            )}
                            <span className={`text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                                {change}
                            </span>
                            <span className="text-sm text-gray-500">vs last month</span>
                        </div>
                    )}
                </div>
                <div className={`w-12 h-12 bg-gradient-to-br ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
                    {Icon && <Icon className="w-6 h-6 text-white" />}
                </div>
            </div>
        </div>
    );
}
