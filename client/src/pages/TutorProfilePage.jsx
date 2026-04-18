import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import { useAuthModalStore } from '../stores/authModalStore';
import LoadingSpinner from '../components/LoadingSpinner';
import RequestDemoModal from '../components/RequestDemoModal';
import DedicatedTutorModal from '../components/DedicatedTutorModal';
import AvailabilityViewer from '../components/AvailabilityViewer';

const GRADIENTS = [
    'from-navy-950 to-royal',
    'from-royal to-navy-900',
    'from-navy-900 to-navy-950',
    'from-royal to-navy-950',
];

const getGradient = (name) => {
    const hash = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return GRADIENTS[hash % GRADIENTS.length];
};

const getInitials = (name) =>
    name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'T';

const SectionCard = ({ title, eyebrow, children }) => (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8">
        {eyebrow && <p className="text-xs font-bold tracking-[0.2em] uppercase text-royal mb-3">{eyebrow}</p>}
        {title && <h2 className="text-xl font-extrabold text-navy-950 mb-5 tracking-tight">{title}</h2>}
        {children}
    </div>
);

const TutorProfilePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const openLogin = useAuthModalStore((s) => s.openLogin);
    const [tutor, setTutor] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalType, setModalType] = useState(null); // 'trial' | 'dedicated' | null

    useEffect(() => {
        const fetchData = async () => {
            try {
                const profileRes = await api.get(`/tutors/${id}`);
                setTutor(profileRes.data);
                if (profileRes.data.userId) {
                    const reviewsRes = await api.get(`/reviews/tutor/${profileRes.data.userId._id}`);
                    setReviews(reviewsRes.data);
                }
            } catch (err) {
                console.error('Error fetching tutor:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const openBooking = (type) => {
        if (!user) { openLogin(type === 'trial' ? 'Sign in to book a free trial class' : 'Sign in to request this tutor'); return; }
        if (user.role !== 'student') return;
        setModalType(type);
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center bg-[#f7f7f7]">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!tutor) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center bg-[#f7f7f7]">
                <div className="text-center">
                    <h2 className="text-lg font-extrabold text-navy-950">Tutor not found</h2>
                    <button onClick={() => navigate(-1)} className="mt-3 text-sm text-gray-500 hover:text-navy-950 transition-colors">
                        ← Go back
                    </button>
                </div>
            </div>
        );
    }

    const name = tutor.userId?.name || 'Tutor';
    const isVerified = tutor.approvalStatus === 'approved';
    const loc = tutor.userId?.location;
    const locationStr = [loc?.area, loc?.city].filter(Boolean).join(', ');
    const modeLabel = tutor.mode === 'online' ? 'Online' : tutor.mode === 'home' ? 'Home tutoring' : 'Online & Home';
    const avgRating = tutor.averageRating || 0;
    const totalReviews = tutor.totalReviews || reviews.length || 0;

    return (
        <div className="bg-[#f7f7f7] min-h-[calc(100vh-72px)] font-sans">
            {/* ═════════ HERO ═════════ */}
            <section className="relative overflow-hidden bg-navy-950">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-24 -right-10 w-[420px] h-[420px] bg-royal/25 rounded-full blur-[120px]" />
                    <div className="absolute -bottom-24 -left-10 w-[320px] h-[320px] bg-lime/10 rounded-full blur-[120px]" />
                </div>

                <div className="max-w-[1200px] mx-auto px-6 lg:px-10 pt-10 pb-28 relative z-10">
                    <button onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/80 text-xs font-semibold hover:bg-white/20 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to tutors
                    </button>

                    <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-end gap-6">
                        {/* Avatar */}
                        {tutor.userId?.profilePicture ? (
                            <img src={tutor.userId.profilePicture} alt={name}
                                className="w-24 h-24 rounded-3xl object-cover ring-4 ring-white/20 shadow-xl flex-shrink-0" />
                        ) : (
                            <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${getGradient(name)} flex items-center justify-center text-white font-extrabold text-3xl ring-4 ring-white/20 shadow-xl flex-shrink-0`}>
                                {getInitials(name)}
                            </div>
                        )}

                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                {isVerified && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-lime/20 text-lime text-[10px] font-bold uppercase tracking-wider">
                                        <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Verified
                                    </span>
                                )}
                                <span className="text-xs font-semibold text-gray-400">{modeLabel}</span>
                                {locationStr && <><span className="text-gray-500">·</span><span className="text-xs font-semibold text-gray-400">{locationStr}</span></>}
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight">
                                {name}
                            </h1>
                            {tutor.subjects?.length > 0 && (
                                <p className="mt-2 text-gray-400 text-sm">
                                    Teaches {tutor.subjects.slice(0, 3).join(', ')}
                                    {tutor.subjects.length > 3 && ` +${tutor.subjects.length - 3} more`}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═════════ BODY ═════════ */}
            <section className="max-w-[1200px] mx-auto px-6 lg:px-10 -mt-20 relative z-10 pb-16">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── Left — sticky booking card ── */}
                    <div className="lg:col-span-1 lg:sticky lg:top-24 self-start space-y-5">
                        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_12px_40px_-20px_rgba(30,58,138,0.25)]">
                            {/* Stats row */}
                            <div className="grid grid-cols-3 gap-2 pb-5 border-b border-gray-100">
                                <div>
                                    <p className="text-2xl font-extrabold text-navy-950">₹{tutor.hourlyRate || '—'}</p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mt-1">Per hour</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-extrabold text-navy-950">{tutor.experienceYears || 0}y</p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mt-1">Experience</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-extrabold text-navy-950 flex items-baseline gap-0.5">
                                        {avgRating > 0 ? avgRating.toFixed(1) : '—'}
                                        <svg className="w-3.5 h-3.5 text-lime-dark" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    </p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mt-1">{totalReviews} reviews</p>
                                </div>
                            </div>

                            {/* Primary CTA */}
                            <button
                                onClick={() => openBooking('trial')}
                                className="mt-5 w-full py-3 rounded-full bg-lime hover:bg-lime-light text-navy-950 text-sm font-bold transition-colors shadow-sm">
                                Book a free trial
                            </button>
                            <p className="text-[11px] text-gray-400 text-center mt-2">30-min session · No payment needed</p>

                            {/* Divider with "or" */}
                            <div className="relative my-4 flex items-center">
                                <div className="flex-1 border-t border-gray-100" />
                                <span className="px-3 text-[10px] font-bold text-gray-300 uppercase tracking-[0.15em]">or</span>
                                <div className="flex-1 border-t border-gray-100" />
                            </div>

                            {/* Secondary CTA */}
                            <button
                                onClick={() => openBooking('dedicated')}
                                className="w-full py-3 rounded-full bg-navy-950 hover:bg-navy-900 text-white text-sm font-bold transition-colors">
                                Request as dedicated tutor
                            </button>
                        </div>

                        {/* Details card */}
                        <div className="bg-white rounded-3xl border border-gray-100 p-6">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Details</p>
                            <div className="space-y-3 text-sm">
                                {locationStr && (
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-gray-500">Location</span>
                                        <span className="font-semibold text-navy-950 text-right truncate max-w-[60%]">{locationStr}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Mode</span>
                                    <span className="font-semibold text-navy-950">{modeLabel}</span>
                                </div>
                                {tutor.languages?.length > 0 && (
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-gray-500">Languages</span>
                                        <span className="font-semibold text-navy-950 text-right truncate max-w-[60%]">{tutor.languages.join(', ')}</span>
                                    </div>
                                )}
                            </div>
                            {isVerified && (
                                <div className="mt-5 pt-5 border-t border-gray-100">
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Trust &amp; Safety</p>
                                    <ul className="space-y-2">
                                        {['Identity confirmed', 'Qualifications reviewed', 'Profile verified by Tutnet'].map(item => (
                                            <li key={item} className="flex items-center gap-2 text-xs text-gray-600">
                                                <span className="w-4 h-4 rounded-full bg-lime flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-2.5 h-2.5 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Right — details ── */}
                    <div className="lg:col-span-2 space-y-6">
                        <SectionCard title="About">
                            <p className="text-[15px] text-gray-600 leading-relaxed whitespace-pre-line">
                                {tutor.bio || "This tutor hasn't added a bio yet."}
                            </p>
                        </SectionCard>

                        <SectionCard title="Expertise">
                            {tutor.subjects?.length > 0 && (
                                <div className="mb-5">
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Subjects</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {tutor.subjects.map((s, i) => (
                                            <span key={i} className="px-3 py-1.5 text-xs font-semibold text-royal bg-royal/10 rounded-full">{s}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {tutor.classes?.length > 0 && (
                                <div className="mb-5">
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Classes</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {tutor.classes.map((c, i) => (
                                            <span key={i} className="px-3 py-1.5 text-xs font-semibold text-navy-950 bg-gray-100 rounded-full">{c}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {tutor.education && (tutor.education.degree || tutor.education.institution) && (
                                <div className="mb-5">
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Education</p>
                                    <div className="bg-[#f7f7f7] rounded-2xl p-4">
                                        {tutor.education.degree && <p className="text-sm font-bold text-navy-950">{tutor.education.degree}</p>}
                                        {tutor.education.institution && <p className="text-xs text-gray-500 mt-0.5">{tutor.education.institution}</p>}
                                    </div>
                                </div>
                            )}

                            {tutor.qualifications?.length > 0 && (
                                <div>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Qualifications</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {tutor.qualifications.map((q, i) => (
                                            <span key={i} className="px-3 py-1.5 text-xs font-semibold text-navy-950 bg-gray-100 rounded-full">{q}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </SectionCard>

                        {(tutor.weeklyAvailability?.length > 0 || tutor.availableSlots?.length > 0) && (
                            <SectionCard title="Availability">
                                <AvailabilityViewer weeklyAvailability={tutor.weeklyAvailability} availableSlots={tutor.availableSlots} />
                            </SectionCard>
                        )}

                        <SectionCard title={`Reviews${reviews.length > 0 ? ` · ${reviews.length}` : ''}`}>
                            {reviews.length > 0 ? (
                                <div className="space-y-5">
                                    {reviews.map((review) => (
                                        <div key={review._id} className="border-b border-gray-100 last:border-0 pb-5 last:pb-0">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-navy-950 to-royal flex items-center justify-center text-[10px] font-bold text-white">
                                                        {getInitials(review.studentId?.name)}
                                                    </div>
                                                    <span className="text-sm font-bold text-navy-950">{review.studentId?.name}</span>
                                                </div>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-0.5 mb-2">
                                                {[...Array(5)].map((_, i) => (
                                                    <svg key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'text-lime-dark' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                ))}
                                            </div>
                                            {review.comment && (
                                                <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 text-center py-6">No reviews yet</p>
                            )}
                        </SectionCard>
                    </div>
                </div>
            </section>

            {modalType === 'trial' && (
                <RequestDemoModal tutor={tutor} onClose={() => setModalType(null)} onSuccess={() => setModalType(null)} />
            )}
            {modalType === 'dedicated' && (
                <DedicatedTutorModal tutor={tutor} onClose={() => setModalType(null)} onSuccess={() => setModalType(null)} />
            )}
        </div>
    );
};

export default TutorProfilePage;
