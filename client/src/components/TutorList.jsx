import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import api from '../utils/api';
import TutorCard from './TutorCard';
import RequestDemoModal from './RequestDemoModal';
import TutorSearch from './TutorSearch';

const CardSkeleton = () => (
    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden animate-pulse">
        <div className="h-24 bg-gradient-to-br from-gray-200 to-gray-100" />
        <div className="pt-8 px-5 pb-5 space-y-2.5">
            <div className="h-4 bg-gray-100 rounded w-3/5" />
            <div className="h-3 bg-gray-50 rounded w-4/5" />
            <div className="flex gap-1 pt-0.5">
                {[1,2].map(i => <div key={i} className="h-5 w-16 bg-gray-50 rounded-md" />)}
            </div>
            <div className="flex gap-2 pt-1">
                <div className="flex-1 h-9 bg-gray-100 rounded-lg" />
                <div className="h-9 w-20 bg-gray-100 rounded-lg" />
            </div>
        </div>
    </div>
);

const SORT_OPTIONS = [
    { label: 'Best Match',       value: 'match' },
    { label: 'Highest Rated',    value: 'rating' },
    { label: 'Most Experienced', value: 'experience' },
    { label: 'Price: Low → High', value: 'price_asc' },
    { label: 'Price: High → Low', value: 'price_desc' },
];

const EMPTY_FILTERS = {
    subject: '', class: '', area: '', minRate: '', maxRate: '',
    mode: 'all', minExperience: '', minRating: '', verifiedOnly: false,
};

const TutorList = () => {
    const [tutors, setTutors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [selectedTutor, setSelectedTutor] = useState(null);
    const [sort, setSort] = useState('match');
    const [activeFilters, setActiveFilters] = useState(EMPTY_FILTERS);
    const fetchStarted = useRef(false);

    const fetchTutors = useCallback(async (filters = EMPTY_FILTERS) => {
        setLoading(true);
        setFetchError(null);
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
            const msg = err?.response?.data?.message
                || err?.message
                || 'Could not load tutors. Check your connection and try again.';
            setFetchError(msg);
            setTutors([]);
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
            <TutorSearch onSearch={fetchTutors} />

            {/* Results bar */}
            <div className="flex items-center justify-between px-1">
                <p className="text-[13px] text-gray-500">
                    {loading ? (
                        <span className="inline-block w-24 h-4 bg-gray-100 rounded animate-pulse" />
                    ) : (
                        <>
                            <span className="font-extrabold text-navy-950 text-base">{sorted.length}</span>
                            <span className="ml-1">tutor{sorted.length !== 1 ? 's' : ''} available</span>
                        </>
                    )}
                </p>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400 font-semibold hidden sm:block uppercase tracking-wider">Sort</span>
                    <select
                        value={sort}
                        onChange={e => setSort(e.target.value)}
                        className="text-[12px] border border-gray-200 rounded-full px-3.5 py-1.5 bg-white text-navy-950 font-semibold focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal/40 cursor-pointer"
                    >
                        {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Tutor grid — auto-rows stretch for equal heights */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 auto-rows-fr">
                    {[1,2,3,4,5,6].map(i => <CardSkeleton key={i} />)}
                </div>
            ) : fetchError ? (
                <div className="text-center py-24 bg-white rounded-3xl border border-gray-100">
                    <div className="w-20 h-20 rounded-2xl bg-royal/10 flex items-center justify-center mx-auto mb-5">
                        <svg className="w-8 h-8 text-royal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-extrabold text-navy-950 mb-1">Couldn't load tutors</h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">{fetchError}</p>
                    <button
                        onClick={() => fetchTutors(activeFilters)}
                        className="px-6 py-3 bg-lime text-navy-950 text-sm font-bold rounded-full hover:bg-lime-light transition-colors shadow-sm"
                    >
                        Try again
                    </button>
                </div>
            ) : sorted.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border border-gray-100">
                    <div className="w-20 h-20 rounded-2xl bg-royal/10 flex items-center justify-center mx-auto mb-5">
                        <svg className="w-8 h-8 text-royal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-extrabold text-navy-950 mb-1">No tutors found</h3>
                    <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
                        Try broadening your search or removing some filters
                    </p>
                    <button
                        onClick={() => fetchTutors(EMPTY_FILTERS)}
                        className="px-6 py-3 bg-lime text-navy-950 text-sm font-bold rounded-full hover:bg-lime-light transition-colors shadow-sm"
                    >
                        Clear all filters
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 auto-rows-fr">
                    {sorted.map((tutor, i) => (
                        <div
                            key={tutor._id}
                            className="animate-fade-in-up flex"
                            style={{ animationDelay: `${Math.min(i * 60, 400)}ms` }}
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
