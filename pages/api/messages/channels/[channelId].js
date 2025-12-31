// pages/api/messages/channels/[channelId].js
// Delete Channel API

import { db } from '../../../../lib/firebase-admin';
import { verifyAuth } from '../../../../lib/auth-middleware';

export default async function handler(req, res) {
    try {
        const user = await verifyAuth(req);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            });
        }

        const { channelId } = req.query;

        if (req.method === 'DELETE') {
            return await deleteChannel(req, res, user, channelId);
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

async function deleteChannel(req, res, user, channelId) {
    // Only super_admin can delete channels
    if (user.role !== 'super_admin' && user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Only admins can delete channels' }
        });
    }

    // Prevent deleting default channels
    const protectedChannels = ['general', 'announcements'];
    if (protectedChannels.includes(channelId)) {
        return res.status(400).json({
            success: false,
            error: { code: 'PROTECTED_CHANNEL', message: 'Cannot delete default channels' }
        });
    }

    // Check if channel exists
    const channelDoc = await db.collection('channels').doc(channelId).get();
    if (!channelDoc.exists) {
        return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Channel not found' }
        });
    }

    // Delete all messages in the channel (subcollection)
    const messagesSnapshot = await db.collection('channels').doc(channelId).collection('messages').get();

    const batch = db.batch();
    
    // Delete messages from subcollection
    messagesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    // Delete channel
    batch.delete(db.collection('channels').doc(channelId));
    
    await batch.commit();

    return res.status(200).json({
        success: true,
        message: 'Channel deleted successfully'
    });
}
