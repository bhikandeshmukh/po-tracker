// hooks/useRealtime.js
// Comprehensive real-time hooks for all entities

import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    limit, 
    onSnapshot, 
    doc
} from 'firebase/firestore';

/**
 * Helper to convert Firestore timestamps
 */
function convertTimestamps(data, fields = ['createdAt', 'updatedAt']) {
    const converted = { ...data };
    fields.forEach(field => {
        if (converted[field]?.toDate) {
            converted[field] = converted[field].toDate().toISOString();
        }
    });
    return converted;
}

/**
 * Generic real-time collection hook
 */
export function useRealtimeCollection(collectionName, options = {}) {
    const {
        filters = [],
        orderByField = 'createdAt',
        orderDirection = 'desc',
        limitCount = 20,
        enabled = true
    } = options;

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return;
        }

        setLoading(true);

        let q = query(
            collection(db, collectionName),
            orderBy(orderByField, orderDirection),
            limit(limitCount)
        );

        // Apply filters
        filters.forEach(({ field, operator, value }) => {
            if (value !== undefined && value !== null && value !== '') {
                q = query(q, where(field, operator, value));
            }
        });

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const items = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...convertTimestamps(doc.data())
                }));
                setData(items);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error(`Real-time ${collectionName} error:`, err);
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [collectionName, JSON.stringify(filters), orderByField, orderDirection, limitCount, enabled]);

    return { data, loading, error };
}

/**
 * Generic real-time document hook
 */
export function useRealtimeDocument(collectionName, docId, options = {}) {
    const { enabled = true } = options;
    
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!docId || !enabled) {
            setLoading(false);
            return;
        }

        setLoading(true);

        const unsubscribe = onSnapshot(
            doc(db, collectionName, docId),
            (docSnap) => {
                if (docSnap.exists()) {
                    setData({
                        id: docSnap.id,
                        ...convertTimestamps(docSnap.data())
                    });
                    setError(null);
                } else {
                    setData(null);
                    setError('Document not found');
                }
                setLoading(false);
            },
            (err) => {
                console.error(`Real-time ${collectionName}/${docId} error:`, err);
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [collectionName, docId, enabled]);

    return { data, loading, error };
}

// ==========================================
// SHIPMENT HOOKS
// ==========================================

export function useShipmentList(options = {}) {
    const { status, poId, transporterId, limitCount = 20 } = options;
    
    const filters = [];
    if (status) filters.push({ field: 'status', operator: '==', value: status });
    if (poId) filters.push({ field: 'poId', operator: '==', value: poId });
    if (transporterId) filters.push({ field: 'transporterId', operator: '==', value: transporterId });

    const { data, loading, error } = useRealtimeCollection('shipments', {
        filters,
        orderByField: 'shipmentDate',
        limitCount
    });

    return { 
        shipments: data.map(s => ({ ...s, shipmentId: s.id })), 
        loading, 
        error 
    };
}

export function useShipmentDetail(shipmentId) {
    const { data, loading, error } = useRealtimeDocument('shipments', shipmentId);
    
    const [items, setItems] = useState([]);

    useEffect(() => {
        if (!shipmentId) return;

        const unsubscribe = onSnapshot(
            query(collection(db, 'shipments', shipmentId, 'items')),
            (snapshot) => {
                setItems(snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...convertTimestamps(doc.data())
                })));
            }
        );

        return () => unsubscribe();
    }, [shipmentId]);

    return { 
        shipment: data ? { ...data, shipmentId: data.id } : null, 
        items, 
        loading, 
        error 
    };
}

// ==========================================
// APPOINTMENT HOOKS
// ==========================================

export function useAppointmentList(options = {}) {
    const { status, date, poId, limitCount = 20 } = options;
    
    const filters = [];
    if (status) filters.push({ field: 'status', operator: '==', value: status });
    if (poId) filters.push({ field: 'poId', operator: '==', value: poId });

    const { data, loading, error } = useRealtimeCollection('appointments', {
        filters,
        orderByField: 'scheduledDate',
        orderDirection: 'asc',
        limitCount
    });

    // Filter by date in memory if needed
    let appointments = data.map(a => ({ ...a, appointmentId: a.id }));
    
    if (date) {
        const targetDate = new Date(date).toDateString();
        appointments = appointments.filter(a => 
            new Date(a.scheduledDate).toDateString() === targetDate
        );
    }

    return { appointments, loading, error };
}

export function useAppointmentDetail(appointmentId) {
    const { data, loading, error } = useRealtimeDocument('appointments', appointmentId);
    
    return { 
        appointment: data ? { ...data, appointmentId: data.id } : null, 
        loading, 
        error 
    };
}

