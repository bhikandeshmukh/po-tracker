// pages/api/messages/channels.js
// Chat Channels API - Hierarchical Structure

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
        } else if (req.method === 'PUT') {
            return await updateChannelMembers(req, res, user);
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
    
    let channels = [];
    
    // Add default channels if none exist
    if (snapshot.empty) {
        const defaultChannels = [
            { id: 'general', name: 'General', description: 'General team discussions', icon: '💬', type: 'public' },
            { id: 'announcements', name: 'Announcements', description: 'Important announcements', icon: '📢', type: 'public' }
        ];
        
        const batch = db.batch();
        for (const channel of defaultChannels) {
            const ref = db.collection('channels').doc(channel.id);
            batch.set(ref, {
                ...channel,
                members: [],
                admins: [],
                createdAt: FieldValue.serverTimestamp(),
                createdBy: 'system',
                lastMessage: null,
                lastMessageAt: null,
                lastMessageBy: null
            });
            channels.push({ ...channel, createdBy: 'system', members: [], admins: [] });
        }
        await batch.commit();
    } else {
        // Get user's unread counts
        const userChannelsSnapshot = await db.collection('userChannels')
            .doc(user.uid)
            .collection('channels')
            .get();
        
        const unreadMap = {};
        userChannelsSnapshot.docs.forEach(doc => {
            unreadMap[doc.id] = doc.data().unreadCount || 0;
        });
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const isSuperAdmin = user.role === 'super_admin';
            const isChannelAdmin = data.admins?.includes(user.uid) || data.createdBy === user.uid;
            const isMember = data.members?.includes(user.uid);
            const isPublic = data.type === 'public';
            
            // Super admin sees all, others see public or channels they're member of
            if (isSuperAdmin || isPublic || isMember || isChannelAdmin) {
                channels.push({
                    id: doc.id,
                    ...data,
                    unreadCount: unreadMap[doc.id] || 0,
                    isAdmin: isSuperAdmin || isChannelAdmin,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
                    lastMessageAt: data.lastMessageAt?.toDate?.()?.toISOString() || data.lastMessageAt
                });
            }
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
    
    const { name, description, icon = '💬', type = 'private', members = [] } = req.body;
    
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
    
    // Ensure creator is in members list
    const membersList = [...new Set([user.uid, ...members])];
    
    const channelData = {
        name: name.trim(),
        description: description?.trim() || '',
        icon,
        type,
        members: membersList,
        admins: [user.uid], // Creator is admin
        createdAt: FieldValue.serverTimestamp(),
        createdBy: user.uid,
        createdByName: user.name || user.email,
        lastMessage: null,
        lastMessageAt: null,
        lastMessageBy: null
    };
    
    await db.collection('channels').doc(channelId).set(channelData);
    
    // Add channel to all members' userChannels
    const batch = db.batch();
    for (const memberId of membersList) {
        const userChannelRef = db.collection('userChannels').doc(memberId).collection('channels').doc(channelId);
        batch.set(userChannelRef, {
            joinedAt: FieldValue.serverTimestamp(),
            lastRead: FieldValue.serverTimestamp(),
            unreadCount: 0
        });
    }
    await batch.commit();
    
    return res.status(201).json({
        success: true,
        data: {
            id: channelId,
            ...channelData,
            isAdmin: true,
            createdAt: new Date().toISOString()
        }
    });
}

// Update channel members (add/remove)
async function updateChannelMembers(req, res, user) {
    const { channelId, action, memberIds } = req.body;
    
    if (!channelId || !action || !memberIds) {
        return res.status(400).json({
            success: false,
            error: { code: 'INVALID_INPUT', message: 'channelId, action, and memberIds are required' }
        });
    }
    
    const channelRef = db.collection('channels').doc(channelId);
    const channelDoc = await channelRef.get();
    
    if (!channelDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Channel not found' }
        });
    }
    
    const channelData = channelDoc.data();
    const isSuperAdmin = user.role === 'super_admin';
    const isChannelAdmin = channelData.admins?.includes(user.uid) || channelData.createdBy === user.uid;
    
    // Only super_admin or channel admin can manage members
    if (!isSuperAdmin && !isChannelAdmin) {
        return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Only channel admins can manage members' }
        });
    }
    
    const batch = db.batch();
    
    if (action === 'add') {
        // Add members
        batch.update(channelRef, {
            members: FieldValue.arrayUnion(...memberIds)
        });
        
        // Add to userChannels for each new member
        for (const memberId of memberIds) {
            const userChannelRef = db.collection('userChannels').doc(memberId).collection('channels').doc(channelId);
            batch.set(userChannelRef, {
                joinedAt: FieldValue.serverTimestamp(),
                lastRead: FieldValue.serverTimestamp(),
                unreadCount: 0
            }, { merge: true });
        }
    } else if (action === 'remove') {
        // Remove members (but not the creator)
        const membersToRemove = memberIds.filter(id => id !== channelData.createdBy);
        
        batch.update(channelRef, {
            members: FieldValue.arrayRemove(...membersToRemove)
        });
        
        // Remove from userChannels
        for (const memberId of membersToRemove) {
            const userChannelRef = db.collection('userChannels').doc(memberId).collection('channels').doc(channelId);
            batch.delete(userChannelRef);
        }
    }
    
    await batch.commit();
    
    // Get updated channel
    const updatedDoc = await channelRef.get();
    const updatedData = updatedDoc.data();
    
    return res.status(200).json({
        success: true,
        data: {
            id: channelId,
            ...updatedData,
            createdAt: updatedData.createdAt?.toDate?.()?.toISOString()
        }
    });
}
