# Real-time Hooks Guide

Guide for using real-time Firestore subscriptions in the Purchase Order Tracking System.

---

## Overview

The application provides comprehensive real-time hooks that automatically sync data from Firestore. When data changes in the database, your UI updates instantly without manual refresh.

---

## Available Hooks

### Generic Hooks

| Hook | Description |
|------|-------------|
| `useRealtimeCollection` | Subscribe to any Firestore collection |
| `useRealtimeDocument` | Subscribe to a single document |

### Entity-Specific Hooks

| Hook | Description |
|------|-------------|
| `usePOList` | Real-time purchase order list |
| `usePODetail` | Single PO with items |
| `usePOActivity` | PO activity log |
| `useShipmentList` | Real-time shipment list |
| `useShipmentDetail` | Single shipment with items |
| `useAppointmentList` | Real-time appointment list |
| `useAppointmentDetail` | Single appointment |
| `useVendorList` | Real-time vendor list |
| `useVendorDetail` | Single vendor with warehouses |
| `useTransporterList` | Real-time transporter list |
| `useTransporterDetail` | Single transporter |
| `useReturnList` | Real-time return order list |
| `useReturnDetail` | Single return with items |
| `useDashboardMetrics` | Real-time dashboard metrics |
| `useRecentActivities` | Real-time activity feed |
| `useNotifications` | User notifications |

---

## Installation

Hooks are available from two files:

```javascript
// Original PO-specific hooks
import { usePOList, usePODetail, usePOActivity } from '../hooks/usePORealtime';

// Comprehensive hooks for all entities
import { 
    useShipmentList,
    useAppointmentList,
    useVendorList,
    useDashboardMetrics,
    // ... etc
} from '../hooks/useRealtime';
```

---

## Usage Examples

### Purchase Order List

```javascript
import { usePOList } from '../hooks/usePORealtime';

function POListPage() {
    const { orders, loading, error } = usePOList({
        status: 'approved',  // Filter by status
        limitCount: 20       // Limit results
    });

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage error={error} />;

    return (
        <ul>
            {orders.map(po => (
                <li key={po.poId}>{po.poNumber} - {po.vendorName}</li>
            ))}
        </ul>
    );
}
```

### Purchase Order Detail with Items

```javascript
import { usePODetail } from '../hooks/usePORealtime';

function PODetailPage({ poId }) {
    const { po, items, loading, error } = usePODetail(poId);

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage error={error} />;
    if (!po) return <NotFound />;

    return (
        <div>
            <h1>{po.poNumber}</h1>
            <p>Vendor: {po.vendorName}</p>
            <p>Status: {po.status}</p>
            
            <h2>Items ({items.length})</h2>
            <table>
                <thead>
                    <tr>
                        <th>SKU</th>
                        <th>Name</th>
                        <th>Quantity</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map(item => (
                        <tr key={item.id}>
                            <td>{item.sku}</td>
                            <td>{item.itemName}</td>
                            <td>{item.poQuantity}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
```

### Shipment List with Filters

```javascript
import { useShipmentList } from '../hooks/useRealtime';

function ShipmentListPage() {
    const [statusFilter, setStatusFilter] = useState('in_transit');
    
    const { shipments, loading, error } = useShipmentList({
        status: statusFilter,
        limitCount: 50
    });

    return (
        <div>
            <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
            >
                <option value="">All</option>
                <option value="created">Created</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
            </select>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <ShipmentTable shipments={shipments} />
            )}
        </div>
    );
}
```

### Dashboard with Real-time Metrics

```javascript
import { useDashboardMetrics, useRecentActivities } from '../hooks/useRealtime';

function Dashboard() {
    const { metrics, loading: metricsLoading } = useDashboardMetrics();
    const { activities, loading: activitiesLoading } = useRecentActivities(10);

    return (
        <div>
            {/* Metrics Cards */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard 
                    title="Total POs" 
                    value={metrics?.totalPOs || 0} 
                    loading={metricsLoading}
                />
                <StatCard 
                    title="In Transit" 
                    value={metrics?.inTransitShipments || 0}
                    loading={metricsLoading}
                />
                <StatCard 
                    title="Pending Qty" 
                    value={metrics?.totalPendingQty || 0}
                    loading={metricsLoading}
                />
                <StatCard 
                    title="Delivered" 
                    value={metrics?.deliveredShipments || 0}
                    loading={metricsLoading}
                />
            </div>

            {/* Activity Feed */}
            <div className="mt-6">
                <h2>Recent Activity</h2>
                {activitiesLoading ? (
                    <LoadingSpinner />
                ) : (
                    <ActivityFeed activities={activities} />
                )}
            </div>
        </div>
    );
}
```

### Vendor with Warehouses

```javascript
import { useVendorDetail } from '../hooks/useRealtime';

function VendorDetailPage({ vendorId }) {
    const { vendor, warehouses, loading, error } = useVendorDetail(vendorId);

    if (loading) return <LoadingSpinner />;
    if (!vendor) return <NotFound />;

    return (
        <div>
            <h1>{vendor.vendorName}</h1>
            <p>Contact: {vendor.contactPerson}</p>
            <p>Email: {vendor.email}</p>

            <h2>Warehouses ({warehouses.length})</h2>
            <ul>
                {warehouses.map(wh => (
                    <li key={wh.warehouseId}>
                        {wh.warehouseName} - {wh.address?.city}
                    </li>
                ))}
            </ul>
        </div>
    );
}
```

### Appointments by Date

