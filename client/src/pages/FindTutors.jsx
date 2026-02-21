import TutorList from '../components/TutorList';

/* ── Trust Strip ─────────────────────────────────────────────────────────── */
const TRUST_ITEMS = [
    {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
        ),
        label: 'Verified Tutors',
        desc: 'Every tutor is background-checked and reviewed by our team'
    },
    {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
        ),
        label: 'Attendance Tracking',
        desc: 'Parents receive real-time attendance updates after each session'
    },
    {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
        label: 'Weekly Reports',
        desc: 'Detailed progress reports delivered to parents every week'
    },
    {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
        ),
        label: 'Secure Payments',
        desc: 'Transparent fee structure with no hidden charges'
    },
    {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
        ),
        label: 'Replacement Guarantee',
        desc: "Not satisfied? We'll match you with a new tutor at no extra cost"
    },
];

const TrustStrip = () => (
    <div className="mt-14 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <div>
                <h2 className="text-sm font-bold text-gray-900">Why Parents Trust TutNet</h2>
                <p className="text-xs text-gray-500">Built for peace of mind, not just bookings</p>
            </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            {TRUST_ITEMS.map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center px-5 py-6 gap-2 group hover:bg-indigo-50/40 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-100 transition-colors flex-shrink-0">
                        {item.icon}
                    </div>
                    <p className="text-xs font-bold text-gray-900">{item.label}</p>
                    <p className="text-[11px] text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
            ))}
        </div>
    </div>
);

/* ── Stats bar ───────────────────────────────────────────────────────────── */
const StatsBar = () => (
    <div className="grid grid-cols-3 gap-3 mb-8">
        {[
            { value: '200+', label: 'Verified Tutors' },
            { value: '1,200+', label: 'Sessions Completed' },
            { value: '4.8★', label: 'Avg. Rating' },
        ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center shadow-sm">
                <p className="text-lg font-bold text-indigo-700">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
        ))}
    </div>
);

/* ── Page ─────────────────────────────────────────────────────────────────── */
const FindTutors = () => {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full mb-4">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            <span className="text-xs font-semibold text-indigo-700">All tutors verified by TutNet</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight leading-tight mb-3">
                            Find the Right Tutor<br className="hidden sm:block" /> for Your Child
                        </h1>
                        <p className="text-gray-500 text-base leading-relaxed">
                            Browse verified tutors by subject, class, and location. Start with a free demo session — no commitment needed.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats */}
                <StatsBar />

                {/* Filter + Results */}
                <TutorList />

                {/* Trust strip */}
                <TrustStrip />

                {/* Bottom CTA */}
                <div className="mt-8 bg-indigo-600 rounded-2xl px-8 py-10 text-center text-white">
                    <h3 className="text-xl font-bold mb-2">Not sure which tutor to pick?</h3>
                    <p className="text-indigo-200 text-sm mb-5 max-w-md mx-auto">
                        Book a free 30-minute demo with any tutor. No payment needed. See if it's the right fit.
                    </p>
                    <a href="#top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-700 text-sm font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-sm">
                        Browse Tutors
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                    </a>
                </div>
            </div>
        </div>
    );
};

export default FindTutors;
