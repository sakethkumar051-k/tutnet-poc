import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import RegularBookingModal from './RegularBookingModal';

/* ── helpers ─────────────────────────────────────────────────────────────────*/
const getInitials = (name) =>
    name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'T';

const StarRow = ({ rating, count }) => {
    const filled = Math.round(rating);
    return (
        <div className="flex items-center gap-1">
            <div className="flex">
                {[1,2,3,4,5].map(i => (
                    <svg key={i} className={`w-3.5 h-3.5 ${i <= filled ? 'text-amber-400' : 'text-gray-200'}`}
                        fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                ))}
            </div>
            {count > 0 ? (
                <span className="text-xs font-semibold text-gray-700">{rating.toFixed(1)}</span>
            ) : null}
            <span className="text-xs text-gray-400">
                {count > 0 ? `(${count} review${count !== 1 ? 's' : ''})` : 'New'}
            </span>
        </div>
    );
};

/* ── main component ───────────────────────────────────────────────────────────*/
const TutorCard = ({ tutor, onRequestDemo }) => {
    const [isFavorite, setIsFavorite]                 = useState(false);
    const [checkingFavorite, setCheckingFavorite]     = useState(true);
    const [trialStatus, setTrialStatus]               = useState(null);
    const [loadingTrialStatus, setLoadingTrialStatus] = useState(true);
    const [showRegularBooking, setShowRegularBooking] = useState(false);
    const { user }                                    = useAuth();
    const { showSuccess, showError }                  = useToast();
    const navigate                                    = useNavigate();

    useEffect(() => {
        if (user?.role === 'student' && tutor.userId?._id) {
            checkFavorite();
            checkTrialStatus();
        } else {
            setCheckingFavorite(false);
            setLoadingTrialStatus(false);
        }
    }, [user, tutor]);

    const checkTrialStatus = async () => {
        try {
            const { data } = await api.get(`/bookings/trial-status/${tutor.userId._id}`);
            setTrialStatus(data);
        } catch {
            setTrialStatus(null);
        } finally {
            setLoadingTrialStatus(false);
        }
    };

    const checkFavorite = async () => {
        try {
            const { data } = await api.get(`/favorites/check/${tutor.userId._id}`);
            setIsFavorite(data.isFavorite);
        } catch {
            setIsFavorite(false);
        } finally {
            setCheckingFavorite(false);
        }
    };

    const toggleFavorite = async (e) => {
        e.stopPropagation();
        if (!user || user.role !== 'student') return;
        try {
            if (isFavorite) {
                await api.delete(`/favorites/${tutor.userId._id}`);
                setIsFavorite(false);
                showSuccess('Removed from favorites');
            } else {
                await api.post('/favorites', { tutorId: tutor.userId._id });
                setIsFavorite(true);
                showSuccess('Added to favorites');
            }
        } catch {
            showError('Failed to update favorite');
        }
    };

    const avgRating   = tutor.averageRating || 0;
    const reviewCount = tutor.reviewCount   || 0;
    const location    = tutor.userId?.location;
    const locationStr = [location?.area, location?.city].filter(Boolean).join(', ');

    // Derive mode label
    const modeLabel = tutor.mode === 'online' ? 'Online'
                    : tutor.mode === 'home'   ? 'Home Visit'
                    : 'Online & Home';
    const modeColor = tutor.mode === 'online' ? 'bg-blue-50 text-blue-700 border-blue-100'
                    : tutor.mode === 'home'   ? 'bg-green-50 text-green-700 border-green-100'
                    : 'bg-purple-50 text-purple-700 border-purple-100';

    /* ── primary CTA logic (unchanged) ───────────────────────────────────────*/
    const renderCTA = () => {
        if (!user || user.role !== 'student') {
            return (
                <button onClick={() => navigate(`/tutor/${tutor._id}`)}
                    className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
                    View Profile
                </button>
            );
        }
        if (loadingTrialStatus) {
            return (
                <button disabled className="w-full py-2.5 px-4 rounded-lg bg-gray-100 text-gray-400 text-sm font-semibold cursor-wait">
                    Loading…
                </button>
            );
        }
        if (!trialStatus || !trialStatus.hasTriedTutor) {
            return (
                <button onClick={() => onRequestDemo(tutor)}
                    className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
                    Try Free Demo Class
                </button>
            );
        }
        if (trialStatus.status === 'pending') {
            return (
                <button disabled
                    className="w-full py-2.5 px-4 rounded-lg bg-amber-50 text-amber-800 text-sm font-semibold cursor-not-allowed border border-amber-200">
                    Free Demo Pending…
                </button>
            );
        }
        if (trialStatus.status === 'approved') {
            return (
                <button onClick={() => navigate('/student-dashboard?tab=sessions')}
                    className="w-full py-2.5 px-4 rounded-lg bg-green-50 text-green-800 text-sm font-semibold hover:bg-green-100 transition border border-green-200">
                    Demo Scheduled — View Details
                </button>
            );
        }
        return (
            <button onClick={() => setShowRegularBooking(true)}
                className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
                Book Paid Session
            </button>
        );
    };

    return (
        <div className="group relative bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-200 flex flex-col overflow-hidden">

            {/* ── Card header ──────────────────────────────────────────────── */}
            <div className="px-5 pt-5 pb-4">
                <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        {tutor.userId?.profilePicture ? (
                            <img src={tutor.userId.profilePicture} alt={tutor.userId.name}
                                className="w-14 h-14 rounded-xl object-cover border border-gray-100" />
                        ) : (
                            <div className="w-14 h-14 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg border border-indigo-50">
                                {getInitials(tutor.userId?.name)}
                            </div>
                        )}
                        {/* Verified dot */}
                        {tutor.approvalStatus === 'approved' && (
                            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center"
                                title="Verified by TutNet">
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </span>
                        )}
                    </div>

                    {/* Name block */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                                <h3 className="text-base font-bold text-gray-900 leading-tight truncate"
                                    title={tutor.userId?.name}>
                                    {tutor.userId?.name}
                                </h3>
                                {tutor.approvalStatus === 'approved' && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 mt-0.5">
                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Verified by TutNet
                                    </span>
                                )}
                            </div>
                            {/* Favorite */}
                            {user?.role === 'student' && !checkingFavorite && (
                                <button onClick={toggleFavorite}
                                    className="flex-shrink-0 mt-0.5 text-gray-300 hover:text-amber-400 transition-colors">
                                    <svg className={`w-5 h-5 ${isFavorite ? 'text-amber-400 fill-amber-400' : ''}`}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Rating row */}
                        <div className="mt-1.5">
                            <StarRow rating={avgRating} count={reviewCount} />
                        </div>
                    </div>
                </div>

                {/* ── Quick meta row ─────────────────────────────────────── */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border ${modeColor}`}>
                        {tutor.mode === 'online' ? (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        ) : (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                        )}
                        {modeLabel}
                    </span>
                    {tutor.experienceYears > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-md text-[11px] font-semibold text-gray-600 border border-gray-100">
                            <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {tutor.experienceYears}+ yrs
                        </span>
                    )}
                    {tutor.hourlyRate > 0 && (
                        <span className="ml-auto text-sm font-bold text-gray-900">
                            ₹{tutor.hourlyRate}<span className="text-xs font-normal text-gray-400">/hr</span>
                        </span>
                    )}
                </div>
            </div>

            {/* ── Subjects ─────────────────────────────────────────────────── */}
            <div className="px-5 pb-4">
                <div className="flex flex-wrap gap-1.5">
                    {tutor.subjects?.slice(0, 4).map((s, i) => (
                        <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[11px] font-semibold rounded-md border border-indigo-100">
                            {s}
                        </span>
                    ))}
                    {tutor.subjects?.length > 4 && (
                        <span className="px-2 py-1 text-[11px] text-gray-400 font-medium">
                            +{tutor.subjects.length - 4} more
                        </span>
                    )}
                </div>
            </div>

            {/* ── Trust signals ────────────────────────────────────────────── */}
            <div className="mx-5 mb-4 grid grid-cols-3 gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="text-center">
                    <p className="text-sm font-bold text-gray-900">{reviewCount > 0 ? reviewCount : '—'}</p>
                    <p className="text-[10px] text-gray-500 leading-tight mt-0.5">Reviews</p>
                </div>
                <div className="text-center border-x border-gray-200">
                    {locationStr ? (
                        <>
                            <p className="text-[10px] font-bold text-gray-700 leading-tight truncate px-1">{location?.area || location?.city}</p>
                            <p className="text-[10px] text-gray-500 leading-tight mt-0.5">Location</p>
                        </>
                    ) : (
                        <>
                            <p className="text-sm font-bold text-gray-900">—</p>
                            <p className="text-[10px] text-gray-500 leading-tight mt-0.5">Location</p>
                        </>
                    )}
                </div>
                <div className="text-center">
                    <p className="text-sm font-bold text-green-600">Free</p>
                    <p className="text-[10px] text-gray-500 leading-tight mt-0.5">Trial</p>
                </div>
            </div>

            {/* ── Availability signal ──────────────────────────────────────── */}
            {tutor.weeklyAvailability?.length > 0 && (
                <div className="px-5 mb-4">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs text-gray-600 font-medium">
                            Available {tutor.weeklyAvailability.slice(0,2).map(d => d.day.slice(0,3)).join(', ')}
                        </span>
                    </div>
                </div>
            )}

            {/* ── Actions ──────────────────────────────────────────────────── */}
            <div className="px-5 pb-5 pt-3 mt-auto border-t border-gray-100 space-y-2">
                {/* Primary CTA */}
                {renderCTA()}

                {/* Secondary CTAs */}
                {user?.role === 'student' && (
                    <div className="flex gap-2">
                        <button onClick={() => navigate(`/tutor/${tutor._id}`)}
                            className="flex-1 py-2 px-3 rounded-lg bg-gray-50 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition border border-gray-200">
                            View Profile
                        </button>
                        {!loadingTrialStatus && (!trialStatus || !trialStatus.hasTriedTutor) && (
                            <button onClick={() => setShowRegularBooking(true)}
                                className="flex-1 py-2 px-3 rounded-lg bg-gray-50 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition border border-gray-200">
                                Book Session
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Booking modal */}
            {showRegularBooking && (
                <RegularBookingModal
                    tutor={tutor}
                    onClose={() => setShowRegularBooking(false)}
                    onSuccess={() => { setShowRegularBooking(false); checkTrialStatus(); }}
                />
            )}
        </div>
    );
};

export default TutorCard;
