// pages/api/messages/channels.js
// Chat Channels API

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
            return await getChannels(req, res, user);
        } else if (req.method === 'POST') {
            return await createChannel(req, res, user);
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

async function getChannels(req, res, user) {
    const snapshot = await db.collection('channels')
        .orderBy('createdAt', 'asc')
        .get();
    
    const channels = [];
    
    // Add default channels if none exist
    if (snapshot.empty) {
        const defaultChannels = [
            { id: 'general', name: 'General', description: 'General team discussions', icon: '💬' },
            { id: 'announcements', name: 'Announcements', description: 'Important announcements', icon: '📢' },
            { id: 'po-updates', name: 'PO Updates', description: 'Purchase order updates', icon: '📦' },
            { id: 'shipments', name: 'Shipments', description: 'Shipment tracking discussions', icon: '🚚' }
        ];
        
        for (const channel of defaultChannels) {
            await db.collection('channels').doc(channel.id).set({
                ...channel,
                createdAt: FieldValue.serverTimestamp(),
                createdBy: 'system'
            });
            channels.push(channel);
        }
    } else {
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            channels.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
            });
        });
    }
    
    return res.status(200).json({
        success: true,
        data: channels
    });
}

async function createChannel(req, res, user) {
    // Only admin/super_admin can create channels
    if (!['admin', 'super_admin'].includes(user.role)) {
        return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Only admins can create channels' }
        });
    }
    
    const { name, description, icon = '💬' } = req.body;
    
    if (!name || !name.trim()) {
        return res.status(400).json({
            success: false,
            error: { code: 'INVALID_INPUT', message: 'Channel name is required' }
        });
    }
    
    const channelId = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Check if channel exists
    const existing = await db.collection('channels').doc(channelId).get();
    if (existing.exists) {
        return res.status(400).json({
            success: false,
            error: { code: 'ALREADY_EXISTS', message: 'Channel already exists' }
        });
    }
    
    const channelData = {
        name: name.trim(),
        description: description?.trim() || '',
        icon,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: user.uid
    };
    
    await db.collection('channels').doc(channelId).set(channelData);
    
    return res.status(201).json({
        success: true,
        data: {
            id: channelId,
            ...channelData,
            createdAt: new Date().toISOString()
        }
    });
}
