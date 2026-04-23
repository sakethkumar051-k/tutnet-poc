import React, { useState, useCallback } from 'react';
import api from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { useAuthModalStore } from '../stores/authModalStore';
import { useNavigate } from 'react-router-dom';
import RegularBookingModal from './RegularBookingModal';
import DedicatedTutorModal from './DedicatedTutorModal';
import { formatPresence } from '../utils/presence';

const getInitials = (name) =>
    name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'T';

const GRADIENTS = [
    'from-navy-950 to-royal',
    'from-royal to-navy-900',
    'from-navy-900 to-navy-950',
    'from-royal to-navy-950',
    'from-navy-950 to-royal',
    'from-navy-900 to-royal',
];

const getGradient = (name) => {
    const hash = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return GRADIENTS[hash % GRADIENTS.length];
};

const TutorCard = ({ tutor, onRequestDemo, onFavoriteChange, onBookingSuccess }) => {
    const [showRegularBooking, setShowRegularBooking] = useState(false);
    const [showDedicatedModal, setShowDedicatedModal] = useState(false);
    const user = useAuthStore((s) => s.user);
    const showSuccess = useToastStore((s) => s.showSuccess);
    const showError = useToastStore((s) => s.showError);
    const openLogin = useAuthModalStore((s) => s.openLogin);
    const navigate = useNavigate();

    const isFavorite = tutor.isFavorited ?? false;
    const trialStatus = tutor.trialStatus ?? { status: null, count: 0, maxReached: false, hasTriedTutor: false };

    const requireAuth = (msg) => {
        if (!user) { openLogin(msg); return false; }
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
    const loc = tutor.userId?.location;
    const locationStr = loc?.area || loc?.city || '';
    const subjects = tutor.subjects || [];
    const name = tutor.userId?.name || 'Tutor';
    const isNew = reviewCount === 0;
    const isVerified = tutor.approvalStatus === 'approved';
    const modeLabel = tutor.mode === 'online' ? 'Online' : tutor.mode === 'home' ? 'Home' : 'Hybrid';
    const presence = formatPresence(tutor.userId?.lastSeenAt);

    const handleDedicated = () => { if (requireAuth('Sign in to request a dedicated tutor')) setShowDedicatedModal(true); };
    const handleDemo = () => { if (requireAuth('Sign in to book a free trial class')) onRequestDemo(tutor); };

    // Build meta items as array then join with dots — avoids messy conditional dot logic
    const metaItems = [];
    if (isVerified) metaItems.push({ type: 'verified' });
    if (isNew) metaItems.push({ type: 'new' });
    if (tutor.experienceYears > 0) metaItems.push({ type: 'text', value: `${tutor.experienceYears}+ yrs` });
    metaItems.push({ type: 'text', value: modeLabel });
    if (locationStr) metaItems.push({ type: 'text', value: locationStr });

    return (
        <div className="group relative bg-white rounded-3xl border border-gray-100 transition-all duration-300 ease-out hover:shadow-[0_12px_40px_-10px_rgba(30,58,138,0.18)] hover:border-gray-200 hover:-translate-y-0.5 flex flex-col w-full overflow-hidden">

            {/* ── Banner (gradient only — overflow-hidden stays here) ── */}
            <div className="relative h-24 overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${getGradient(name)}`} />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08),transparent_60%)]" />

                {/* Price */}
                {tutor.hourlyRate > 0 && (
                    <div className="absolute top-3 left-4 z-10 inline-flex items-baseline gap-1 px-3 py-1 rounded-full bg-lime text-navy-950">
                        <span className="font-extrabold text-[13px]">₹{tutor.hourlyRate}</span>
                        <span className="text-[10px] font-bold">/hr</span>
                    </div>
                )}

                {/* Heart */}
                <button
                    onClick={toggleFavorite}
                    className={`absolute top-3 right-3 z-10 p-1.5 rounded-full transition-all duration-200 ${
                        isFavorite
                            ? 'bg-white text-rose-500 shadow-sm'
                            : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                    }`}
                    aria-label="Save tutor"
                >
                    <svg className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                </button>
            </div>

            {/* ── Avatar (lives OUTSIDE banner so it's never clipped) ── */}
            <div className="relative z-10 -mt-7 ml-5 w-fit">
                {tutor.userId?.profilePicture ? (
                    <img src={tutor.userId.profilePicture} alt={name}
                        className="w-14 h-14 rounded-2xl object-cover ring-4 ring-white shadow-md" />
                ) : (
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getGradient(name)} flex items-center justify-center text-white font-extrabold text-lg ring-4 ring-white shadow-md`}>
                        {getInitials(name)}
                    </div>
                )}
                {isVerified && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-lime rounded-md border-[2px] border-white flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </span>
                )}
            </div>

            {/* ── Body ────────────────────────────────────────────── */}
            <div className="pt-3 px-5 pb-3 flex-1">
                {/* Name + rating */}
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[15px] font-bold text-navy-950 truncate leading-snug cursor-pointer hover:text-royal transition-colors"
                        onClick={() => navigate(`/tutor/${tutor._id}`)}>
                        {name}
                    </h3>
                    {avgRating > 0 && (
                        <span className="flex items-center gap-0.5 text-[12px] font-bold text-navy-950 flex-shrink-0">
                            <svg className="w-3.5 h-3.5 text-lime-dark" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {avgRating.toFixed(1)}
                        </span>
                    )}
                </div>

                {/* Meta line — dot-separated, clean alignment */}
                {presence.label && (
                    <p className={`text-[10px] font-semibold mt-1 ${presence.isActive ? 'text-lime-dark' : 'text-gray-400'}`}>
                        {presence.isActive ? '● ' : ''}{presence.label}
                    </p>
                )}
                <div className="flex items-center gap-0 mt-1 flex-wrap leading-none">
                    {metaItems.map((item, i) => (
                        <span key={i} className="flex items-center">
                            {i > 0 && <span className="mx-1 text-gray-300 text-[10px]">·</span>}
                            {item.type === 'verified' ? (
                                <span className="inline-flex items-center gap-0.5 text-royal text-[10px] font-bold leading-none">
                                    <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Verified
                                </span>
                            ) : item.type === 'new' ? (
                                <span className="text-[10px] font-bold text-lime-dark leading-none">New</span>
                            ) : (
                                <span className="text-[11px] text-gray-400 leading-none truncate max-w-[100px]">{item.value}</span>
                            )}
                        </span>
                    ))}
                </div>

                {/* Subjects */}
                <div className="flex flex-wrap items-center gap-1.5 mt-3 min-h-[28px]">
                    {subjects.slice(0, 3).map((s, i) => (
                        <span key={i} className="px-2.5 py-1 text-[11px] font-semibold text-royal bg-royal/10 rounded-full leading-none">
                            {s}
                        </span>
                    ))}
                    {subjects.length > 3 && (
                        <span className="px-1 py-1 text-[11px] text-gray-400 font-semibold leading-none">+{subjects.length - 3}</span>
                    )}
                </div>
            </div>

            {/* ── Actions ─────────────────────────────────────────── */}
            <div className="px-5 pb-5 pt-0 flex gap-2">
                <button onClick={handleDedicated}
                    className="flex-1 py-2.5 rounded-full bg-navy-950 text-white text-[12px] font-bold hover:bg-navy-900 active:scale-[0.98] transition-all">
                    Request Tutor
                </button>
                {(!user || !trialStatus.hasTriedTutor) ? (
                    <button onClick={handleDemo}
                        className="py-2.5 px-4 rounded-full bg-lime text-navy-950 text-[12px] font-bold hover:bg-lime-light active:scale-[0.98] transition-all">
                        Free Trial
                    </button>
                ) : trialStatus.status === 'pending' ? (
                    <span className="py-2.5 px-4 rounded-full bg-lime/20 text-navy-950 text-[12px] font-bold border border-lime/40">
                        Pending
                    </span>
                ) : trialStatus.status === 'approved' ? (
                    <button onClick={() => navigate('/student-dashboard?tab=sessions')}
                        className="py-2.5 px-4 rounded-full bg-royal/10 text-royal text-[12px] font-bold hover:bg-royal/20 border border-royal/20 transition-colors">
                        Booked
                    </button>
                ) : null}
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
