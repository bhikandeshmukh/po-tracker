// pages/messages/index.js
// Team Chat/Messaging Page with Real-time Updates

import { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '../../components/Layout/Layout';
import { useAuth } from '../../lib/auth-client';
import apiClient from '../../lib/api-client';
import { db, setupPresence } from '../../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import {
    MessageSquare,
    Send,
    Users,
    Plus,
    Search,
    Trash2,
    X,
    UserPlus,
    UserMinus,
    Lock,
    Globe
} from 'lucide-react';

export default function MessagesPage() {
    const { user, loading: authLoading } = useAuth();
    const [channels, setChannels] = useState([]);
    const [activeChannel, setActiveChannel] = useState('general');
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showNewChannelModal, setShowNewChannelModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [deletingMessage, setDeletingMessage] = useState(null);
    const [showMembersPanel, setShowMembersPanel] = useState(false);
    const [members, setMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [showManageMembers, setShowManageMembers] = useState(false);
    const [removingMember, setRemovingMember] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState({});
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Setup presence system
    useEffect(() => {
        if (!user?.uid) return;
        
        const cleanup = setupPresence(user.uid, user.name);
        return () => cleanup();
    }, [user?.uid, user?.name]);

    // Listen to online status of all users
    useEffect(() => {
        const presenceRef = collection(db, 'presence');
        const unsubscribe = onSnapshot(presenceRef, (snapshot) => {
            const online = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                online[doc.id] = data.state === 'online';
            });
            setOnlineUsers(online);
        });
        
        return () => unsubscribe();
    }, []);

    // Fetch channels
    const fetchChannels = useCallback(async () => {
        try {
            const response = await apiClient.get('/messages/channels');
            if (response.success) {
                setChannels(response.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch channels:', error);
        }
    }, []);

    // Fetch team members
    const fetchMembers = useCallback(async () => {
        if (loadingMembers) return;
        setLoadingMembers(true);
        try {
            const response = await apiClient.get('/users?limit=100');
            if (response.success) {
                setMembers(response.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch members:', error);
        } finally {
            setLoadingMembers(false);
        }
    }, [loadingMembers]);

    // Setup real-time listener for messages (Hierarchical: channels/{channelId}/messages)
    useEffect(() => {
        if (!user || !activeChannel) return;

        setLoading(true);
        
        // Real-time listener using Firebase - Hierarchical subcollection
        const messagesRef = collection(db, 'channels', activeChannel, 'messages');
        const q = query(
            messagesRef,
            orderBy('createdAt', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newMessages = [];
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                newMessages.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
                });
            });
            // Reverse for chronological order
            newMessages.reverse();
            setMessages(newMessages);
            setLoading(false);
            
            // Scroll to bottom on new messages
            setTimeout(() => scrollToBottom(), 100);
        }, (error) => {
            console.error('Messages listener error:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, activeChannel]);

    // Fetch channels on mount
    useEffect(() => {
        if (user) {
            fetchChannels();
        }
    }, [user, fetchChannels]);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Generate message ID: MSG-{timestamp}-{random4}
    const generateMessageId = () => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `MSG-${timestamp}-${random}`;
    };

    // Send message - Direct Firestore write for instant update (Hierarchical)
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        const messageContent = newMessage.trim();
        setNewMessage(''); // Clear immediately for better UX
        setSending(true);
        
        try {
            // Generate custom message ID
            const messageId = generateMessageId();
            
            // Write directly to Firestore with custom ID: channels/{channelId}/messages/{messageId}
            const messageRef = doc(db, 'channels', activeChannel, 'messages', messageId);
            await setDoc(messageRef, {
                content: messageContent,
                senderId: user.uid,
                senderName: user.name || user.email?.split('@')[0] || 'Unknown',
                senderEmail: user.email,
                senderRole: user.role || 'user',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                isEdited: false,
                reactions: {},
                replyTo: null,
                attachments: []
            });
            
            inputRef.current?.focus();
        } catch (error) {
            console.error('Failed to send message:', error);
            setNewMessage(messageContent); // Restore message on error
        } finally {
            setSending(false);
        }
    };

    // Delete channel
    const handleDeleteChannel = async (channelId) => {
        try {
            const response = await apiClient.delete(`/messages/channels/${channelId}`);
            if (response.success) {
                setShowDeleteConfirm(null);
                fetchChannels();
                if (activeChannel === channelId) {
                    setActiveChannel('general');
                }
            }
        } catch (error) {
            console.error('Failed to delete channel:', error);
        }
    };

    // Delete message - Direct Firestore delete
    const handleDeleteMessage = async (messageId) => {
        if (deletingMessage) return;
        setDeletingMessage(messageId);
        
        try {
            const messageRef = doc(db, 'channels', activeChannel, 'messages', messageId);
            await deleteDoc(messageRef);
        } catch (error) {
            console.error('Failed to delete message:', error);
            alert('Message delete nahi ho paya. Shayad 30 minute se zyada ho gaye.');
        } finally {
            setDeletingMessage(null);
        }
    };

    // Check if message can be deleted (within 30 minutes)
    const canDeleteMessage = (message) => {
        if (!message || !user) return false;
        
        // Admin can delete anytime
        if (['admin', 'super_admin'].includes(user.role)) return true;
        
        // Sender can delete within 30 minutes
        if (message.senderId === user.uid) {
            const createdAt = new Date(message.createdAt).getTime();
            const now = Date.now();
            const diffMinutes = (now - createdAt) / (1000 * 60);
            return diffMinutes <= 30;
        }
        
        return false;
    };

    // Remove member from channel (direct from panel)
    const handleRemoveMemberFromPanel = async (memberId) => {
        const currentChannel = channels.find(c => c.id === activeChannel);
        if (!currentChannel || currentChannel.type !== 'private') return;
        
        // Can't remove channel creator
        if (memberId === currentChannel.createdBy) {
            alert('Channel creator ko remove nahi kar sakte');
            return;
        }
        
        setRemovingMember(memberId);
        try {
            const response = await apiClient.put('/messages/channels', {
                channelId: activeChannel,
                action: 'remove',
                memberIds: [memberId]
            });
            if (response.success) {
                fetchChannels();
                fetchMembers();
            }
        } catch (error) {
            console.error('Failed to remove member:', error);
        } finally {
            setRemovingMember(null);
        }
    };

    // Check if current user can manage channel members
    const canManageMembers = () => {
        const currentChannel = channels.find(c => c.id === activeChannel);
        if (!currentChannel || currentChannel.type !== 'private') return false;
        return user?.role === 'super_admin' || currentChannel.isAdmin;
    };

    // Format timestamp
    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        
        if (isToday) {
            return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    // Get initials for avatar
    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    // Get avatar color based on name
    const getAvatarColor = (name) => {
        const colors = [
            'from-blue-500 to-blue-600',
            'from-green-500 to-green-600',
            'from-purple-500 to-purple-600',
            'from-pink-500 to-pink-600',
            'from-indigo-500 to-indigo-600',
            'from-teal-500 to-teal-600',
            'from-orange-500 to-orange-600',
            'from-red-500 to-red-600'
        ];
        const index = (name || '').charCodeAt(0) % colors.length;
        return colors[index];
    };

    if (authLoading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="flex h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Sidebar - Channels */}
                <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Team Chat</h2>
                            {['admin', 'super_admin'].includes(user?.role) && (
                                <button
                                    onClick={() => setShowNewChannelModal(true)}
                                    className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                    title="New Channel"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Channels List */}
                    <div className="flex-1 overflow-y-auto p-2">
                        <div className="mb-4">
                            <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Channels</p>
                            {channels.map(channel => (
                                <div
                                    key={channel.id}
                                    className={`group flex items-center justify-between px-3 py-2 rounded-lg transition ${
                                        activeChannel === channel.id
                                            ? 'bg-indigo-100 text-indigo-700'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    <button
                                        onClick={() => setActiveChannel(channel.id)}
                                        className="flex items-center space-x-2 flex-1 text-left"
                                    >
                                        <span className="text-lg">{channel.icon || '💬'}</span>
                                        <span className="font-medium truncate">{channel.name}</span>
                                        {channel.type === 'private' && (
                                            <Lock className="w-3 h-3 text-gray-400" />
                                        )}
                                    </button>
                                    {['admin', 'super_admin'].includes(user?.role) && !['general', 'announcements'].includes(channel.id) && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowDeleteConfirm(channel.id);
                                            }}
                                            className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
                                            title="Delete Channel"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* User Info */}
                    <div className="p-3 border-t border-gray-200 bg-white">
                        <div className="flex items-center space-x-3">
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarColor(user?.name)} flex items-center justify-center text-white text-sm font-semibold`}>
                                {getInitials(user?.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                                <p className="text-xs text-green-600 flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                                    Online
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col">
                    {/* Channel Header */}
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
                        <div className="flex items-center space-x-3">
                            <span className="text-2xl">
                                {channels.find(c => c.id === activeChannel)?.icon || '💬'}
                            </span>
                            <div>
                                <h3 className="font-semibold text-gray-900">
                                    {channels.find(c => c.id === activeChannel)?.name || activeChannel}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {channels.find(c => c.id === activeChannel)?.description || 'Team channel'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
                                <Search className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => {
                                    setShowMembersPanel(!showMembersPanel);
                                    if (!showMembersPanel && members.length === 0) {
                                        fetchMembers();
                                    }
                                }}
                                className={`p-2 rounded-lg transition ${showMembersPanel ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                            >
                                <Users className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        {/* Messages Area */}
                        <div className={`flex-1 flex flex-col ${showMembersPanel ? 'border-r border-gray-200' : ''}`}>
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
                                <p className="text-lg font-medium">No messages yet</p>
                                <p className="text-sm">Be the first to send a message!</p>
                            </div>
                        ) : (
                            messages.map((message, index) => {
                                const isOwnMessage = message.senderId === user?.uid;
                                const showAvatar = index === 0 || messages[index - 1]?.senderId !== message.senderId;
                                const canDelete = canDeleteMessage(message);
                                
                                return (
                                    <div
                                        key={message.id}
                                        className={`group flex items-start space-x-3 ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}
                                    >
                                        {showAvatar ? (
                                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarColor(message.senderName)} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
                                                {getInitials(message.senderName)}
                                            </div>
                                        ) : (
                                            <div className="w-9 flex-shrink-0"></div>
                                        )}
                                        <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                                            {showAvatar && (
                                                <div className={`flex items-center space-x-2 mb-1 ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {isOwnMessage ? 'You' : message.senderName}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {formatTime(message.createdAt)}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="relative flex items-center gap-2">
                                                {/* Delete button - left side for own messages */}
                                                {isOwnMessage && canDelete && (
                                                    <button
                                                        onClick={() => handleDeleteMessage(message.id)}
                                                        disabled={deletingMessage === message.id}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                        title="Delete message"
                                                    >
                                                        {deletingMessage === message.id ? (
                                                            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                )}
                                                <div className={`px-4 py-2 rounded-2xl ${
                                                    isOwnMessage
                                                        ? 'bg-indigo-600 text-white rounded-tr-md'
                                                        : 'bg-white text-gray-900 border border-gray-200 rounded-tl-md'
                                                }`}>
                                                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                                </div>
                                                {/* Delete button - right side for others' messages (admin only) */}
                                                {!isOwnMessage && canDelete && (
                                                    <button
                                                        onClick={() => handleDeleteMessage(message.id)}
                                                        disabled={deletingMessage === message.id}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                        title="Delete message"
                                                    >
                                                        {deletingMessage === message.id ? (
                                                            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                            <div className="px-6 py-4 border-t border-gray-200 bg-white">
                                <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                                    <div className="flex-1 relative">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder={`Message #${channels.find(c => c.id === activeChannel)?.name || activeChannel}`}
                                            className="w-full px-4 py-3 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                                            disabled={sending}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim() || sending}
                                        className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Members Panel */}
                        {showMembersPanel && (
                            <div className="w-64 bg-white flex flex-col">
                                <div className="p-4 border-b border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-gray-900">
                                            {channels.find(c => c.id === activeChannel)?.type === 'private' ? 'Channel Members' : 'Team Members'}
                                        </h3>
                                        {channels.find(c => c.id === activeChannel)?.type === 'private' ? (
                                            <Lock className="w-4 h-4 text-gray-400" />
                                        ) : (
                                            <Globe className="w-4 h-4 text-gray-400" />
                                        )}
                                    </div>
                                    {/* Add/Manage Members button for channel admin */}
                                    {(user?.role === 'super_admin' || channels.find(c => c.id === activeChannel)?.isAdmin) && 
                                     channels.find(c => c.id === activeChannel)?.type === 'private' && (
                                        <button
                                            onClick={() => {
                                                setShowManageMembers(true);
                                                if (members.length === 0) fetchMembers();
                                            }}
                                            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            Manage Members
                                        </button>
                                    )}
                                </div>
                                <div className="flex-1 overflow-y-auto p-2">
                                    {loadingMembers ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {/* Show channel members for private, all for public */}
                                            {(() => {
                                                const currentChannel = channels.find(c => c.id === activeChannel);
                                                const displayMembers = currentChannel?.type === 'private' 
                                                    ? members.filter(m => currentChannel?.members?.includes(m.id))
                                                    : members;
                                                
                                                if (displayMembers.length === 0) {
                                                    return <p className="text-center text-gray-500 py-8 text-sm">No members found</p>;
                                                }
                                                
                                                return displayMembers.map(member => (
                                                    <div
                                                        key={member.id}
                                                        className="group flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition"
                                                    >
                                                        <div className="relative">
                                                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarColor(member.name)} flex items-center justify-center text-white text-sm font-semibold`}>
                                                                {getInitials(member.name)}
                                                            </div>
                                                            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${onlineUsers[member.id] ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                                {member.name}
                                                                {member.id === currentChannel?.createdBy && (
                                                                    <span className="ml-1 text-xs text-indigo-600">👑</span>
                                                                )}
                                                                {member.id === user?.uid && <span className="text-gray-400 ml-1">(you)</span>}
                                                            </p>
                                                            <p className="text-xs text-gray-500 truncate capitalize">{member.role?.replace('_', ' ')}</p>
                                                        </div>
                                                        {/* Remove button for private channels - admin only */}
                                                        {canManageMembers() && 
                                                         member.id !== currentChannel?.createdBy && 
                                                         member.id !== user?.uid && (
                                                            <button
                                                                onClick={() => handleRemoveMemberFromPanel(member.id)}
                                                                disabled={removingMember === member.id}
                                                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                                                title="Remove from channel"
                                                            >
                                                                {removingMember === member.id ? (
                                                                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                                                                ) : (
                                                                    <UserMinus className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* New Channel Modal */}
            {showNewChannelModal && (
                <NewChannelModal
                    onClose={() => setShowNewChannelModal(false)}
                    onSuccess={() => {
                        setShowNewChannelModal(false);
                        fetchChannels();
                    }}
                />
            )}

            {/* Manage Members Modal */}
            {showManageMembers && (
                <ManageMembersModal
                    channel={channels.find(c => c.id === activeChannel)}
                    allUsers={members}
                    currentUser={user}
                    onClose={() => setShowManageMembers(false)}
                    onUpdate={() => {
                        fetchChannels();
                        fetchMembers();
                    }}
                    getInitials={getInitials}
                    getAvatarColor={getAvatarColor}
                />
            )}

            {/* Delete Channel Confirmation */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Delete Channel</h3>
                            <button onClick={() => setShowDeleteConfirm(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete this channel? All messages will be permanently deleted.
                        </p>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteChannel(showDeleteConfirm)}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}

// New Channel Modal
function NewChannelModal({ onClose, onSuccess }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('💬');
    const [type, setType] = useState('private');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const icons = ['💬', '📢', '📦', '🚚', '💡', '🔧', '📊', '🎯', '🔔', '⭐'];

    // Fetch all users on mount
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await apiClient.get('/users?limit=100');
                if (response.success) {
                    setAllUsers(response.data || []);
                }
            } catch (err) {
                console.error('Failed to fetch users:', err);
            } finally {
                setLoadingUsers(false);
            }
        };
        fetchUsers();
    }, []);

    const filteredUsers = allUsers.filter(u => 
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleMember = (userId) => {
        setSelectedMembers(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        setError('');

        try {
            const response = await apiClient.post('/messages/channels', {
                name: name.trim(),
                description: description.trim(),
                icon,
                type,
                members: selectedMembers
            });

            if (response.success) {
                onSuccess();
            } else {
                setError(response.error?.message || 'Failed to create channel');
            }
        } catch (err) {
            setError(err.message || 'Failed to create channel');
        } finally {
            setLoading(false);
        }
    };

    // Get initials for avatar
    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    // Get avatar color based on name
    const getAvatarColor = (name) => {
        const colors = [
            'from-blue-500 to-blue-600',
            'from-green-500 to-green-600',
            'from-purple-500 to-purple-600',
            'from-pink-500 to-pink-600',
            'from-indigo-500 to-indigo-600',
            'from-teal-500 to-teal-600',
            'from-orange-500 to-orange-600',
            'from-red-500 to-red-600'
        ];
        const index = (name || '').charCodeAt(0) % colors.length;
        return colors[index];
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-gray-900">Create New Channel</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                            <div className="flex flex-wrap gap-2">
                                {icons.map(i => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setIcon(i)}
                                        className={`w-10 h-10 text-xl rounded-lg border-2 transition ${
                                            icon === i ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        {i}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Channel Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., project-updates"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What's this channel about?"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Channel Type</label>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setType('public')}
                                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition ${
                                        type === 'public' 
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    🌐 Public
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('private')}
                                    className={`flex-1 px-4 py-2 rounded-lg border-2 transition ${
                                        type === 'private' 
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    🔒 Private
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {type === 'public' ? 'Everyone can see this channel' : 'Only selected members can see this channel'}
                            </p>
                        </div>

                        {type === 'private' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Add Members ({selectedMembers.length} selected)
                                </label>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search users..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-2"
                                />
                                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                                    {loadingUsers ? (
                                        <div className="flex items-center justify-center py-4">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                                        </div>
                                    ) : filteredUsers.length === 0 ? (
                                        <p className="text-center text-gray-500 py-4 text-sm">No users found</p>
                                    ) : (
                                        filteredUsers.map(u => (
                                            <div
                                                key={u.id}
                                                onClick={() => toggleMember(u.id)}
                                                className={`flex items-center space-x-3 p-3 cursor-pointer transition ${
                                                    selectedMembers.includes(u.id) 
                                                        ? 'bg-indigo-50' 
                                                        : 'hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(u.name)} flex items-center justify-center text-white text-xs font-semibold`}>
                                                    {getInitials(u.name)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                                                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                                                </div>
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                                    selectedMembers.includes(u.id) 
                                                        ? 'bg-indigo-600 border-indigo-600' 
                                                        : 'border-gray-300'
                                                }`}>
                                                    {selectedMembers.includes(u.id) && (
                                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !name.trim()}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                            >
                                {loading ? 'Creating...' : 'Create Channel'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Manage Members Modal
function ManageMembersModal({ channel, allUsers, currentUser, onClose, onUpdate, getInitials, getAvatarColor }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    if (!channel) return null;

    const channelMembers = allUsers.filter(u => channel.members?.includes(u.id));
    const nonMembers = allUsers.filter(u => !channel.members?.includes(u.id));
    
    const filteredNonMembers = nonMembers.filter(u => 
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddMember = async (userId) => {
        setActionLoading(userId);
        try {
            const response = await apiClient.put('/messages/channels', {
                channelId: channel.id,
                action: 'add',
                memberIds: [userId]
            });
            if (response.success) {
                onUpdate();
            }
        } catch (error) {
            console.error('Failed to add member:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemoveMember = async (userId) => {
        // Can't remove channel creator
        if (userId === channel.createdBy) {
            alert('Channel creator cannot be removed');
            return;
        }
        
        setActionLoading(userId);
        try {
            const response = await apiClient.put('/messages/channels', {
                channelId: channel.id,
                action: 'remove',
                memberIds: [userId]
            });
            if (response.success) {
                onUpdate();
            }
        } catch (error) {
            console.error('Failed to remove member:', error);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Manage Members</h3>
                            <p className="text-sm text-gray-500">{channel.name}</p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Current Members */}
                    <div className="p-4 border-b border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            Current Members ({channelMembers.length})
                        </h4>
                        <div className="space-y-2">
                            {channelMembers.map(member => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(member.name)} flex items-center justify-center text-white text-xs font-semibold`}>
                                            {getInitials(member.name)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {member.name}
                                                {member.id === channel.createdBy && (
                                                    <span className="ml-2 text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">Admin</span>
                                                )}
                                                {member.id === currentUser?.uid && (
                                                    <span className="ml-1 text-gray-400">(you)</span>
                                                )}
                                            </p>
                                            <p className="text-xs text-gray-500">{member.email}</p>
                                        </div>
                                    </div>
                                    {member.id !== channel.createdBy && (
                                        <button
                                            onClick={() => handleRemoveMember(member.id)}
                                            disabled={actionLoading === member.id}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                            title="Remove member"
                                        >
                                            {actionLoading === member.id ? (
                                                <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <UserMinus className="w-4 h-4" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Add Members */}
                    <div className="p-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Add Members</h4>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search users to add..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-3"
                        />
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {filteredNonMembers.length === 0 ? (
                                <p className="text-center text-gray-500 py-4 text-sm">
                                    {searchQuery ? 'No users found' : 'All users are already members'}
                                </p>
                            ) : (
                                filteredNonMembers.map(user => (
                                    <div
                                        key={user.id}
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(user.name)} flex items-center justify-center text-white text-xs font-semibold`}>
                                                {getInitials(user.name)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                                <p className="text-xs text-gray-500">{user.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleAddMember(user.id)}
                                            disabled={actionLoading === user.id}
                                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                                            title="Add member"
                                        >
                                            {actionLoading === user.id ? (
                                                <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <UserPlus className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
