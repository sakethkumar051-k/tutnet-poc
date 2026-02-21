import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const formatTime = (d) => {
    const date = new Date(d);
    const now = new Date();
    const diffDays = Math.floor((now - date) / 86400000);
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const Avatar = ({ name = '', size = 8 }) => {
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const colors = ['bg-indigo-100 text-indigo-700', 'bg-purple-100 text-purple-700', 'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700'];
    const color = colors[name.charCodeAt(0) % colors.length];
    return (
        <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${color}`}>
            {initials}
        </div>
    );
};

export default function MessagingPanel({ preselectedUserId = null, preselectedUserName = null }) {
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newText, setNewText] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const bottomRef = useRef(null);
    const pollRef = useRef(null);

    const fetchConversations = useCallback(async () => {
        try {
            const { data } = await api.get('/messages/conversations');
            setConversations(data);
        } catch { /* silent */ }
        finally { setLoadingConvs(false); }
    }, []);

    const fetchMessages = useCallback(async (partnerId) => {
        if (!partnerId) return;
        setLoadingMsgs(true);
        try {
            const { data } = await api.get(`/messages/${partnerId}`);
            setMessages(data);
        } catch { /* silent */ }
        finally { setLoadingMsgs(false); }
    }, []);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    // Handle preselected user (e.g. "Message Tutor" button from another page)
    useEffect(() => {
        if (preselectedUserId && preselectedUserName) {
            const synthetic = { _id: preselectedUserId, name: preselectedUserName, role: '' };
            setSelectedPartner(synthetic);
        }
    }, [preselectedUserId, preselectedUserName]);

    useEffect(() => {
        if (!selectedPartner) return;
        fetchMessages(selectedPartner._id);
        // Poll for new messages every 5s
        pollRef.current = setInterval(() => fetchMessages(selectedPartner._id), 5000);
        return () => clearInterval(pollRef.current);
    }, [selectedPartner, fetchMessages]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSelectConversation = (conv) => {
        setSelectedPartner(conv.partner);
        // Mark as read locally
        setConversations(prev => prev.map(c =>
            c.partner._id === conv.partner._id ? { ...c, unreadCount: 0 } : c
        ));
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newText.trim() || !selectedPartner || sending) return;
        const text = newText.trim();
        setNewText('');
        setSending(true);
        try {
            const { data } = await api.post('/messages', { recipientId: selectedPartner._id, text });
            setMessages(prev => [...prev, data]);
            fetchConversations();
        } catch { setNewText(text); }
        finally { setSending(false); }
    };

    const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: '600px', display: 'flex' }}>
            {/* Sidebar — conversation list */}
            <div className="w-72 border-r border-gray-100 flex flex-col flex-shrink-0">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">Messages</span>
                    {totalUnread > 0 && (
                        <span className="text-xs bg-indigo-600 text-white rounded-full px-2 py-0.5">{totalUnread}</span>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loadingConvs ? (
                        <div className="p-4 space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                    <div className="w-9 h-9 rounded-full bg-gray-100" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3 bg-gray-100 rounded w-24" />
                                        <div className="h-2.5 bg-gray-100 rounded w-36" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center px-6 py-8">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <p className="text-xs font-medium text-gray-500">No conversations yet</p>
                            <p className="text-xs text-gray-400 mt-1">Start by messaging your tutor or a student</p>
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <button
                                key={conv.partner._id}
                                onClick={() => handleSelectConversation(conv)}
                                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 ${selectedPartner?._id === conv.partner._id ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''}`}
                            >
                                <Avatar name={conv.partner.name} size={9} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                            {conv.partner.name}
                                        </span>
                                        <span className="text-xs text-gray-400 ml-1 flex-shrink-0">{formatTime(conv.lastMessage.createdAt)}</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5">
                                        <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
                                            {conv.lastMessage.senderId === user?._id || conv.lastMessage.senderId?._id === user?._id ? 'You: ' : ''}
                                            {conv.lastMessage.text}
                                        </p>
                                        {conv.unreadCount > 0 && (
                                            <span className="ml-1 flex-shrink-0 w-4 h-4 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">{conv.unreadCount}</span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Main chat area */}
            {selectedPartner ? (
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
                        <Avatar name={selectedPartner.name} size={8} />
                        <div>
                            <p className="text-sm font-semibold text-gray-900">{selectedPartner.name}</p>
                            {selectedPartner.role && (
                                <p className="text-xs text-gray-400 capitalize">{selectedPartner.role}</p>
                            )}
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                        {loadingMsgs ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
                                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                </div>
                                <p className="text-sm text-gray-500 font-medium">Start the conversation</p>
                                <p className="text-xs text-gray-400 mt-1">Send a message to {selectedPartner.name}</p>
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isMe = msg.senderId?._id === user?._id || msg.senderId === user?._id;
                                return (
                                    <div key={msg._id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                        {!isMe && <Avatar name={selectedPartner.name} size={6} />}
                                        <div className={`max-w-xs lg:max-w-sm px-3.5 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                                            <p className="leading-relaxed">{msg.text}</p>
                                            <p className={`text-xs mt-1 ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>{formatTime(msg.createdAt)}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="px-5 py-3 border-t border-gray-100 flex items-end gap-3">
                        <textarea
                            value={newText}
                            onChange={e => setNewText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                            placeholder={`Message ${selectedPartner.name}…`}
                            rows={1}
                            className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder-gray-400"
                            style={{ maxHeight: '96px', overflowY: 'auto' }}
                        />
                        <button
                            type="submit"
                            disabled={!newText.trim() || sending}
                            className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                        >
                            {sending ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            )}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-700">Select a conversation</p>
                        <p className="text-xs text-gray-400 mt-1">Choose from the list to start messaging</p>
                    </div>
                </div>
            )}
        </div>
    );
}
