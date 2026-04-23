import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

/**
 * NewConversationPicker — modal to start a new conversation.
 * Students see their current tutors + favourites.
 * Tutors see their current students.
 */
export default function NewConversationPicker({ role, onPick, onClose }) {
    const navigate = useNavigate();
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                if (role === 'student') {
                    const [tutorsRes, favRes] = await Promise.all([
                        api.get('/current-tutors/student/my-tutors').catch(() => ({ data: [] })),
                        api.get('/favorites').catch(() => ({ data: [] }))
                    ]);
                    if (cancelled) return;

                    const tutors = (tutorsRes.data || []).map((r) => ({
                        _id: r.tutorId?._id || r.tutorId,
                        name: r.tutorId?.name || r.tutorName || 'Tutor',
                        email: r.tutorId?.email,
                        source: 'Your tutor',
                        subject: r.subject
                    }));

                    const favs = (favRes.data || []).map((f) => {
                        const u = f.tutorId?.userId || f.tutorId;
                        return {
                            _id: u?._id || u,
                            name: u?.name || 'Tutor',
                            email: u?.email,
                            source: 'Favourite'
                        };
                    });

                    const seen = new Set();
                    const merged = [...tutors, ...favs].filter((c) => {
                        if (!c._id) return false;
                        const k = String(c._id);
                        if (seen.has(k)) return false;
                        seen.add(k);
                        return true;
                    });
                    setContacts(merged);
                } else {
                    const { data } = await api.get('/current-tutors/tutor/my-students').catch(() => ({ data: [] }));
                    if (cancelled) return;
                    setContacts((data || []).map((r) => ({
                        _id: r.studentId?._id || r.studentId,
                        name: r.studentId?.name || r.studentName || 'Student',
                        email: r.studentId?.email,
                        source: 'Your student',
                        subject: r.subject
                    })));
                }
            } catch (_) {
                if (!cancelled) setContacts([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [role]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return contacts;
        return contacts.filter((c) => c.name?.toLowerCase().includes(q));
    }, [contacts, search]);

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
             onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-white rounded-3xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)] w-full max-w-[440px] overflow-hidden">
                <div className="px-6 pt-6 pb-4">
                    <div className="flex items-center justify-between mb-1">
                        <div>
                            <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Start a conversation</p>
                            <h3 className="text-lg font-extrabold text-navy-950 tracking-tight mt-0.5">
                                {role === 'student' ? 'Message a tutor' : 'Message a student'}
                            </h3>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {contacts.length > 0 && (
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name..."
                            className="w-full mt-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-navy-950 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal/40 transition-all"
                        />
                    )}
                </div>

                <div className="max-h-[360px] overflow-y-auto px-2 pb-4">
                    {loading ? (
                        <div className="p-4 space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3 bg-gray-100 rounded w-2/3" />
                                        <div className="h-2 bg-gray-100 rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        contacts.length === 0 ? (
                            <div className="py-10 px-6 text-center">
                                <p className="text-sm font-semibold text-navy-950">
                                    {role === 'student' ? "You don't have any tutors yet" : "You don't have any active students"}
                                </p>
                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                    {role === 'student'
                                        ? 'Book a session or add a tutor to your favourites first.'
                                        : 'Once a student books a session with you, they\'ll appear here.'}
                                </p>
                                {role === 'student' && (
                                    <button
                                        onClick={() => { onClose(); navigate('/find-tutors'); }}
                                        className="mt-4 px-5 py-2.5 bg-lime hover:bg-lime-light text-navy-950 text-sm font-bold rounded-full transition-colors"
                                    >
                                        Find a tutor
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="py-6 text-center text-sm text-gray-400">No matches for "{search}"</div>
                        )
                    ) : (
                        <div className="space-y-0.5">
                            {filtered.map((c) => (
                                <button
                                    key={c._id}
                                    onClick={() => { onPick(c); onClose(); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                                >
                                    <Avatar name={c.name} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-navy-950 truncate">{c.name}</p>
                                            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 flex-shrink-0">{c.source}</span>
                                        </div>
                                        {c.subject && (
                                            <p className="text-xs text-gray-500 truncate">{c.subject}</p>
                                        )}
                                    </div>
                                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Avatar({ name = '' }) {
    const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    const colors = ['bg-royal/10 text-royal-dark', 'bg-lime/30 text-navy-950', 'bg-navy-950 text-white'];
    const color = colors[name.charCodeAt(0) % colors.length];
    return (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${color}`}>
            {initials}
        </div>
    );
}
