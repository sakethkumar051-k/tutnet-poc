import { Link } from 'react-router-dom';

const Home = () => {
    return (
        <div className="bg-white font-sans">

            {/* ════════════════ HERO ════════════════ */}
            <section className="relative overflow-hidden bg-white min-h-[calc(100vh-72px)] flex items-center">
                <div className="max-w-[1300px] mx-auto px-6 lg:px-10 w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center py-10 lg:py-6">
                        {/* Left copy */}
                        <div className="relative z-10">
                            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lime/20 text-navy-950 text-xs font-bold tracking-wide mb-6">
                                <span className="w-2 h-2 rounded-full bg-lime-dark" />
                                Serving West Hyderabad
                            </span>
                            <h1 className="text-[clamp(2.5rem,5vw,3.8rem)] font-extrabold text-navy-950 leading-[1.1] tracking-tight">
                                Find the Right Tutor,
                                <br />
                                Right at Your Doorstep.
                            </h1>
                            <p className="mt-5 text-[16px] text-gray-500 leading-relaxed max-w-md">
                                Tutnet connects students with verified home tutors across West Hyderabad. Book a free trial, learn at home or online, and track every session — all in one place.
                            </p>

                            {/* CTA buttons */}
                            <div className="mt-8 flex flex-wrap items-center gap-4">
                                <Link
                                    to="/find-tutors"
                                    className="inline-flex items-center px-7 py-3.5 text-[15px] font-bold text-navy-950 bg-lime rounded-full hover:bg-lime-light transition-colors shadow-sm"
                                >
                                    Find a Tutor
                                </Link>
                                <Link
                                    to="/register"
                                    className="inline-flex items-center gap-2 px-7 py-3.5 text-[15px] font-bold text-white bg-navy-950 rounded-full hover:bg-navy-900 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                    </svg>
                                    Become a Tutor
                                </Link>
                            </div>

                            {/* Stats row */}
                            <div className="mt-12 flex items-center gap-10">
                                <div>
                                    <p className="text-3xl font-extrabold text-navy-950">500+</p>
                                    <p className="text-sm text-gray-400 mt-0.5">Verified Tutors</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-extrabold text-navy-950">10k+</p>
                                    <p className="text-sm text-gray-400 mt-0.5">Sessions Booked</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-extrabold text-navy-950">4.8★</p>
                                    <p className="text-sm text-gray-400 mt-0.5">Parent Rating</p>
                                </div>
                            </div>
                        </div>

                        {/* Right — Person with blue circle */}
                        <div className="relative hidden lg:flex justify-center items-center">
                            {/* Blue circle */}
                            <div className="w-[420px] h-[420px] rounded-full bg-royal absolute" />
                            {/* Tutor placeholder */}
                            <div className="relative z-10 w-[340px] h-[440px] rounded-3xl bg-gradient-to-b from-gray-200 to-gray-300 flex items-end justify-center overflow-hidden">
                                <div className="text-center pb-8">
                                    <svg className="w-24 h-24 text-gray-400 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                    </svg>
                                    <p className="text-sm text-gray-500 font-medium mt-2">Verified Tutor</p>
                                </div>
                            </div>
                            {/* Yellow dots decoration */}
                            <div className="absolute top-10 right-6 grid grid-cols-4 gap-1.5">
                                {Array.from({ length: 16 }).map((_, i) => (
                                    <div key={i} className="w-2 h-2 rounded-full bg-lime" />
                                ))}
                            </div>
                            {/* Floating trial card */}
                            <div className="absolute bottom-12 -left-4 bg-white rounded-2xl shadow-xl p-4 z-20 border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-lime flex items-center justify-center">
                                        <svg className="w-5 h-5 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-navy-950">Free Trial</p>
                                        <p className="text-xs text-gray-400">Book your first session</p>
                                    </div>
                                </div>
                            </div>
                            {/* Floating rating card */}
                            <div className="absolute top-16 -right-2 bg-white rounded-2xl shadow-xl p-4 z-20 border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-royal/10 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-royal" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-navy-950">4.8/5</p>
                                        <p className="text-xs text-gray-400">Avg. tutor rating</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════════════ COURSES DESIGNED ════════════════ */}
            <section className="py-20 bg-[#f7f7f7]">
                <div className="max-w-[1300px] mx-auto px-6 lg:px-10">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl sm:text-[2.5rem] font-extrabold text-navy-950 leading-tight">
                            Subjects We Cover
                        </h2>
                        <p className="mt-3 text-gray-500 text-[15px] max-w-xl mx-auto">
                            From CBSE and ICSE to state boards — find expert tutors for every subject, grade, and learning style.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                        {[
                            { title: 'Mathematics', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z', count: '120+ Tutors' },
                            { title: 'Physics', icon: 'M13 10V3L4 14h7v7l9-11h-7z', count: '85+ Tutors' },
                            { title: 'Chemistry', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z', count: '70+ Tutors' },
                            { title: 'Biology', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', count: '60+ Tutors' },
                            { title: 'English', icon: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129', count: '95+ Tutors' },
                            { title: 'Computer Science', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', count: '50+ Tutors' },
                            { title: 'Social Studies', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', count: '40+ Tutors' },
                            { title: 'Hindi & Telugu', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', count: '55+ Tutors' },
                        ].map((course) => (
                            <div key={course.title} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-200 cursor-pointer group">
                                <div className="w-12 h-12 rounded-xl bg-royal/10 flex items-center justify-center mb-4 group-hover:bg-royal group-hover:text-white transition-colors">
                                    <svg className="w-6 h-6 text-royal group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d={course.icon} />
                                    </svg>
                                </div>
                                <h3 className="font-bold text-navy-950 text-[15px] mb-1">{course.title}</h3>
                                <p className="text-xs text-gray-400">{course.count}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════ BUILT TO HELP YOU LEARN ════════════════ */}
            <section className="py-20 bg-white">
                <div className="max-w-[1300px] mx-auto px-6 lg:px-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                        {/* Left — Blue card */}
                        <div className="relative bg-royal rounded-3xl p-10 overflow-hidden min-h-[380px] flex flex-col justify-between">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="relative z-10">
                                <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                                    Home, Online,<br />or Hybrid — Your Choice
                                </h3>
                                <p className="mt-4 text-blue-200 text-sm leading-relaxed max-w-sm">
                                    Browse 500+ background-verified tutors. Trial before you commit, flexible schedules, transparent pricing.
                                </p>
                            </div>
                            <div className="relative z-10 mt-6">
                                <Link
                                    to="/find-tutors"
                                    className="inline-flex items-center px-6 py-3 text-[14px] font-bold text-navy-950 bg-lime rounded-full hover:bg-lime-light transition-colors"
                                >
                                    Browse Tutors
                                </Link>
                            </div>
                            {/* Person silhouette placeholder */}
                            <div className="absolute bottom-0 right-6 w-44 h-56 bg-white/10 rounded-t-2xl flex items-end justify-center overflow-hidden">
                                <svg className="w-20 h-20 text-white/20 mb-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                            </div>
                        </div>

                        {/* Right — Stats + heading */}
                        <div>
                            <h2 className="text-3xl sm:text-[2.5rem] font-extrabold text-navy-950 leading-tight mb-4">
                                Learning That's Personal,<span className="text-royal"> local</span>, and<span className="text-lime-dark"> accountable</span>.
                            </h2>
                            <p className="text-gray-500 text-[15px] leading-relaxed mb-10 max-w-md">
                                Verified tutors, free trial sessions, real-time attendance, and progress reports — everything parents and students need, in one place.
                            </p>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="border-l-4 border-royal pl-5">
                                    <p className="text-5xl font-extrabold text-navy-950">70%</p>
                                    <p className="text-sm text-gray-400 mt-2">Students show grade improvement within 3 months</p>
                                </div>
                                <div className="border-l-4 border-lime pl-5">
                                    <p className="text-5xl font-extrabold text-navy-950">500+</p>
                                    <p className="text-sm text-gray-400 mt-2">Verified home tutors across West Hyderabad</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════════════ MEET OUR EXPERT MENTORS ════════════════ */}
            <section className="py-20 bg-[#f7f7f7]">
                <div className="max-w-[1300px] mx-auto px-6 lg:px-10">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl sm:text-[2.5rem] font-extrabold text-navy-950 leading-tight">
                            Meet Our Verified Tutors
                        </h2>
                        <p className="mt-3 text-gray-500 text-[15px] max-w-xl mx-auto">
                            Every tutor is background-checked, interviewed, and rated by parents and students.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                        {[
                            { name: 'Priya Sharma', role: 'Mathematics' },
                            { name: 'Arjun Reddy', role: 'Physics' },
                            { name: 'Saketh Kumar', role: 'Computer Science' },
                            { name: 'Ananya Das', role: 'Chemistry' },
                            { name: 'Rahul Mehta', role: 'English' },
                        ].map((mentor, i) => (
                            <div key={i} className="text-center group cursor-pointer">
                                <div className="w-full aspect-[2/3] rounded-2xl bg-gray-200 mb-4 overflow-hidden relative">
                                    {/* Placeholder with initials */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-gray-300 to-gray-400 flex items-center justify-center">
                                        <span className="text-4xl font-bold text-white/60">{mentor.name.split(' ').map(n => n[0]).join('')}</span>
                                    </div>
                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-royal/0 group-hover:bg-royal/20 transition-colors duration-300" />
                                </div>
                                <h3 className="font-bold text-navy-950 text-[15px]">{mentor.name}</h3>
                                <p className="text-xs text-gray-400 mt-0.5">{mentor.role}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════ TESTIMONIALS ════════════════ */}
            <section className="py-20 bg-royal relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute top-10 left-10 w-32 h-32 rounded-full border border-white/10" />
                <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full border border-white/10" />

                <div className="max-w-[1300px] mx-auto px-6 lg:px-10 relative z-10">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl sm:text-[2.5rem] font-extrabold text-white leading-tight">
                            What Our Learners Are Saying
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { name: 'Priya M.', role: 'Class 10 Parent', quote: 'Tutnet helped us find an amazing maths tutor. My daughter improved from 65% to 92% in just three months. The progress tracking is incredible.' },
                            { name: 'Arjun S.', role: 'Engineering Student', quote: 'The flexible scheduling is perfect. I book online sessions during weekdays and home tutoring on weekends. Best of both worlds.' },
                            { name: 'Saketh K.', role: 'Physics Tutor', quote: 'As a tutor, Tutnet gives me the tools I need — scheduling, progress reports, and direct messaging. I can focus on teaching.' },
                        ].map((t, i) => (
                            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                                {/* Quote icon */}
                                <svg className="w-8 h-8 text-lime mb-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11h4v10H0z" />
                                </svg>
                                <p className="text-white/90 text-[15px] leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
                                        {t.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-sm">{t.name}</p>
                                        <p className="text-white/50 text-xs">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════ TEACHING SINCE / CTA ════════════════ */}
            <section className="bg-navy-950 py-20 relative overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-royal/10 rounded-full blur-[100px]" />
                </div>
                <div className="max-w-[1300px] mx-auto px-6 lg:px-10 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.08] tracking-tight">
                                Your Next Tutor
                                <br />
                                Is <span className="text-lime">One Click</span> Away
                            </h2>
                            <p className="mt-5 text-gray-400 text-[16px] leading-relaxed max-w-md">
                                Join thousands of families across West Hyderabad who trust Tutnet to find the right tutor — with a free trial and zero risk.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-4">
                                <Link to="/register" className="inline-flex items-center px-7 py-3.5 text-[14px] font-bold text-navy-950 bg-lime rounded-full hover:bg-lime-light transition-colors">
                                    Get Started Free
                                </Link>
                                <Link to="/login" className="inline-flex items-center px-7 py-3.5 text-[14px] font-bold text-white border border-white/20 rounded-full hover:bg-white/5 transition-colors">
                                    Sign In
                                </Link>
                            </div>
                        </div>

                        {/* Right — Quick links */}
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-xs font-bold text-gray-500 tracking-[0.15em] uppercase mb-4">Platform</h3>
                                <ul className="space-y-3 text-sm">
                                    <li><Link to="/find-tutors" className="text-gray-400 hover:text-white transition-colors">Find Tutors</Link></li>
                                    <li><Link to="/register" className="text-gray-400 hover:text-white transition-colors">Become a Tutor</Link></li>
                                    <li><Link to="/register" className="text-gray-400 hover:text-white transition-colors">Student Sign Up</Link></li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-gray-500 tracking-[0.15em] uppercase mb-4">Company</h3>
                                <ul className="space-y-3 text-sm">
                                    <li><Link to="/about" className="text-gray-400 hover:text-white transition-colors">About</Link></li>
                                    <li><Link to="/contact" className="text-gray-400 hover:text-white transition-colors">Contact</Link></li>
                                    <li><Link to="/login" className="text-gray-400 hover:text-white transition-colors">Login</Link></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
