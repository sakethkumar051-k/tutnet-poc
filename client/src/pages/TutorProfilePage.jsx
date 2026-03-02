import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import LoadingSkeleton from '../components/LoadingSkeleton';
import RequestDemoModal from '../components/RequestDemoModal';
import AvailabilityViewer from '../components/AvailabilityViewer';

const TutorProfilePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [tutor, setTutor] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDemoModal, setShowDemoModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [profileRes] = await Promise.all([
                    api.get(`/tutors/${id}`),
                    api.get(`/reviews/tutor/${id}`) // Assuming review endpoint accepts tutorProfile or userId, verification needed. 
                    // Based on code, reviews might be by tutor userId. 
                    // NOTE: TutorProfile.userId is what we usually use. 
                    // Let's check if 'id' param is TutorProfile ID. 
                    // getTutorById fetches TutorProfile.
                ]);

                setTutor(profileRes.data);

                // If reviews endpoint needs USER ID, we use profileRes.data.userId._id
                // But for now let's try fetching efficiently.
                if (profileRes.data.userId) {
                    const realReviews = await api.get(`/reviews/tutor/${profileRes.data.userId._id}`);
                    setReviews(realReviews.data);
                }
            } catch (err) {
                console.error('Error fetching tutor details:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    if (loading) {
        return (
            <div className="flex h-screen bg-gray-50">
                {user && <Sidebar user={user} />}
                <div className="flex-1 overflow-auto">
                    <div className="p-8 max-w-5xl mx-auto">
                        <LoadingSkeleton type="profile" />
                    </div>
                </div>
            </div>
        );
    }

    if (!tutor) {
        return (
            <div className="flex h-screen bg-gray-50 items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900">Tutor not found</h2>
                    <button onClick={() => navigate(-1)} className="mt-4 text-indigo-600 hover:text-indigo-800">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    // Helper for initials
    const getInitials = (name) => name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            {/* Conditionally render sidebar based on auth */}
            {user && <Sidebar user={user} activeTab="find-tutors" />}

            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
                        {/* Back Button */}
                        <button
                            onClick={() => navigate(-1)}
                            className="mb-6 flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors"
                        >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Tutors
                        </button>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left Column: Brief Info & Sticky CTA */}
                            <div className="lg:col-span-1 space-y-6">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center relative overflow-hidden">
                                    <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-500 absolute top-0 left-0 w-full"></div>

                                    <div className="relative mt-8 mb-4">
                                        {tutor.userId?.profilePicture ? (
                                            <img
                                                src={tutor.userId.profilePicture}
                                                alt={tutor.userId.name}
                                                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md mx-auto"
                                            />
                                        ) : (
                                            <div className="w-32 h-32 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-4xl border-4 border-white shadow-md mx-auto">
                                                {getInitials(tutor.userId?.name)}
                                            </div>
                                        )}
                                    </div>

                                    <h1 className="text-2xl font-bold text-gray-900">{tutor.userId?.name}</h1>
                                    <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-gray-600">
                                        {tutor.approvalStatus === 'approved' && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                Verified by TutNet
                                            </span>
                                        )}
                                        {tutor.approvalStatus === 'pending' && (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                                Pending verification
                                            </span>
                                        )}
                                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs uppercase font-semibold tracking-wide">
                                            {tutor.mode === 'both' ? 'Online & Home' : tutor.mode}
                                        </span>
                                    </div>
                                    {tutor.approvalStatus === 'approved' && tutor.updatedAt && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            Profile approved · Last reviewed {new Date(tutor.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    )}

                                    <div className="mt-6 flex justify-center items-center gap-8 border-t border-gray-50 pt-6">
                                        <div>
                                            <p className="text-2xl font-bold text-gray-900">₹{tutor.hourlyRate}</p>
                                            <p className="text-xs text-gray-400 uppercase tracking-wider">Per Hour</p>
                                        </div>
                                        <div className="w-px h-8 bg-gray-100"></div>
                                        <div>
                                            <p className="text-2xl font-bold text-gray-900">{tutor.experienceYears}</p>
                                            <p className="text-xs text-gray-400 uppercase tracking-wider">Years Exp</p>
                                        </div>
                                    </div>

                                    <div className="mt-8">
                                        <button
                                            onClick={() => setShowDemoModal(true)}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5"
                                        >
                                            Request Demo Class
                                        </button>
                                        <p className="text-xs text-gray-400 mt-3">Free 30-min session to get started</p>
                                    </div>
                                </div>

                                {/* Quick Stats */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Overview</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 text-sm">Review Rating</span>
                                            <div className="flex items-center font-bold text-gray-900">
                                                <span className="text-amber-500 mr-1">★</span>
                                                {tutor.averageRating?.toFixed(1) || '0.0'}
                                                <span className="text-gray-400 font-normal text-xs ml-1">({tutor.totalReviews || 0} reviews)</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 text-sm">Location</span>
                                            <span className="text-gray-900 font-medium text-sm text-right truncate pl-4">
                                                {tutor.userId?.location?.area}, {tutor.userId?.location?.city}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 text-sm">Languages</span>
                                            <span className="text-gray-900 font-medium text-sm text-right truncate pl-4">
                                                {tutor.languages?.join(', ') || 'English'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Trust & verification (parent/student visibility) */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Trust & Safety</h3>
                                    <div className="space-y-3">
                                        {tutor.approvalStatus === 'approved' ? (
                                            <>
                                                <div className="flex items-center gap-2.5 p-3 bg-green-50 rounded-lg border border-green-100">
                                                    <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    <div>
                                                        <p className="text-sm font-semibold text-green-800">Verified by TutNet</p>
                                                        <p className="text-xs text-green-700 mt-0.5">Reviewed and approved by our team</p>
                                                    </div>
                                                </div>
                                                <ul className="space-y-2 mt-1">
                                                    {['Identity confirmed', 'Qualifications reviewed', 'Profile completeness checked', 'Safe to book'].map(item => (
                                                        <li key={item} className="flex items-center gap-2 text-xs text-gray-700">
                                                            <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                            {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                                {tutor.tutorCode && (
                                                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-100 mt-2">
                                                        <span className="text-xs text-gray-500">Reference ID</span>
                                                        <span className="text-xs font-mono font-semibold text-gray-800">{tutor.tutorCode}</span>
                                                    </div>
                                                )}
                                                {tutor.updatedAt && (
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Last reviewed {new Date(tutor.updatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                    </p>
                                                )}
                                            </>
                                        ) : tutor.approvalStatus === 'pending' ? (
                                            <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-lg border border-amber-100">
                                                <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                                <div>
                                                    <p className="text-sm font-medium text-amber-800">Verification in progress</p>
                                                    <p className="text-xs text-amber-700 mt-0.5">Our team is reviewing this profile. All details and reviews are visible.</p>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Detailed Info */}
                            <div className="lg:col-span-2 space-y-8">
                                {/* About */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                                    <h2 className="text-xl font-bold text-gray-900 mb-4">About Me</h2>
                                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                                        {tutor.bio || "This tutor hasn't added a bio yet."}
                                    </p>
                                </div>

                                {/* Expertise */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                                    <h2 className="text-xl font-bold text-gray-900 mb-6">Expertise</h2>

                                    <div className="mb-6">
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Subjects</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {tutor.subjects?.map((subject, idx) => (
                                                <span key={idx} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
                                                    {subject}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Classes / Grades</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {tutor.classes?.map((cls, idx) => (
                                                <span key={idx} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                                                    {cls}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Availability */}
                                    {(tutor.weeklyAvailability?.length > 0 || tutor.availableSlots?.length > 0) && (
                                        <div className="mb-6">
                                            <AvailabilityViewer
                                                weeklyAvailability={tutor.weeklyAvailability}
                                                availableSlots={tutor.availableSlots}
                                            />
                                        </div>
                                    )}

                                    {/* Education */}
                                    {tutor.education && (tutor.education.degree || tutor.education.institution) && (
                                        <div className="mb-6">
                                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Education</h3>
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                {tutor.education.degree && (
                                                    <p className="text-gray-900 font-medium">{tutor.education.degree}</p>
                                                )}
                                                {tutor.education.institution && (
                                                    <p className="text-gray-600 text-sm mt-1">{tutor.education.institution}</p>
                                                )}
                                                {tutor.education.year && (
                                                    <p className="text-gray-500 text-xs mt-1">Year: {tutor.education.year}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Qualifications */}
                                    {tutor.qualifications && tutor.qualifications.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Qualifications</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {tutor.qualifications.map((qual, idx) => (
                                                    <span key={idx} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium">
                                                        {qual}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Availability */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                                    <h2 className="text-xl font-bold text-gray-900 mb-4">Availability</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {tutor.availableSlots?.length > 0 ? (
                                            tutor.availableSlots.map((slot, idx) => (
                                                <div key={idx} className="flex items-center p-3 border border-gray-100 rounded-lg bg-gray-50">
                                                    <span className="text-green-500 mr-2">●</span>
                                                    <span className="text-gray-700 text-sm font-medium">{slot}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-gray-500 italic">Contact for availability</p>
                                        )}
                                    </div>
                                </div>

                                {/* Reviews */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xl font-bold text-gray-900">Student Reviews</h2>
                                        {reviews.length > 0 && (
                                            <span className="text-sm text-gray-500">
                                                Showing {reviews.length} reviews
                                            </span>
                                        )}
                                    </div>

                                    {reviews.length > 0 ? (
                                        <div className="space-y-6">
                                            {reviews.map((review) => (
                                                <div key={review._id} className="border-b border-gray-50 last:border-0 pb-6 last:pb-0">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                                                {getInitials(review.studentId?.name)}
                                                            </div>
                                                            <span className="font-semibold text-gray-900 text-sm">{review.studentId?.name}</span>
                                                        </div>
                                                        <span className="text-xs text-gray-400">
                                                            {new Date(review.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center mb-2">
                                                        {[...Array(5)].map((_, i) => (
                                                            <span key={i} className={`text-sm ${i < review.rating ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                                                        ))}
                                                    </div>
                                                    <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <p className="text-gray-400">No reviews yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Modal */}
            {showDemoModal && (
                <RequestDemoModal
                    tutor={tutor}
                    onClose={() => setShowDemoModal(false)}
                    onSuccess={() => {
                        // Optional: Navigate to requests/dashboard
                    }}
                />
            )}
        </div>
    );
};

export default TutorProfilePage;
