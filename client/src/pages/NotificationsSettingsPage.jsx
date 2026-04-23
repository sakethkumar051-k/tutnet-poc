import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useToastStore } from '../stores/toastStore';
import { CATEGORIES } from '../constants/notificationCategories';

/**
 * NotificationsSettingsPage — /notifications/settings
 * Per-category on/off toggles. Saves inline.
 */
export default function NotificationsSettingsPage() {
    const [prefs, setPrefs] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const showSuccess = useToastStore((s) => s.showSuccess);
    const showError = useToastStore((s) => s.showError);

    useEffect(() => {
        api.get('/notifications/preferences')
            .then(({ data }) => setPrefs(data.preferences))
            .catch((e) => setError(e?.response?.data?.message || 'Failed to load preferences'))
            .finally(() => setLoading(false));
    }, []);

    const toggle = async (key) => {
        if (!prefs || saving) return;
        const next = { ...prefs, [key]: !prefs[key] };
        setPrefs(next);
        setSaving(true);
        try {
            const { data } = await api.put('/notifications/preferences', { preferences: next });
            setPrefs(data.preferences);
            showSuccess('Preferences saved');
        } catch (e) {
            showError(e?.response?.data?.message || 'Could not save');
            // Revert optimistic change
            setPrefs((p) => ({ ...p, [key]: !next[key] }));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
                <div className="mb-6">
                    <Link to="/notifications" className="text-xs font-bold text-gray-500 hover:text-navy-950">
                        ← Back to notifications
                    </Link>
                    <h1 className="text-3xl font-extrabold text-navy-950 mt-2">Notification settings</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Turn categories off to stop new notifications in that group. Existing ones stay in your inbox.
                    </p>
                </div>

                {loading ? (
                    <SettingsSkeleton />
                ) : error ? (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-800">
                        {error}
                    </div>
                ) : prefs ? (
                    <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-100 overflow-hidden">
                        {CATEGORIES.map((c) => (
                            <div key={c.key} className="px-5 py-4 flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-navy-950">{c.label}</p>
                                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{c.desc}</p>
                                </div>
                                <Switch
                                    checked={!!prefs[c.key]}
                                    onChange={() => toggle(c.key)}
                                    disabled={saving}
                                    ariaLabel={`${c.label} notifications`}
                                />
                            </div>
                        ))}
                    </div>
                ) : null}

                <p className="text-[11px] text-gray-400 mt-4 leading-relaxed">
                    Email, SMS, and push notifications are not yet wired. When they launch you'll get separate toggles per channel.
                </p>
            </div>
        </div>
    );
}

function Switch({ checked, onChange, disabled, ariaLabel }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            onClick={onChange}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                checked ? 'bg-emerald-500' : 'bg-gray-300'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    checked ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
    );
}

function SettingsSkeleton() {
    return (
        <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-100">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center justify-between gap-4 animate-pulse">
                    <div className="flex-1">
                        <div className="h-3 bg-gray-100 rounded w-24 mb-2" />
                        <div className="h-2.5 bg-gray-100 rounded w-5/6" />
                    </div>
                    <div className="h-6 w-11 rounded-full bg-gray-100" />
                </div>
            ))}
        </div>
    );
}
