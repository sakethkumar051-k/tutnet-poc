import { Fragment, useCallback, useEffect, useState } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

/**
 * CustomerSupportConsole — Amazon-style "you called support and they know
 * everything about you" view for TutNet admins. Master-detail layout with
 * search/filter on the left and a 360° profile on the right.
 *
 * Backend: /api/admin/support/*
 *   GET    /users?q=...&role=...&status=...
 *   GET    /users/:id/full
 *   PATCH  /users/:id/active
 *   POST   /users/:id/notes
 *   POST   /users/:id/password-reset
 *   POST   /bookings/:id/cancel
 *
 * Existing: POST /admin/send-alert   (still used for targeted alerts)
 */
export default function CustomerSupportConsole() {
    // ── list state ──
    const [query, setQuery]     = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [role, setRole]       = useState('all');
    const [status, setStatus]   = useState('all');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchError, setSearchError] = useState(null);

    // ── detail state ──
    const [selectedId, setSelectedId] = useState(() => {
        const p = new URLSearchParams(window.location.search);
        return p.get('userId') || null;
    });
    const [detail, setDetail]         = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [detailTab, setDetailTab]   = useState('overview');
    const [detailError, setDetailError] = useState(null);

    // ── action modals ──
    const [modal, setModal] = useState(null); // { kind, payload }
    const [resetLink, setResetLink] = useState(null);

    const { showSuccess, showError } = useToast();

    // Debounce the search query so we don't fire a request on every keystroke
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
        return () => clearTimeout(t);
    }, [query]);

    const search = useCallback(async () => {
        setLoading(true);
        setSearchError(null);
        try {
            const { data } = await api.get('/admin/support/users', {
                params: { q: debouncedQuery || undefined, role, status, limit: 100 }
            });
            setResults(data.users || []);
        } catch (err) {
            const msg = err?.response?.status === 404
                ? 'Backend route /api/admin/support/users not found — restart the server so new routes register.'
                : err?.response?.data?.error?.message
                  || err?.response?.data?.message
                  || err?.message
                  || 'Search failed';
            setSearchError(msg);
            setResults([]);
        } finally { setLoading(false); }
    }, [debouncedQuery, role, status]);

    useEffect(() => { search(); }, [search]);

    // Sync selectedId → URL so profiles are shareable / bookmarkable
    useEffect(() => {
        const url = new URL(window.location.href);
        if (selectedId) url.searchParams.set('userId', selectedId);
        else url.searchParams.delete('userId');
        window.history.replaceState({}, '', url.toString());
    }, [selectedId]);

    const loadDetail = useCallback(async (id) => {
        if (!id) return;
        setLoadingDetail(true);
        setDetailError(null);
        try {
            const { data } = await api.get(`/admin/support/users/${id}/full`);
            setDetail(data);
        } catch (err) {
            const msg = err?.response?.status === 404
                ? 'Backend route not found — restart the server (`cd server && npm run dev`) to load new admin support routes.'
                : err?.response?.data?.error?.message
                  || err?.response?.data?.message
                  || err?.message
                  || 'Failed to load user detail';
            setDetailError(msg);
            showError(msg);
            setDetail(null);
        } finally { setLoadingDetail(false); }
    }, [showError]);

    useEffect(() => {
        if (selectedId) loadDetail(selectedId);
        else setDetail(null);
    }, [selectedId, loadDetail]);

    // ── actions ──
    const sendAlert = async ({ title, message }) => {
        try {
            await api.post('/admin/send-alert', { userId: selectedId, title, message });
            showSuccess('Alert sent');
            setModal(null);
        } catch { showError('Failed to send alert'); }
    };
    const toggleActive = async ({ active, reason }) => {
        try {
            await api.patch(`/admin/support/users/${selectedId}/active`, { active, reason });
            showSuccess(active ? 'User reactivated' : 'User suspended');
            setModal(null);
            loadDetail(selectedId);
            search();
        } catch { showError('Action failed'); }
    };
    const addNote = async ({ note }) => {
        try {
            const { data } = await api.post(`/admin/support/users/${selectedId}/notes`, { note });
            setDetail((d) => d ? { ...d, adminNotes: data.adminNotes, user: { ...d.user, adminNotes: data.adminNotes } } : d);
            showSuccess('Note added');
            setModal(null);
        } catch { showError('Could not add note'); }
    };
    const generateResetLink = async () => {
        try {
            const { data } = await api.post(`/admin/support/users/${selectedId}/password-reset`);
            setResetLink({ link: data.resetLink, expiresAt: data.expiresAt });
            loadDetail(selectedId);
        } catch (err) {
            const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Could not generate link';
            showError(msg);
        }
    };
    const cancelBookingById = async (bookingId, reason) => {
        try {
            await api.post(`/admin/support/bookings/${bookingId}/cancel`, { reason });
            showSuccess('Booking cancelled');
            loadDetail(selectedId);
        } catch { showError('Could not cancel booking'); }
    };
    const issueCredit = async ({ amount, reason }) => {
        try {
            await api.post(`/admin/support/users/${selectedId}/credit`, { amount, reason });
            showSuccess(`₹${amount} credit issued`);
            setModal(null);
            loadDetail(selectedId);
        } catch (err) {
            showError(err?.response?.data?.error?.message || 'Could not issue credit');
        }
    };
    const refundPaymentById = async (paymentId, { amount, reason }) => {
        try {
            const { data } = await api.post(`/admin/support/payments/${paymentId}/refund`, { amount, reason });
            showSuccess(`Refund of ₹${data.refundAmount} processed`);
            loadDetail(selectedId);
        } catch (err) {
            showError(err?.response?.data?.error?.message || 'Refund failed');
        }
    };
    const clearRisk = async () => {
        try {
            await api.post(`/admin/support/tutors/${selectedId}/clear-risk`, {});
            showSuccess('Risk score cleared');
            loadDetail(selectedId);
        } catch { showError('Could not clear risk'); }
    };

    return (
        <div className="h-[calc(100vh-220px)] min-h-[520px] flex gap-4">
            {/* ── Left rail: search + results ─────────────────────────── */}
            <aside className="w-[360px] flex-shrink-0 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
                <div className="p-3 border-b border-gray-100 space-y-2">
                    <div className="relative">
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Name, email, or phone…"
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal/40" />
                        <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
                        </svg>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                        {['all', 'student', 'tutor', 'admin'].map((r) => (
                            <button key={r} onClick={() => setRole(r)}
                                className={`px-2 py-1 text-[11px] font-semibold rounded-md capitalize border transition-colors ${
                                    role === r ? 'bg-navy-950 border-navy-950 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-navy-900/30'
                                }`}>
                                {r === 'all' ? 'All' : r}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-1">
                        {[
                            { v: 'all',       label: 'Any status' },
                            { v: 'active',    label: 'Active' },
                            { v: 'suspended', label: 'Suspended' }
                        ].map((s) => (
                            <button key={s.v} onClick={() => setStatus(s.v)}
                                className={`px-2 py-1 text-[11px] font-semibold rounded-md border transition-colors ${
                                    status === s.v ? 'bg-royal/10 border-royal/40 text-royal-dark' : 'bg-white border-gray-200 text-gray-500 hover:border-royal/30'
                                }`}>
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {searchError ? (
                        <div className="m-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                            <p className="font-bold mb-1">Couldn't load users</p>
                            <p>{searchError}</p>
                        </div>
                    ) : loading ? (
                        <div className="py-10 text-center text-xs text-gray-400">Searching…</div>
                    ) : results.length === 0 ? (
                        <div className="py-10 text-center text-xs text-gray-400">
                            {query || role !== 'all' || status !== 'all'
                                ? 'No matches for current filters.'
                                : 'No users in the database yet.'}
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {results.map((u) => (
                                <li key={u._id}>
                                    <button
                                        onClick={() => setSelectedId(u._id)}
                                        className={`w-full text-left px-3 py-2.5 transition-colors ${
                                            selectedId === u._id ? 'bg-royal/5' : 'hover:bg-gray-50'
                                        }`}>
                                        <div className="flex items-start gap-2.5">
                                            <Avatar user={u} size={32} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-sm font-semibold text-navy-950 truncate">{u.name}</p>
                                                    {!u.isActive && <span className="px-1 py-0 text-[9px] font-bold rounded bg-rose-100 text-rose-700 uppercase">SUSPENDED</span>}
                                                </div>
                                                <p className="text-[11px] text-gray-500 truncate">{u.email}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400">
                                                    <span className="capitalize">{u.role}</span>
                                                    {u.tutorProfile?.tier && <><span>·</span><TierPill tier={u.tutorProfile.tier} size="xs" /></>}
                                                    {u.tutorProfile?.averageRating > 0 && <><span>·</span><span>{u.tutorProfile.averageRating.toFixed(1)}★</span></>}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="px-3 py-2 border-t border-gray-100 text-[10px] text-gray-400 flex justify-between">
                    <span>{results.length} results</span>
                    <button onClick={search} className="text-royal hover:text-royal-dark font-semibold">Refresh</button>
                </div>
            </aside>

            {/* ── Right panel: 360° detail ────────────────────────────── */}
            <section className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                {!selectedId ? (
                    <EmptyDetail />
                ) : loadingDetail && !detail ? (
                    <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Loading profile…</div>
                ) : !detail ? (
                    <div className="flex-1 flex items-center justify-center p-10">
                        <div className="max-w-md text-center">
                            <p className="text-sm font-semibold text-rose-700">Could not load profile</p>
                            {detailError && <p className="text-xs text-rose-600 mt-1">{detailError}</p>}
                        </div>
                    </div>
                ) : (
                    <>
                        <DetailHeader
                            detail={detail}
                            onAlert={() => setModal({ kind: 'alert' })}
                            onSuspend={() => setModal({ kind: 'suspend', payload: !detail.user.isActive })}
                            onReset={() => setModal({ kind: 'confirm-reset' })}
                            onAddNote={() => setModal({ kind: 'note' })}
                            onIssueCredit={() => setModal({ kind: 'credit' })}
                        />

                        <DetailTabs value={detailTab} onChange={setDetailTab} detail={detail} />

                        <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
                            {detailTab === 'overview'    && <OverviewTab detail={detail} />}
                            {detailTab === 'bookings'    && <BookingsTab detail={detail} onCancel={cancelBookingById} />}
                            {detailTab === 'payments'    && <PaymentsTab detail={detail} onRefund={refundPaymentById} />}
                            {detailTab === 'reviews'     && <ReviewsTab detail={detail} />}
                            {detailTab === 'attendance'  && <AttendanceTab detail={detail} />}
                            {detailTab === 'messages'    && <MessagesTab detail={detail} />}
                            {detailTab === 'escalations' && <EscalationsTab detail={detail} />}
                            {detailTab === 'tutor' && detail.tutorProfile && <TutorTab detail={detail} onClearRisk={clearRisk} />}
                            {detailTab === 'notes'       && <NotesTab notes={detail.adminNotes || []} onAdd={() => setModal({ kind: 'note' })} />}
                        </div>
                    </>
                )}
            </section>

            {modal?.kind === 'alert'         && <AlertModal onClose={() => setModal(null)} onSend={sendAlert} user={detail?.user} />}
            {modal?.kind === 'suspend'       && <SuspendModal onClose={() => setModal(null)} onConfirm={toggleActive} active={modal.payload} user={detail?.user} />}
            {modal?.kind === 'note'          && <NoteModal onClose={() => setModal(null)} onSave={addNote} />}
            {modal?.kind === 'confirm-reset' && <ResetConfirmModal onClose={() => setModal(null)} onConfirm={() => { setModal(null); generateResetLink(); }} user={detail?.user} />}
            {modal?.kind === 'credit'        && <CreditModal onClose={() => setModal(null)} onIssue={issueCredit} user={detail?.user} creditBalance={detail?.summary?.incentives?.creditBalance || 0} />}
            {resetLink && <ResetLinkModal link={resetLink.link} expiresAt={resetLink.expiresAt} onClose={() => setResetLink(null)} />}
        </div>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyDetail() {
    return (
        <div className="flex-1 flex items-center justify-center p-10">
            <div className="text-center max-w-sm">
                <div className="w-16 h-16 bg-royal/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-royal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>
                <h3 className="text-base font-bold text-navy-950">Pick a customer to start</h3>
                <p className="text-sm text-gray-500 mt-1">
                    Search by name, email, or phone. You'll see every booking, payment, review, message, and note in one place.
                </p>
            </div>
        </div>
    );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function DetailHeader({ detail, onAlert, onSuspend, onReset, onAddNote, onIssueCredit }) {
    const u = detail.user;
    const tp = detail.tutorProfile;
    return (
        <div className="border-b border-gray-200 bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    <Avatar user={u} size={56} />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl font-extrabold text-navy-950 truncate">{u.name}</h2>
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-bold uppercase tracking-wider">{u.role}</span>
                            {!u.isActive && <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold uppercase">Suspended</span>}
                            {u.isActive && <span className="px-2 py-0.5 rounded-md bg-lime/30 text-navy-950 text-[10px] font-bold uppercase">Active</span>}
                            {tp?.tier && <TierPill tier={tp.tier} />}
                            {tp?.approvalStatus && <StatusBadge status={tp.approvalStatus} />}
                            {tp?.tutorCode && <span className="px-2 py-0.5 rounded-md bg-royal/5 text-royal-dark text-[10px] font-mono border border-royal/20">{tp.tutorCode}</span>}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 truncate">{u.email}</p>
                        <div className="flex items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500 flex-wrap">
                            {u.phone && <span>{u.phone}</span>}
                            <span className="capitalize">Auth: {u.authProvider}</span>
                            {u.location?.area && <span>{[u.location.area, u.location.city].filter(Boolean).join(', ')}</span>}
                            <span>Joined {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            {u.lastSeenAt && <span>Last seen {relativeTime(u.lastSeenAt)}</span>}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
                    <ActionBtn onClick={onAlert}   label="Send Alert"  icon="alert" />
                    {u.role === 'student' && <ActionBtn onClick={onIssueCredit} label="Issue Credit" icon="credit" />}
                    <ActionBtn onClick={onReset}   label="Reset Pwd"   icon="key" disabled={u.authProvider !== 'local'} />
                    <ActionBtn onClick={onAddNote} label="Add Note"    icon="note" />
                    <ActionBtn onClick={onSuspend} label={u.isActive ? 'Suspend' : 'Reactivate'} icon="suspend" danger={u.isActive} primary={!u.isActive} />
                </div>
            </div>
        </div>
    );
}

function ActionBtn({ onClick, label, icon, danger, primary, disabled }) {
    const cls = disabled
        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
        : danger
            ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
            : primary
                ? 'bg-lime border-lime text-navy-950 hover:bg-lime-light'
                : 'bg-white border-gray-200 text-gray-700 hover:border-royal/30 hover:bg-royal/5';
    const iconSvg = {
        alert:   <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0" />,
        key:     <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a4 4 0 11-8 0 4 4 0 018 0zM3 21l4-4m0 0l4 4m-4-4V10" />,
        note:    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.4-9.6a2 2 0 112.8 2.8L11.8 15.4 8 16l.6-3.8 9-8.8z" />,
        suspend: <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />,
        credit:  <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a4 4 0 10-8 0v2M5 9h14l-1 11H6L5 9z" />
    }[icon];
    return (
        <button onClick={onClick} disabled={disabled}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${cls}`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>{iconSvg}</svg>
            {label}
        </button>
    );
}

// ─── Tab strip ────────────────────────────────────────────────────────────────
function DetailTabs({ value, onChange, detail }) {
    const tp = detail.tutorProfile;
    const s = detail.summary || {};
    const tabs = [
        { id: 'overview',   label: 'Overview' },
        { id: 'bookings',   label: 'Bookings',      count: s.bookings?.total },
        { id: 'payments',   label: 'Payments & Payouts', count: (detail.payments?.length || 0) + (detail.payouts?.length || 0) },
        { id: 'reviews',    label: 'Reviews',       count: (detail.reviewsGiven?.length || 0) + (detail.reviewsReceived?.length || 0) },
        { id: 'attendance', label: 'Attendance',    count: s.attendance?.total },
        { id: 'messages',   label: 'Messages',      count: detail.messageStats?.total, danger: detail.messageStats?.flagged > 0 },
        { id: 'escalations', label: 'Escalations & Reports', count: (detail.escalations?.length || 0) + (detail.offPlatformReports?.length || 0) }
    ];
    if (tp) tabs.push({ id: 'tutor', label: 'Tutor Profile' });
    tabs.push({ id: 'notes', label: 'Admin Notes', count: detail.adminNotes?.length });

    return (
        <div className="border-b border-gray-200 bg-white px-2 overflow-x-auto">
            <div className="flex gap-0">
                {tabs.map((t) => (
                    <button key={t.id} onClick={() => onChange(t.id)}
                        className={`px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
                            value === t.id
                                ? 'border-royal text-royal-dark'
                                : 'border-transparent text-gray-500 hover:text-navy-950'
                        }`}>
                        {t.label}
                        {typeof t.count === 'number' && t.count > 0 && (
                            <span className={`px-1.5 py-0 rounded-full text-[10px] font-bold ${
                                t.danger ? 'bg-rose-100 text-rose-700' : value === t.id ? 'bg-royal/10 text-royal-dark' : 'bg-gray-100 text-gray-500'
                            }`}>{t.count}</span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────
function OverviewTab({ detail }) {
    const u = detail.user;
    const s = detail.summary;
    const statCards = [
        { label: 'Bookings',           value: s.bookings?.total || 0 },
        { label: 'Completed',          value: s.bookings?.completed || 0 },
        { label: 'Total Paid',         value: `₹${(s.payments?.totalPaid || 0).toLocaleString('en-IN')}` },
        { label: 'Refunded',           value: `₹${(s.payments?.totalRefunded || 0).toLocaleString('en-IN')}` },
        { label: 'Credit Balance',     value: `₹${(s.incentives?.creditBalance || 0).toLocaleString('en-IN')}`, showIf: u.role === 'student', highlight: (s.incentives?.creditBalance || 0) > 0 },
        { label: 'Credits Applied',    value: `₹${(s.incentives?.creditApplied || 0).toLocaleString('en-IN')}`, showIf: u.role === 'student' },
        { label: 'Payouts Paid',       value: `₹${(s.payouts?.netPaid || 0).toLocaleString('en-IN')}`, showIf: u.role === 'tutor' },
        { label: 'Payouts Scheduled',  value: `₹${(s.payouts?.scheduledTotal || 0).toLocaleString('en-IN')}`, showIf: u.role === 'tutor' },
        { label: 'Incentives Accrued', value: `₹${(s.incentives?.accrued || 0).toLocaleString('en-IN')}` },
        { label: 'Avg Rating',         value: s.avgReceivedRating ? `${s.avgReceivedRating}★` : '—', showIf: u.role === 'tutor' },
        { label: 'Attendance Rate',    value: `${s.attendance?.rate || 0}%` },
        { label: 'Active Tutors',      value: s.currentTutorCount || 0, showIf: u.role === 'student' },
        { label: 'Favorites',          value: s.favoriteCount || 0, showIf: u.role === 'student' },
        { label: 'Escalations',        value: (s.escalationsFiled || 0) + (s.escalationsAgainst || 0) }
    ].filter((c) => c.showIf === undefined || c.showIf);

    return (
        <div className="space-y-5">
            {/* Summary stat grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {statCards.map((c) => (
                    <div key={c.label} className={`border rounded-lg p-3 ${c.highlight ? 'bg-lime/10 border-lime/40' : 'bg-white border-gray-200'}`}>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{c.label}</p>
                        <p className={`text-lg font-bold mt-0.5 ${c.highlight ? 'text-lime-dark' : 'text-navy-950'}`}>{c.value}</p>
                    </div>
                ))}
            </div>

            {/* Contact card */}
            <Card title="Contact & Account">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <KV k="Email"        v={u.email} />
                    <KV k="Phone"        v={u.phone || '—'} />
                    <KV k="Role"         v={<span className="capitalize">{u.role}</span>} />
                    <KV k="Auth"         v={<span className="capitalize">{u.authProvider}</span>} />
                    <KV k="Class/Grade"  v={u.classGrade || '—'} />
                    <KV k="Timezone"     v={u.timezone || 'Asia/Kolkata'} />
                    <KV k="Location"     v={[u.location?.area, u.location?.city, u.location?.pincode].filter(Boolean).join(', ') || '—'} />
                    <KV k="Device tokens" v={`${u.deviceTokens?.length || 0} registered`} />
                    <KV k="Parent account" v={u.parentUserId ? 'Linked' : '—'} />
                    <KV k="Google ID"    v={u.googleId || '—'} mono />
                    <KV k="Reminder channels" v={(u.preferences?.reminderChannels || []).join(', ') || 'email'} />
                    <KV k="Lead times"   v={(u.preferences?.reminderLeadTimes || []).join(', ') || '—'} />
                    <KV k="Created"      v={fmtDT(u.createdAt)} />
                    <KV k="Last seen"    v={fmtDT(u.lastSeenAt) || 'never'} />
                    {u.suspendedAt && <KV k="Suspended at"   v={fmtDT(u.suspendedAt)} />}
                    {u.suspensionReason && <KV k="Suspension reason" v={u.suspensionReason} />}
                </dl>
            </Card>

            {/* Emergency contact */}
            {(u.emergencyContact?.name || u.emergencyContact?.phone) && (
                <Card title="Emergency contact">
                    <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                        <KV k="Name"         v={u.emergencyContact.name || '—'} />
                        <KV k="Relationship" v={u.emergencyContact.relationship || '—'} />
                        <KV k="Phone"        v={u.emergencyContact.phone || '—'} />
                    </dl>
                </Card>
            )}

            {/* Last notifications */}
            {detail.recentNotifications?.length > 0 && (
                <Card title="Recent notifications to this user">
                    <ul className="divide-y divide-gray-100">
                        {detail.recentNotifications.slice(0, 8).map((n) => (
                            <li key={n._id} className="py-2 flex items-start gap-3">
                                <span className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${n.isRead ? 'bg-gray-300' : 'bg-royal'}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-navy-950 truncate">{n.title}</p>
                                    <p className="text-xs text-gray-500 truncate">{n.message}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{fmtDT(n.createdAt)} · {n.type}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
        </div>
    );
}

// ─── Bookings tab ─────────────────────────────────────────────────────────────
function BookingsTab({ detail, onCancel }) {
    const [filter, setFilter] = useState('all');
    const [expanded, setExpanded] = useState(null);
    const [cancelTarget, setCancelTarget] = useState(null);

    const bookings = detail.bookings || [];
    const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

    return (
        <div className="space-y-4">
            <FilterChips value={filter} onChange={setFilter}
                options={['all', 'pending', 'approved', 'completed', 'cancelled', 'rejected']}
                counts={Object.fromEntries([['all', bookings.length], ...Object.entries(detail.summary?.bookings?.byStatus || {})])} />

            {filtered.length === 0 ? (
                <EmptyBlock text="No bookings in this filter." />
            ) : (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {['Date', 'Student', 'Tutor', 'Subject', 'Category', 'Plan', 'Status', 'Paid', 'Actions'].map((h) => (
                                    <th key={h} className="py-2.5 px-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map((b) => (
                                <Fragment key={b._id}>
                                    <tr className="hover:bg-gray-50">
                                        <td className="py-2.5 px-3 text-xs text-gray-600 whitespace-nowrap">
                                            {b.sessionDate ? fmtDT(b.sessionDate) : fmtDT(b.createdAt)}
                                        </td>
                                        <td className="py-2.5 px-3 text-xs">{b.studentId?.name || '—'}</td>
                                        <td className="py-2.5 px-3 text-xs">{b.tutorId?.name || '—'}</td>
                                        <td className="py-2.5 px-3 text-xs">{b.subject || '—'}</td>
                                        <td className="py-2.5 px-3 text-xs"><Chip>{b.bookingCategory}</Chip></td>
                                        <td className="py-2.5 px-3 text-xs">{b.plan ? <Chip tone="royal">{b.plan}</Chip> : '—'}</td>
                                        <td className="py-2.5 px-3"><StatusBadge status={b.status} /></td>
                                        <td className="py-2.5 px-3 text-xs">{b.isPaid ? <Chip tone="lime">paid</Chip> : <span className="text-gray-400">—</span>}</td>
                                        <td className="py-2.5 px-3">
                                            <div className="flex gap-1">
                                                <button onClick={() => setExpanded(expanded === b._id ? null : b._id)}
                                                    className="px-2 py-0.5 text-[10px] font-semibold border border-gray-200 rounded hover:bg-gray-50">
                                                    {expanded === b._id ? 'Less' : 'More'}
                                                </button>
                                                {['pending', 'approved'].includes(b.status) && (
                                                    <button onClick={() => setCancelTarget(b)}
                                                        className="px-2 py-0.5 text-[10px] font-semibold border border-rose-200 text-rose-700 rounded hover:bg-rose-50">
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    {expanded === b._id && (
                                        <tr key={`${b._id}-x`} className="bg-gray-50/60">
                                            <td colSpan={9} className="px-3 py-3">
                                                <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-1 text-xs">
                                                    <KV k="Created"          v={fmtDT(b.createdAt)} />
                                                    <KV k="Preferred"        v={b.preferredSchedule || '—'} />
                                                    <KV k="Trial expires"    v={b.trialExpiresAt ? fmtDT(b.trialExpiresAt) : '—'} />
                                                    <KV k="Trial outcome"    v={b.trialOutcome || '—'} />
                                                    <KV k="Locked rate"      v={b.lockedHourlyRate ? `₹${b.lockedHourlyRate}/hr` : '—'} />
                                                    <KV k="Commission"       v={b.commissionAmount ? `₹${b.commissionAmount} @ ${b.commissionRate}%` : '—'} />
                                                    <KV k="Session allowance" v={b.sessionAllowance != null ? `${b.sessionsConsumed || 0}/${b.sessionAllowance}` : '—'} />
                                                    <KV k="Period"           v={b.planPeriodStart ? `${fmtDate(b.planPeriodStart)} → ${fmtDate(b.planPeriodEnd)}` : '—'} />
                                                    <KV k="Cancelled by"     v={b.cancelledBy || '—'} />
                                                    <KV k="Cancellation"     v={b.cancellationReason || '—'} />
                                                    <KV k="Learning goals"   v={b.learningGoals || '—'} />
                                                    <KV k="Focus areas"      v={b.focusAreas || '—'} />
                                                    <KV k="Additional notes" v={b.additionalNotes || '—'} />
                                                    <KV k="Booking id"       v={b._id} mono />
                                                </dl>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {cancelTarget && (
                <ConfirmTextModal
                    title={`Cancel booking`}
                    description={`${cancelTarget.studentId?.name || 'student'} → ${cancelTarget.tutorId?.name || 'tutor'} · ${cancelTarget.subject}`}
                    placeholder="Reason shared with both parties (required)"
                    confirmLabel="Cancel Booking"
                    dangerous
                    onClose={() => setCancelTarget(null)}
                    onConfirm={(reason) => { onCancel(cancelTarget._id, reason); setCancelTarget(null); }}
                />
            )}
        </div>
    );
}

// ─── Payments & Payouts tab ──────────────────────────────────────────────────
function PaymentsTab({ detail, onRefund }) {
    const pm = detail.payments || [];
    const po = detail.payouts || [];
    const inc = detail.incentives || [];
    const [refundTarget, setRefundTarget] = useState(null);
    return (
        <div className="space-y-5">
            <Card title={`Payments (${pm.length})`} subtitle="Every razorpay order & refund tied to this user">
                {pm.length === 0 ? <EmptyBlock text="No payments yet." /> : (
                    <DataTable
                        columns={['Date', 'Booking', 'Amount', 'Status', 'Method', 'Refund', 'IDs', 'Action']}
                        rows={pm.map((p) => [
                            fmtDT(p.createdAt),
                            p.bookingId?.subject || '—',
                            <span key="amt" className="font-semibold">₹{(p.amount || 0).toLocaleString('en-IN')}</span>,
                            <StatusBadge key="st" status={p.status} />,
                            p.paymentMethod || 'online',
                            p.refundAmount ? `₹${p.refundAmount} · ${p.refundStatus}` : '—',
                            <span key="ids" className="font-mono text-[10px] text-gray-500">
                                {p.razorpayOrderId || '—'}<br />{p.razorpayPaymentId || ''}
                            </span>,
                            (p.status === 'completed' || p.status === 'partially_refunded') && (p.amount > (p.refundAmount || 0))
                                ? <button key="r" onClick={() => setRefundTarget(p)}
                                    className="px-2 py-0.5 text-[10px] font-semibold border border-rose-200 text-rose-700 rounded hover:bg-rose-50">
                                    Refund
                                  </button>
                                : <span key="r" className="text-gray-300">—</span>
                        ])} />
                )}
            </Card>

            {refundTarget && (
                <RefundModal
                    payment={refundTarget}
                    onClose={() => setRefundTarget(null)}
                    onConfirm={(body) => { onRefund(refundTarget._id, body); setRefundTarget(null); }} />
            )}

            {detail.user.role === 'tutor' && (
                <Card title={`Payouts (${po.length})`} subtitle="Weekly tutor payout ledger">
                    {po.length === 0 ? <EmptyBlock text="No payouts yet." /> : (
                        <DataTable
                            columns={['Period', 'Gross', 'Commission', 'Incentives', 'Reserve', 'Net', 'Status', 'Mode']}
                            rows={po.map((p) => [
                                p.periodLabel || fmtDate(p.periodStart),
                                `₹${(p.grossEarnings || 0).toLocaleString('en-IN')}`,
                                `₹${(p.commissionAmount || 0).toLocaleString('en-IN')} (${p.commissionRate}%)`,
                                `₹${(p.incentiveBonuses || 0).toLocaleString('en-IN')}`,
                                `₹${(p.reserveHeld || 0).toLocaleString('en-IN')}`,
                                <span key="net" className="font-bold text-navy-950">₹{(p.netPayable || 0).toLocaleString('en-IN')}</span>,
                                <StatusBadge key="st" status={p.status} />,
                                p.mode || '—'
                            ])} />
                    )}
                </Card>
            )}

            <Card title={`Incentives (${inc.length})`} subtitle="Bonuses, credits, retention cliffs">
                {inc.length === 0 ? <EmptyBlock text="No incentives yet." /> : (
                    <DataTable
                        columns={['Date', 'Kind', 'Amount', 'Settlement', 'Status', 'Reason']}
                        rows={inc.map((i) => [
                            fmtDT(i.accruedAt || i.createdAt),
                            <Chip key="k">{(i.kind || '').replace(/_/g, ' ')}</Chip>,
                            <span key="a" className="font-semibold">₹{(i.amount || 0).toLocaleString('en-IN')}</span>,
                            i.settlementType || '—',
                            <StatusBadge key="s" status={i.status} />,
                            i.trigger?.reason || i.notes || '—'
                        ])} />
                )}
            </Card>
        </div>
    );
}

// ─── Reviews tab ─────────────────────────────────────────────────────────────
function ReviewsTab({ detail }) {
    const given = detail.reviewsGiven || [];
    const received = detail.reviewsReceived || [];
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card title={`Reviews received (${received.length})`} subtitle={detail.summary?.avgReceivedRating ? `Avg ${detail.summary.avgReceivedRating}★` : 'No ratings yet'}>
                {received.length === 0 ? <EmptyBlock text="No reviews received." /> : (
                    <ul className="space-y-3">
                        {received.map((r) => (
                            <li key={r._id} className="border border-gray-100 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-navy-950">{r.studentId?.name || 'Student'}</span>
                                    <span className="text-xs font-bold text-lime-dark">{r.rating}★</span>
                                </div>
                                {r.comment && <p className="text-xs text-gray-600">{r.comment}</p>}
                                <p className="text-[10px] text-gray-400 mt-1">{fmtDT(r.createdAt)}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            <Card title={`Reviews given (${given.length})`}>
                {given.length === 0 ? <EmptyBlock text="Nothing written yet." /> : (
                    <ul className="space-y-3">
                        {given.map((r) => (
                            <li key={r._id} className="border border-gray-100 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-navy-950">to {r.tutorId?.name || 'tutor'}</span>
                                    <span className="text-xs font-bold text-lime-dark">{r.rating}★</span>
                                </div>
                                {r.comment && <p className="text-xs text-gray-600">{r.comment}</p>}
                                <p className="text-[10px] text-gray-400 mt-1">{fmtDT(r.createdAt)}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
}

// ─── Attendance tab ──────────────────────────────────────────────────────────
function AttendanceTab({ detail }) {
    const s = detail.summary?.attendance || {};
    const records = detail.attendance || [];
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MiniCard label="Total sessions" value={s.total || 0} />
                <MiniCard label="Present"        value={s.byStatus?.present || 0} />
                <MiniCard label="Absent"         value={s.byStatus?.absent || 0} danger={(s.byStatus?.absent || 0) > 0} />
                <MiniCard label="Disputed"       value={s.disputed || 0} danger={(s.disputed || 0) > 0} />
            </div>

            {records.length === 0 ? <EmptyBlock text="No attendance records." /> : (
                <DataTable
                    columns={['Date', 'Student', 'Tutor', 'Subject', 'Status', 'Parent Verdict', 'Note', 'Marked By']}
                    rows={records.map((r) => [
                        fmtDT(r.sessionDate || r.createdAt),
                        r.studentId?.name || '—',
                        r.tutorId?.name || '—',
                        r.bookingId?.subject || '—',
                        <StatusBadge key="s" status={r.status} />,
                        <StatusBadge key="pv" status={r.parentVerificationStatus} />,
                        r.notes || r.parentVerificationNote || '—',
                        r.requestedAfterWindow ? 'late-window' : 'tutor'
                    ])} />
            )}
        </div>
    );
}

// ─── Messages tab ────────────────────────────────────────────────────────────
function MessagesTab({ detail }) {
    const s = detail.messageStats || {};
    const flagged = detail.flaggedMessages || [];
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MiniCard label="Total messages" value={s.total || 0} />
                <MiniCard label="Sent"           value={s.sent || 0} />
                <MiniCard label="Received"       value={s.received || 0} />
                <MiniCard label="Flagged"        value={s.flagged || 0} danger={(s.flagged || 0) > 0} />
            </div>
            {s.lastAt && <p className="text-xs text-gray-500">Last message: {fmtDT(s.lastAt)}</p>}

            <Card title={`Flagged messages (${flagged.length})`} subtitle="Auto-detected off-platform bypass attempts">
                {flagged.length === 0 ? <EmptyBlock text="Nothing flagged." /> : (
                    <ul className="space-y-3">
                        {flagged.map((m) => (
                            <li key={m._id} className="border border-rose-100 rounded-lg p-3 bg-rose-50/40">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-navy-950">
                                        {m.senderId?.name || '—'} → {m.recipientId?.name || '—'}
                                    </span>
                                    <span className="text-[10px] text-gray-400">{fmtDT(m.createdAt)}</span>
                                </div>
                                <p className="text-xs text-gray-700 whitespace-pre-line">{m.text}</p>
                                {m.moderation?.reasons?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {m.moderation.reasons.map((r, i) => (
                                            <span key={i} className="px-1.5 py-0 rounded text-[10px] font-bold bg-rose-100 text-rose-700 uppercase">{r}</span>
                                        ))}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
}

// ─── Escalations & off-platform reports ──────────────────────────────────────
function EscalationsTab({ detail }) {
    const esc = detail.escalations || [];
    const rep = detail.offPlatformReports || [];
    return (
        <div className="space-y-5">
            <Card title={`Escalations (${esc.length})`} subtitle="Disputes raised by or about this user">
                {esc.length === 0 ? <EmptyBlock text="No escalations." /> : (
                    <ul className="space-y-3">
                        {esc.map((e) => (
                            <li key={e._id} className="border border-gray-100 rounded-lg p-3">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="text-xs font-semibold text-navy-950 capitalize">{e.type?.replace(/_/g, ' ')}</span>
                                    <StatusBadge status={e.status} />
                                    <span className="text-[10px] text-gray-400">
                                        {e.raisedBy?.name} ({e.raisedByRole}) → {e.againstUser?.name || 'platform'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-700">{e.description}</p>
                                {e.adminNotes && <p className="text-xs text-royal-dark mt-1 italic">Admin: {e.adminNotes}</p>}
                                <p className="text-[10px] text-gray-400 mt-1">{fmtDT(e.createdAt)}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            <Card title={`Off-platform reports (${rep.length})`} subtitle="Parents reporting tutor bypass attempts">
                {rep.length === 0 ? <EmptyBlock text="No reports." /> : (
                    <DataTable
                        columns={['Date', 'Filed by', 'Tutor', 'Status', 'Description']}
                        rows={rep.map((r) => [
                            fmtDT(r.createdAt),
                            r.studentId?.name || '—',
                            r.tutorId?.name || '—',
                            <StatusBadge key="s" status={r.status} />,
                            <span key="d" className="text-xs text-gray-700">{r.description}</span>
                        ])} />
                )}
            </Card>
        </div>
    );
}

// ─── Tutor profile tab ───────────────────────────────────────────────────────
function TutorTab({ detail, onClearRisk }) {
    const tp = detail.tutorProfile;
    const [confirming, setConfirming] = useState(false);
    if (!tp) return null;
    const hasRisk = (tp.riskScore || 0) > 0 || (tp.flaggedEventsCount || 0) > 0;
    return (
        <div className="space-y-5">
            {hasRisk && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-bold text-rose-800">Risk signals on record</p>
                        <p className="text-xs text-rose-700">Risk score {tp.riskScore} · {tp.flaggedEventsCount} flagged events</p>
                    </div>
                    {confirming ? (
                        <div className="flex gap-1.5">
                            <button onClick={() => { onClearRisk(); setConfirming(false); }}
                                className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg">Yes, clear</button>
                            <button onClick={() => setConfirming(false)}
                                className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-700 rounded-lg">Cancel</button>
                        </div>
                    ) : (
                        <button onClick={() => setConfirming(true)}
                            className="px-3 py-1.5 text-xs font-semibold bg-white border border-rose-200 text-rose-700 rounded-lg hover:bg-rose-100">
                            Clear risk score
                        </button>
                    )}
                </div>
            )}

            <Card title="Profile">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <KV k="Tutor code"        v={tp.tutorCode || '—'} mono />
                    <KV k="Tier"              v={<TierPill tier={tp.tier} />} />
                    <KV k="Commission rate"   v={`${tp.currentCommissionRate || 0}%`} />
                    <KV k="Approval status"   v={<StatusBadge status={tp.approvalStatus} />} />
                    <KV k="Verification"      v={tp.verificationLevel || 'none'} />
                    <KV k="Hourly rate"       v={`₹${tp.hourlyRate || 0}/hr`} />
                    <KV k="Mode"              v={tp.mode || '—'} />
                    <KV k="Experience"        v={`${tp.experienceYears || 0} yrs`} />
                    <KV k="Travel radius"     v={`${tp.travelRadius || 0} km`} />
                    <KV k="Notice period"     v={`${tp.noticePeriodHours || 0} hrs`} />
                    <KV k="Max sessions/day"  v={tp.maxSessionsPerDay || '—'} />
                    <KV k="Completion score"  v={`${tp.profileCompletionScore || 0}%`} />
                    <KV k="Total sessions"    v={tp.totalSessions || 0} />
                    <KV k="Avg rating"        v={tp.averageRating ? `${tp.averageRating.toFixed(2)} ★ (${tp.totalReviews} reviews)` : 'no ratings'} />
                    <KV k="Search appearances (wk)" v={tp.searchAppearancesThisWeek || 0} />
                    <KV k="Risk score"        v={<span className={tp.riskScore >= 25 ? 'text-rose-700 font-bold' : ''}>{tp.riskScore || 0}</span>} />
                    <KV k="Flagged events"    v={tp.flaggedEventsCount || 0} />
                    <KV k="Subjects"          v={(tp.subjects || []).join(', ') || '—'} />
                    <KV k="Classes"           v={(tp.classes || []).join(', ') || '—'} />
                    <KV k="Languages"         v={(tp.languages || []).join(', ') || '—'} />
                    <KV k="Qualifications"    v={(tp.qualifications || []).join(', ') || '—'} />
                    <KV k="Education"         v={tp.education?.degree ? `${tp.education.degree} · ${tp.education.institution || ''}` : '—'} />
                </dl>
                {tp.bio && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Bio</p>
                        <p className="text-xs text-gray-700 whitespace-pre-line">{tp.bio}</p>
                    </div>
                )}
            </Card>

            <Card title="Earnings & deposit">
                <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                    <KV k="Lifetime gross"       v={`₹${(tp.lifetimeGrossEarnings || 0).toLocaleString('en-IN')}`} />
                    <KV k="Commission paid"      v={`₹${(tp.lifetimeCommissionPaid || 0).toLocaleString('en-IN')}`} />
                    <KV k="Incentives paid"      v={`₹${(tp.lifetimeIncentivesPaid || 0).toLocaleString('en-IN')}`} />
                    <KV k="Security deposit"     v={tp.securityDeposit?.amountHeld != null ? `₹${tp.securityDeposit.amountHeld} · ${tp.securityDeposit.status}` : '—'} />
                    {tp.securityDeposit?.forfeitReason && <KV k="Forfeit reason" v={tp.securityDeposit.forfeitReason} />}
                </dl>
            </Card>

            {tp.tierHistory?.length > 0 && (
                <Card title="Tier history">
                    <ul className="space-y-1.5">
                        {tp.tierHistory.map((h, i) => (
                            <li key={i} className="text-xs flex items-center gap-3">
                                <TierPill tier={h.tier} size="xs" />
                                <span className="text-gray-500">{h.commissionRate}%</span>
                                <span className="text-gray-400">{fmtDT(h.reachedAt)}</span>
                                {h.reason && <span className="text-gray-500 italic">· {h.reason}</span>}
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            {tp.approvalHistory?.length > 0 && (
                <Card title="Approval history">
                    <ul className="space-y-2">
                        {[...tp.approvalHistory].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map((h, i) => (
                            <li key={i} className="text-xs flex items-start gap-3">
                                <Chip tone={h.action === 'approved' ? 'lime' : h.action === 'rejected' ? 'rose' : 'royal'}>{h.action}</Chip>
                                <div className="flex-1">
                                    <span className="text-gray-400">{fmtDT(h.timestamp)}</span>
                                    {h.adminName && <span className="text-gray-500"> · by {h.adminName}</span>}
                                    {h.note && <p className="text-gray-600 italic mt-0.5">"{h.note}"</p>}
                                </div>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
        </div>
    );
}

// ─── Admin notes tab ─────────────────────────────────────────────────────────
function NotesTab({ notes, onAdd }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Internal CS notes — not visible to the user.</p>
                <button onClick={onAdd} className="px-3 py-1.5 text-xs font-semibold bg-royal hover:bg-royal-dark text-white rounded-lg">
                    + Add note
                </button>
            </div>
            {notes.length === 0 ? <EmptyBlock text="No notes yet." /> : (
                <ol className="relative border-l-2 border-royal/20 ml-2 space-y-4 py-2">
                    {[...notes].sort((a, b) => new Date(b.at) - new Date(a.at)).map((n, i) => (
                        <li key={i} className="ml-4">
                            <div className="absolute -left-[7px] mt-1 w-3 h-3 rounded-full bg-royal border-2 border-white" />
                            <p className="text-xs text-gray-400 mb-0.5">
                                {fmtDT(n.at)}{n.adminName && ` · ${n.adminName}`}
                            </p>
                            <p className="text-sm text-navy-950 whitespace-pre-line">{n.note}</p>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared UI helpers
// ═══════════════════════════════════════════════════════════════════════════

function Card({ title, subtitle, children }) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="mb-3">
                <h4 className="text-sm font-bold text-navy-950">{title}</h4>
                {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            {children}
        </div>
    );
}

function KV({ k, v, mono }) {
    return (
        <div className="flex gap-2 min-w-0">
            <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-widest w-[120px] flex-shrink-0 pt-0.5">{k}</dt>
            <dd className={`text-xs text-gray-800 min-w-0 flex-1 break-words ${mono ? 'font-mono text-[11px]' : ''}`}>{v}</dd>
        </div>
    );
}

function MiniCard({ label, value, danger }) {
    return (
        <div className={`rounded-lg p-3 border ${danger ? 'bg-rose-50 border-rose-200' : 'bg-white border-gray-200'}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
            <p className={`text-lg font-bold mt-0.5 ${danger ? 'text-rose-700' : 'text-navy-950'}`}>{value}</p>
        </div>
    );
}

function Chip({ children, tone = 'gray' }) {
    const cls = {
        gray:  'bg-gray-100 text-gray-700',
        lime:  'bg-lime/30 text-navy-950',
        royal: 'bg-royal/10 text-royal-dark',
        rose:  'bg-rose-100 text-rose-700'
    }[tone];
    return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${cls}`}>{children}</span>;
}

function EmptyBlock({ text }) {
    return <div className="text-center py-8 text-xs text-gray-400 bg-white border border-dashed border-gray-200 rounded-lg">{text}</div>;
}

function FilterChips({ value, onChange, options, counts = {} }) {
    return (
        <div className="flex gap-1 flex-wrap">
            {options.map((o) => (
                <button key={o} onClick={() => onChange(o)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border capitalize transition-colors ${
                        value === o ? 'bg-navy-950 border-navy-950 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-navy-900/30'
                    }`}>
                    {o} {counts[o] != null && <span className="ml-1 opacity-70">{counts[o]}</span>}
                </button>
            ))}
        </div>
    );
}

function DataTable({ columns, rows }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        {columns.map((c) => (
                            <th key={c} className="py-2 px-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{c}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {rows.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                            {r.map((cell, j) => <td key={j} className="py-2 px-3 align-top">{cell}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Avatar({ user, size = 40 }) {
    const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase();
    if (user?.profilePicture) {
        return <img src={user.profilePicture} alt="" style={{ width: size, height: size }} className="rounded-full object-cover flex-shrink-0" />;
    }
    return (
        <div
            style={{ width: size, height: size, fontSize: size * 0.4 }}
            className="rounded-full bg-gradient-to-br from-royal to-navy-900 text-white font-bold flex items-center justify-center flex-shrink-0">
            {initial}
        </div>
    );
}

function TierPill({ tier, size = 'sm' }) {
    const cls = {
        starter: 'bg-gray-100 text-gray-700',
        silver:  'bg-slate-100 text-slate-700',
        gold:    'bg-yellow-100 text-yellow-800',
        platinum:'bg-lime/30 text-navy-950'
    }[tier] || 'bg-gray-100 text-gray-600';
    const pad = size === 'xs' ? 'px-1 py-0 text-[9px]' : 'px-2 py-0.5 text-[10px]';
    return <span className={`inline-flex items-center rounded-md font-bold uppercase tracking-wider ${cls} ${pad}`}>{tier || '—'}</span>;
}

function StatusBadge({ status }) {
    const map = {
        approved: 'bg-lime/30 text-navy-950',
        completed: 'bg-lime/30 text-navy-950',
        paid: 'bg-lime/30 text-navy-950',
        applied: 'bg-lime/30 text-navy-950',
        verified: 'bg-lime/30 text-navy-950',
        active: 'bg-lime/30 text-navy-950',
        present: 'bg-lime/30 text-navy-950',
        pending: 'bg-yellow-100 text-yellow-800',
        accrued: 'bg-yellow-100 text-yellow-800',
        scheduled: 'bg-yellow-100 text-yellow-800',
        created: 'bg-yellow-100 text-yellow-800',
        submitted: 'bg-yellow-100 text-yellow-800',
        open: 'bg-yellow-100 text-yellow-800',
        under_review: 'bg-royal/10 text-royal-dark',
        processing: 'bg-royal/10 text-royal-dark',
        rejected: 'bg-rose-100 text-rose-700',
        cancelled: 'bg-rose-100 text-rose-700',
        failed: 'bg-rose-100 text-rose-700',
        refunded: 'bg-rose-100 text-rose-700',
        disputed: 'bg-rose-100 text-rose-700',
        absent: 'bg-rose-100 text-rose-700',
        dismissed: 'bg-gray-100 text-gray-500',
        unverified: 'bg-gray-100 text-gray-500',
        resolved: 'bg-lime/30 text-navy-950',
        clawed_back: 'bg-rose-100 text-rose-700',
        partially_refunded: 'bg-yellow-100 text-yellow-800'
    };
    const cls = map[status] || 'bg-gray-100 text-gray-600';
    return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${cls}`}>{(status || '—').replace(/_/g, ' ')}</span>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Modals
// ═══════════════════════════════════════════════════════════════════════════

function ModalShell({ title, subtitle, children, onClose, size = 'md' }) {
    const w = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' }[size];
    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className={`bg-white rounded-2xl shadow-2xl w-full ${w}`} onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-navy-950">{title}</h3>
                    {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
                    <div className="mt-4">{children}</div>
                </div>
            </div>
        </div>
    );
}

function AlertModal({ onClose, onSend, user }) {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    return (
        <ModalShell title="Send Alert" subtitle={`To ${user?.name || 'user'}`} onClose={onClose}>
            <div className="space-y-3">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title…"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal/40" />
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Message…"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal/40 resize-none" />
            </div>
            <div className="flex gap-2 justify-end mt-4">
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={() => onSend({ title, message })} disabled={!title.trim() || !message.trim()}
                    className="px-4 py-2 text-sm bg-royal hover:bg-royal-dark text-white font-semibold rounded-lg disabled:opacity-50">
                    Send
                </button>
            </div>
        </ModalShell>
    );
}

function SuspendModal({ onClose, onConfirm, active, user }) {
    const [reason, setReason] = useState('');
    const verb = active ? 'Reactivate' : 'Suspend';
    return (
        <ModalShell title={`${verb} ${user?.name || 'user'}`} subtitle={active ? 'User will regain access immediately.' : 'User will be locked out immediately.'} onClose={onClose}>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason (logged in admin notes)"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal/40 resize-none" />
            <div className="flex gap-2 justify-end mt-4">
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={() => onConfirm({ active, reason: reason.trim() })}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg text-white ${active ? 'bg-lime-dark hover:bg-lime-dark/80' : 'bg-rose-600 hover:bg-rose-700'}`}>
                    {verb}
                </button>
            </div>
        </ModalShell>
    );
}

function NoteModal({ onClose, onSave }) {
    const [note, setNote] = useState('');
    return (
        <ModalShell title="Add internal note" subtitle="Visible only to admins." onClose={onClose}>
            <textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} rows={5} placeholder="What happened? Who did you talk to? Next step?"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal/40 resize-none" />
            <div className="flex gap-2 justify-end mt-4">
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={() => onSave({ note })} disabled={!note.trim()}
                    className="px-4 py-2 text-sm bg-royal hover:bg-royal-dark text-white font-semibold rounded-lg disabled:opacity-50">
                    Save note
                </button>
            </div>
        </ModalShell>
    );
}

function ResetConfirmModal({ onClose, onConfirm, user }) {
    return (
        <ModalShell title="Generate password reset link" subtitle={`For ${user?.name || 'user'}`} onClose={onClose}>
            <p className="text-sm text-gray-600">This creates a one-time reset link valid for 30 minutes. Share it with the user via a safe channel — it will be logged in admin notes.</p>
            <div className="flex gap-2 justify-end mt-4">
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={onConfirm} className="px-4 py-2 text-sm bg-royal hover:bg-royal-dark text-white font-semibold rounded-lg">
                    Generate link
                </button>
            </div>
        </ModalShell>
    );
}

function ResetLinkModal({ link, expiresAt, onClose }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* noop */ }
    };
    return (
        <ModalShell title="Reset link ready" subtitle={`Expires ${new Date(expiresAt).toLocaleString('en-IN')}`} onClose={onClose} size="lg">
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 font-mono text-[11px] text-navy-950 break-all">{link}</div>
            <div className="flex gap-2 justify-end mt-4">
                <button onClick={copy} className="px-4 py-2 text-sm bg-navy-950 hover:bg-navy-900 text-white font-semibold rounded-lg">
                    {copied ? 'Copied ✓' : 'Copy link'}
                </button>
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Close</button>
            </div>
        </ModalShell>
    );
}

function CreditModal({ onClose, onIssue, user, creditBalance }) {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const presets = [100, 250, 500, 1000];
    return (
        <ModalShell title="Issue platform credit" subtitle={`Current balance: ₹${creditBalance.toLocaleString('en-IN')} · To ${user?.name}`} onClose={onClose}>
            <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Amount (₹)</label>
                <div className="flex gap-1.5 mb-2 flex-wrap">
                    {presets.map((p) => (
                        <button key={p} onClick={() => setAmount(String(p))}
                            className={`px-2.5 py-1 text-xs font-semibold border rounded-md ${String(amount) === String(p) ? 'bg-navy-950 border-navy-950 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-navy-900/30'}`}>
                            ₹{p}
                        </button>
                    ))}
                </div>
                <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder="Custom amount"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal/40" />
            </div>
            <div className="mt-3">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Reason (required)</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                    placeholder="Goodwill after poor session, refund for session not delivered, etc."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal/40 resize-none" />
            </div>
            <p className="text-[11px] text-gray-500 mt-2">Applied automatically on the user's next paid session.</p>
            <div className="flex gap-2 justify-end mt-4">
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={() => onIssue({ amount: Number(amount), reason: reason.trim() })}
                    disabled={!amount || Number(amount) <= 0 || !reason.trim()}
                    className="px-4 py-2 text-sm bg-lime hover:bg-lime-light text-navy-950 font-semibold rounded-lg disabled:opacity-50">
                    Issue ₹{amount || '0'} credit
                </button>
            </div>
        </ModalShell>
    );
}

function RefundModal({ payment, onClose, onConfirm }) {
    const maxRefundable = Math.max(0, (payment.amount || 0) - (payment.refundAmount || 0));
    const [amount, setAmount] = useState(String(maxRefundable));
    const [reason, setReason] = useState('');
    return (
        <ModalShell title="Refund payment"
            subtitle={`₹${payment.amount} · ${payment.razorpayPaymentId || 'no gateway id'}`}
            onClose={onClose}>
            <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                    Refund amount (max ₹{maxRefundable.toLocaleString('en-IN')})
                </label>
                <input type="number" min="1" max={maxRefundable} value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400" />
            </div>
            <div className="mt-3">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Reason</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                    placeholder="Shared with the student and logged in admin notes."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none" />
            </div>
            {!payment.razorpayPaymentId && (
                <p className="text-[11px] text-yellow-700 mt-2">
                    No razorpay id — refund will be recorded locally but not sent to the gateway.
                </p>
            )}
            <div className="flex gap-2 justify-end mt-4">
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={() => onConfirm({ amount: Number(amount), reason: reason.trim() })}
                    disabled={!amount || Number(amount) <= 0 || Number(amount) > maxRefundable || !reason.trim()}
                    className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg disabled:opacity-50">
                    Refund ₹{amount || '0'}
                </button>
            </div>
        </ModalShell>
    );
}

function ConfirmTextModal({ title, description, placeholder, confirmLabel, dangerous, onClose, onConfirm }) {
    const [text, setText] = useState('');
    return (
        <ModalShell title={title} subtitle={description} onClose={onClose}>
            <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={placeholder}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal/40 resize-none" />
            <div className="flex gap-2 justify-end mt-4">
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={() => onConfirm(text.trim() || placeholder)}
                    disabled={!text.trim()}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50 ${dangerous ? 'bg-rose-600 hover:bg-rose-700' : 'bg-royal hover:bg-royal-dark'}`}>
                    {confirmLabel}
                </button>
            </div>
        </ModalShell>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Utils
// ═══════════════════════════════════════════════════════════════════════════

function fmtDT(d) {
    if (!d) return '';
    return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function relativeTime(d) {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.round(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return fmtDate(d);
}
