import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useAuthModalStore } from '../stores/authModalStore';
import NotificationBell from './NotificationBell';
import NotificationPanel from './NotificationPanel';
import ProfileDropdown from './ProfileDropdown';
import { cn } from '../lib/utils';

const getInitials = (name) =>
    name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'U';

// Compact profile pill themed for the dark public navbar.
const PublicProfilePill = ({ user }) => {
    const navigate = useNavigate();
    const logout = useAuthStore((s) => s.logout);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const onClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [open]);

    const handleLogout = () => {
        logout();
        setOpen(false);
        navigate('/');
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((o) => !o)}
                className={cn(
                    'flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition-all duration-200',
                    open
                        ? 'bg-white/10 border-white/20'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                )}
            >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-royal to-lime/40 flex items-center justify-center text-white text-xs font-extrabold">
                    {getInitials(user?.name)}
                </div>
                <div className="text-left hidden sm:block leading-none">
                    <p className="text-[13px] font-bold text-white">{user?.name?.split(' ')[0] || 'You'}</p>
                    <p className="text-[10px] font-semibold text-gray-400 capitalize mt-0.5">{user?.role}</p>
                </div>
                <svg className={cn('w-3.5 h-3.5 text-gray-400 transition-transform hidden sm:block', open && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-bold text-navy-950 truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                    <div className="py-1">
                        <Link
                            to="/dashboard"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-navy-950 hover:bg-[#f7f7f7] transition-colors"
                        >
                            <svg className="w-4 h-4 text-royal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            <span className="font-semibold">Dashboard</span>
                        </Link>
                        <Link
                            to="/dashboard?tab=profile"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-navy-950 hover:bg-[#f7f7f7] transition-colors"
                        >
                            <svg className="w-4 h-4 text-royal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="font-semibold">My profile</span>
                        </Link>
                    </div>
                    <div className="py-1 border-t border-gray-100">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="font-semibold">Log out</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const Navbar = ({ variant = 'public' }) => {
    const user = useAuthStore((s) => s.user);
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();
    const isApp = variant === 'app';

    const getDashboardLink = () => '/dashboard';

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };
    const isDashboardActive = location.pathname.includes('-dashboard');

    // ── App variant (dashboard pages) ──
    if (isApp) {
        return (
            <nav className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/90 backdrop-blur-xl flex-shrink-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-8">
                            <Link to="/" className="flex items-center"><img src="/tutnet-logo.png" alt="Tutnet" className="h-6" /></Link>
                            <div className="hidden md:flex items-center gap-1">
                                {[{ to: '/', label: 'Home' }, { to: '/find-tutors', label: 'Find tutors' }].map(l => (
                                    <Link key={l.to} to={l.to} className={cn('px-3 py-2 rounded-lg text-sm font-medium transition-colors', isActive(l.to) ? 'text-navy-950 bg-gray-100' : 'text-gray-500 hover:text-navy-950 hover:bg-gray-50')}>{l.label}</Link>
                                ))}
                                {user && (
                                    <Link to={getDashboardLink()} className={cn('px-3 py-2 rounded-lg text-sm font-medium transition-colors', isDashboardActive ? 'text-navy-950 bg-gray-100' : 'text-gray-500 hover:text-navy-950 hover:bg-gray-50')}>Dashboard</Link>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {user && (
                                <>
                                    <div className="relative"><NotificationBell /><NotificationPanel /></div>
                                    <ProfileDropdown />
                                </>
                            )}
                            <button className="md:hidden p-2 text-gray-500 hover:text-gray-700" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    {mobileOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                {mobileOpen && (
                    <div className="md:hidden border-t bg-white px-4 py-3 space-y-1">
                        <Link to="/" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50">Home</Link>
                        <Link to="/find-tutors" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50">Find tutors</Link>
                        {user && <Link to={getDashboardLink()} onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-50">Dashboard</Link>}
                    </div>
                )}
            </nav>
        );
    }

    // ── Public variant (landing / marketing pages) ──
    return (
        <nav className="sticky top-0 z-50 bg-navy-950 flex-shrink-0">
            <div className="max-w-[1300px] mx-auto px-6 lg:px-10">
                <div className="flex justify-between items-center h-[72px]">
                    {/* Left — Logo + Links */}
                    <div className="flex items-center gap-10">
                        <Link to="/" className="flex items-center">
                            <img src="/tutnet-logo.png" alt="Tutnet" className="h-9 brightness-0 invert" />
                        </Link>
                        <div className="hidden md:flex items-center gap-8">
                            {[
                                { to: '/', label: 'Home' },
                                { to: '/find-tutors', label: 'Find Tutors' },
                                { to: '/pricing', label: 'Pricing' },
                                { to: '/how-it-works', label: 'How it works' },
                                { to: '/about', label: 'About' },
                            ].map((link) => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className={cn(
                                        'text-[15px] font-medium transition-colors inline-flex items-center gap-2',
                                        isActive(link.to)
                                            ? 'text-white'
                                            : 'text-gray-400 hover:text-white'
                                    )}
                                >
                                    {link.label}
                                    {link.soon && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-lime/20 text-lime">Soon</span>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Right — Icons + CTA */}
                    <div className="flex items-center gap-4">
                        <button className="hidden sm:flex text-gray-400 hover:text-white transition-colors" aria-label="Search">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                            </svg>
                        </button>
                        {user ? (
                            <PublicProfilePill user={user} />
                        ) : (
                            <>
                                <button
                                    onClick={() => useAuthModalStore.getState().openLogin()}
                                    className="hidden sm:inline-flex text-[14px] font-medium text-gray-300 hover:text-white transition-colors"
                                >
                                    Log in
                                </button>
                                <Link
                                    to="/register"
                                    className="inline-flex items-center px-6 py-2.5 text-[14px] font-bold text-navy-950 bg-lime rounded-full hover:bg-lime-light transition-colors"
                                >
                                    Join Now
                                </Link>
                            </>
                        )}

                        {/* Mobile hamburger */}
                        <button className="md:hidden p-2 text-gray-400 hover:text-white" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                {mobileOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="md:hidden border-t border-white/10 px-6 py-4 space-y-2">
                    {[{ to: '/', label: 'Home' }, { to: '/find-tutors', label: 'Find Tutors' }, { to: '/pricing', label: 'Pricing' }, { to: '/how-it-works', label: 'How it works' }, { to: '/about', label: 'About' }].map(l => (
                        <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-lg">{l.label}</Link>
                    ))}
                    {user ? (
                        <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-lime hover:text-white rounded-lg">Dashboard</Link>
                    ) : (
                        <>
                            <button
                                onClick={() => { setMobileOpen(false); useAuthModalStore.getState().openLogin(); }}
                                className="block w-full text-left px-3 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-lg">
                                Log in
                            </button>
                            <Link to="/register" onClick={() => setMobileOpen(false)}
                                className="block px-3 py-2 text-sm font-bold text-lime hover:text-white rounded-lg">
                                Join Now
                            </Link>
                        </>
                    )}
                </div>
            )}
        </nav>
    );
};

export default Navbar;