// ==========================================
// VENDOR HOOKS
// ==========================================

export function useVendorList(options = {}) {
    const { isActive, limitCount = 50 } = options;
    
    const filters = [];
    if (isActive !== undefined) {
        filters.push({ field: 'isActive', operator: '==', value: isActive });
    }

    const { data, loading, error } = useRealtimeCollection('vendors', {
        filters,
        orderByField: 'vendorName',
        orderDirection: 'asc',
        limitCount
    });

    return { 
        vendors: data.map(v => ({ ...v, vendorId: v.id })), 
        loading, 
        error 
    };
}

export function useVendorDetail(vendorId) {
    const { data, loading, error } = useRealtimeDocument('vendors', vendorId);
    
    const [warehouses, setWarehouses] = useState([]);

    useEffect(() => {
        if (!vendorId) return;

        const unsubscribe = onSnapshot(
            collection(db, 'vendors', vendorId, 'warehouses'),
            (snapshot) => {
                setWarehouses(snapshot.docs.map(doc => ({
                    id: doc.id,
                    warehouseId: doc.id,
                    ...convertTimestamps(doc.data())
                })));
            }
        );

        return () => unsubscribe();
    }, [vendorId]);

    return { 
        vendor: data ? { ...data, vendorId: data.id } : null, 
        warehouses, 
        loading, 
        error 
    };
}

// ==========================================
// TRANSPORTER HOOKS
// ==========================================

export function useTransporterList(options = {}) {
    const { isActive, limitCount = 50 } = options;
    
    const filters = [];
    if (isActive !== undefined) {
        filters.push({ field: 'isActive', operator: '==', value: isActive });
    }

    const { data, loading, error } = useRealtimeCollection('transporters', {
        filters,
        orderByField: 'transporterName',
        orderDirection: 'asc',
        limitCount
    });

    return { 
        transporters: data.map(t => ({ ...t, transporterId: t.id })), 
        loading, 
        error 
    };
}

export function useTransporterDetail(transporterId) {
    const { data, loading, error } = useRealtimeDocument('transporters', transporterId);
    
    return { 
        transporter: data ? { ...data, transporterId: data.id } : null, 
        loading, 
        error 
    };
}

// ==========================================
// DASHBOARD HOOKS
// ==========================================

export function useDashboardMetrics() {
    const { data, loading, error } = useRealtimeDocument('dashboardMetrics', 'overview');
    return { metrics: data, loading, error };
}

export function useRecentActivities(limitCount = 20) {
    const { data, loading, error } = useRealtimeCollection('recentActivities', {
        orderByField: 'timestamp',
        orderDirection: 'desc',
        limitCount
    });

    return { activities: data, loading, error };
}

// ==========================================
// RETURN ORDER HOOKS
// ==========================================

export function useReturnList(options = {}) {
    const { status, poId, limitCount = 20 } = options;
    
    const filters = [];
    if (status) filters.push({ field: 'status', operator: '==', value: status });
    if (poId) filters.push({ field: 'poId', operator: '==', value: poId });

    const { data, loading, error } = useRealtimeCollection('returnOrders', {
        filters,
        limitCount
    });

    return { 
        returns: data.map(r => ({ ...r, returnId: r.id })), 
        loading, 
        error 
    };
}

export function useReturnDetail(returnId) {
    const { data, loading, error } = useRealtimeDocument('returnOrders', returnId);
    
    const [items, setItems] = useState([]);

    useEffect(() => {
        if (!returnId) return;

        const unsubscribe = onSnapshot(
            collection(db, 'returnOrders', returnId, 'items'),
            (snapshot) => {
                setItems(snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...convertTimestamps(doc.data())
                })));
            }
        );

        return () => unsubscribe();
    }, [returnId]);

    return { 
        returnOrder: data ? { ...data, returnId: data.id } : null, 
        items, 
        loading, 
        error 
    };
}

// ==========================================
// NOTIFICATION HOOK
// ==========================================

export function useNotifications(userId, limitCount = 10) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const notifs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...convertTimestamps(doc.data())
                }));
                setNotifications(notifs);
                setUnreadCount(notifs.filter(n => !n.read).length);
                setLoading(false);
            },
            (err) => {
                console.error('Notifications error:', err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId, limitCount]);

    return { notifications, unreadCount, loading };
}

// Re-export PO hooks from original file for backward compatibility
export { usePOList, usePODetail, usePOActivity } from './usePORealtime';
