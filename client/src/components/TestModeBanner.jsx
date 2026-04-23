import { useEffect, useState } from 'react';
import api from '../utils/api';

/**
 * TestModeBanner — thin, unobtrusive banner shown when the server reports
 * PAYMENT_MODE=mock. Keeps everyone honest that no real money moves.
 * Auto-hides when the server is switched to live/test mode.
 */
export default function TestModeBanner() {
    const [mode, setMode] = useState(null);
    const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('tutnet_testmode_dismissed') === '1');

    useEffect(() => {
        let cancelled = false;
        api.get('/health')
            .then(({ data }) => { if (!cancelled) setMode(data?.paymentMode || null); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    if (dismissed) return null;
    if (mode !== 'mock') return null;

    const dismiss = () => {
        sessionStorage.setItem('tutnet_testmode_dismissed', '1');
        setDismissed(true);
    };

    return (
        <div className="sticky top-0 z-40 bg-yellow-500/95 text-navy-950 border-b border-yellow-600">
            <div className="max-w-[1500px] mx-auto px-4 py-1.5 flex items-center gap-3 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-navy-950 animate-pulse" />
                    TEST MODE
                </span>
                <span className="flex-1 truncate">
                    Payments are simulated. No real money moves. Configure live Razorpay keys and set <code className="font-mono text-[11px] bg-navy-950/10 px-1 rounded">PAYMENT_MODE=test</code> in server/.env to enable real payments.
                </span>
                <button
                    onClick={dismiss}
                    className="flex-shrink-0 w-5 h-5 rounded-full hover:bg-navy-950/10 flex items-center justify-center"
                    aria-label="Dismiss"
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
