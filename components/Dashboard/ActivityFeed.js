// components/Dashboard/ActivityFeed.js
import { Package, Truck, CheckCircle, AlertCircle, Clock, User } from 'lucide-react';

const activityIcons = {
    PO_CREATED: Package,
    SHIPMENT_DISPATCHED: Truck,
    SHIPMENT_DELIVERED: CheckCircle,
    RETURN_CREATED: AlertCircle,
    PO_APPROVED: CheckCircle,
    USER_CREATED: User,
};

const activityColors = {
    PO_CREATED: 'bg-blue-100 text-blue-600',
    SHIPMENT_DISPATCHED: 'bg-purple-100 text-purple-600',
    SHIPMENT_DELIVERED: 'bg-green-100 text-green-600',
    RETURN_CREATED: 'bg-red-100 text-red-600',
    PO_APPROVED: 'bg-green-100 text-green-600',
    USER_CREATED: 'bg-indigo-100 text-indigo-600',
};

function formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000); // seconds

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function ActivityFeed({ activities = [] }) {
    return (
        <div className="space-y-4 max-h-96 overflow-y-auto">
            {activities.length === 0 ? (
                <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No recent activities</p>
                </div>
            ) : (
                activities.map((activity, index) => {
                    const Icon = activityIcons[activity.type] || Package;
                    const colorClass = activityColors[activity.type] || 'bg-gray-100 text-gray-600';
                    
                    return (
                        <div key={activity.activityId || index} className="flex items-start space-x-3 group">
                            <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {activity.title}
                                </p>
                                <p className="text-xs text-gray-600 mt-0.5 truncate">
                                    {activity.description}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {formatTimeAgo(activity.timestamp)}
                                </p>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}
