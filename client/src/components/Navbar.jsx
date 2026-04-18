import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import NotificationBell from './NotificationBell';
import NotificationPanel from './NotificationPanel';
import ProfileDropdown from './ProfileDropdown';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

const Navbar = () => {
    const user = useAuthStore((s) => s.user);
    const [mobileOpen, setMobileOpen] = useState(false);

    const getDashboardLink = () => {
        if (user?.role === 'admin') return '/admin-dashboard';
        if (user?.role === 'tutor') return '/tutor-dashboard';
        return '/student-dashboard';
    };

    return (
        <nav className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-14">
                    {/* Left */}
                    <div className="flex items-center gap-6">
                        <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
                            <img src="/tutnet-logo.png" alt="Tutnet" className="h-6" />
                        </Link>

                        <div className="hidden md:flex items-center gap-1">
                            <Button asChild variant="ghost" size="sm" className="text-gray-600 font-medium">
                                <Link to="/">Home</Link>
                            </Button>

                            {!user && (
                                <Button asChild variant="ghost" size="sm" className="text-gray-600 font-medium">
                                    <Link to="/register">Apply</Link>
                                </Button>
                            )}

                            <span className="px-3 py-1.5 text-sm text-gray-400 cursor-not-allowed flex items-center gap-2">
                                Courses
                                <Badge variant="secondary" className="text-[10px] font-medium">Soon</Badge>
                            </span>

                            <Button asChild variant="ghost" size="sm" className="text-gray-600 font-medium">
                                <Link to="/find-tutors">Find tutors</Link>
                            </Button>

                            {user && (
                                <Button asChild variant="ghost" size="sm" className="text-gray-600 font-medium">
                                    <Link to={getDashboardLink()}>Dashboard</Link>
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-2">
                        {user ? (
                            <>
                                <div className="relative">
                                    <NotificationBell />
                                    <NotificationPanel />
                                </div>
                                <ProfileDropdown />
                            </>
                        ) : (
                            <>
                                <Button asChild variant="ghost" size="sm" className="text-gray-600">
                                    <Link to="/login">Login</Link>
                                </Button>
                                <Button asChild size="sm" className="rounded-full bg-gray-900 hover:bg-gray-800">
                                    <Link to="/register">Sign up</Link>
                                </Button>
                            </>
                        )}

                        {/* Mobile hamburger */}
                        <button
                            className="md:hidden p-2 -mr-1 text-gray-500 hover:text-gray-700"
                            onClick={() => setMobileOpen(!mobileOpen)}
                            aria-label="Toggle menu"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                {mobileOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1 animate-fade-in">
                    <Link to="/" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">Home</Link>
                    <Link to="/find-tutors" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">Find tutors</Link>
                    {user && (
                        <Link to={getDashboardLink()} onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">Dashboard</Link>
                    )}
                    {!user && (
                        <>
                            <Link to="/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">Login</Link>
                            <Link to="/register" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">Sign up</Link>
                        </>
                    )}
                </div>
            )}
        </nav>
    );
};

export default Navbar;
