import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useAuthModalStore } from '../stores/authModalStore';

/**
 * Public pricing page. Shows all 4 plans, explains the model, and
 * anchors parents on the monthly subscription as the default.
 */
const Pricing = () => {
    const user = useAuthStore((s) => s.user);
    const openLogin = useAuthModalStore((s) => s.openLogin);

    const handleCTA = () => {
        if (!user) { openLogin('Sign in to pick a tutor'); return; }
        window.location.href = user.role === 'tutor' ? '/tutor-dashboard' : '/find-tutors';
    };

    return (
        <div className="bg-[#f7f7f7] min-h-screen">
            {/* Hero */}
            <section className="relative overflow-hidden bg-navy-950">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-24 -left-24 w-[480px] h-[480px] bg-royal/20 rounded-full blur-[120px]" />
                    <div className="absolute -bottom-24 right-0 w-[420px] h-[420px] bg-lime/10 rounded-full blur-[120px]" />
                </div>
                <div className="max-w-[1300px] mx-auto px-6 lg:px-10 py-20 lg:py-24 relative z-10 text-center">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lime/20 text-lime text-xs font-bold tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-lime" />
                        Simple, transparent pricing
                    </span>
                    <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-extrabold text-white leading-[1.08] tracking-tight mt-6">
                        Pay once a month.<br /><span className="text-lime">No surprises.</span>
                    </h1>
                    <p className="mt-5 text-[17px] text-gray-400 leading-relaxed max-w-xl mx-auto">
                        Home and online tutoring in West Hyderabad. 4 plans, every one includes refund safety, backup tutor support, and verified profiles.
                    </p>
                </div>
            </section>

            {/* Plans */}
            <section className="max-w-[1300px] mx-auto px-6 lg:px-10 -mt-10 relative z-10 pb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {PLANS.map((p) => (
                        <div key={p.key}
                            className={`bg-white rounded-3xl border-2 ${p.highlight ? 'border-royal shadow-[0_20px_60px_-20px_rgba(25,57,229,0.35)]' : 'border-gray-100'} p-6 flex flex-col`}>
                            {p.highlight && (
                                <div className="-mt-9 mb-3 mx-auto inline-flex items-center self-center px-3 py-1 bg-royal text-white text-[10px] font-bold tracking-[0.18em] uppercase rounded-full">
                                    Most popular
                                </div>
                            )}
                            <h3 className="text-xl font-extrabold text-navy-950 tracking-tight">{p.label}</h3>
                            <p className="text-xs text-gray-500 mt-1 min-h-[34px] leading-relaxed">{p.description}</p>

                            <div className="mt-5">
                                <p className="text-4xl font-extrabold text-navy-950 tracking-tight">
                                    {p.pricingHint}
                                </p>
                                <p className="text-[11px] text-gray-400 mt-1">{p.pricingSubhint}</p>
                            </div>

                            <ul className="mt-5 space-y-2.5 flex-1">
                                {p.features.map((f, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                        <svg className="w-4 h-4 text-lime-dark mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>

                            <button onClick={handleCTA}
                                className={`mt-6 w-full py-3 rounded-full text-sm font-bold transition-colors ${
                                    p.highlight
                                        ? 'bg-lime hover:bg-lime-light text-navy-950'
                                        : 'bg-navy-950 hover:bg-navy-900 text-white'
                                }`}>
                                {p.cta}
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Trust strip */}
            <section className="max-w-[1300px] mx-auto px-6 lg:px-10 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <TrustCard
                        eyebrow="Every plan includes"
                        title="Refund protection"
                        body="Miss a tutor? Tutor no-show? We refund the session. No arguments, no friction."
                    />
                    <TrustCard
                        eyebrow="Every plan includes"
                        title="Backup tutor within 24h"
                        body="If your tutor is unavailable, we arrange a matched substitute within a day. Your child doesn't miss a class."
                    />
                    <TrustCard
                        eyebrow="Every plan includes"
                        title="Monthly progress reports"
                        body="Concrete topic coverage, homework, and improvement tracked. Shared with you on the 1st of every month."
                    />
                </div>
            </section>

            {/* Price examples */}
            <section className="max-w-[1100px] mx-auto px-6 lg:px-10 py-12">
                <div className="bg-white rounded-3xl border border-gray-100 p-8 lg:p-10">
                    <p className="text-[10px] font-bold tracking-[0.2em] text-royal uppercase">Example pricing</p>
                    <h2 className="text-2xl font-extrabold text-navy-950 tracking-tight mt-2">What you actually pay</h2>
                    <p className="text-sm text-gray-500 mt-2 max-w-xl leading-relaxed">
                        Real rates by grade. Every tutor sets their rate inside a published band for fairness and consistency.
                    </p>
                    <div className="mt-6 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-[10px] text-gray-400 uppercase tracking-widest font-bold border-b border-gray-100">
                                    <th className="text-left py-3">Grade</th>
                                    <th className="text-right">₹ / hour (typical)</th>
                                    <th className="text-right">Monthly plan (16 sessions)</th>
                                    <th className="text-right">Committed (5% off)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {RATE_EXAMPLES.map((r) => (
                                    <tr key={r.grade} className="border-b border-gray-50 last:border-0">
                                        <td className="py-3 font-semibold text-navy-950">{r.grade}</td>
                                        <td className="text-right text-gray-700">₹{r.hourly}</td>
                                        <td className="text-right font-semibold text-navy-950">₹{(r.hourly * 16).toLocaleString('en-IN')}</td>
                                        <td className="text-right font-semibold text-royal">₹{Math.round(r.hourly * 16 * 0.95).toLocaleString('en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="max-w-[900px] mx-auto px-6 lg:px-10 py-12 pb-20">
                <h2 className="text-2xl font-extrabold text-navy-950 tracking-tight text-center">Common questions</h2>
                <div className="mt-8 space-y-3">
                    {FAQ.map((f, i) => <FAQItem key={i} {...f} />)}
                </div>
            </section>

            {/* Final CTA */}
            <section className="bg-navy-950 py-16">
                <div className="max-w-[900px] mx-auto px-6 text-center">
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">Ready to find your tutor?</h2>
                    <p className="text-gray-400 mt-3 max-w-lg mx-auto leading-relaxed">
                        Browse 500+ verified tutors in Gachibowli, Kondapur, Madhapur and across West Hyderabad.
                    </p>
                    <button onClick={handleCTA}
                        className="mt-7 px-8 py-3 bg-lime hover:bg-lime-light text-navy-950 text-sm font-bold rounded-full transition-colors">
                        Find a tutor
                    </button>
                    <Link to="/how-it-works" className="ml-3 px-6 py-3 text-sm text-gray-300 hover:text-white font-semibold transition-colors">
                        How it works →
                    </Link>
                </div>
            </section>
        </div>
    );
};

function TrustCard({ eyebrow, title, body }) {
    return (
        <div className="bg-white rounded-3xl p-6 border border-gray-100">
            <p className="text-[10px] font-bold tracking-[0.2em] text-royal uppercase">{eyebrow}</p>
            <h3 className="text-lg font-extrabold text-navy-950 tracking-tight mt-2">{title}</h3>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">{body}</p>
        </div>
    );
}

function FAQItem({ q, a }) {
    return (
        <details className="group bg-white rounded-2xl border border-gray-100 px-5 py-4 open:shadow-sm">
            <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-bold text-navy-950 text-[15px]">{q}</span>
                <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </summary>
            <p className="text-sm text-gray-600 mt-3 leading-relaxed">{a}</p>
        </details>
    );
}

const PLANS = [
    {
        key: 'flex',
        label: 'Flex',
        description: 'Pay per session. No commitment, try before you commit.',
        pricingHint: '+10%',
        pricingSubhint: 'over hourly rate · per session',
        features: ['Pay as you go', 'Cancel anytime', 'All trust & safety features', 'Good for occasional help'],
        cta: 'Try Flex',
        highlight: false
    },
    {
        key: 'monthly',
        label: 'Monthly',
        description: '16 sessions/month, up to 20. Our main plan for regular tuition.',
        pricingHint: '₹9,600+',
        pricingSubhint: 'per month · from ₹600/hr',
        features: ['16 sessions/month (up to 20 free)', 'Upfront monthly billing', 'Refund protection', 'Backup tutor in 24h'],
        cta: 'Choose Monthly',
        highlight: true
    },
    {
        key: 'committed',
        label: 'Committed',
        description: '3-month commitment with 5% off. Best for retained tuition.',
        pricingHint: '₹9,120+',
        pricingSubhint: 'per month · save 5% monthly',
        features: ['Everything in Monthly', '5% lower monthly cost', 'Priority scheduling', 'Priority support'],
        cta: 'Commit & save',
        highlight: false
    },
    {
        key: 'intensive',
        label: 'Intensive',
        description: '24 sessions/month, 7% off. For board exams, JEE, NEET.',
        pricingHint: '₹13,392+',
        pricingSubhint: 'per month · for exam prep',
        features: ['24 sessions/month (up to 28)', '7% lower per-session cost', '3-month commitment', 'Exam-focused progress tracking'],
        cta: 'Choose Intensive',
        highlight: false
    }
];

const RATE_EXAMPLES = [
    { grade: 'Classes 1–5',          hourly: 300 },
    { grade: 'Classes 6–8',          hourly: 450 },
    { grade: 'Classes 9–10',         hourly: 650 },
    { grade: 'Classes 11–12',        hourly: 950 },
    { grade: 'JEE / NEET foundation',  hourly: 1200 }
];

const FAQ = [
    { q: 'How does the monthly subscription work?',
        a: 'You pay once at the start of the month for up to 20 sessions. Your tutor and you agree on a schedule (e.g., Mon/Wed/Fri evenings). No per-session payments, no back-and-forth.' },
    { q: 'What if my tutor cancels or doesn\'t show up?',
        a: 'We refund missed sessions prorated at month end, and we\'ll arrange a backup tutor within 24 hours. No arguments needed — our attendance records are the source of truth.' },
    { q: 'Can I cancel anytime?',
        a: 'Yes. Monthly plan renews each month and you can skip or cancel before the next billing. Committed & Intensive plans have a 3-month minimum; after that, cancel any time.' },
    { q: 'What payment methods do you accept?',
        a: 'UPI, UPI AutoPay, netbanking, credit & debit cards — all processed by Razorpay. We prefer UPI AutoPay because it\'s zero-friction for the next month.' },
    { q: 'Why can\'t I pay the tutor directly in cash?',
        a: 'Off-platform arrangements don\'t get our refund protection, backup-tutor coverage, or dispute resolution. Most importantly, parents often report that cash tutors disappear without notice — we exist specifically to prevent that.' },
    { q: 'Do I get tax invoices?',
        a: 'Yes — a GST-compliant invoice is emailed each month and available in your dashboard. Useful for salaried parents claiming education expenses.' }
];

export default Pricing;
