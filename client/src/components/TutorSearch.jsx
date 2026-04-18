import { useState, useEffect, useRef } from 'react';

const CLASS_OPTIONS = [
    'Class 1','Class 2','Class 3','Class 4','Class 5',
    'Class 6','Class 7','Class 8','Class 9','Class 10',
    'Class 11','Class 12','Undergraduate','Postgraduate','Other'
];

const COMMON_SUBJECTS = [
    'Mathematics','Physics','Chemistry','Biology',
    'English','Hindi','History','Geography','Economics',
    'Computer Science','Accountancy','Business Studies','Sanskrit',
];

const EXPERIENCE_OPTIONS = [
    { label: '1+ yr',  value: '1' },
    { label: '3+ yrs', value: '3' },
    { label: '5+ yrs', value: '5' },
    { label: '10+ yrs',value: '10' },
];

const RATING_OPTIONS = [
    { label: '3+ stars', value: '3' },
    { label: '4+ stars', value: '4' },
    { label: '4.5+',     value: '4.5' },
];

const EMPTY = {
    subject: '', class: '', area: '', minRate: '', maxRate: '',
    mode: 'all', minExperience: '', minRating: '', verifiedOnly: false,
};

/* Subject autocomplete */
const SubjectInput = ({ value, onChange }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const query = value || '';

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = query
        ? COMMON_SUBJECTS.filter(s => s.toLowerCase().includes(query.toLowerCase()))
        : COMMON_SUBJECTS;

    return (
        <div ref={ref} className="relative flex-1 min-w-[150px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
                type="text" value={query}
                onFocus={() => setOpen(true)}
                onChange={e => { onChange(e.target.value); setOpen(true); }}
                placeholder="Search subjects..."
                className="w-full pl-9 pr-8 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal/40 placeholder:text-gray-400 transition-all"
            />
            {query && (
                <button onClick={() => { onChange(''); setOpen(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
            {open && filtered.length > 0 && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                    {filtered.map(s => (
                        <button key={s} onMouseDown={() => { onChange(s); setOpen(false); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-royal/5 hover:text-royal transition-colors">
                            {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const fieldBase = 'py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal/40 placeholder:text-gray-400 transition-all';

const TutorSearch = ({ onSearch }) => {
    const [filters, setFilters] = useState(EMPTY);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const debounceRef = useRef(null);

    const apply = (next, instant = false) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (instant) { onSearch(next); }
        else { debounceRef.current = setTimeout(() => onSearch(next), 400); }
    };

    const set = (key, value, instant = false) => {
        setFilters(prev => {
            const next = { ...prev, [key]: value };
            apply(next, instant);
            return next;
        });
    };

    const clearAll = () => { setFilters(EMPTY); onSearch(EMPTY); };

    const activeCount = Object.entries(filters).filter(([k, v]) =>
        k !== 'mode' ? (v !== '' && v !== false) : v !== 'all'
    ).length;

    return (
        <div className="space-y-3">
            {/* Primary search bar */}
            <div className="bg-white rounded-3xl border border-gray-100 p-3 shadow-[0_4px_30px_-12px_rgba(0,0,0,0.08)]">
                <div className="flex flex-wrap gap-2">
                    <SubjectInput value={filters.subject} onChange={v => set('subject', v)} />

                    <select
                        value={filters.class}
                        onChange={e => set('class', e.target.value, true)}
                        className={`flex-1 min-w-[130px] px-3 ${fieldBase} text-gray-600 appearance-none cursor-pointer`}
                    >
                        <option value="">Class / Grade</option>
                        {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <div className="relative flex-1 min-w-[130px]">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        <input
                            type="text" value={filters.area}
                            onChange={e => set('area', e.target.value)}
                            placeholder="Location"
                            className={`w-full pl-9 pr-3 ${fieldBase}`}
                        />
                    </div>

                    {/* Mode toggle */}
                    <div className="flex bg-gray-100 rounded-full p-1 gap-0.5">
                        {[
                            { label: 'All', value: 'all' },
                            { label: 'Online', value: 'online' },
                            { label: 'Home', value: 'home' },
                        ].map(m => (
                            <button key={m.value} onClick={() => set('mode', m.value, true)}
                                className={`px-4 py-1.5 text-[12px] font-bold rounded-full transition-all duration-200 ${
                                    filters.mode === m.value
                                        ? 'bg-navy-950 text-white shadow-sm'
                                        : 'text-gray-500 hover:text-navy-950'
                                }`}>
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-3 px-1">
                <button onClick={() => setShowAdvanced(v => !v)}
                    className="text-[12px] font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1.5 transition-colors">
                    <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    {showAdvanced ? 'Less' : 'More'} filters
                </button>
                {activeCount > 0 && (
                    <>
                        <span className="w-px h-3 bg-gray-200" />
                        <button onClick={clearAll} className="text-[12px] text-rose-500 hover:text-rose-700 font-medium transition-colors">
                            Clear all ({activeCount})
                        </button>
                    </>
                )}
            </div>

            {/* Advanced filters */}
            {showAdvanced && (
                <div className="flex flex-wrap gap-2 px-1 animate-fade-in">
                    <input type="number" value={filters.minRate} onChange={e => set('minRate', e.target.value)}
                        placeholder="Min ₹/hr" className={`w-28 px-3 ${fieldBase}`} />
                    <input type="number" value={filters.maxRate} onChange={e => set('maxRate', e.target.value)}
                        placeholder="Max ₹/hr" className={`w-28 px-3 ${fieldBase}`} />
                    <select value={filters.minExperience} onChange={e => set('minExperience', e.target.value, true)}
                        className={`w-28 px-3 ${fieldBase} text-gray-600 appearance-none cursor-pointer`}>
                        <option value="">Experience</option>
                        {EXPERIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <select value={filters.minRating} onChange={e => set('minRating', e.target.value, true)}
                        className={`w-28 px-3 ${fieldBase} text-gray-600 appearance-none cursor-pointer`}>
                        <option value="">Rating</option>
                        {RATING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <button
                        onClick={() => set('verifiedOnly', !filters.verifiedOnly, true)}
                        className={`px-4 py-2.5 text-[12px] font-bold rounded-full border transition-all duration-200 ${
                            filters.verifiedOnly
                                ? 'bg-lime text-navy-950 border-lime shadow-sm'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-navy-950 hover:text-navy-950'
                        }`}>
                        <span className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Verified only
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default TutorSearch;
