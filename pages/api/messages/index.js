// pages/api/messages/index.js
// Team Messages API

import { db } from '../../../lib/firebase-admin';
import { verifyAuth } from '../../../lib/auth-middleware';
import { FieldValue } from 'firebase-admin/firestore';

export default async function handler(req, res) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            });
        }

        if (req.method === 'GET') {
            return await getMessages(req, res, user);
        } else if (req.method === 'POST') {
            return await sendMessage(req, res, user);
        } else {
            return res.status(405).json({
                success: false,
                error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }
            });
        }
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            error: { code: 'SERVER_ERROR', message: error.message }
        });
    }
}

async function getMessages(req, res, user) {
    const { channelId = 'general', limit = 50, before } = req.query;
    
    let query = db.collection('messages')
        .where('channelId', '==', channelId)
        .orderBy('createdAt', 'desc')
        .limit(parseInt(limit));
    
    if (before) {
        const beforeDoc = await db.collection('messages').doc(before).get();
        if (beforeDoc.exists) {
            query = query.startAfter(beforeDoc);
        }
    }
    
    const snapshot = await query.get();
    const messages = [];
    
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        messages.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
        });
    });
    
    // Reverse to get chronological order
    messages.reverse();
    
    return res.status(200).json({
        success: true,
        data: messages
    });
}

async function sendMessage(req, res, user) {
    const { content, channelId = 'general', replyTo } = req.body;
    
    if (!content || !content.trim()) {
        return res.status(400).json({
            success: false,
            error: { code: 'INVALID_INPUT', message: 'Message content is required' }
        });
    }
    
    const messageData = {
        content: content.trim(),
        channelId,
        senderId: user.uid,
        senderName: user.name || user.email?.split('@')[0] || 'Unknown',
        senderEmail: user.email,
        senderRole: user.role || 'user',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        isEdited: false,
        reactions: {},
        replyTo: replyTo || null
    };
    
    const docRef = await db.collection('messages').add(messageData);
    
    // Update channel's last message
    await db.collection('channels').doc(channelId).set({
        lastMessage: content.trim().substring(0, 100),
        lastMessageAt: FieldValue.serverTimestamp(),
        lastMessageBy: user.name || user.email
    }, { merge: true });
    
    return res.status(201).json({
        success: true,
        data: {
            id: docRef.id,
            ...messageData,
            createdAt: new Date().toISOString()
        }
    });
}
