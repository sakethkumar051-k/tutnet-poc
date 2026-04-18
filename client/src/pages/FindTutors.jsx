import TutorList from '../components/TutorList';

const FindTutors = () => (
    <div className="bg-white font-sans">
        {/* ════════════════ HERO ════════════════ */}
        <section className="relative overflow-hidden bg-navy-950">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-20 -right-20 w-[480px] h-[480px] bg-royal/20 rounded-full blur-[120px]" />
                <div className="absolute -bottom-20 -left-20 w-[420px] h-[420px] bg-lime/10 rounded-full blur-[120px]" />
            </div>
            <div className="max-w-[1300px] mx-auto px-6 lg:px-10 pt-16 pb-20 relative z-10">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lime/20 text-lime text-xs font-bold tracking-wide mb-6">
                    <span className="w-2 h-2 rounded-full bg-lime" />
                    500+ Verified Tutors
                </span>
                <h1 className="text-[clamp(2.25rem,4vw,3.25rem)] font-extrabold text-white leading-[1.08] tracking-tight max-w-3xl">
                    Find the perfect tutor for your<br />
                    <span className="text-lime">subject, board, and schedule.</span>
                </h1>
                <p className="mt-5 text-[16px] text-gray-400 leading-relaxed max-w-xl">
                    Browse background-checked tutors across West Hyderabad. Filter by subject, class, location, and mode — then book a free trial in one click.
                </p>
            </div>
        </section>

        {/* ════════════════ RESULTS ════════════════ */}
        <section className="bg-[#f7f7f7] min-h-screen py-10">
            <div className="max-w-[1300px] mx-auto px-6 lg:px-10">
                <TutorList />
            </div>
        </section>
    </div>
);

export default FindTutors;
