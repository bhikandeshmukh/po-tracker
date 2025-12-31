// pages/api/messages/index.js
// Team Messages API - Hierarchical Structure

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
    const { channelId = 'general', limit: limitParam = 50, before } = req.query;
    
    // Hierarchical path: channels/{channelId}/messages
    let query = db.collection('channels').doc(channelId).collection('messages')
        .orderBy('createdAt', 'desc')
        .limit(parseInt(limitParam));
    
    if (before) {
        const beforeDoc = await db.collection('channels').doc(channelId).collection('messages').doc(before).get();
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
    
    // Update user's last read timestamp
    await updateLastRead(user.uid, channelId);
    
    return res.status(200).json({
        success: true,
        data: messages
    });
}

// Generate message ID: MSG-{timestamp}-{random4}
function generateMessageId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `MSG-${timestamp}-${random}`;
}

async function sendMessage(req, res, user) {
    const { content, channelId = 'general', replyTo, attachments } = req.body;
    
    if (!content || !content.trim()) {
        return res.status(400).json({
            success: false,
            error: { code: 'INVALID_INPUT', message: 'Message content is required' }
        });
    }
    
    // Check if channel exists
    const channelDoc = await db.collection('channels').doc(channelId).get();
    if (!channelDoc.exists) {
        // Create channel if it doesn't exist (for default channels)
        await db.collection('channels').doc(channelId).set({
            name: channelId.charAt(0).toUpperCase() + channelId.slice(1),
            description: '',
            icon: '💬',
            type: 'public',
            createdBy: 'system',
            createdAt: FieldValue.serverTimestamp()
        });
    }
    
    // Generate custom message ID
    const messageId = generateMessageId();
    
    const messageData = {
        content: content.trim(),
        senderId: user.uid,
        senderName: user.name || user.email?.split('@')[0] || 'Unknown',
        senderEmail: user.email,
        senderRole: user.role || 'user',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        isEdited: false,
        reactions: {},
        replyTo: replyTo || null,
        attachments: attachments || []
    };
    
    // Add message with custom ID: channels/{channelId}/messages/{messageId}
    await db.collection('channels').doc(channelId).collection('messages').doc(messageId).set(messageData);
    
    // Update channel's last message info
    await db.collection('channels').doc(channelId).update({
        lastMessage: content.trim().substring(0, 100),
        lastMessageAt: FieldValue.serverTimestamp(),
        lastMessageBy: user.name || user.email
    });
    
    // Increment unread count for other users in channel
    await incrementUnreadCounts(channelId, user.uid);
    
    return res.status(201).json({
        success: true,
        data: {
            id: messageId,
            ...messageData,
            createdAt: new Date().toISOString()
        }
    });
}

// Update user's last read timestamp for a channel
async function updateLastRead(userId, channelId) {
    try {
        await db.collection('userChannels').doc(userId).collection('channels').doc(channelId).set({
            lastRead: FieldValue.serverTimestamp(),
            unreadCount: 0
        }, { merge: true });
    } catch (error) {
        console.error('Error updating last read:', error);
    }
}

// Increment unread counts for all users except sender
async function incrementUnreadCounts(channelId, senderId) {
    try {
        // Get all users who have this channel
        const userChannelsSnapshot = await db.collectionGroup('channels')
            .where('__name__', '>=', channelId)
            .where('__name__', '<=', channelId)
            .get();
        
        // This is simplified - in production you'd want a better approach
        // For now, we'll skip this as it requires more complex setup
    } catch (error) {
        console.error('Error incrementing unread counts:', error);
    }
}
