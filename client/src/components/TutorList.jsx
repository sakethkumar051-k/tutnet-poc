import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import api from '../utils/api';
import TutorCard from './TutorCard';
import RequestDemoModal from './RequestDemoModal';
import TutorSearch from './TutorSearch';

/* Skeleton matching the new card design */
const CardSkeleton = () => (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 animate-pulse">
        <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex-shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 bg-gray-100 rounded-lg w-3/5" />
                <div className="flex gap-2">
                    <div className="h-4 w-16 bg-teal-50 rounded-full" />
                    <div className="h-4 w-12 bg-amber-50 rounded-full" />
                </div>
            </div>
        </div>
        <div className="flex gap-2">
            <div className="h-3 w-20 bg-gray-50 rounded" />
            <div className="h-3 w-24 bg-gray-50 rounded" />
            <div className="h-3 w-16 bg-gray-50 rounded" />
        </div>
        <div className="flex gap-2">
            {[1,2,3].map(i => <div key={i} className="h-7 w-20 bg-gray-50 rounded-lg" />)}
        </div>
        <div className="h-5 w-20 bg-gray-100 rounded" />
        <div className="flex gap-2 pt-1">
            <div className="flex-1 h-10 bg-gray-100 rounded-xl" />
            <div className="h-10 w-24 bg-teal-50 rounded-xl" />
        </div>
    </div>
);

const SORT_OPTIONS = [
    { label: 'Best Match',       value: 'match' },
    { label: 'Highest Rated',    value: 'rating' },
    { label: 'Most Experienced', value: 'experience' },
    { label: 'Lowest Price',     value: 'price_asc' },
    { label: 'Highest Price',    value: 'price_desc' },
];

const EMPTY_FILTERS = {
    subject: '', class: '', area: '', minRate: '', maxRate: '',
    mode: 'all', minExperience: '', minRating: '', verifiedOnly: false,
};

const TutorList = () => {
    const [tutors, setTutors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTutor, setSelectedTutor] = useState(null);
    const [sort, setSort] = useState('match');
    const [activeFilters, setActiveFilters] = useState(EMPTY_FILTERS);
    const fetchStarted = useRef(false);

    const fetchTutors = useCallback(async (filters = EMPTY_FILTERS) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.subject)       params.append('subject',       filters.subject);
            if (filters.class)         params.append('class',         filters.class);
            if (filters.area)          params.append('area',          filters.area);
            if (filters.minRate)       params.append('minRate',       filters.minRate);
            if (filters.maxRate)       params.append('maxRate',       filters.maxRate);
            if (filters.mode && filters.mode !== 'all') params.append('mode', filters.mode);
            if (filters.minExperience) params.append('minExperience', filters.minExperience);
            if (filters.minRating)     params.append('minRating',     filters.minRating);

            const { data } = await api.get(`/tutors?${params.toString()}`);
            const result = filters.verifiedOnly
                ? data.filter(t => t.approvalStatus === 'approved')
                : data;
            setTutors(result);
            setActiveFilters(filters);
        } catch (err) {
            console.error('Error fetching tutors:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (fetchStarted.current) return;
        fetchStarted.current = true;
        fetchTutors();
    }, [fetchTutors]);

    const sorted = useMemo(() => {
        const arr = [...tutors];
        if (sort === 'rating')      return arr.sort((a,b) => (b.averageRating||0) - (a.averageRating||0));
        if (sort === 'experience')  return arr.sort((a,b) => (b.experienceYears||0) - (a.experienceYears||0));
        if (sort === 'price_asc')   return arr.sort((a,b) => (a.hourlyRate||0) - (b.hourlyRate||0));
        if (sort === 'price_desc')  return arr.sort((a,b) => (b.hourlyRate||0) - (a.hourlyRate||0));
        return arr;
    }, [tutors, sort]);

    const onFavoriteChange = useCallback((tutorUserId, isFavorite) => {
        setTutors(prev => prev.map(t => {
            const id = t.userId?._id?.toString?.() ?? t.userId?.toString?.();
            if (id !== (tutorUserId?.toString?.() ?? tutorUserId)) return t;
            return { ...t, isFavorited: isFavorite };
        }));
    }, []);

    const onRequestDemo = useCallback((tutor) => setSelectedTutor(tutor), []);

    const onBookingSuccess = useCallback(() => {
        fetchTutors(activeFilters);
    }, [fetchTutors, activeFilters]);

    return (
        <div className="space-y-5">
            {/* Search filters */}
            <TutorSearch onSearch={fetchTutors} />

            {/* Results bar */}
            <div className="flex items-center justify-between">
                <p className="text-[13px] text-gray-500">
                    {loading ? (
                        <span className="inline-block w-20 h-4 bg-gray-100 rounded animate-pulse" />
                    ) : (
                        <span>
                            Showing <span className="font-semibold text-gray-900">{sorted.length}</span> tutor{sorted.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </p>
                <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-gray-400 font-medium hidden sm:block">Sort by</span>
                    <select
                        value={sort}
                        onChange={e => setSort(e.target.value)}
                        className="text-[12px] border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-300 cursor-pointer"
                    >
                        {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {[1,2,3,4,5,6].map(i => <CardSkeleton key={i} />)}
                </div>
            ) : sorted.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">No tutors found</h3>
                    <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto">
                        Try adjusting your filters to discover more tutors
                    </p>
                    <button
                        onClick={() => fetchTutors(EMPTY_FILTERS)}
                        className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
                    >
                        Clear all filters
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {sorted.map((tutor, i) => (
                        <div
                            key={tutor._id}
                            className="animate-fade-in-up"
                            style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
                        >
                            <TutorCard
                                tutor={tutor}
                                onRequestDemo={onRequestDemo}
                                onFavoriteChange={onFavoriteChange}
                                onBookingSuccess={onBookingSuccess}
                            />
                        </div>
                    ))}
                </div>
            )}

            {selectedTutor && (
                <RequestDemoModal
                    tutor={selectedTutor}
                    onClose={() => setSelectedTutor(null)}
                    onSuccess={() => setSelectedTutor(null)}
                />
            )}
        </div>
    );
};

export default TutorList;
