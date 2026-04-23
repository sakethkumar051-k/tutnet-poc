import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatPresence } from '../utils/presence';
import { getSocket } from '../socketClient';
import ReportOffPlatformButton from './ReportOffPlatformButton';
import NewConversationPicker from './NewConversationPicker';

const formatTime = (d) => {
    const date = new Date(d);
    const now = new Date();
    const diffDays = Math.floor((now - date) / 86400000);
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const Avatar = ({ name = '', className = 'w-9 h-9 text-xs' }) => {
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const colors = ['bg-royal/10 text-royal-dark', 'bg-royal/10 text-royal-dark', 'bg-royal/10 text-royal-dark', 'bg-lime/30 text-navy-950'];
    const color = colors[name.charCodeAt(0) % colors.length];
    return (
        <div className={`rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${color} ${className}`}>
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
    const [showNewPicker, setShowNewPicker] = useState(false);

    const handleStartConversation = useCallback((contact) => {
        if (!contact?._id) return;
        const partnerObj = {
            _id: contact._id,
            name: contact.name,
            role: user?.role === 'student' ? 'tutor' : 'student',
            lastSeenAt: null
        };
        setSelectedPartner(partnerObj);
        setConversations((prev) => {
            const exists = prev.some((c) => String(c.partner?._id) === String(contact._id));
            if (exists) return prev;
            return [{
                partner: partnerObj,
                lastMessage: { text: 'No messages yet', createdAt: new Date().toISOString() },
                unreadCount: 0
            }, ...prev];
        });
    }, [user?.role]);
    const [sending, setSending] = useState(false);
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const bottomRef = useRef(null);
    const lastMessageAtRef = useRef(null);
    const pollIntervalRef = useRef(null);
    const [socketConnected, setSocketConnected] = useState(false);

    /** When Socket.IO is connected, rely on pushes; HTTP poll is only a slow safety net. */
    const POLL_MS_VISIBLE = 20_000;
    const POLL_MS_HIDDEN = 60_000;
    const POLL_MS_SOCKET_BACKUP = 180_000;

    const fetchConversations = useCallback(async () => {
        try {
            const { data } = await api.get('/messages/conversations');
            setConversations(data);
        } catch { /* silent */ }
        finally { setLoadingConvs(false); }
    }, []);

    const fetchMessagesFull = useCallback(async (partnerId) => {
        if (!partnerId) return;
        setLoadingMsgs(true);
        try {
            const { data } = await api.get(`/messages/${partnerId}`);
            setMessages(data);
            const last = data?.length ? data[data.length - 1] : null;
            lastMessageAtRef.current = last?.createdAt ? new Date(last.createdAt).toISOString() : null;
        } catch { /* silent */ }
        finally { setLoadingMsgs(false); }
    }, []);

    const fetchNewMessagesSince = useCallback(async (partnerId) => {
        if (!partnerId || !lastMessageAtRef.current) return;
        try {
            const { data } = await api.get(`/messages/${partnerId}`, {
                params: { since: lastMessageAtRef.current }
            });
            if (!data?.length) return;
            setMessages((prev) => {
                const ids = new Set(prev.map((m) => m._id));
                const merged = [...prev];
                data.forEach((m) => {
                    if (!ids.has(m._id)) merged.push(m);
                });
                merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                return merged;
            });
            const last = data[data.length - 1];
            if (last?.createdAt) {
                lastMessageAtRef.current = new Date(last.createdAt).toISOString();
            }
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    useEffect(() => {
        const s = getSocket();
        if (!s) {
            setSocketConnected(false);
            return undefined;
        }
        const onConnect = () => setSocketConnected(true);
        const onDisconnect = () => setSocketConnected(false);
        s.on('connect', onConnect);
        s.on('disconnect', onDisconnect);
        setSocketConnected(s.connected);
        return () => {
            s.off('connect', onConnect);
            s.off('disconnect', onDisconnect);
        };
    }, [user]);

    useEffect(() => {
        const s = getSocket();
        if (!s || !user?._id) return undefined;

        const onNew = (payload) => {
            const msg = payload?.message;
            if (!msg) return;
            fetchConversations();
            const partnerId = selectedPartner?._id;
            if (!partnerId) return;
            const me = String(user._id);
            const sid = String(msg.senderId?._id || msg.senderId);
            const rid = String(msg.recipientId?._id || msg.recipientId);
            const p = String(partnerId);
            const inThread = (sid === me && rid === p) || (sid === p && rid === me);
            if (!inThread) return;
            setMessages((prev) => {
                if (prev.some((m) => String(m._id) === String(msg._id))) return prev;
                const merged = [...prev, msg];
                merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                return merged;
            });
            if (msg.createdAt) {
                lastMessageAtRef.current = new Date(msg.createdAt).toISOString();
            }
        };

        s.on('message:new', onNew);
        return () => s.off('message:new', onNew);
    }, [user, selectedPartner, fetchConversations]);

    // Handle preselected user (e.g. "Message Tutor" button from another page)
    useEffect(() => {
        if (preselectedUserId && preselectedUserName) {
            const synthetic = { _id: preselectedUserId, name: preselectedUserName, role: '' };
            setSelectedPartner(synthetic);
        }
    }, [preselectedUserId, preselectedUserName]);

    useEffect(() => {
        if (!selectedPartner) {
            lastMessageAtRef.current = null;
            return undefined;
        }

        fetchMessagesFull(selectedPartner._id);

        const schedulePoll = () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            let ms;
            if (socketConnected) {
                ms = POLL_MS_SOCKET_BACKUP;
            } else {
                ms = document.visibilityState === 'hidden' ? POLL_MS_HIDDEN : POLL_MS_VISIBLE;
            }
            pollIntervalRef.current = setInterval(() => {
                fetchNewMessagesSince(selectedPartner._id);
            }, ms);
        };

        schedulePoll();
        const onVis = () => schedulePoll();
        document.addEventListener('visibilitychange', onVis);

        return () => {
            document.removeEventListener('visibilitychange', onVis);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [selectedPartner, fetchMessagesFull, fetchNewMessagesSince, socketConnected]);

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
            setMessages((prev) => [...prev, data]);
            if (data?.createdAt) {
                lastMessageAtRef.current = new Date(data.createdAt).toISOString();
            }
            fetchConversations();
        } catch { setNewText(text); }
        finally { setSending(false); }
    };

    const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: '600px', display: 'flex' }}>
            {/* Sidebar — conversation list */}
            <div className="w-72 border-r border-gray-100 flex flex-col flex-shrink-0">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-semibold text-navy-950">Messages</span>
                        {totalUnread > 0 && (
                            <span className="text-[10px] bg-royal text-white rounded-full px-1.5 py-0.5 font-bold">{totalUnread}</span>
                        )}
                    </div>
                    <button
                        onClick={() => setShowNewPicker(true)}
                        className="flex items-center gap-1 px-2 py-1 rounded-full bg-navy-950 hover:bg-navy-900 text-white text-[11px] font-bold transition-colors"
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        New
                    </button>
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
                            <div className="w-10 h-10 rounded-full bg-royal/10 flex items-center justify-center mb-3">
                                <svg className="w-5 h-5 text-royal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                                </svg>
                            </div>
                            <p className="text-sm font-bold text-navy-950">No conversations yet</p>
                            <p className="text-xs text-gray-500 mt-1 max-w-[200px] leading-relaxed">
                                Start a conversation with {user?.role === 'student' ? 'a tutor you\'ve booked or favourited' : 'one of your students'}.
                            </p>
                            <button
                                onClick={() => setShowNewPicker(true)}
                                className="mt-4 px-4 py-2 bg-lime hover:bg-lime-light text-navy-950 text-xs font-bold rounded-full transition-colors"
                            >
                                Start conversation
                            </button>
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <button
                                key={conv.partner._id}
                                onClick={() => handleSelectConversation(conv)}
                                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 ${selectedPartner?._id === conv.partner._id ? 'bg-royal/5 border-l-2 border-l-royal' : ''}`}
                            >
                                <Avatar name={conv.partner.name} className="w-9 h-9 text-xs" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-semibold text-navy-950' : 'font-medium text-gray-700'}`}>
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
                                            <span className="ml-1 flex-shrink-0 w-4 h-4 rounded-full bg-royal text-white text-xs flex items-center justify-center">{conv.unreadCount}</span>
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
                        <Avatar name={selectedPartner.name} className="w-8 h-8 text-[11px]" />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-navy-950">{selectedPartner.name}</p>
                            {selectedPartner.role && (
                                <p className="text-xs text-gray-400 capitalize">{selectedPartner.role}</p>
                            )}
                            {(() => {
                                const p = formatPresence(selectedPartner.lastSeenAt);
                                return p.label ? (
                                    <p className={`text-[11px] mt-0.5 truncate ${p.isActive ? 'text-lime-dark font-medium' : 'text-gray-400'}`}>
                                        {p.isActive ? '● ' : ''}{p.label}
                                    </p>
                                ) : null;
                            })()}
                        </div>
                        {/* Safety: off-platform report — only parents see it, only when chatting with a tutor */}
                        {user?.role === 'student' && selectedPartner?.role === 'tutor' && (
                            <ReportOffPlatformButton tutorId={selectedPartner._id} />
                        )}
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                        {loadingMsgs ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="w-5 h-5 border-2 border-royal/50 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="w-10 h-10 rounded-full bg-royal/5 flex items-center justify-center mb-3">
                                    <svg className="w-5 h-5 text-royal-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                        {!isMe && <Avatar name={selectedPartner.name} className="w-6 h-6 text-[10px]" />}
                                        <div className={`max-w-xs lg:max-w-sm px-3.5 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-royal text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                                            <p className="leading-relaxed">{msg.text}</p>
                                            <div className={`text-xs mt-1 flex items-center justify-end gap-2 flex-wrap ${isMe ? 'text-white/80' : 'text-gray-400'}`}>
                                                <span>{formatTime(msg.createdAt)}</span>
                                                {isMe && msg.readAt && (
                                                    <span className="opacity-90">Read</span>
                                                )}
                                            </div>
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
                            className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-royal/40 focus:border-transparent placeholder-gray-400"
                            style={{ maxHeight: '96px', overflowY: 'auto' }}
                        />
                        <button
                            type="submit"
                            disabled={!newText.trim() || sending}
                            className="flex-shrink-0 w-10 h-10 rounded-xl bg-royal text-white flex items-center justify-center hover:bg-royal-dark disabled:opacity-40 transition-colors"
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
                        <div className="w-14 h-14 rounded-2xl bg-royal/5 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-7 h-7 text-royal-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-700">Select a conversation</p>
                        <p className="text-xs text-gray-400 mt-1">Choose from the list to start messaging</p>
                    </div>
                </div>
            )}

            {showNewPicker && (
                <NewConversationPicker
                    role={user?.role}
                    onPick={handleStartConversation}
                    onClose={() => setShowNewPicker(false)}
                />
            )}
        </div>
    );
}
