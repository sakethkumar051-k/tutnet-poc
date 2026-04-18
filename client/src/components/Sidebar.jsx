import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { cn } from '../lib/utils';

const Icon = ({ path, className }) => (
    <svg className={cn('h-[18px] w-[18px] flex-shrink-0', className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

const getInitials = (name) =>
    name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'U';

const studentNav = [
    { id: 'dashboard',    label: 'Overview',    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'sessions',     label: 'Sessions',    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'find-tutors',  label: 'Find Tutors', icon: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z' },
    { id: 'tutors',       label: 'My Tutors',   icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'messages',     label: 'Messages',    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { id: 'progress',     label: 'Progress',    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'resources',    label: 'Resources',   icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { id: 'safety',       label: 'Safety',      icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
];

const tutorNav = [
    { id: 'dashboard', label: 'Overview',    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'sessions',  label: 'Sessions',    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'students',  label: 'My Students', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'progress',  label: 'Progress',    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'schedule',  label: 'Schedule',    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'earnings',  label: 'Earnings',    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'messages',  label: 'Messages',    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { id: 'resources', label: 'Resources',   icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { id: 'safety',    label: 'Safety',      icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
];

const Sidebar = ({ user, activeTab, onTabChange }) => {
    const logout = useAuthStore((s) => s.logout);
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    const navItems = user?.role === 'student' ? studentNav : tutorNav;

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <>
            {/* Mobile toggle — floating FAB */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden fixed bottom-4 left-4 z-50 p-3 bg-navy-950 text-white rounded-full shadow-lg hover:bg-navy-900 transition-colors"
                aria-label="Toggle sidebar"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {mobileOpen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    )}
                </svg>
            </button>

            {/* Mobile backdrop */}
            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 z-40 bg-navy-950/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            )}

            {/* Sidebar panel */}
            <aside className={cn(
                'fixed lg:static inset-y-0 left-0 z-50 lg:z-auto w-64 bg-navy-950 flex flex-col h-full flex-shrink-0 transition-transform duration-200',
                mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            )}>
                {/* ── Top — logo + back to site ── */}
                <div className="px-5 pt-5 pb-4">
                    <Link
                        to="/"
                        className="flex items-center justify-between gap-3 group"
                    >
                        <img src="/tutnet-logo.png" alt="Tutnet" className="h-7 brightness-0 invert" />
                        <span
                            className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 group-hover:text-lime transition-colors"
                            title="Back to site"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Home
                        </span>
                    </Link>
                </div>

                {/* ── Nav items ── */}
                <nav className="flex-1 overflow-y-auto px-3 pt-3 pb-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    onTabChange(item.id);
                                    setMobileOpen(false);
                                }}
                                className={cn(
                                    'w-full flex items-center gap-3 px-3.5 py-2.5 text-[13px] rounded-xl transition-colors font-semibold',
                                    isActive
                                        ? 'bg-lime text-navy-950 shadow-sm'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                )}
                            >
                                <Icon path={item.icon} className={isActive ? 'text-navy-950' : 'text-gray-400'} />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* ── Bottom — profile block ── */}
                <div className="p-3 border-t border-white/10 relative">
                    <button
                        onClick={() => setProfileOpen((o) => !o)}
                        className={cn(
                            'w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors',
                            profileOpen ? 'bg-white/10' : 'hover:bg-white/5'
                        )}
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-royal to-lime/40 flex items-center justify-center text-white text-sm font-extrabold flex-shrink-0">
                            {getInitials(user?.name)}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-bold text-white truncate">{user?.name || 'You'}</p>
                            <p className="text-[11px] text-gray-400 capitalize truncate">{user?.role}</p>
                        </div>
                        <svg
                            className={cn('w-4 h-4 text-gray-400 transition-transform', profileOpen && 'rotate-180')}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                    </button>

                    {/* Profile popover */}
                    {profileOpen && (
                        <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <p className="text-sm font-bold text-navy-950 truncate">{user?.name}</p>
                                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                            </div>
                            <div className="py-1">
                                <button
                                    onClick={() => { setProfileOpen(false); onTabChange('profile'); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-navy-950 hover:bg-[#f7f7f7] transition-colors"
                                >
                                    <svg className="w-4 h-4 text-royal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span className="font-semibold">My profile</span>
                                </button>
                                <Link
                                    to="/"
                                    onClick={() => setProfileOpen(false)}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-navy-950 hover:bg-[#f7f7f7] transition-colors"
                                >
                                    <svg className="w-4 h-4 text-royal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3" />
                                    </svg>
                                    <span className="font-semibold">Back to site</span>
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
            </aside>
        </>
    );
};

export default Sidebar;
