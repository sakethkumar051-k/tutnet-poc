import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const StarRating = ({ rating }) => (
    <span className="flex items-center gap-1">
        <svg className="w-3.5 h-3.5 text-lime-dark fill-amber-400" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <span className="text-xs font-semibold text-gray-700">{rating}</span>
    </span>
);

export default function RecommendedTutors() {
    const navigate = useNavigate();
    const [tutors, setTutors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/tutors/recommendations')
            .then(res => setTutors(res.data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
                <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="border border-gray-100 rounded-xl p-4 animate-pulse space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-gray-100" />
                            <div className="space-y-1.5">
                                <div className="h-3.5 w-28 bg-gray-100 rounded" />
                                <div className="h-3 w-20 bg-gray-100 rounded" />
                            </div>
                        </div>
                        <div className="h-3 w-full bg-gray-100 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );

    if (tutors.length === 0) return null;

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            {/* Section header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h3 className="text-base font-bold text-navy-950 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-royal/10 flex items-center justify-center text-sm">✨</span>
                        Recommended for You
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Matched based on your class, subjects & location</p>
                </div>
                <button
                    onClick={() => navigate('/find-tutors')}
                    className="text-xs font-semibold text-royal hover:text-navy-900 transition-colors flex items-center gap-1"
                >
                    View all
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tutors.map((t) => {
                    const initials = t.userId?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
                    const subjects = t.subjects?.slice(0, 3) || [];
                    const location = t.userId?.location;
                    const city = location?.city || '';
                    const area = location?.area || '';
                    const locationStr = [area, city].filter(Boolean).join(', ');

                    return (
                        <div
                            key={t._id}
                            className="group border border-gray-100 rounded-xl p-4 hover:border-royal/30 hover:shadow-md transition-all duration-200 cursor-pointer"
                            onClick={() => navigate(`/tutor/${t.userId?._id}`)}
                        >
                            {/* Avatar + name */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-11 h-11 rounded-full bg-royal/10 flex items-center justify-center text-royal-dark font-bold text-sm flex-shrink-0 group-hover:bg-royal/20 transition-colors">
                                    {initials}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-navy-950 truncate">{t.userId?.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {t._avgRating ? (
                                            <StarRating rating={t._avgRating} />
                                        ) : (
                                            <span className="text-xs text-gray-400">New tutor</span>
                                        )}
                                        {t._reviewCount > 0 && (
                                            <span className="text-xs text-gray-400">({t._reviewCount})</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Subjects */}
                            {subjects.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {subjects.map((s, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-royal/5 text-royal-dark text-xs font-medium rounded-md border border-royal/20">
                                            {s}
                                        </span>
                                    ))}
                                    {t.subjects?.length > 3 && (
                                        <span className="text-xs text-gray-400">+{t.subjects.length - 3}</span>
                                    )}
                                </div>
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                    {locationStr && (
                                        <>
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span className="truncate max-w-[100px]">{locationStr}</span>
                                        </>
                                    )}
                                </div>
                                {t.hourlyRate && (
                                    <span className="text-xs font-semibold text-gray-700">₹{t.hourlyRate}/hr</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
