// pages/messages/index.js
// Team Chat/Messaging Page with Real-time Updates

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import { useAuth } from '../../lib/auth-client';
import apiClient from '../../lib/api-client';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import {
    MessageSquare,
    Send,
    Hash,
    Users,
    Plus,
    Search,
    Smile,
    Paperclip,
    MoreVertical,
    Bell,
    Settings,
    ChevronDown
} from 'lucide-react';

export default function MessagesPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [channels, setChannels] = useState([]);
    const [activeChannel, setActiveChannel] = useState('general');
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [showNewChannelModal, setShowNewChannelModal] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

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

    // Setup real-time listener for messages
    useEffect(() => {
        if (!user || !activeChannel) return;

        setLoading(true);
        
        // Real-time listener using Firebase
        const messagesRef = collection(db, 'messages');
        const q = query(
            messagesRef,
            where('channelId', '==', activeChannel),
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

    // Send message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        try {
            await apiClient.post('/messages', {
                content: newMessage.trim(),
                channelId: activeChannel
            });
            setNewMessage('');
            inputRef.current?.focus();
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setSending(false);
        }
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
                                <button
                                    key={channel.id}
                                    onClick={() => setActiveChannel(channel.id)}
                                    className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition ${
                                        activeChannel === channel.id
                                            ? 'bg-indigo-100 text-indigo-700'
                                            : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    <span className="text-lg">{channel.icon || '💬'}</span>
                                    <span className="font-medium truncate">{channel.name}</span>
                                </button>
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
                            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
                                <Users className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
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
                                
                                return (
                                    <div
                                        key={message.id}
                                        className={`flex items-start space-x-3 ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}
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
                                            <div className={`px-4 py-2 rounded-2xl ${
                                                isOwnMessage
                                                    ? 'bg-indigo-600 text-white rounded-tr-md'
                                                    : 'bg-white text-gray-900 border border-gray-200 rounded-tl-md'
                                            }`}>
                                                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
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
        </Layout>
    );
}

// New Channel Modal
function NewChannelModal({ onClose, onSuccess }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState('💬');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const icons = ['💬', '📢', '📦', '🚚', '💡', '🔧', '📊', '🎯', '🔔', '⭐'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        setError('');

        try {
            const response = await apiClient.post('/messages/channels', {
                name: name.trim(),
                description: description.trim(),
                icon
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

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">Create New Channel</h3>

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