```javascript
import { useAppointmentList } from '../hooks/useRealtime';

function TodayAppointments() {
    const today = new Date().toISOString().split('T')[0];
    
    const { appointments, loading } = useAppointmentList({
        date: today,
        status: 'scheduled'
    });

    return (
        <div>
            <h2>Today's Appointments</h2>
            {loading ? (
                <LoadingSpinner />
            ) : appointments.length === 0 ? (
                <p>No appointments scheduled for today</p>
            ) : (
                <ul>
                    {appointments.map(apt => (
                        <li key={apt.appointmentId}>
                            {apt.appointmentNumber} - {apt.scheduledTimeSlot}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
```

### User Notifications

```javascript
import { useNotifications } from '../hooks/useRealtime';
import { useAuth } from '../lib/auth-client';

function NotificationBell() {
    const { user } = useAuth();
    const { notifications, unreadCount, loading } = useNotifications(user?.uid, 5);

    return (
        <div className="relative">
            <button>
                <BellIcon />
                {unreadCount > 0 && (
                    <span className="badge">{unreadCount}</span>
                )}
            </button>

            <div className="dropdown">
                {notifications.map(notif => (
                    <div key={notif.id} className={notif.read ? '' : 'unread'}>
                        {notif.title}
                    </div>
                ))}
            </div>
        </div>
    );
}
```

---

## Generic Hooks

### useRealtimeCollection

Subscribe to any Firestore collection with filters:

```javascript
import { useRealtimeCollection } from '../hooks/useRealtime';

function CustomList() {
    const { data, loading, error } = useRealtimeCollection('myCollection', {
        filters: [
            { field: 'status', operator: '==', value: 'active' },
            { field: 'type', operator: '==', value: 'premium' }
        ],
        orderByField: 'createdAt',
        orderDirection: 'desc',
        limitCount: 25,
        enabled: true  // Can disable subscription
    });

    return (
        <ul>
            {data.map(item => (
                <li key={item.id}>{item.name}</li>
            ))}
        </ul>
    );
}
```

### useRealtimeDocument

Subscribe to a single document:

```javascript
import { useRealtimeDocument } from '../hooks/useRealtime';

function SingleItem({ itemId }) {
    const { data, loading, error } = useRealtimeDocument('items', itemId, {
        enabled: !!itemId  // Only subscribe when ID exists
    });

    if (!data) return null;
    
    return <div>{data.name}</div>;
}
```

---

## Hook Options

### Common Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `limitCount` | number | 20 | Maximum documents to fetch |
| `enabled` | boolean | true | Enable/disable subscription |

### Filter Options

| Option | Type | Description |
|--------|------|-------------|
| `status` | string | Filter by status field |
| `poId` | string | Filter by purchase order |
| `vendorId` | string | Filter by vendor |
| `transporterId` | string | Filter by transporter |
| `date` | string | Filter by date (YYYY-MM-DD) |
| `isActive` | boolean | Filter by active status |

---

## Return Values

All hooks return an object with:

| Property | Type | Description |
|----------|------|-------------|
| `data` / `[entity]` | array/object | The fetched data |
| `loading` | boolean | Loading state |
| `error` | string/null | Error message if any |

Entity-specific hooks may include additional data:
- `items` - Sub-collection items (PO items, shipment items)
- `warehouses` - Vendor warehouses
- `activities` - Activity log entries

---

## Best Practices

### 1. Conditional Subscriptions

```javascript
// Only subscribe when you have the ID
const { data } = useRealtimeDocument('collection', id, {
    enabled: !!id
});
```

### 2. Cleanup is Automatic

Hooks automatically unsubscribe when component unmounts:

```javascript
// No need for manual cleanup
function MyComponent() {
    const { data } = usePOList(); // Auto-cleanup on unmount
    return <div>{data.length} items</div>;
}
```

### 3. Combine with Local State

```javascript
function FilteredList() {
    const [filter, setFilter] = useState('all');
    
    // Hook re-subscribes when filter changes
    const { data } = usePOList({ 
        status: filter === 'all' ? null : filter 
    });

    return (
        <>
            <FilterDropdown value={filter} onChange={setFilter} />
            <List items={data} />
        </>
    );
}
```

### 4. Handle Loading States

```javascript
function DataDisplay() {
    const { data, loading, error } = usePOList();

    if (loading) return <Skeleton />;
    if (error) return <ErrorAlert message={error} />;
    if (data.length === 0) return <EmptyState />;

    return <DataTable data={data} />;
}
```

### 5. Limit Data for Performance

```javascript
// Don't fetch more than needed
const { data } = usePOList({ limitCount: 10 }); // Not 1000
```

---

## Troubleshooting

### Data Not Updating

1. Check Firestore rules allow read access
2. Verify document path is correct
3. Check browser console for errors

### Too Many Reads

1. Reduce `limitCount`
2. Use `enabled: false` when not needed
3. Consider pagination for large lists

### Stale Data

Real-time hooks should always show fresh data. If stale:
1. Check network connection
2. Verify Firestore subscription is active
3. Check for errors in console

---

## Migration from API Calls

Before (API polling):
```javascript
const [data, setData] = useState([]);

useEffect(() => {
    const fetchData = async () => {
        const response = await apiClient.getPurchaseOrders();
        setData(response.data);
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
}, []);
```

After (Real-time):
```javascript
const { orders: data, loading } = usePOList();
// That's it! Auto-updates on any change
```

---

**Enjoy real-time data!** ⚡
