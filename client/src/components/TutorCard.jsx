import React, { useState, useCallback } from 'react';
import api from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { useAuthModalStore } from '../stores/authModalStore';
import { useNavigate } from 'react-router-dom';
import RegularBookingModal from './RegularBookingModal';
import DedicatedTutorModal from './DedicatedTutorModal';

const getInitials = (name) =>
    name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'T';

// Deterministic warm gradient from name
const AVATAR_GRADIENTS = [
    'from-amber-400 to-orange-500',
    'from-teal-400 to-cyan-500',
    'from-violet-400 to-purple-500',
    'from-rose-400 to-pink-500',
    'from-emerald-400 to-green-500',
    'from-sky-400 to-blue-500',
    'from-fuchsia-400 to-pink-500',
    'from-lime-400 to-emerald-500',
];

const getGradient = (name) => {
    const hash = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
};

// Subject color mapping for visual variety
const SUBJECT_STYLES = {
    'Mathematics': 'bg-blue-50 text-blue-700',
    'Physics': 'bg-violet-50 text-violet-700',
    'Chemistry': 'bg-amber-50 text-amber-700',
    'Biology': 'bg-emerald-50 text-emerald-700',
    'English': 'bg-rose-50 text-rose-700',
    'Computer Science': 'bg-cyan-50 text-cyan-700',
    'Economics': 'bg-orange-50 text-orange-700',
    'History': 'bg-stone-100 text-stone-700',
    'Geography': 'bg-teal-50 text-teal-700',
};

const getSubjectStyle = (subject) =>
    SUBJECT_STYLES[subject] || 'bg-gray-50 text-gray-600';

