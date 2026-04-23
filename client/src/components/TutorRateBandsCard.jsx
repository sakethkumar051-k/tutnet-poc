import { RATE_BANDS } from '../constants/tierMeta';

/**
 * TutorRateBandsCard — reference for the tutor's listable price ranges by
 * grade and subject (REVENUE_MODEL.md §2). These are enforced on the backend;
 * this view is the tutor-facing disclosure so there are no surprises.
 */
export default function TutorRateBandsCard({ highlightRate }) {
    return (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-royal/5 to-transparent">
                <h3 className="text-sm font-bold text-navy-950">Platform rate bands</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                    Every listing must fall inside the band. Below the floor → undercuts supply; above the ceiling → prices out
                    the home-tuition market.
                </p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50/50">
                        <tr>
                            {['Grade', 'Subjects', 'Online', 'Home visit'].map((h) => (
                                <th key={h} className="py-2.5 px-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {RATE_BANDS.map((b, i) => {
                            const inOnline = highlightRate && highlightRate >= b.online[0] && highlightRate <= b.online[1];
                            const inHome   = highlightRate && highlightRate >= b.home[0]   && highlightRate <= b.home[1];
                            return (
                                <tr key={i} className="hover:bg-gray-50/50">
                                    <td className="py-2.5 px-4 text-xs font-bold text-navy-950 whitespace-nowrap">{b.grade}</td>
                                    <td className="py-2.5 px-4 text-xs text-gray-500">{b.subjectLabel}</td>
                                    <td className={`py-2.5 px-4 text-xs ${inOnline ? 'bg-emerald-50 font-bold text-emerald-800' : 'text-gray-700'}`}>
                                        ₹{b.online[0].toLocaleString('en-IN')}–₹{b.online[1].toLocaleString('en-IN')}
                                    </td>
                                    <td className={`py-2.5 px-4 text-xs ${inHome ? 'bg-emerald-50 font-bold text-emerald-800' : 'text-gray-700'}`}>
                                        ₹{b.home[0].toLocaleString('en-IN')}–₹{b.home[1].toLocaleString('en-IN')}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100">
                <p className="text-[11px] text-gray-500 leading-relaxed">
                    <strong className="text-navy-950">Online rates are ~25–30% lower</strong> than home visits — no travel.
                    {highlightRate && <> Your current rate <strong className="text-emerald-700">₹{highlightRate}/hr</strong> is highlighted where it fits.</>}
                </p>
            </div>
        </div>
    );
}
