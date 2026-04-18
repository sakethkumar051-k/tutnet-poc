import { Link } from 'react-router-dom';

const values = [
    {
        title: 'Verified & Trusted',
        desc: 'Every tutor is background-checked, interviewed, and rated by real parents before going live on Tutnet.',
        icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    },
    {
        title: 'Personal First',
        desc: 'One student, one tutor, one plan. We pair learners with tutors who fit their style, board, and pace.',
        icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-9a4 4 0 11-8 0 4 4 0 018 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z',
    },
    {
        title: 'Transparent',
        desc: 'No hidden fees. Clear pricing, free trial sessions, attendance tracking, and parent-visible progress reports.',
        icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
    },
    {
        title: 'Local Focus',
        desc: 'Born in West Hyderabad for West Hyderabad. Our tutors know your neighbourhood, your schools, and your boards.',
        icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    },
];

const steps = [
    { step: '01', title: 'Tell us what you need', desc: 'Share the subject, board, grade, and whether you prefer home, online, or hybrid lessons.' },
    { step: '02', title: 'Match with tutors', desc: 'Browse verified tutors nearby. Read reviews, check availability, and compare hourly rates.' },
    { step: '03', title: 'Book a free trial', desc: 'Try before you commit. If it clicks, continue. If not, try another tutor at no cost.' },
    { step: '04', title: 'Learn & track', desc: 'Attend sessions, mark attendance, and watch progress reports land in your dashboard.' },
];

