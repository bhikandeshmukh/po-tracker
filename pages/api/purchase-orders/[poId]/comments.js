// pages/api/purchase-orders/[poId]/comments.js
import { db } from '../../../../lib/firebase-admin';

export default async function handler(req, res) {
    const { poId } = req.query;

    if (!poId) {
        return res.status(400).json({ success: false, error: 'PO ID is required' });
    }

    try {
        if (req.method === 'GET') {
            // Get all comments for this PO
            const commentsRef = db.collection('purchaseOrders').doc(poId).collection('comments');
            const snapshot = await commentsRef.orderBy('createdAt', 'desc').get();
            
            const comments = [];
            snapshot.forEach(doc => {
                comments.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return res.status(200).json({ success: true, data: comments });
        }

        if (req.method === 'POST') {
            // Add a new comment
            const { text, createdBy } = req.body;

            if (!text || !text.trim()) {
                return res.status(400).json({ success: false, error: 'Comment text is required' });
            }

            const commentData = {
                text: text.trim(),
                createdBy: createdBy || 'User',
                createdAt: new Date().toISOString(),
                poId: poId
            };

            const commentsRef = db.collection('purchaseOrders').doc(poId).collection('comments');
            const docRef = await commentsRef.add(commentData);

            return res.status(201).json({ 
                success: true, 
                data: { 
                    id: docRef.id, 
                    ...commentData 
                } 
            });
        }

        return res.status(405).json({ success: false, error: 'Method not allowed' });
    } catch (error) {
        console.error('Comments API error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
