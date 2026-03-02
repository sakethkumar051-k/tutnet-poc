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
    { label: 'Any',    value: '' },
    { label: '1+ yr',  value: '1' },
    { label: '3+ yrs', value: '3' },
    { label: '5+ yrs', value: '5' },
    { label: '10+ yrs',value: '10' },
];

const RATING_OPTIONS = [
    { label: 'Any',   value: '' },
    { label: '3+',    value: '3' },
    { label: '4+',    value: '4' },
    { label: '4.5+',  value: '4.5' },
];

const EMPTY = {
    subject: '', class: '', area: '', minRate: '', maxRate: '',
    mode: 'all', minExperience: '', minRating: '', verifiedOnly: false,
};

/* ── SubjectSearch dropdown ───────────────────────────────────────────────── */
const SubjectDropdown = ({ value, onChange }) => {
    const [open, setOpen]     = useState(false);
    const ref                 = useRef(null);
    const query               = value || '';

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = query
        ? COMMON_SUBJECTS.filter(s => s.toLowerCase().includes(query.toLowerCase()))
        : COMMON_SUBJECTS;

    const select = (s) => { onChange(s); setOpen(false); };
    const clear  = ()  => { onChange(''); setOpen(false); };

    return (
        <div ref={ref} className="relative">
            <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="text"
                    value={query}
                    onFocus={() => setOpen(true)}
                    onChange={e => { onChange(e.target.value); setOpen(true); }}
                    placeholder="Subject"
                    className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                />
                {query && (
                    <button onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
            {open && filtered.length > 0 && (
                <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                    {filtered.map(s => (
                        <button key={s} onMouseDown={() => select(s)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                            {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ── Main filter bar ──────────────────────────────────────────────────────── */
const TutorSearch = ({ onSearch }) => {
    const [filters, setFilters]         = useState(EMPTY);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const debounceRef                   = useRef(null);

    // Debounce text inputs, instant for selects / toggles
    const apply = (next, instant = false) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (instant) {
            onSearch(next);
        } else {
            debounceRef.current = setTimeout(() => onSearch(next), 500);
        }
    };

    const set = (key, value, instant = false) => {
        setFilters(prev => {
            const next = { ...prev, [key]: value };
            apply(next, instant);
            return next;
        });
    };

    const clearAll = () => {
        setFilters(EMPTY);
        onSearch(EMPTY);
    };

    const activeCount = Object.entries(filters).filter(([k, v]) =>
        k !== 'mode' ? (v !== '' && v !== false) : v !== 'all'
    ).length;

    return (
        <div className="space-y-3">
            {/* ── Primary filter row ─────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Subject */}
                    <SubjectDropdown
                        value={filters.subject}
                        onChange={v => set('subject', v)}
                    />

                    {/* Class */}
                    <select value={filters.class}
                        onChange={e => set('class', e.target.value, true)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-gray-600">
                        <option value="">Class / Grade</option>
                        {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    {/* Area */}
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <input type="text" value={filters.area}
                            onChange={e => set('area', e.target.value)}
                            placeholder="Area / Location"
                            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
                    </div>

                    {/* Mode pills */}
                    <div className="flex gap-1.5">
                        {[
                            { label: 'All',    value: 'all' },
                            { label: 'Online', value: 'online' },
                            { label: 'Home',   value: 'home' },
                        ].map(m => (
                            <button key={m.value}
                                onClick={() => set('mode', m.value, true)}
                                className={`flex-1 py-2.5 text-xs font-semibold rounded-xl border transition-colors ${filters.mode === m.value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Advanced toggle row */}
                <div className="flex items-center justify-between pt-1">
                    <button onClick={() => setShowAdvanced(v => !v)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors">
                        <svg className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                        {showAdvanced ? 'Hide' : 'More'} Filters
                    </button>
                    {activeCount > 0 && (
                        <button onClick={clearAll}
                            className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Clear all ({activeCount})
                        </button>
                    )}
                </div>

                {/* ── Advanced filters ───────────────────────────────────── */}
                {showAdvanced && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-gray-100">
                        {/* Budget */}
                        <div>
                            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Min Budget (₹/hr)</label>
                            <input type="number" value={filters.minRate}
                                onChange={e => set('minRate', e.target.value)}
                                placeholder="e.g. 200"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Max Budget (₹/hr)</label>
                            <input type="number" value={filters.maxRate}
                                onChange={e => set('maxRate', e.target.value)}
                                placeholder="e.g. 1000"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                        </div>

                        {/* Experience */}
                        <div>
                            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Experience</label>
                            <select value={filters.minExperience}
                                onChange={e => set('minExperience', e.target.value, true)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-gray-600">
                                {EXPERIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>

                        {/* Min Rating */}
                        <div>
                            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Min Rating</label>
                            <select value={filters.minRating}
                                onChange={e => set('minRating', e.target.value, true)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-gray-600">
                                {RATING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>

                        {/* Verified toggle */}
                        <div className="col-span-2 sm:col-span-4 flex items-center gap-2 pt-1">
                            <button
                                role="switch"
                                aria-checked={filters.verifiedOnly}
                                onClick={() => set('verifiedOnly', !filters.verifiedOnly, true)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${filters.verifiedOnly ? 'bg-indigo-600' : 'bg-gray-200'}`}
                            >
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${filters.verifiedOnly ? 'translate-x-4.5' : 'translate-x-0.5'}`}
                                    style={{ transform: filters.verifiedOnly ? 'translateX(18px)' : 'translateX(2px)' }} />
                            </button>
                            <span className="text-sm text-gray-700 font-medium">Verified tutors only</span>
                            {filters.verifiedOnly && (
                                <span className="ml-1 inline-flex items-center gap-0.5 text-xs text-green-700 font-semibold">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Active
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TutorSearch;
