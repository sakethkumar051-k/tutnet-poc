import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import NotificationPanel from './NotificationPanel';
import ProfileDropdown from './ProfileDropdown';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

const Navbar = () => {
    const { user } = useAuth();

    const getDashboardLink = () => {
        if (user?.role === 'admin') return '/admin-dashboard';
        if (user?.role === 'tutor') return '/tutor-dashboard';
        return '/student-dashboard';
    };

    return (
        <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center space-x-4">
                        <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
                            <img
                                src="/tutnet-logo.png"
                                alt="Tutnet Logo"
                                className="h-7"
                            />
                        </Link>

                        <div className="hidden md:flex items-center space-x-1">
                            <Button asChild variant="default" size="sm" className="rounded-full">
                                <Link to="/">Home</Link>
                            </Button>

                            {!user && (
                                <Button asChild variant="ghost" size="sm">
                                    <Link to="/register" className="flex items-center gap-1">
                                        Apply
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </Link>
                                </Button>
                            )}

                            <span className="px-4 py-1.5 text-sm font-medium text-muted-foreground cursor-not-allowed flex items-center gap-2">
                                Courses
                                <Badge variant="secondary" className="text-[10px]">Coming soon!</Badge>
                            </span>

                            {user?.role === 'student' ? (
                                <Button asChild variant="ghost" size="sm">
                                    <Link to="/find-tutors">Find tutors</Link>
                                </Button>
                            ) : (
                                <Button asChild variant="ghost" size="sm">
                                    <Link to={user ? getDashboardLink() : "/login"}>Find tutors</Link>
                                </Button>
                            )}

                            {user && (
                                <Button asChild variant="ghost" size="sm">
                                    <Link to={getDashboardLink()}>Dashboard</Link>
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
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
                                <Button asChild variant="ghost" size="sm">
                                    <Link to="/login">Login</Link>
                                </Button>
                                <Button asChild size="sm" className="rounded-full">
                                    <Link to="/register">Sign up</Link>
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
