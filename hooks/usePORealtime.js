// hooks/usePORealtime.js
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc } from 'firebase/firestore';

/**
 * Real-time hook for PO list
 */
export function usePOList({ status = null, limitCount = 10 }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        
        let q = query(
            collection(db, 'purchaseOrders'),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        if (status && status !== 'all') {
            q = query(
                collection(db, 'purchaseOrders'),
                where('status', '==', status),
                orderBy('createdAt', 'desc'),
                limit(limitCount)
            );
        }

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const pos = snapshot.docs.map(doc => ({
                    id: doc.id,
                    poId: doc.id,
                    ...doc.data(),
                    poDate: doc.data().poDate?.toDate?.()?.toISOString() || doc.data().poDate,
                    expectedDeliveryDate: doc.data().expectedDeliveryDate?.toDate?.()?.toISOString() || doc.data().expectedDeliveryDate,
                    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
                    updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
                }));
                
                setOrders(pos);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error('Real-time PO list error:', err);
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [status, limitCount]);

    return { orders, loading, error };
}

/**
 * Real-time hook for single PO
 */
export function usePODetail(poId) {
    const [po, setPO] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!poId) return;

        setLoading(true);

        // Subscribe to PO document
        const unsubscribePO = onSnapshot(
            doc(db, 'purchaseOrders', poId),
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setPO({
                        id: docSnap.id,
                        poId: docSnap.id,
                        ...data,
                        poDate: data.poDate?.toDate?.()?.toISOString() || data.poDate,
                        expectedDeliveryDate: data.expectedDeliveryDate?.toDate?.()?.toISOString() || data.expectedDeliveryDate,
                        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
                    });
                    setError(null);
                } else {
                    setError('PO not found');
                }
                setLoading(false);
            },
            (err) => {
                console.error('Real-time PO error:', err);
                setError(err.message);
                setLoading(false);
            }
        );

        // Subscribe to items subcollection
        const unsubscribeItems = onSnapshot(
            query(
                collection(db, 'purchaseOrders', poId, 'items'),
                orderBy('lineNumber', 'asc')
            ),
            (snapshot) => {
                const itemsList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
                    updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
                }));
                setItems(itemsList);
            },
            (err) => {
                console.error('Real-time items error:', err);
            }
        );

        return () => {
            unsubscribePO();
            unsubscribeItems();
        };
    }, [poId]);

    return { po, items, loading, error };
}

/**
 * Real-time hook for PO activity log
 */
export function usePOActivity(poId, limitCount = 50) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!poId) return;

        const unsubscribe = onSnapshot(
            query(
                collection(db, 'poActivityLogs', poId, 'activities'),
                orderBy('timestamp', 'desc'),
                limit(limitCount)
            ),
            (snapshot) => {
                const acts = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || doc.data().timestamp
                }));
                setActivities(acts);
                setLoading(false);
            },
            (err) => {
                console.error('Real-time activity error:', err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [poId, limitCount]);

    return { activities, loading };
}