const TutorCard = ({ tutor, onRequestDemo, onFavoriteChange, onBookingSuccess }) => {
    const [showRegularBooking, setShowRegularBooking] = useState(false);
    const [showDedicatedModal, setShowDedicatedModal] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const user = useAuthStore((s) => s.user);
    const showSuccess = useToastStore((s) => s.showSuccess);
    const showError = useToastStore((s) => s.showError);
    const openLogin = useAuthModalStore((s) => s.openLogin);
    const navigate = useNavigate();

    const isFavorite = tutor.isFavorited ?? false;
    const trialStatus = tutor.trialStatus ?? { status: null, count: 0, maxReached: false, hasTriedTutor: false };

    const requireAuth = (actionMessage) => {
        if (!user) { openLogin(actionMessage); return false; }
        if (user.role !== 'student') return false;
        return true;
    };

    const toggleFavorite = useCallback(async (e) => {
        e.stopPropagation();
        if (!user) { openLogin('Sign in to save your favorite tutors'); return; }
        if (user.role !== 'student') return;
        const tutorUserId = tutor.userId?._id;
        if (!tutorUserId) return;
        try {
            if (isFavorite) {
                await api.delete(`/favorites/${tutorUserId}`);
                showSuccess('Removed from favorites');
                onFavoriteChange?.(tutorUserId, false);
            } else {
                await api.post('/favorites', { tutorId: tutorUserId });
                showSuccess('Added to favorites');
                onFavoriteChange?.(tutorUserId, true);
            }
        } catch {
            showError('Failed to update favorite');
        }
    }, [user, isFavorite, tutor.userId?._id, onFavoriteChange, showSuccess, showError, openLogin]);

    const avgRating = tutor.averageRating || 0;
    const reviewCount = tutor.reviewCount || 0;
    const location = tutor.userId?.location;
    const locationStr = location?.area || location?.city || '';
    const subjects = tutor.subjects || [];
    const tutorName = tutor.userId?.name || 'Tutor';

    const modeIcon = tutor.mode === 'online' ? (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
    ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
    );

    const modeLabel = tutor.mode === 'online' ? 'Online' : tutor.mode === 'home' ? 'Home tutoring' : 'Online & Home';

    const handleDedicated = () => { if (requireAuth('Sign in to request a dedicated tutor')) setShowDedicatedModal(true); };
    const handleDemo = () => { if (requireAuth('Sign in to book a free trial class')) onRequestDemo(tutor); };

    const isNew = reviewCount === 0;
    const isVerified = tutor.approvalStatus === 'approved';

    return (
        <div
            className="group relative bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:border-gray-200 hover:-translate-y-0.5"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Top section — avatar + identity */}
            <div className="p-5 pb-0">
                <div className="flex items-start gap-4">
                    {/* Large avatar */}
                    <div className="relative flex-shrink-0 cursor-pointer" onClick={() => navigate(`/tutor/${tutor._id}`)}>
                        {tutor.userId?.profilePicture ? (
                            <img
                                src={tutor.userId.profilePicture}
                                alt={tutorName}
                                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white shadow-sm transition-transform duration-300 group-hover:scale-105"
                            />
                        ) : (
                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getGradient(tutorName)} flex items-center justify-center text-white font-bold text-lg shadow-sm ring-2 ring-white transition-transform duration-300 group-hover:scale-105`}>
                                {getInitials(tutorName)}
                            </div>
                        )}

                        {/* Verified badge on avatar */}
                        {isVerified && (
                            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-teal-500 rounded-lg border-2 border-white flex items-center justify-center shadow-sm" title="Verified by TutNet">
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </span>
                        )}
                    </div>

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <h3
                                    className="text-[15px] font-semibold text-gray-900 truncate leading-tight tracking-tight cursor-pointer hover:text-teal-700 transition-colors"
                                    onClick={() => navigate(`/tutor/${tutor._id}`)}
                                >
                                    {tutorName}
                                </h3>

                                {/* Badges row */}
                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                    {isVerified && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-semibold rounded-full tracking-wide uppercase">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            Verified
                                        </span>
                                    )}
                                    {isNew && (
                                        <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded-full tracking-wide uppercase">
                                            New
                                        </span>
                                    )}
                                    {tutor.experienceYears > 0 && (
                                        <span className="text-[11px] text-gray-400 font-medium">
                                            {tutor.experienceYears}+ yrs exp
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Favorite heart */}
                            <button
                                onClick={toggleFavorite}
                                className={`flex-shrink-0 p-1.5 -mr-1.5 -mt-0.5 rounded-full transition-all duration-200 ${
                                    isFavorite
                                        ? 'text-rose-500 bg-rose-50'
                                        : 'text-gray-300 hover:text-rose-400 hover:bg-rose-50/50'
                                }`}
                                aria-label="Save tutor"
                            >
                                <svg className="w-[18px] h-[18px]" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Middle section — details */}
            <div className="px-5 pt-4 pb-4 flex-1">
                {/* Rating + Location + Mode row */}
                <div className="flex items-center gap-3 text-[12px]">
                    {avgRating > 0 ? (
                        <span className="flex items-center gap-1 font-medium text-gray-700">
                            <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {avgRating.toFixed(1)}
                            <span className="text-gray-400 font-normal">({reviewCount})</span>
                        </span>
                    ) : null}
                    <span className="flex items-center gap-1 text-gray-400">
                        {modeIcon}
                        <span>{modeLabel}</span>
                    </span>
                    {locationStr && (
                        <span className="flex items-center gap-1 text-gray-400 truncate">
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                            </svg>
                            <span className="truncate">{locationStr}</span>
                        </span>
                    )}
                </div>

                {/* Subject pills */}
                {subjects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {subjects.slice(0, 4).map((s, i) => (
                            <span key={i} className={`px-2.5 py-1 text-[11px] font-medium rounded-lg ${getSubjectStyle(s)}`}>
                                {s}
                            </span>
                        ))}
                        {subjects.length > 4 && (
                            <span className="px-2 py-1 text-[11px] text-gray-400 font-medium">
                                +{subjects.length - 4}
                            </span>
                        )}
                    </div>
                )}

                {/* Price — prominent */}
                {tutor.hourlyRate > 0 && (
                    <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-xl font-bold text-gray-900 tracking-tight">₹{tutor.hourlyRate}</span>
                        <span className="text-xs text-gray-400 font-medium">/hour</span>
                    </div>
                )}
            </div>

            {/* Bottom — Actions (revealed on hover on desktop, always visible on mobile) */}
            <div className="px-5 pb-5 pt-0 mt-auto space-y-2">
                {/* Primary row */}
                <div className="flex gap-2">
                    <button
                        onClick={handleDedicated}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-gray-900 text-white text-[13px] font-semibold hover:bg-gray-800 active:scale-[0.98] transition-all duration-150 shadow-sm hover:shadow-md"
                    >
                        Request Tutor
                    </button>
                    {(!user || !trialStatus.hasTriedTutor) ? (
                        <button
                            onClick={handleDemo}
                            className="py-2.5 px-4 rounded-xl bg-teal-50 text-teal-700 text-[13px] font-semibold hover:bg-teal-100 active:scale-[0.98] transition-all duration-150"
                        >
                            Free Trial
                        </button>
                    ) : trialStatus.status === 'pending' ? (
                        <span className="py-2.5 px-4 rounded-xl bg-amber-50 text-amber-600 text-[13px] font-semibold">
                            Pending
                        </span>
                    ) : trialStatus.status === 'approved' ? (
                        <button
                            onClick={() => navigate('/student-dashboard?tab=sessions')}
                            className="py-2.5 px-4 rounded-xl bg-emerald-50 text-emerald-700 text-[13px] font-semibold hover:bg-emerald-100 transition-colors"
                        >
                            Booked
                        </button>
                    ) : null}
                </div>

                {/* Secondary — View profile link */}
                <button
                    onClick={() => navigate(`/tutor/${tutor._id}`)}
                    className="w-full py-2 text-[12px] font-medium text-gray-400 hover:text-gray-600 transition-colors text-center"
                >
                    View full profile →
                </button>
            </div>

            {showRegularBooking && (
                <RegularBookingModal tutor={tutor} onClose={() => setShowRegularBooking(false)} onSuccess={() => { setShowRegularBooking(false); onBookingSuccess?.(); }} />
            )}
            {showDedicatedModal && (
                <DedicatedTutorModal tutor={tutor} onClose={() => setShowDedicatedModal(false)} onSuccess={() => { setShowDedicatedModal(false); onBookingSuccess?.(); }} />
            )}
        </div>
    );
};

export default React.memo(TutorCard);
