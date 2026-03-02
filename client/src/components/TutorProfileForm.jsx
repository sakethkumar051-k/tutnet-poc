import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_OPTIONS, TEACHING_MODES, TIME_SLOTS } from '../constants/tutorProfile';

function FixedWeeklySlots({ weeklyAvailability, addSlot, removeSlot, timeSlots }) {
    const [draft, setDraft] = useState({});
    const setDraftForDay = (dayIndex, field, value) => {
        setDraft(prev => ({
            ...prev,
            [dayIndex]: { ...(prev[dayIndex] || {}), [field]: value }
        }));
    };
    const handleAdd = (dayIndex) => {
        const d = draft[dayIndex] || {};
        if (d.start && d.end) {
            addSlot(dayIndex, d.start, d.end);
            setDraft(prev => ({ ...prev, [dayIndex]: {} }));
        }
    };
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Weekly slots (add start–end per day)</label>
            <div className="space-y-4">
                {weeklyAvailability.map((dayObj, dayIndex) => (
                    <div key={dayObj.day} className="border border-slate-200 rounded-lg p-3">
                        <div className="font-medium text-slate-700 mb-2">{dayObj.day}</div>
                        <div className="space-y-2">
                            {(dayObj.slots || []).map((slot, slotIndex) => (
                                <div key={slotIndex} className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm text-slate-600">{slot.start} – {slot.end}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeSlot(dayIndex, slotIndex)}
                                        className="text-red-600 text-sm hover:underline"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                            <div className="flex items-center gap-2 flex-wrap">
                                <select
                                    value={(draft[dayIndex] || {}).start || ''}
                                    onChange={e => setDraftForDay(dayIndex, 'start', e.target.value)}
                                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                                >
                                    <option value="">Start</option>
                                    {timeSlots.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                                <select
                                    value={(draft[dayIndex] || {}).end || ''}
                                    onChange={e => setDraftForDay(dayIndex, 'end', e.target.value)}
                                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                                >
                                    <option value="">End</option>
                                    {timeSlots.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => handleAdd(dayIndex)}
                                    className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200"
                                >
                                    Add slot
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const STEPS = [
    { id: 1, title: 'Basic Info', short: 'Basic' },
    { id: 2, title: 'Teaching Details', short: 'Teaching' },
    { id: 3, title: 'Availability', short: 'Availability' },
    { id: 4, title: 'Professional Info', short: 'Professional' },
    { id: 5, title: 'Review & Submit', short: 'Review' }
];

const initialWeekly = () =>
    DEFAULT_OPTIONS.daysOfWeek.map(day => ({ day, slots: [] }));

const TutorProfileForm = () => {
    const { setUser } = useAuth();
    const [step, setStep] = useState(1);
    const [options, setOptions] = useState(DEFAULT_OPTIONS);
    const [profileData, setProfileData] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [formData, setFormData] = useState({
        phone: '',
        area: '',
        pincode: '',
        mode: 'home',
        travelRadius: '',
        subjects: [],
        classes: [],
        experienceYears: '',
        hourlyRate: '',
        availabilityMode: 'flexible',
        weeklyAvailability: initialWeekly(),
        noticePeriodHours: 24,
        maxSessionsPerDay: 4,
        degree: '',
        institution: '',
        year: '',
        qualifications: [],
        strengthTags: [],
        bio: ''
    });

    const fetchData = useCallback(async () => {
        try {
            const [profileRes, userRes, optionsRes] = await Promise.all([
                api.get('/tutors/me').catch(() => ({ data: null })),
                api.get('/auth/me'),
                api.get('/tutors/profile/options').catch(() => ({ data: null }))
            ]);
            const profile = profileRes.data;
            const user = userRes.data;
            if (optionsRes.data) setOptions({ ...DEFAULT_OPTIONS, ...optionsRes.data });

            setUserData(user);
            setProfileData(profile);

            const loc = user?.location || {};
            const weekly = (profile?.weeklyAvailability && profile.weeklyAvailability.length > 0)
                ? DEFAULT_OPTIONS.daysOfWeek.map(day => {
                    const existing = profile.weeklyAvailability.find(w => w.day === day);
                    return { day, slots: existing?.slots || [] };
                })
                : initialWeekly();

            setFormData({
                phone: user?.phone || '',
                area: loc?.area || '',
                pincode: loc?.pincode || '',
                mode: profile?.mode || 'home',
                travelRadius: profile?.travelRadius ?? '',
                subjects: profile?.subjects || [],
                classes: profile?.classes || [],
                experienceYears: profile?.experienceYears ?? '',
                hourlyRate: profile?.hourlyRate ?? '',
                availabilityMode: profile?.availabilityMode || 'flexible',
                weeklyAvailability: weekly,
                noticePeriodHours: profile?.noticePeriodHours ?? 24,
                maxSessionsPerDay: profile?.maxSessionsPerDay ?? 4,
                degree: profile?.education?.degree || '',
                institution: profile?.education?.institution || '',
                year: profile?.education?.year || '',
                qualifications: profile?.qualifications || [],
                strengthTags: profile?.strengthTags || [],
                bio: profile?.bio || ''
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setMessage({ type: '', text: '' });
    };

    const toggleMulti = (field, item) => {
        setFormData(prev => {
            const arr = prev[field] || [];
            const next = arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
            return { ...prev, [field]: next };
        });
        setMessage({ type: '', text: '' });
    };

    const addSlot = (dayIndex, start, end) => {
        if (!start || !end) return;
        setFormData(prev => {
            const next = prev.weeklyAvailability.map((d, i) => {
                if (i !== dayIndex) return d;
                const slots = [...(d.slots || []), { start, end }];
                return { ...d, slots };
            });
            return { ...prev, weeklyAvailability: next };
        });
    };

    const removeSlot = (dayIndex, slotIndex) => {
        setFormData(prev => {
            const next = prev.weeklyAvailability.map((d, i) => {
                if (i !== dayIndex) return d;
                const slots = (d.slots || []).filter((_, j) => j !== slotIndex);
                return { ...d, slots };
            });
            return { ...prev, weeklyAvailability: next };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            const payload = {
                phone: formData.phone,
                location: { area: formData.area, pincode: formData.pincode },
                mode: formData.mode,
                travelRadius: formData.travelRadius === '' ? undefined : Number(formData.travelRadius),
                subjects: formData.subjects,
                classes: formData.classes,
                experienceYears: formData.experienceYears === '' ? undefined : Number(formData.experienceYears),
                hourlyRate: formData.hourlyRate === '' ? undefined : Number(formData.hourlyRate),
                availabilityMode: formData.availabilityMode,
                weeklyAvailability: formData.weeklyAvailability,
                noticePeriodHours: formData.noticePeriodHours,
                maxSessionsPerDay: formData.maxSessionsPerDay,
                education: {
                    degree: formData.degree,
                    institution: formData.institution,
                    year: formData.year
                },
                qualifications: formData.qualifications,
                strengthTags: formData.strengthTags,
                bio: formData.bio
            };
            const { data } = await api.put('/tutors/profile', payload);
            setProfileData(data);
            try {
                const { data: me } = await api.get('/auth/me');
                setUser(me);
            } catch (_) {}
            setMessage({ type: 'success', text: 'Progress saved.' });
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Failed to save';
            setMessage({ type: 'error', text: msg });
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitForApproval = async () => {
        setMessage({ type: '', text: '' });
        try {
            await handleSave();
            setSubmitting(true);
            const { data } = await api.patch('/tutors/profile/submit');
            setProfileData(data);
            setMessage({ type: 'success', text: 'Profile submitted for approval. An admin will review it soon.' });
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to submit';
            const errors = err.response?.data?.errors;
            const detail = errors?.length ? errors.map(e => e.message).join('. ') : msg;
            setMessage({ type: 'error', text: detail });
        } finally {
            setSubmitting(false);
        }
    };

    const status = profileData?.profileStatus || profileData?.approvalStatus;
    const isApproved = status === 'approved';
    const isPending = status === 'pending';
    const isRejected = status === 'rejected';
    const completionScore = profileData?.profileCompletionScore ?? 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Status banner */}
            {profileData && (
                <div className={`rounded-xl border p-4 ${
                    isApproved ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                    isPending ? 'bg-amber-50 border-amber-200 text-amber-800' :
                    isRejected ? 'bg-red-50 border-red-200 text-red-800' :
                    'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <h3 className="font-semibold">Profile status: {String(status || 'draft').toUpperCase()}</h3>
                            {isPending && <p className="text-sm mt-0.5">Your profile is awaiting admin approval.</p>}
                            {isApproved && <p className="text-sm mt-0.5">Your profile is visible to students.</p>}
                            {isRejected && profileData.rejectionReason && (
                                <p className="text-sm mt-0.5">Reason: {profileData.rejectionReason}</p>
                            )}
                        </div>
                        {!isPending && (
                            <button
                                type="button"
                                onClick={handleSubmitForApproval}
                                disabled={submitting || saving}
                                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {submitting ? 'Submitting…' : 'Submit for approval'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {message.text && (
                <div className={`rounded-lg border p-3 ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    {message.text}
                </div>
            )}

            {/* Stepper */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
                {STEPS.map((s, i) => (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => setStep(s.id)}
                        className={`shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            step === s.id
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        {s.short}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 sm:p-8">
                    {/* Step 1 – Basic Info */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-900">Basic information</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={e => updateField('phone', e.target.value)}
                                        placeholder="10-digit mobile"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                    <p className="mt-1 text-xs text-slate-500">Verified number preferred for bookings</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Area</label>
                                    <input
                                        type="text"
                                        value={formData.area}
                                        onChange={e => updateField('area', e.target.value)}
                                        placeholder="e.g. Jubilee Hills"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Pincode</label>
                                    <input
                                        type="text"
                                        value={formData.pincode}
                                        onChange={e => updateField('pincode', e.target.value)}
                                        placeholder="6-digit"
                                        maxLength={6}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Teaching mode</label>
                                    <select
                                        value={formData.mode}
                                        onChange={e => updateField('mode', e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        {TEACHING_MODES.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {(formData.mode === 'home' || formData.mode === 'both') && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Travel radius (km)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={formData.travelRadius}
                                        onChange={e => updateField('travelRadius', e.target.value)}
                                        placeholder="e.g. 10"
                                        className="w-full max-w-[140px] rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2 – Teaching Details */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-900">Teaching details</h2>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Subjects</label>
                                <div className="flex flex-wrap gap-2">
                                    {(options.subjects || []).map(subj => (
                                        <button
                                            key={subj}
                                            type="button"
                                            onClick={() => toggleMulti('subjects', subj)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                                                formData.subjects.includes(subj)
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'
                                            }`}
                                        >
                                            {subj}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Classes / Grades</label>
                                <div className="flex flex-wrap gap-2">
                                    {(options.classes || []).map(cls => (
                                        <button
                                            key={cls}
                                            type="button"
                                            onClick={() => toggleMulti('classes', cls)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                                                formData.classes.includes(cls)
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'
                                            }`}
                                        >
                                            {cls}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Years of experience</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={formData.experienceYears}
                                        onChange={e => updateField('experienceYears', e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Hourly rate (₹)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={formData.hourlyRate}
                                        onChange={e => updateField('hourlyRate', e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3 – Availability */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-900">Availability</h2>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Availability mode</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="availabilityMode"
                                            checked={formData.availabilityMode === 'fixed'}
                                            onChange={() => updateField('availabilityMode', 'fixed')}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span>Fixed weekly</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="availabilityMode"
                                            checked={formData.availabilityMode === 'flexible'}
                                            onChange={() => updateField('availabilityMode', 'flexible')}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span>Flexible / On-demand</span>
                                    </label>
                                </div>
                            </div>

                            {formData.availabilityMode === 'fixed' && (
                                <FixedWeeklySlots
                                    weeklyAvailability={formData.weeklyAvailability}
                                    addSlot={addSlot}
                                    removeSlot={removeSlot}
                                    timeSlots={TIME_SLOTS}
                                />
                            )}

                            {formData.availabilityMode === 'flexible' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Notice period</label>
                                        <select
                                            value={formData.noticePeriodHours}
                                            onChange={e => updateField('noticePeriodHours', Number(e.target.value))}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            {(options.noticePeriodOptions || []).map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Max sessions per day</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={12}
                                            value={formData.maxSessionsPerDay}
                                            onChange={e => updateField('maxSessionsPerDay', e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4 – Professional Info */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-900">Professional information</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Degree</label>
                                    <input
                                        type="text"
                                        value={formData.degree}
                                        onChange={e => updateField('degree', e.target.value)}
                                        placeholder="e.g. B.Tech, M.Sc"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Institution</label>
                                    <input
                                        type="text"
                                        value={formData.institution}
                                        onChange={e => updateField('institution', e.target.value)}
                                        placeholder="University / College"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                                    <input
                                        type="text"
                                        value={formData.year}
                                        onChange={e => updateField('year', e.target.value)}
                                        placeholder="e.g. 2020"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Certifications</label>
                                <div className="flex flex-wrap gap-2">
                                    {(options.certifications || []).map(cert => (
                                        <button
                                            key={cert}
                                            type="button"
                                            onClick={() => toggleMulti('qualifications', cert)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                                                formData.qualifications.includes(cert)
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'
                                            }`}
                                        >
                                            {cert}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Teaching strengths</label>
                                <div className="flex flex-wrap gap-2">
                                    {(options.strengthTags || []).map(tag => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => toggleMulti('strengthTags', tag)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                                                formData.strengthTags.includes(tag)
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'
                                            }`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Bio (min {options.bioMinLength || 150} characters)</label>
                                <textarea
                                    value={formData.bio}
                                    onChange={e => updateField('bio', e.target.value)}
                                    rows={4}
                                    placeholder="Describe your teaching style, experience, and what makes you a great tutor..."
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <p className="mt-1 text-xs text-slate-500">{formData.bio.length} / {options.bioMinLength || 150}</p>
                            </div>
                        </div>
                    )}

                    {/* Step 5 – Review & Submit */}
                    {step === 5 && (
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-900">Review & submit</h2>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium text-slate-700">Profile completeness</span>
                                        <span className="text-slate-600">{completionScore}%</span>
                                    </div>
                                    <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-600 rounded-full transition-all"
                                            style={{ width: `${completionScore}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                                <h3 className="font-medium text-slate-900 mb-2">Preview</h3>
                                <ul className="text-sm text-slate-600 space-y-1">
                                    <li><strong>Contact:</strong> {formData.phone || '—'}, {formData.area || '—'}, {formData.pincode || '—'}</li>
                                    <li><strong>Mode:</strong> {formData.mode} {formData.travelRadius ? `(${formData.travelRadius} km)` : ''}</li>
                                    <li><strong>Subjects:</strong> {formData.subjects.length ? formData.subjects.join(', ') : '—'}</li>
                                    <li><strong>Classes:</strong> {formData.classes.length ? formData.classes.join(', ') : '—'}</li>
                                    <li><strong>Experience:</strong> {formData.experienceYears !== '' ? `${formData.experienceYears} yrs` : '—'}, <strong>Rate:</strong> ₹{formData.hourlyRate || '—'}/hr</li>
                                    <li><strong>Availability:</strong> {formData.availabilityMode === 'fixed' ? 'Fixed weekly' : 'Flexible'}</li>
                                    <li><strong>Bio:</strong> {formData.bio ? `${formData.bio.slice(0, 80)}…` : '—'}</li>
                                </ul>
                            </div>
                            <p className="text-sm text-slate-600">Submit for admin approval. Your profile will be visible to students only after approval.</p>
                        </div>
                    )}
                </div>

                <div className="px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-2">
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={() => setStep(step - 1)}
                                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100"
                            >
                                Back
                            </button>
                        )}
                        {step < 5 && (
                            <button
                                type="button"
                                onClick={() => setStep(step + 1)}
                                className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 text-sm font-medium hover:bg-slate-300"
                            >
                                Next
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {saving ? 'Saving…' : 'Save progress'}
                        </button>
                        {step === 5 && (
                            <button
                                type="button"
                                onClick={handleSubmitForApproval}
                                disabled={submitting || saving}
                                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {submitting ? 'Submitting…' : 'Submit for approval'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TutorProfileForm;
