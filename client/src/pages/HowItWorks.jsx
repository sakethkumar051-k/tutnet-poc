import { Link } from 'react-router-dom';

/**
 * Public how-it-works explainer.
 * Explains the parent journey + subscription model + trust pillars.
 */
const HowItWorks = () => {
    return (
        <div className="bg-[#f7f7f7] min-h-screen">
            {/* Hero */}
            <section className="bg-navy-950 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/3 -left-24 w-[420px] h-[420px] bg-royal/20 rounded-full blur-[120px]" />
                    <div className="absolute top-1/4 right-0 w-[420px] h-[420px] bg-lime/10 rounded-full blur-[120px]" />
                </div>
                <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-20 lg:py-24 relative z-10">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lime/20 text-lime text-xs font-bold tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-lime" />
                        How Tutnet works
                    </span>
                    <h1 className="text-[clamp(2.5rem,4.5vw,3.75rem)] font-extrabold text-white leading-[1.08] tracking-tight mt-6 max-w-3xl">
                        A better way to hire a home tutor. <span className="text-lime">Built for trust.</span>
                    </h1>
                    <p className="mt-5 text-[16px] text-gray-400 leading-relaxed max-w-2xl">
                        Pick a verified tutor, subscribe monthly, and get refund protection, attendance tracking, and backup tutor support — things WhatsApp-group referrals can't offer.
                    </p>
                </div>
            </section>

            {/* Journey steps */}
            <section className="max-w-[1100px] mx-auto px-6 lg:px-10 py-16 lg:py-20">
                <p className="text-[10px] font-bold tracking-[0.2em] text-royal uppercase text-center">The parent journey</p>
                <h2 className="text-3xl font-extrabold text-navy-950 tracking-tight mt-3 text-center max-w-xl mx-auto">
                    From first search to monthly tutoring, in about 48 hours.
                </h2>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {STEPS.map((s, i) => (
                        <div key={s.title} className="flex gap-5">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-navy-950 text-white font-bold text-sm flex items-center justify-center">
                                {i + 1}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-extrabold text-navy-950 tracking-tight">{s.title}</h3>
                                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{s.body}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Why subscription */}
            <section className="bg-white border-y border-gray-100">
                <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-16 lg:py-20">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-10 lg:gap-16 items-start">
                        <div>
                            <p className="text-[10px] font-bold tracking-[0.2em] text-royal uppercase">The subscription model</p>
                            <h2 className="text-3xl font-extrabold text-navy-950 tracking-tight mt-3 leading-tight">
                                One monthly payment. <span className="text-royal">Covers everything.</span>
                            </h2>
                            <p className="text-sm text-gray-600 mt-4 leading-relaxed">
                                Instead of fighting per-session cash transactions, your monthly plan covers up to 20 sessions, refund protection, backup tutor support, and monthly progress reports.
                            </p>
                            <Link to="/pricing"
                                className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-lime hover:bg-lime-light text-navy-950 text-sm font-bold rounded-full transition-colors">
                                See all plans →
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {COMPARE.map((c) => (
                                <div key={c.dimension} className="grid grid-cols-[140px_1fr_1fr] gap-3 items-start">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{c.dimension}</p>
                                    <div className="bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5">
                                        <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wide mb-0.5">Cash tutor</p>
                                        <p className="text-sm text-gray-700">{c.cash}</p>
                                    </div>
                                    <div className="bg-lime/15 border border-lime/30 rounded-xl px-3 py-2.5">
                                        <p className="text-[10px] font-bold text-navy-950 uppercase tracking-wide mb-0.5">Tutnet</p>
                                        <p className="text-sm text-gray-700">{c.tutnet}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust pillars */}
            <section className="max-w-[1100px] mx-auto px-6 lg:px-10 py-16 lg:py-20">
                <p className="text-[10px] font-bold tracking-[0.2em] text-royal uppercase text-center">Built-in trust</p>
                <h2 className="text-3xl font-extrabold text-navy-950 tracking-tight mt-3 text-center max-w-xl mx-auto">
                    Every session is on the record.
                </h2>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
                    {TRUST.map((t) => (
                        <div key={t.title} className="bg-white rounded-3xl border border-gray-100 p-6">
                            <div className="w-10 h-10 rounded-xl bg-lime/30 flex items-center justify-center">
                                <svg className="w-5 h-5 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                                </svg>
                            </div>
                            <h3 className="text-lg font-extrabold text-navy-950 tracking-tight mt-4">{t.title}</h3>
                            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{t.body}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Tutor side */}
            <section className="bg-navy-950 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-lime/5 rounded-full blur-[120px]" />
                </div>
                <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-20 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div>
                            <p className="text-[10px] font-bold tracking-[0.2em] text-lime uppercase">For tutors</p>
                            <h2 className="text-3xl font-extrabold text-white tracking-tight mt-3 leading-tight">
                                Earn more by staying on Tutnet.
                            </h2>
                            <p className="text-gray-400 mt-4 leading-relaxed">
                                Our commission drops from 25% (Starter) to 15% (Platinum) as you complete more sessions and maintain quality. Plus monthly retention bonuses, volume bonuses, and guaranteed weekly payouts.
                            </p>
                            <Link to="/register"
                                className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-lime hover:bg-lime-light text-navy-950 text-sm font-bold rounded-full transition-colors">
                                Apply to teach →
                            </Link>
                        </div>
                        <div className="space-y-2">
                            <TierRow label="Starter" rate={25} desc="0–20 sessions" />
                            <TierRow label="Silver" rate={22} desc="21+ sessions, 4.0+ rating" />
                            <TierRow label="Gold" rate={18} desc="76+ sessions, 4.4+ rating" highlighted />
                            <TierRow label="Platinum" rate={15} desc="201+ sessions, 4.7+ rating" />
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-white py-16">
                <div className="max-w-[700px] mx-auto px-6 text-center">
                    <h2 className="text-3xl font-extrabold text-navy-950 tracking-tight">Start with a free trial</h2>
                    <p className="text-gray-600 mt-3 leading-relaxed">
                        30-minute free demo with any tutor. No payment, no commitment. Decide after.
                    </p>
                    <Link to="/find-tutors"
                        className="inline-flex items-center gap-2 mt-7 px-6 py-3 bg-lime hover:bg-lime-light text-navy-950 text-sm font-bold rounded-full transition-colors">
                        Find a tutor
                    </Link>
                </div>
            </section>
        </div>
    );
};

function TierRow({ label, rate, desc, highlighted }) {
    return (
        <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${highlighted ? 'bg-lime/15 border border-lime/30' : 'bg-white/5 border border-white/10'}`}>
            <div>
                <p className="text-sm font-extrabold text-white">{label}</p>
                <p className="text-[11px] text-gray-400">{desc}</p>
            </div>
            <p className={`text-lg font-extrabold ${highlighted ? 'text-lime' : 'text-white'}`}>{rate}%</p>
        </div>
    );
}

const STEPS = [
    { title: 'Search verified tutors near you',
        body: 'Filter by grade, subject, mode (home or online), and area. Every listed tutor has been reviewed by our admin team.' },
    { title: 'Book a free trial',
        body: '30-min demo class, completely free. No card needed. Your child meets the tutor, you decide.' },
    { title: 'Pick a monthly plan',
        body: 'Flex for occasional sessions, Monthly for regular tuition, Intensive for exam prep. Pay once at signup.' },
    { title: 'Attend sessions — we track everything',
        body: 'Tutor marks attendance, you confirm. Progress reports monthly. If something is wrong, disputed attendance is admin-resolved within 72h.' },
    { title: 'Renew, switch, or cancel anytime',
        body: 'Your plan renews automatically. Cancel from your dashboard. If your tutor doesn\'t work out, we\'ll match you with another at no cost.' },
    { title: 'Refer a friend, earn credits',
        body: 'Refer another parent and you both get ₹300 credit after their first month. Sibling discount 10% off the 2nd child.' }
];

const COMPARE = [
    { dimension: 'Missed sessions',
        cash: 'Tough conversation. Tutor might ghost.',
        tutnet: 'Auto-refunded prorated. Backup tutor in 24h.' },
    { dimension: 'Receipts',
        cash: 'None. If you ask you sound rude.',
        tutnet: 'Monthly GST-compliant invoice by email.' },
    { dimension: 'Tutor quality',
        cash: 'WhatsApp vouch. Hope for the best.',
        tutnet: 'Admin-approved profiles. Real reviews from other parents.' },
    { dimension: 'Safety if something goes wrong',
        cash: 'Your problem.',
        tutnet: 'In-app reporting, admin review, tutor suspension if needed.' }
];

const TRUST = [
    { title: 'Verified tutors',
        body: 'Every tutor is manually reviewed. Credentials checked. Rejected if anything is off. We suspend on misconduct.',
        icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
    { title: 'Every session logged',
        body: 'Attendance is marked by the tutor and confirmed by you. Disputes surface inside the app. No he-said-she-said.',
        icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { title: 'Refund-safe payments',
        body: 'Pay through Razorpay. Disputes resolve within 72 hours. Payment records follow you; we never touch your card details.',
        icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' }
];

export default HowItWorks;
