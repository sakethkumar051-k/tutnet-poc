import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const TutorCredibilityPanel = () => {
    const [profile, setProfile] = useState(null);
    const [reviews, setReviews]  = useState([]);
    const [loading, setLoading]  = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        Promise.all([
            api.get('/tutors/my-profile'),
            api.get('/reviews').catch(() => ({ data: [] }))
        ]).then(([profileRes, reviewsRes]) => {
            setProfile(profileRes.data);
            setReviews(reviewsRes.data || []);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) return null;
    if (!profile) return null;

    // Profile completeness scoring
    const checks = [
        { label: 'Bio written',           done: !!profile.bio && profile.bio.length > 20 },
        { label: 'Subjects added',        done: profile.subjects?.length > 0 },
        { label: 'Classes listed',        done: profile.classes?.length > 0 },
        { label: 'Education added',       done: !!(profile.education?.degree || profile.education?.institution) },
        { label: 'Availability set',      done: profile.availableSlots?.length > 0 },
        { label: 'Hourly rate set',       done: profile.hourlyRate > 0 },
        { label: 'Profile approved',      done: profile.approvalStatus === 'approved' },
        { label: 'Languages listed',      done: profile.languages?.length > 0 }
    ];
    const doneCount = checks.filter(c => c.done).length;
    const strength  = Math.round((doneCount / checks.length) * 100);

    const statusColor = {
        approved: { bg: 'bg-lime/30', text: 'text-navy-950', dot: 'bg-lime', label: 'Verified & Approved' },
        pending:  { bg: 'bg-lime/30',  text: 'text-navy-950',  dot: 'bg-lime',  label: 'Pending Verification' },
        rejected: { bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500',    label: 'Rejected — Action Required' }
    }[profile.approvalStatus] || { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400', label: 'Unknown' };

    const avgRating = reviews.length
        ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
        : null;

    const barColor = strength >= 80 ? 'bg-lime' : strength >= 50 ? 'bg-royal/50' : 'bg-lime';

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-base font-bold text-navy-950">Profile Credibility</h3>
                        <p className="text-sm text-gray-500 mt-0.5">How parents and students see you</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusColor.bg} ${statusColor.text}`}>
                        <span className={`w-2 h-2 rounded-full ${statusColor.dot}`} />
                        {statusColor.label}
                    </span>
                </div>

                {/* Strength bar */}
                <div className="mt-4">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">Profile strength</span>
                        <span className={`text-xs font-bold ${strength >= 80 ? 'text-navy-950' : strength >= 50 ? 'text-royal-dark' : 'text-navy-950'}`}>
                            {strength}%
                        </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${strength}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Key stats row */}
            <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
                <div className="px-5 py-4 text-center">
                    <p className="text-2xl font-bold text-navy-950">{profile.experienceYears || 0}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Yrs experience</p>
                </div>
                <div className="px-5 py-4 text-center">
                    <p className="text-2xl font-bold text-lime-dark">{avgRating ?? '—'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="px-5 py-4 text-center">
                    <p className="text-2xl font-bold text-royal-dark">₹{profile.hourlyRate || '—'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">per hour</p>
                </div>
            </div>

            {/* Checklist */}
            <div className="px-6 py-4">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Completeness checklist</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {checks.map(c => (
                        <div key={c.label} className="flex items-center gap-2">
                            {c.done ? (
                                <svg className="w-4 h-4 text-navy-9500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                                </svg>
                            )}
                            <span className={`text-xs ${c.done ? 'text-gray-700' : 'text-gray-400'}`}>{c.label}</span>
                        </div>
                    ))}
                </div>

                {strength < 100 && (
                    <button
                        onClick={() => navigate('/tutor-dashboard?tab=profile')}
                        className="mt-4 w-full py-2.5 bg-royal hover:bg-royal-dark text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                        Complete your profile →
                    </button>
                )}
            </div>

            {/* Subjects & mode */}
            {(profile.subjects?.length > 0 || profile.education?.degree) && (
                <div className="px-6 pb-5 space-y-3 border-t border-gray-100 pt-4">
                    {profile.subjects?.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Subjects</p>
                            <div className="flex flex-wrap gap-1.5">
                                {profile.subjects.map(s => (
                                    <span key={s} className="px-2.5 py-1 bg-royal/5 text-royal-dark rounded-lg text-xs font-medium border border-royal/20">{s}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {profile.education?.degree && (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Education</p>
                            <p className="text-sm text-gray-800 font-medium">{profile.education.degree}</p>
                            {profile.education.institution && <p className="text-xs text-gray-500">{profile.education.institution}</p>}
                        </div>
                    )}
                    {profile.tutorCode && (
                        <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
                            <span className="text-xs text-gray-500">Your TutNet ID</span>
                            <span className="text-xs font-mono font-bold text-gray-800">{profile.tutorCode}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TutorCredibilityPanel;