const About = () => {
    return (
        <div className="bg-white font-sans">
            {/* ════════════════ HERO ════════════════ */}
            <section className="relative overflow-hidden bg-white">
                <div className="max-w-[1300px] mx-auto px-6 lg:px-10 pt-20 pb-24">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
                        <div className="lg:col-span-7">
                            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lime/20 text-navy-950 text-xs font-bold tracking-wide mb-6">
                                <span className="w-2 h-2 rounded-full bg-lime-dark" />
                                About Tutnet
                            </span>
                            <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-extrabold text-navy-950 leading-[1.05] tracking-tight">
                                Tutoring that feels<br />
                                personal, <span className="text-royal">local</span>, and<br />
                                <span className="text-lime-dark">accountable</span>.
                            </h1>
                        </div>
                        <div className="lg:col-span-5">
                            <p className="text-[17px] text-gray-500 leading-relaxed">
                                Tutnet is a home-tutoring marketplace built for families in West Hyderabad. We believe every student deserves a tutor who understands their board, their syllabus, and their way of learning — without the usual guesswork, dropped classes, or opaque pricing.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <Link to="/find-tutors" className="inline-flex items-center px-6 py-3 text-[14px] font-bold text-navy-950 bg-lime rounded-full hover:bg-lime-light transition-colors">
                                    Find a Tutor
                                </Link>
                                <Link to="/register" className="inline-flex items-center px-6 py-3 text-[14px] font-bold text-white bg-navy-950 rounded-full hover:bg-navy-900 transition-colors">
                                    Become a Tutor
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════════════ MISSION ════════════════ */}
            <section className="py-20 bg-[#f7f7f7]">
                <div className="max-w-[1300px] mx-auto px-6 lg:px-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                        <div className="relative bg-royal rounded-3xl p-10 lg:p-12 overflow-hidden min-h-[380px] flex flex-col justify-between">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                            <div className="relative z-10">
                                <p className="text-lime text-xs font-bold tracking-[0.2em] uppercase mb-4">Our Mission</p>
                                <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                                    Make great tutoring easy to find — and easy to trust.
                                </h2>
                            </div>
                            <div className="relative z-10 mt-8 grid grid-cols-3 gap-6">
                                <div>
                                    <p className="text-3xl font-extrabold text-white">500+</p>
                                    <p className="text-xs text-blue-200 mt-1">Verified tutors</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-extrabold text-white">10k+</p>
                                    <p className="text-xs text-blue-200 mt-1">Sessions delivered</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-extrabold text-white">4.8★</p>
                                    <p className="text-xs text-blue-200 mt-1">Parent rating</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-3xl sm:text-[2.5rem] font-extrabold text-navy-950 leading-tight mb-5">
                                Why we built Tutnet
                            </h2>
                            <p className="text-gray-500 text-[15px] leading-relaxed mb-4">
                                Finding a good home tutor used to mean word-of-mouth, phone chains, and crossed fingers. Parents never knew if a tutor was truly qualified, students stopped showing up, and progress lived on a loose sheet of paper.
                            </p>
                            <p className="text-gray-500 text-[15px] leading-relaxed">
                                We built Tutnet to fix that — with verified tutor profiles, free trial sessions, real-time attendance, and progress reports parents can actually read. One platform, from the first search to the final exam.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════════════ VALUES ════════════════ */}
            <section className="py-20 bg-white">
                <div className="max-w-[1300px] mx-auto px-6 lg:px-10">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl sm:text-[2.5rem] font-extrabold text-navy-950 leading-tight">
                            What we stand for
                        </h2>
                        <p className="mt-3 text-gray-500 text-[15px] max-w-xl mx-auto">
                            Four principles that shape every tutor we onboard and every feature we ship.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {values.map((v) => (
                            <div key={v.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200">
                                <div className="w-12 h-12 rounded-xl bg-royal/10 flex items-center justify-center mb-4">
                                    <svg className="w-6 h-6 text-royal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d={v.icon} />
                                    </svg>
                                </div>
                                <h3 className="font-bold text-navy-950 text-[15px] mb-2">{v.title}</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════ HOW IT WORKS ════════════════ */}
            <section className="py-20 bg-[#f7f7f7]">
                <div className="max-w-[1300px] mx-auto px-6 lg:px-10">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="lg:col-span-1">
                            <p className="text-royal text-xs font-bold tracking-[0.2em] uppercase mb-4">How It Works</p>
                            <h2 className="text-3xl sm:text-[2.5rem] font-extrabold text-navy-950 leading-tight">
                                From search to first lesson in minutes.
                            </h2>
                            <p className="mt-4 text-gray-500 text-[15px] leading-relaxed">
                                No calls. No paperwork. Just a clean, transparent path to the right tutor for your child.
                            </p>
                        </div>
                        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {steps.map((s) => (
                                <div key={s.step} className="bg-white rounded-2xl p-6 border border-gray-100">
                                    <p className="text-lime-dark text-sm font-extrabold tracking-wider mb-3">{s.step}</p>
                                    <h3 className="font-bold text-navy-950 text-[16px] mb-2">{s.title}</h3>
                                    <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════════════ CTA ════════════════ */}
            <section className="bg-navy-950 py-20 relative overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-royal/10 rounded-full blur-[100px]" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-lime/5 rounded-full blur-[120px]" />
                </div>
                <div className="max-w-[1300px] mx-auto px-6 lg:px-10 relative z-10 text-center">
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.08] tracking-tight">
                        Ready to meet your<br />
                        <span className="text-lime">next tutor?</span>
                    </h2>
                    <p className="mt-6 text-gray-400 text-[16px] leading-relaxed max-w-xl mx-auto">
                        Book a free trial today. If it works out, great. If not, try another tutor — no commitment, no charge.
                    </p>
                    <div className="mt-10 flex flex-wrap justify-center gap-4">
                        <Link to="/find-tutors" className="inline-flex items-center px-7 py-3.5 text-[14px] font-bold text-navy-950 bg-lime rounded-full hover:bg-lime-light transition-colors">
                            Browse Tutors
                        </Link>
                        <Link to="/register" className="inline-flex items-center px-7 py-3.5 text-[14px] font-bold text-white border border-white/20 rounded-full hover:bg-white/5 transition-colors">
                            Get Started Free
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default About;
