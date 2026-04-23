import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuthStore } from '../stores/authStore';

/**
 * SessionRoom — full-screen in-app Jitsi video call for a booking.
 *
 * Loads meet.jit.si's external iframe API, embeds the room using the booking's
 * sessionJoinUrl (generated at approval time), and tracks join/leave via
 * /api/booking-actions/:id/session-presence so attendance data is reliable.
 *
 * Falls back to a "copy link" panel if Jitsi fails to load or if only a
 * non-Jitsi URL is stored on the booking.
 */
export default function SessionRoom() {
    const { bookingId } = useParams();
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);

    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [apiReady, setApiReady] = useState(false);
    const [ended, setEnded] = useState(false);
    const containerRef = useRef(null);
    const apiRef = useRef(null);
    const presenceFiredRef = useRef({ join: false, leave: false });

    // Load booking
    useEffect(() => {
        let cancelled = false;
        api.get(`/bookings/${bookingId}`)
            .then(({ data }) => { if (!cancelled) setBooking(data?.booking || data); })
            .catch((err) => {
                if (cancelled) return;
                setError(err?.response?.data?.message || 'Could not load booking');
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [bookingId]);

    // Load Jitsi external API script
    useEffect(() => {
        if (window.JitsiMeetExternalAPI) { setApiReady(true); return; }
        const existing = document.querySelector('script[data-jitsi-api]');
        if (existing) {
            existing.addEventListener('load', () => setApiReady(true), { once: true });
            return;
        }
        const s = document.createElement('script');
        s.src = 'https://meet.jit.si/external_api.js';
        s.async = true;
        s.dataset.jitsiApi = '1';
        s.onload = () => setApiReady(true);
        s.onerror = () => setError('Could not load the video call service. Try opening the link in a new tab instead.');
        document.body.appendChild(s);
    }, []);

    // Extract room name from stored URL
    const roomName = (() => {
        if (!booking?.sessionJoinUrl) return null;
        try {
            const u = new URL(booking.sessionJoinUrl);
            if (!/meet\.jit\.si|jit\.si/.test(u.hostname)) return null;
            return u.pathname.replace(/^\//, '');
        } catch { return null; }
    })();

    // Notify server of presence
    const notifyPresence = async (action) => {
        if (presenceFiredRef.current[action]) return;
        presenceFiredRef.current[action] = true;
        try {
            await api.patch(`/booking-actions/${bookingId}/session-presence`, { action });
        } catch { /* non-fatal — attendance just won't auto-log */ }
    };

    // Boot Jitsi once everything is ready
    useEffect(() => {
        if (!apiReady || !booking || !roomName || !containerRef.current) return;
        if (apiRef.current) return; // already booted

        const displayName = user?.name || 'Guest';
        const email = user?.email;
        const otherParty = (booking.studentId?._id === user?._id)
            ? booking.tutorId?.name
            : booking.studentId?.name;
        const subject = `${booking.subject || 'Session'}${otherParty ? ` · with ${otherParty}` : ''}`;

        try {
            // eslint-disable-next-line no-undef
            const api = new window.JitsiMeetExternalAPI('meet.jit.si', {
                roomName,
                parentNode: containerRef.current,
                width: '100%',
                height: '100%',
                userInfo: { displayName, email },
                configOverwrite: {
                    subject,
                    prejoinPageEnabled: true,
                    disableDeepLinking: true,
                    startWithAudioMuted: false,
                    startWithVideoMuted: false,
                    enableWelcomePage: false,
                    enableClosePage: false
                },
                interfaceConfigOverwrite: {
                    MOBILE_APP_PROMO: false,
                    SHOW_JITSI_WATERMARK: false,
                    SHOW_CHROME_EXTENSION_BANNER: false,
                    DEFAULT_BACKGROUND: '#0b1023',
                    TOOLBAR_BUTTONS: [
                        'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                        'fodeviceselection', 'hangup', 'profile', 'chat', 'settings',
                        'raisehand', 'videoquality', 'filmstrip', 'tileview'
                    ]
                }
            });
            apiRef.current = api;

            api.addListener('videoConferenceJoined', () => notifyPresence('join'));
            api.addListener('readyToClose', () => {
                notifyPresence('leave');
                setEnded(true);
            });
            api.addListener('videoConferenceLeft', () => {
                notifyPresence('leave');
                setEnded(true);
            });
        } catch (e) {
            setError('Could not start the video call. ' + (e?.message || ''));
        }
    }, [apiReady, booking, roomName, user]);

    // Cleanup on unmount
    useEffect(() => () => {
        notifyPresence('leave').catch(() => {});
        try { apiRef.current?.dispose(); } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return <Center><p className="text-gray-400">Preparing your session…</p></Center>;
    }
    if (error && !booking) {
        return (
            <Center>
                <p className="text-rose-300 mb-3">{error}</p>
                <button onClick={() => navigate(-1)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg">Go back</button>
            </Center>
        );
    }
    if (!booking?.sessionJoinUrl) {
        return (
            <Center>
                <p className="text-gray-300 font-semibold mb-1">No join link yet</p>
                <p className="text-gray-400 text-sm mb-4">The tutor hasn't set a video call link for this session.</p>
                <button onClick={() => navigate(-1)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg">Go back</button>
            </Center>
        );
    }

    // Non-jitsi URL — show copy/open card
    if (!roomName) {
        return (
            <Center>
                <div className="max-w-md text-center">
                    <p className="text-white text-lg font-bold mb-1">External session link</p>
                    <p className="text-gray-400 text-sm mb-4">
                        This session uses a non-Jitsi video service. Open it in a new tab to join.
                    </p>
                    <a
                        href={booking.sessionJoinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => notifyPresence('join')}
                        className="inline-block px-5 py-2.5 bg-lime hover:bg-lime-light text-navy-950 font-bold rounded-lg">
                        Open session link
                    </a>
                    <p className="text-xs text-gray-500 mt-4 font-mono break-all">{booking.sessionJoinUrl}</p>
                </div>
            </Center>
        );
    }

    return (
        <div className="fixed inset-0 bg-navy-950 flex flex-col">
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-navy-950">
                <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">TutNet Session</p>
                    <p className="text-sm font-semibold text-white truncate">
                        {booking.subject}
                        {booking.studentId?.name && booking.tutorId?.name && (
                            <span className="text-gray-400 font-normal"> · {booking.studentId.name} ↔ {booking.tutorId.name}</span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <CopyLinkButton url={booking.sessionJoinUrl} />
                    <Link to={user?.role === 'tutor' ? '/tutor-dashboard?tab=sessions' : '/student-dashboard?tab=sessions'}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-lg">
                        Exit
                    </Link>
                </div>
            </div>

            {/* Jitsi iframe container */}
            <div className="flex-1 relative">
                {!apiReady && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                        Connecting to video service…
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center text-rose-300 text-sm p-6">
                        {error}
                    </div>
                )}
                {ended && (
                    <div className="absolute inset-0 flex items-center justify-center bg-navy-950/95 z-20">
                        <div className="text-center max-w-sm">
                            <p className="text-white text-lg font-bold mb-2">Session ended</p>
                            <p className="text-gray-400 text-sm mb-5">You can close this tab or head back to your dashboard.</p>
                            <div className="flex gap-2 justify-center">
                                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-lg">Rejoin</button>
                                <Link to={user?.role === 'tutor' ? '/tutor-dashboard?tab=sessions' : '/student-dashboard?tab=sessions'}
                                    className="px-4 py-2 bg-lime hover:bg-lime-light text-navy-950 text-sm font-semibold rounded-lg">
                                    Back to dashboard
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={containerRef} className="absolute inset-0" />
            </div>
        </div>
    );
}

function Center({ children }) {
    return (
        <div className="fixed inset-0 bg-navy-950 flex items-center justify-center p-6">
            <div className="text-center">{children}</div>
        </div>
    );
}

function CopyLinkButton({ url }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* noop */ }
    };
    return (
        <button onClick={copy}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-semibold rounded-lg">
            {copied ? 'Copied ✓' : 'Copy link'}
        </button>
    );
}
