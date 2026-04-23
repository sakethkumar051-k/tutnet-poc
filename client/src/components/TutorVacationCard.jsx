import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

/**
 * TutorVacationCard — toggle leave/vacation mode for tutors.
 * When active, the tutor is hidden from search and students see a "on leave" banner.
 * Existing bookings remain.
 */
export default function TutorVacationCard() {
    const [vacation, setVacation] = useState({ active: false, from: '', to: '', message: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { showSuccess, showError } = useToast();

    useEffect(() => {
        api.get('/tutors/me')
            .then(({ data }) => {
                const v = data?.vacation || {};
                setVacation({
                    active: !!v.active,
                    from: v.from ? new Date(v.from).toISOString().slice(0, 10) : '',
                    to: v.to ? new Date(v.to).toISOString().slice(0, 10) : '',
                    message: v.message || ''
                });
            })
            .catch(() => { /* silent */ })
            .finally(() => setLoading(false));
    }, []);

    const save = async (activeOverride) => {
        const nextActive = typeof activeOverride === 'boolean' ? activeOverride : !vacation.active;
        setSaving(true);
        try {
            const { data } = await api.patch('/tutors/vacation', {
                active: nextActive,
                from: vacation.from || undefined,
                to: vacation.to || undefined,
                message: vacation.message || ''
            });
            const v = data?.vacation || {};
            setVacation({
                active: !!v.active,
                from: v.from ? new Date(v.from).toISOString().slice(0, 10) : vacation.from,
                to: v.to ? new Date(v.to).toISOString().slice(0, 10) : vacation.to,
                message: v.message || vacation.message
            });
            showSuccess(nextActive ? "You're now on leave — hidden from search." : "Welcome back! You're live again.");
        } catch (err) {
            showError(err?.response?.data?.message || 'Could not update vacation mode');
        } finally { setSaving(false); }
    };

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-400">Loading vacation settings…</p>
            </div>
        );
    }

    const isActive = vacation.active;

    return (
        <div className={`p-6 rounded-xl border shadow-sm ${isActive ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-navy-950">Vacation mode</h3>
                        {isActive && (
                            <span className="px-2 py-0.5 bg-yellow-400/30 text-yellow-900 text-[10px] font-bold uppercase tracking-wider rounded">
                                On leave
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-600">
                        {isActive
                            ? "You're hidden from search. Existing bookings are unchanged — you can still teach."
                            : 'Turn this on to hide your profile from new students while you’re away. Takes a second to turn off when you’re back.'}
                    </p>
                </div>
                <button
                    onClick={() => save()}
                    disabled={saving}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        isActive
                            ? 'bg-yellow-400 hover:bg-yellow-500 text-navy-950'
                            : 'bg-navy-950 hover:bg-navy-900 text-white'
                    } disabled:opacity-60`}>
                    {saving ? 'Saving…' : isActive ? 'Come back' : 'Go on leave'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">From</label>
                    <input type="date" value={vacation.from}
                        onChange={(e) => setVacation((v) => ({ ...v, from: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal/40" />
                </div>
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Until</label>
                    <input type="date" value={vacation.to}
                        onChange={(e) => setVacation((v) => ({ ...v, to: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal/40" />
                </div>
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Note (optional)</label>
                    <input type="text" value={vacation.message} maxLength={300}
                        onChange={(e) => setVacation((v) => ({ ...v, message: e.target.value }))}
                        placeholder="e.g. Back Aug 15 after exams"
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal/40" />
                </div>
            </div>
            {isActive && (
                <button onClick={() => save(true)} disabled={saving}
                    className="mt-3 text-xs font-semibold text-royal hover:text-royal-dark">
                    Update dates / note
                </button>
            )}
        </div>
    );
}
