import { useState, useEffect, useMemo } from 'react';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import TutorCard from './TutorCard';
import RequestDemoModal from './RequestDemoModal';
import TutorSearch from './TutorSearch';
import LoadingSkeleton from './LoadingSkeleton';

/* ── Filter chip ─────────────────────────────────────────────────────────── */
const FilterChip = ({ label, onRemove }) => (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-semibold">
        {label}
        <button onClick={onRemove} className="ml-0.5 hover:text-indigo-900 transition-colors">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
    </span>
);

/* ── Card skeleton ───────────────────────────────────────────────────────── */
const CardSkeleton = () => (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 animate-pulse">
        <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gray-100 flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
        </div>
        <div className="flex gap-2">
            {[1,2,3].map(i => <div key={i} className="h-6 w-20 bg-gray-100 rounded-md" />)}
        </div>
        <div className="h-14 bg-gray-50 rounded-xl" />
        <div className="h-9 bg-gray-100 rounded-lg" />
    </div>
);

/* ── Main component ──────────────────────────────────────────────────────── */
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
    const [tutors, setTutors]             = useState([]);
    const [loading, setLoading]           = useState(true);
    const [selectedTutor, setSelectedTutor] = useState(null);
    const [sort, setSort]                 = useState('match');
    const [activeFilters, setActiveFilters] = useState(EMPTY_FILTERS);
    const { showSuccess }                 = useToast();

    const fetchTutors = async (filters = EMPTY_FILTERS) => {
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
            // Apply verifiedOnly client-side (since it's already in approvalStatus)
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
    };

    useEffect(() => { fetchTutors(); }, []);

    // Client-side sort
    const sorted = useMemo(() => {
        const arr = [...tutors];
        if (sort === 'rating')      return arr.sort((a,b) => (b.averageRating||0) - (a.averageRating||0));
        if (sort === 'experience')  return arr.sort((a,b) => (b.experienceYears||0) - (a.experienceYears||0));
        if (sort === 'price_asc')   return arr.sort((a,b) => (a.hourlyRate||0) - (b.hourlyRate||0));
        if (sort === 'price_desc')  return arr.sort((a,b) => (b.hourlyRate||0) - (a.hourlyRate||0));
        return arr; // match = API order
    }, [tutors, sort]);

    // Build active filter chips
    const chips = useMemo(() => {
        const list = [];
        if (activeFilters.subject)       list.push({ key: 'subject',       label: activeFilters.subject });
        if (activeFilters.class)         list.push({ key: 'class',         label: activeFilters.class });
        if (activeFilters.area)          list.push({ key: 'area',          label: activeFilters.area });
        if (activeFilters.mode && activeFilters.mode !== 'all')
            list.push({ key: 'mode', label: `Mode: ${activeFilters.mode}` });
        if (activeFilters.minRate)       list.push({ key: 'minRate',       label: `Min ₹${activeFilters.minRate}` });
        if (activeFilters.maxRate)       list.push({ key: 'maxRate',       label: `Max ₹${activeFilters.maxRate}` });
        if (activeFilters.minExperience) list.push({ key: 'minExperience', label: `${activeFilters.minExperience}+ yrs exp` });
        if (activeFilters.minRating)     list.push({ key: 'minRating',     label: `${activeFilters.minRating}★+` });
        if (activeFilters.verifiedOnly)  list.push({ key: 'verifiedOnly',  label: 'Verified only' });
        return list;
    }, [activeFilters]);

    const removeChip = (key) => {
        const next = { ...activeFilters, [key]: key === 'verifiedOnly' ? false : key === 'mode' ? 'all' : '' };
        fetchTutors(next);
    };

    return (
        <div className="space-y-5">
            {/* Filters */}
            <TutorSearch onSearch={fetchTutors} />

            {/* Results control strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-gray-200">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">
                        {loading ? (
                            <span className="inline-block w-6 h-4 bg-gray-200 rounded animate-pulse" />
                        ) : (
                            <>{sorted.length} tutor{sorted.length !== 1 ? 's' : ''}</>
                        )}
                        <span className="text-gray-500 font-normal"> found</span>
                    </span>
                    {chips.map(chip => (
                        <FilterChip key={chip.key} label={chip.label}
                            onRemove={() => removeChip(chip.key)} />
                    ))}
                    {chips.length > 0 && (
                        <button onClick={() => fetchTutors(EMPTY_FILTERS)}
                            className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors">
                            Reset all
                        </button>
                    )}
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <label className="text-xs text-gray-500 font-medium">Sort:</label>
                    <select value={sort} onChange={e => setSort(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white font-medium text-gray-700">
                        {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Tutor grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1,2,3,4,5,6].map(i => <CardSkeleton key={i} />)}
                </div>
            ) : sorted.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                    <div className="text-5xl mb-4">🔍</div>
                    <h3 className="text-base font-bold text-gray-800 mb-1">No tutors match your filters</h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto mb-5">
                        Try adjusting your subject, class, or location filters to see more tutors.
                    </p>
                    <button onClick={() => fetchTutors(EMPTY_FILTERS)}
                        className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
                        Clear Filters
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {sorted.map(tutor => (
                        <TutorCard key={tutor._id} tutor={tutor}
                            onRequestDemo={t => setSelectedTutor(t)} />
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
