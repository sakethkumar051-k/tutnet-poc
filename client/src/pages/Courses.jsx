import { Link } from 'react-router-dom';

const Courses = () => {
    return (
        <div className="bg-white font-sans">
            <section className="relative overflow-hidden bg-white min-h-[calc(100vh-72px)] flex items-center">
                {/* Decorative background */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-royal/10 rounded-full blur-[100px]" />
                    <div className="absolute bottom-10 right-10 w-96 h-96 bg-lime/20 rounded-full blur-[120px]" />
                </div>

                <div className="max-w-[1300px] mx-auto px-6 lg:px-10 w-full relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        {/* Left — copy */}
                        <div>
                            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lime/20 text-navy-950 text-xs font-bold tracking-wide mb-6">
                                <span className="w-2 h-2 rounded-full bg-lime-dark animate-pulse" />
                                Coming Soon
                            </span>
                            <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-extrabold text-navy-950 leading-[1.05] tracking-tight">
                                Structured <span className="text-royal">Courses</span>,<br />
                                crafted by our <span className="text-lime-dark">best tutors</span>.
                            </h1>
                            <p className="mt-6 text-[16px] text-gray-500 leading-relaxed max-w-md">
                                We're building bite-sized, board-aligned courses — CBSE, ICSE, and State boards — that pair perfectly with your one-on-one tutor. Self-paced practice, live doubt sessions, and clear progress tracking.
                            </p>

                            {/* Feature bullets */}
                            <ul className="mt-8 space-y-3">
                                {[
                                    'Board-aligned course tracks (CBSE · ICSE · State)',
                                    'Live doubt-solving with verified tutors',
                                    'Chapter-wise practice tests & progress reports',
                                ].map((item) => (
                                    <li key={item} className="flex items-start gap-3">
                                        <span className="w-5 h-5 rounded-full bg-lime flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <svg className="w-3 h-3 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </span>
                                        <span className="text-[15px] text-gray-600">{item}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTAs */}
                            <div className="mt-10 flex flex-wrap items-center gap-4">
                                <Link
                                    to="/find-tutors"
                                    className="inline-flex items-center px-7 py-3.5 text-[15px] font-bold text-navy-950 bg-lime rounded-full hover:bg-lime-light transition-colors shadow-sm"
                                >
                                    Find a Tutor Meanwhile
                                </Link>
                                <Link
                                    to="/"
                                    className="inline-flex items-center gap-2 px-7 py-3.5 text-[15px] font-bold text-navy-950 hover:text-royal transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Back to Home
                                </Link>
                            </div>
                        </div>

                        {/* Right — illustration card */}
                        <div className="relative hidden lg:flex justify-center items-center">
                            <div className="relative w-full max-w-md">
                                {/* Blurred backdrop */}
                                <div className="absolute inset-0 bg-navy-950 rounded-[32px] rotate-3 opacity-90" />
                                {/* Main card */}
                                <div className="relative bg-white rounded-[32px] p-8 shadow-2xl border border-gray-100">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-xl bg-royal flex items-center justify-center">
                                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-navy-950">Class 10 · Mathematics</p>
                                                <p className="text-xs text-gray-400">CBSE · 24 chapters</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-lime/20 text-lime-dark">Preview</span>
                                    </div>

                                    {/* Progress bars */}
                                    <div className="space-y-4">
                                        {[
                                            { name: 'Real Numbers', pct: 100 },
                                            { name: 'Polynomials', pct: 72 },
                                            { name: 'Trigonometry', pct: 40 },
                                            { name: 'Coordinate Geometry', pct: 12 },
                                        ].map((ch) => (
                                            <div key={ch.name}>
                                                <div className="flex justify-between mb-1.5">
                                                    <span className="text-sm font-medium text-navy-950">{ch.name}</span>
                                                    <span className="text-xs text-gray-400 font-semibold">{ch.pct}%</span>
                                                </div>
                                                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${ch.pct === 100 ? 'bg-lime' : 'bg-royal'}`}
                                                        style={{ width: `${ch.pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-gray-400">Next live session</p>
                                            <p className="text-sm font-bold text-navy-950">Tomorrow · 6:00 PM</p>
                                        </div>
                                        <div className="flex -space-x-2">
                                            {['P', 'A', 'S'].map((i, idx) => (
                                                <div key={idx} className="w-8 h-8 rounded-full bg-gradient-to-br from-royal to-navy-950 border-2 border-white flex items-center justify-center text-white text-xs font-bold">
                                                    {i}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Floating "Coming Soon" ribbon */}
                                <div className="absolute -top-4 -right-4 bg-lime text-navy-950 text-xs font-extrabold px-4 py-2 rounded-full shadow-lg rotate-6">
                                    Launching Soon
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Courses;
