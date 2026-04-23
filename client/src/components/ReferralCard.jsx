import { useEffect, useState } from 'react';
import api from '../utils/api';

/**
 * ReferralCard — surfaces the user's referral code + share link + stats.
 * Same component for students and tutors; reward amount comes from the API.
 */
export default function ReferralCard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        api.get('/referrals/mine')
            .then(({ data }) => setData(data))
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, []);

    const copy = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* noop */ }
    };

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-lime/20 to-lime/5 border border-lime/30 rounded-xl p-5 text-sm text-gray-500">
                Loading referral…
            </div>
        );
    }
    if (!data) return null;

    return (
        <div className="bg-gradient-to-br from-lime/20 to-lime/5 border border-lime/30 rounded-xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-navy-950">Refer & Earn</p>
                    <h3 className="text-lg font-extrabold text-navy-950 mt-0.5">
                        Earn ₹{data.rewardPerSignup} for each signup
                    </h3>
                </div>
                <div className="flex gap-3 text-xs">
                    <div className="text-right">
                        <p className="text-gray-500">Invited</p>
                        <p className="text-lg font-bold text-navy-950">{data.invited}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-500">Rewarded</p>
                        <p className="text-lg font-bold text-lime-dark">{data.rewarded}</p>
                    </div>
                </div>
            </div>

            <p className="text-sm text-gray-700 mb-3">
                Share your code. When someone signs up and completes their first session, your credit lands automatically.
            </p>

            <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 bg-white border border-lime/40 rounded-lg px-3 py-2 font-mono text-lg font-bold text-navy-950 text-center tracking-wider">
                    {data.code}
                </div>
                <button onClick={() => copy(data.code)}
                    className="px-3 py-2 bg-navy-950 hover:bg-navy-900 text-white text-xs font-semibold rounded-lg">
                    {copied ? 'Copied ✓' : 'Copy'}
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                <button onClick={() => copy(data.shareUrl)}
                    className="flex-1 min-w-[160px] px-3 py-2 bg-white border border-gray-200 hover:border-royal/40 text-navy-950 text-xs font-semibold rounded-lg text-left truncate">
                    <span className="text-gray-400 mr-1">Link:</span>{data.shareUrl.replace(/^https?:\/\//, '')}
                </button>
                <a
                    href={`https://wa.me/?text=${encodeURIComponent(data.shareMessage)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="px-3 py-2 bg-[#25D366] hover:bg-[#1fb358] text-white text-xs font-semibold rounded-lg">
                    Share on WhatsApp
                </a>
                <a
                    href={`mailto:?subject=${encodeURIComponent('Join me on TutNet')}&body=${encodeURIComponent(data.shareMessage)}`}
                    className="px-3 py-2 bg-white border border-gray-200 hover:border-royal/40 text-navy-950 text-xs font-semibold rounded-lg">
                    Email
                </a>
            </div>
        </div>
    );
}
