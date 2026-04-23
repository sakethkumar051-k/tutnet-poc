import { useState, useEffect, useCallback, useMemo } from 'react';
import api, { getApiErrorMessage } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import RateBandHint from './RateBandHint';
import {
    DEFAULT_OPTIONS,
    TEACHING_MODES,
    TIME_SLOTS,
    TIMEZONE_OPTIONS
} from '../constants/tutorProfile';
import {
    User,
    BookOpen,
    Clock,
    Award,
    Sparkles,
    CheckCircle2,
    ChevronRight,
    Loader2,
    MapPin,
    Globe2,
    Save,
    Send
} from 'lucide-react';

function FixedWeeklySlots({ weeklyAvailability, addSlot, removeSlot, timeSlots }) {
    const [draft, setDraft] = useState({});
    const setDraftForDay = (dayIndex, field, value) => {
        setDraft((prev) => ({
            ...prev,
            [dayIndex]: { ...(prev[dayIndex] || {}), [field]: value }
        }));
    };
    const handleAdd = (dayIndex) => {
        const d = draft[dayIndex] || {};
        if (d.start && d.end) {
            addSlot(dayIndex, d.start, d.end);
            setDraft((prev) => ({ ...prev, [dayIndex]: {} }));
        }
    };

    const dayShort = (day) => day.slice(0, 3);

    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed">
                Add one or more time windows per day. Students see this when booking — keep it accurate.
            </p>
            <div className="space-y-3">
                {weeklyAvailability.map((dayObj, dayIndex) => (
                    <div
                        key={dayObj.day}
                        className="rounded-2xl border border-gray-200/80 bg-gradient-to-br from-white to-gray-50/80 p-4 shadow-sm"
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-royal/10 text-royal font-bold text-sm">
                                {dayShort(dayObj.day)}
                            </span>
                            <span className="font-semibold text-navy-950">{dayObj.day}</span>
                        </div>
                        <div className="space-y-2">
                            {(dayObj.slots || []).map((slot, slotIndex) => (
                                <div
                                    key={slotIndex}
                                    className="flex items-center justify-between gap-2 rounded-lg bg-white border border-gray-100 px-3 py-2"
                                >
                                    <span className="text-sm font-medium text-navy-950">
                                        {slot.start} – {slot.end}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => removeSlot(dayIndex, slotIndex)}
                                        className="text-xs font-medium text-red-600 hover:text-red-700"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <select
                                    value={(draft[dayIndex] || {}).start || ''}
                                    onChange={(e) => setDraftForDay(dayIndex, 'start', e.target.value)}
                                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-navy-950 focus:ring-2 focus:ring-royal/40 focus:border-royal"
                                >
                                    <option value="">Start</option>
                                    {timeSlots.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                                <span className="text-gray-400">→</span>
                                <select
                                    value={(draft[dayIndex] || {}).end || ''}
                                    onChange={(e) => setDraftForDay(dayIndex, 'end', e.target.value)}
                                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-navy-950 focus:ring-2 focus:ring-royal/40 focus:border-royal"
                                >
                                    <option value="">End</option>
                                    {timeSlots.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => handleAdd(dayIndex)}
                                    className="ml-auto px-4 py-2 rounded-xl bg-navy-950 text-white text-sm font-medium hover:bg-navy-900 transition-colors"
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
    { id: 1, title: 'You & location', short: 'Profile', Icon: User, blurb: 'How students find and trust you' },
    { id: 2, title: 'Teaching', short: 'Teach', Icon: BookOpen, blurb: 'Subjects, grades & languages' },
    { id: 3, title: 'Availability', short: 'Time', Icon: Clock, blurb: 'When you can take sessions' },
    { id: 4, title: 'Credentials', short: 'Expertise', Icon: Award, blurb: 'Education & your story' },
    { id: 5, title: 'Review', short: 'Review', Icon: Sparkles, blurb: 'Submit for approval' }
];

const initialWeekly = () => DEFAULT_OPTIONS.daysOfWeek.map((day) => ({ day, slots: [] }));

const TutorProfileForm = () => {
    const { refreshUser } = useAuth();
    const [step, setStep] = useState(1);
    const [options, setOptions] = useState(DEFAULT_OPTIONS);
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [formData, setFormData] = useState({
        name: '',
        timezone: 'Asia/Kolkata',
        phone: '',
        area: '',
        pincode: '',
        city: 'Hyderabad',
        mode: 'home',
        travelRadius: '',
        subjects: [],
        classes: [],
        languages: [],
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
            if (optionsRes.data) {
                setOptions({
                    ...DEFAULT_OPTIONS,
                    ...optionsRes.data,
                    languages: optionsRes.data.languages || DEFAULT_OPTIONS.languages
                });
            }

            setProfileData(profile);

            const loc = user?.location || {};
            const weekly =
                profile?.weeklyAvailability && profile.weeklyAvailability.length > 0
                    ? DEFAULT_OPTIONS.daysOfWeek.map((day) => {
                          const existing = profile.weeklyAvailability.find((w) => w.day === day);
                          return { day, slots: existing?.slots || [] };
                      })
                    : initialWeekly();

            setFormData({
                name: user?.name || '',
                timezone: user?.timezone || 'Asia/Kolkata',
                phone: user?.phone || '',
                area: loc?.area || '',
                pincode: loc?.pincode || '',
                city: loc?.city || 'Hyderabad',
                mode: profile?.mode || 'home',
                travelRadius: profile?.travelRadius ?? '',
                subjects: profile?.subjects || [],
                classes: profile?.classes || [],
                languages: Array.isArray(profile?.languages) ? profile.languages : [],
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

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const updateField = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setMessage({ type: '', text: '' });
    };

    const toggleMulti = (field, item) => {
        setFormData((prev) => {
            const arr = prev[field] || [];
            const next = arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
            return { ...prev, [field]: next };
        });
        setMessage({ type: '', text: '' });
    };

    const addSlot = (dayIndex, start, end) => {
        if (!start || !end) return;
        setFormData((prev) => {
            const next = prev.weeklyAvailability.map((d, i) => {
                if (i !== dayIndex) return d;
                const slots = [...(d.slots || []), { start, end }];
                return { ...d, slots };
            });
            return { ...prev, weeklyAvailability: next };
        });
    };

    const removeSlot = (dayIndex, slotIndex) => {
        setFormData((prev) => {
            const next = prev.weeklyAvailability.map((d, i) => {
                if (i !== dayIndex) return d;
                const slots = (d.slots || []).filter((_, j) => j !== slotIndex);
                return { ...d, slots };
            });
            return { ...prev, weeklyAvailability: next };
        });
    };

    const buildPayload = () => ({
        name: formData.name.trim(),
        timezone: formData.timezone,
        phone: formData.phone,
        location: { area: formData.area, pincode: formData.pincode, city: formData.city },
        mode: formData.mode,
        travelRadius: formData.travelRadius === '' ? undefined : Number(formData.travelRadius),
        subjects: formData.subjects,
        classes: formData.classes,
        languages: formData.languages,
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
    });

    const handleSave = async (silent = false) => {
        setSaving(true);
        if (!silent) setMessage({ type: '', text: '' });
        try {
            const { data } = await api.put('/tutors/profile', buildPayload());
            setProfileData(data);
            await refreshUser();
            if (!silent) setMessage({ type: 'success', text: 'Your profile has been saved.' });
            return true;
        } catch (err) {
            setMessage({ type: 'error', text: getApiErrorMessage(err) });
            throw err;
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitForApproval = async () => {
        setMessage({ type: '', text: '' });
        setSubmitting(true);
        try {
            await handleSave(true);
            const { data } = await api.patch('/tutors/profile/submit');
            setProfileData(data);
            await refreshUser();
            setMessage({
                type: 'success',
                text: 'Application submitted. Our team will review your profile shortly.'
            });
        } catch (err) {
            if (err.response?.data?.errors?.length) {
                const detail = err.response.data.errors.map((e) => e.message).join('. ');
                setMessage({ type: 'error', text: detail });
            } else {
                setMessage({ type: 'error', text: getApiErrorMessage(err) });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const status = profileData?.profileStatus || profileData?.approvalStatus;
    const isApproved = status === 'approved';
    const isPending = status === 'pending';
    const isRejected = status === 'rejected';
    const completionScore = profileData?.profileCompletionScore ?? 0;
    const currentStepMeta = STEPS.find((s) => s.id === step) || STEPS[0];
    const StepIconHeader = currentStepMeta.Icon;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="w-10 h-10 text-royal animate-spin" />
                <p className="text-sm text-gray-500 font-medium">Loading your tutor profile…</p>
            </div>
        );
    }

    return (
        <div className="relative max-w-4xl mx-auto">
            <div
                className="pointer-events-none absolute inset-x-0 -top-4 h-56 rounded-b-[2.5rem] bg-gradient-to-br from-navy-950 via-[#121a3a] to-royal/35 opacity-[0.97]"
                aria-hidden
            />
            <div className="relative px-4 sm:px-6 pb-16 pt-10">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-8">
                    <div>
                        <p className="text-lime text-xs font-semibold uppercase tracking-widest mb-2">
                            Tutor application
                        </p>
                        <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
                            Build your{' '}
                            <span className="text-lime">premium</span> profile
                        </h1>
                        <p className="mt-2 text-sm sm:text-base text-white/75 max-w-xl leading-relaxed">
                            A complete profile helps parents and students book with confidence. Save as you go — nothing
                            is final until you submit for approval.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3 text-white">
                        <div className="text-right">
                            <p className="text-xs text-white/60 uppercase tracking-wide">Completeness</p>
                            <p className="text-2xl font-bold tabular-nums">{completionScore}%</p>
                        </div>
                        <div
                            className="relative w-14 h-14 rounded-full flex items-center justify-center"
                            style={{
                                background: `conic-gradient(#c8ee44 ${completionScore * 3.6}deg, rgba(255,255,255,0.2) 0deg)`
                            }}
                        >
                            <div className="absolute inset-1 rounded-full bg-navy-950/90 flex items-center justify-center text-lime text-xs font-bold">
                                {completionScore}
                            </div>
                        </div>
                    </div>
                </div>

                {profileData && (
                    <div
                        className={`mb-8 rounded-2xl border p-5 shadow-lg ${
                            isApproved
                                ? 'bg-lime/15 border-lime/40 text-navy-950'
                                : isPending
                                  ? 'bg-white border-royal/25 text-navy-950 shadow-royal/5'
                                  : isRejected
                                    ? 'bg-red-50 border-red-200 text-red-900'
                                    : 'bg-white/95 border-gray-200 text-navy-950'
                        }`}
                    >
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div
                                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                        isApproved || isPending ? 'bg-royal text-white' : 'bg-gray-200 text-gray-700'
                                    }`}
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">
                                        Status: <span className="capitalize">{String(status || 'draft')}</span>
                                    </h3>
                                    {isPending && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            We&apos;re reviewing your application. You can still edit and save — major
                                            changes may require re-approval.
                                        </p>
                                    )}
                                    {isApproved && (
                                        <p className="text-sm text-gray-700 mt-1">
                                            You&apos;re live on TutNet. Keep your availability and bio up to date.
                                        </p>
                                    )}
                                    {isRejected && profileData.rejectionReason && (
                                        <p className="text-sm mt-1">
                                            <span className="font-medium">Note:</span> {profileData.rejectionReason}
                                        </p>
                                    )}
                                    {!isPending && !isApproved && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            Finish all steps, then submit for admin approval to appear in search.
                                        </p>
                                    )}
                                </div>
                            </div>
                            {!isPending && (
                                <button
                                    type="button"
                                    onClick={handleSubmitForApproval}
                                    disabled={submitting || saving}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-royal px-5 py-3 text-sm font-semibold text-white shadow-md shadow-royal/25 hover:bg-royal-dark disabled:opacity-50 transition-colors"
                                >
                                    {submitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    {submitting ? 'Submitting…' : 'Submit for approval'}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {message.text && (
                    <div
                        className={`mb-6 rounded-xl border px-4 py-3 text-sm font-medium ${
                            message.type === 'success'
                                ? 'bg-lime/15 border-lime/50 text-navy-950'
                                : 'bg-red-50 border-red-200 text-red-800'
                        }`}
                    >
                        {message.text}
                    </div>
                )}

                {/* Stepper */}
                <div className="mb-8 overflow-x-auto pb-2 -mx-1 px-1">
                    <div className="flex min-w-max items-stretch gap-2 sm:gap-3">
                        {STEPS.map((s, i) => {
                            const active = step === s.id;
                            const done = step > s.id;
                            const Icon = s.Icon;
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => setStep(s.id)}
                                    className={`group flex flex-1 min-w-[100px] flex-col items-center rounded-2xl border px-3 py-3 text-center transition-all sm:min-w-[120px] ${
                                        active
                                            ? 'border-royal bg-white shadow-lg shadow-royal/10 ring-2 ring-royal/20'
                                            : done
                                              ? 'border-lime/40 bg-white/90 hover:border-lime'
                                              : 'border-gray-200/80 bg-white/60 hover:bg-white'
                                    }`}
                                >
                                    <span
                                        className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${
                                            active
                                                ? 'bg-royal text-white'
                                                : done
                                                  ? 'bg-lime/30 text-navy-950'
                                                  : 'bg-gray-100 text-gray-500'
                                        }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                    </span>
                                    <span
                                        className={`text-xs font-semibold ${active ? 'text-navy-950' : 'text-gray-600'}`}
                                    >
                                        {s.short}
                                    </span>
                                    <span className="hidden sm:block text-[10px] text-gray-400 mt-0.5">{i + 1}/5</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-xl shadow-navy-950/5">
                    <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white px-6 sm:px-8 py-5">
                        <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-royal/10 text-royal">
                                <StepIconHeader className="w-6 h-6" />
                            </span>
                            <div>
                                <h2 className="text-xl font-bold text-navy-950">{currentStepMeta.title}</h2>
                                <p className="text-sm text-gray-500">{currentStepMeta.blurb}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 sm:p-8">
                        {step === 1 && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-semibold text-navy-950 mb-1.5">
                                            Full name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => updateField('name', e.target.value)}
                                            placeholder="As it should appear to students"
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-navy-950 placeholder:text-gray-400 focus:ring-2 focus:ring-royal/40 focus:border-royal"
                                        />
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-1.5 text-sm font-semibold text-navy-950 mb-1.5">
                                            <Globe2 className="w-3.5 h-3.5 text-royal" />
                                            Timezone
                                        </label>
                                        <select
                                            value={formData.timezone}
                                            onChange={(e) => updateField('timezone', e.target.value)}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-navy-950 focus:ring-2 focus:ring-royal/40 focus:border-royal"
                                        >
                                            {TIMEZONE_OPTIONS.map((tz) => (
                                                <option key={tz.value} value={tz.value}>
                                                    {tz.label}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="mt-1.5 text-xs text-gray-500">Used for session reminders and scheduling.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-navy-950 mb-1.5">Phone</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => updateField('phone', e.target.value)}
                                            placeholder="10-digit mobile"
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-navy-950 focus:ring-2 focus:ring-royal/40 focus:border-royal"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="flex items-center gap-1.5 text-sm font-semibold text-navy-950 mb-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-royal" />
                                            Area / locality
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.area}
                                            onChange={(e) => updateField('area', e.target.value)}
                                            placeholder="e.g. Jubilee Hills"
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-navy-950 focus:ring-2 focus:ring-royal/40 focus:border-royal"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-navy-950 mb-1.5">City</label>
                                        <input
                                            type="text"
                                            value={formData.city}
                                            onChange={(e) => updateField('city', e.target.value)}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-navy-950 focus:ring-2 focus:ring-royal/40 focus:border-royal"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-navy-950 mb-1.5">Pincode</label>
                                        <input
                                            type="text"
                                            value={formData.pincode}
                                            onChange={(e) => updateField('pincode', e.target.value)}
                                            placeholder="6-digit"
                                            maxLength={6}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-navy-950 focus:ring-2 focus:ring-royal/40 focus:border-royal"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-navy-950 mb-1.5">
                                            Teaching mode
                                        </label>
                                        <select
                                            value={formData.mode}
                                            onChange={(e) => updateField('mode', e.target.value)}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-navy-950 focus:ring-2 focus:ring-royal/40 focus:border-royal"
                                        >
                                            {TEACHING_MODES.map((m) => (
                                                <option key={m.value} value={m.value}>
                                                    {m.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                {(formData.mode === 'home' || formData.mode === 'both') && (
                                    <div className="rounded-2xl bg-royal/5 border border-royal/15 p-4">
                                        <label className="block text-sm font-semibold text-navy-950 mb-1.5">
                                            Travel radius (km)
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={formData.travelRadius}
                                            onChange={(e) => updateField('travelRadius', e.target.value)}
                                            placeholder="e.g. 10"
                                            className="w-full max-w-[160px] rounded-xl border border-gray-200 px-4 py-2.5 text-navy-950 focus:ring-2 focus:ring-royal/40 focus:border-royal"
                                        />
                                        <p className="mt-2 text-xs text-gray-600">
                                            How far you&apos;re willing to travel for home sessions.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-8">
                                <div>
                                    <label className="block text-sm font-semibold text-navy-950 mb-3">
                                        Languages you teach in
                                    </label>
                                    <p className="text-sm text-gray-600 mb-3">
                                        Students often filter by language — select all that apply.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {(options.languages || DEFAULT_OPTIONS.languages).map((lang) => (
                                            <button
                                                key={lang}
                                                type="button"
                                                onClick={() => toggleMulti('languages', lang)}
                                                className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all ${
                                                    formData.languages.includes(lang)
                                                        ? 'bg-navy-950 text-white border-navy-950 shadow-md'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:border-royal/40'
                                                }`}
                                            >
                                                {lang}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-navy-950 mb-3">Subjects</label>
                                    <div className="flex flex-wrap gap-2">
                                        {(options.subjects || []).map((subj) => (
                                            <button
                                                key={subj}
                                                type="button"
                                                onClick={() => toggleMulti('subjects', subj)}
                                                className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all ${
                                                    formData.subjects.includes(subj)
                                                        ? 'bg-royal text-white border-royal shadow-md'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:border-royal/40'
                                                }`}
                                            >
                                                {subj}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-navy-950 mb-3">
                                        Classes / grades
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {(options.classes || []).map((cls) => (
                                            <button
                                                key={cls}
                                                type="button"
                                                onClick={() => toggleMulti('classes', cls)}
                                                className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all ${
                                                    formData.classes.includes(cls)
                                                        ? 'bg-royal text-white border-royal shadow-md'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:border-royal/40'
                                                }`}
                                            >
                                                {cls}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-navy-950 mb-1.5">
                                            Years of experience
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={formData.experienceYears}
                                            onChange={(e) => updateField('experienceYears', e.target.value)}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-navy-950 focus:ring-2 focus:ring-royal/40 focus:border-royal"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-navy-950 mb-1.5">
                                            Hourly rate (₹)
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={formData.hourlyRate}
                                            onChange={(e) => updateField('hourlyRate', e.target.value)}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-navy-950 focus:ring-2 focus:ring-royal/40 focus:border-royal"
                                        />
                                        <RateBandHint
                                            classes={formData.classes}
                                            subjects={formData.subjects}
                                            strengthTags={formData.strengthTags}
                                            mode={formData.mode}
                                            currentRate={Number(formData.hourlyRate) || 0}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-navy-950 mb-3">
                                        Availability style
                                    </label>
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <label
                                            className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-4 flex-1 transition-all ${
                                                formData.availabilityMode === 'fixed'
                                                    ? 'border-royal bg-royal/5 ring-2 ring-royal/20'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="availabilityMode"
                                                checked={formData.availabilityMode === 'fixed'}
                                                onChange={() => updateField('availabilityMode', 'fixed')}
                                                className="text-royal focus:ring-royal"
                                            />
                                            <div>
                                                <span className="font-semibold text-navy-950">Fixed weekly</span>
                                                <p className="text-xs text-gray-600 mt-0.5">
                                                    Same windows each week — best for regular students.
                                                </p>
                                            </div>
                                        </label>
                                        <label
                                            className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-4 flex-1 transition-all ${
                                                formData.availabilityMode === 'flexible'
                                                    ? 'border-royal bg-royal/5 ring-2 ring-royal/20'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="availabilityMode"
                                                checked={formData.availabilityMode === 'flexible'}
                                                onChange={() => updateField('availabilityMode', 'flexible')}
                                                className="text-royal focus:ring-royal"
                                            />
                                            <div>
                                                <span className="font-semibold text-navy-950">Flexible</span>
                                                <p className="text-xs text-gray-600 mt-0.5">
                                                    You confirm slots with notice — good for varied schedules.
                                                </p>
                                            </div>
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-semibold text-navy-950 mb-1.5">
                                                Booking notice
                                            </label>
                                            <select
                                                value={formData.noticePeriodHours}
                                                onChange={(e) =>
                                                    updateField('noticePeriodHours', Number(e.target.value))
                                                }
                                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-navy-950 focus:ring-2 focus:ring-royal/40 focus:border-royal"
                                            >
                                                {(options.noticePeriodOptions || []).map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-navy-950 mb-1.5">
                                                Max sessions per day
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={12}
                                                value={formData.maxSessionsPerDay}
                                                onChange={(e) => updateField('maxSessionsPerDay', e.target.value)}
                                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-navy-950 focus:ring-2 focus:ring-royal/40 focus:border-royal"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-navy-950 mb-1.5">Degree</label>
                                        <input
                                            type="text"
                                            value={formData.degree}
                                            onChange={(e) => updateField('degree', e.target.value)}
                                            placeholder="e.g. M.Sc, B.Tech"
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-navy-950 focus:ring-2 focus:ring-royal/40 focus:border-royal"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-navy-950 mb-1.5">
                                            Institution
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.institution}
                                            onChange={(e) => updateField('institution', e.target.value)}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-navy-950 focus:ring-2 focus:ring-royal/40 focus:border-royal"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-navy-950 mb-1.5">Year</label>
                                        <input
                                            type="text"
                                            value={formData.year}
                                            onChange={(e) => updateField('year', e.target.value)}
                                            placeholder="e.g. 2020"
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-navy-950 focus:ring-2 focus:ring-royal/40 focus:border-royal"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-navy-950 mb-3">
                                        Certifications
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {(options.certifications || []).map((cert) => (
                                            <button
                                                key={cert}
                                                type="button"
                                                onClick={() => toggleMulti('qualifications', cert)}
                                                className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all ${
                                                    formData.qualifications.includes(cert)
                                                        ? 'bg-royal text-white border-royal shadow-md'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:border-royal/40'
                                                }`}
                                            >
                                                {cert}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-navy-950 mb-3">
                                        Teaching strengths
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {(options.strengthTags || []).map((tag) => (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => toggleMulti('strengthTags', tag)}
                                                className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all ${
                                                    formData.strengthTags.includes(tag)
                                                        ? 'bg-royal text-white border-royal shadow-md'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:border-royal/40'
                                                }`}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-navy-950 mb-1.5">
                                        Bio — min {options.bioMinLength || 150} characters
                                    </label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={(e) => updateField('bio', e.target.value)}
                                        rows={6}
                                        placeholder="Your teaching philosophy, results you’ve helped students achieve, and what makes lessons with you effective…"
                                        className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-navy-950 leading-relaxed focus:ring-2 focus:ring-royal/40 focus:border-royal resize-y min-h-[140px]"
                                    />
                                    <div className="flex justify-between mt-2 text-xs">
                                        <span className="text-gray-500">
                                            {formData.bio.length} / {options.bioMinLength || 150} min
                                        </span>
                                        {formData.bio.length >= (options.bioMinLength || 150) && (
                                            <span className="text-lime-dark font-medium flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Great length
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 5 && (
                            <div className="space-y-6">
                                <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-6">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="font-semibold text-navy-950">Profile strength</span>
                                        <span className="tabular-nums font-bold text-royal">{completionScore}%</span>
                                    </div>
                                    <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-royal to-royal-light transition-all duration-500"
                                            style={{ width: `${completionScore}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-3 text-sm text-gray-700">
                                    <h3 className="font-bold text-navy-950 text-base mb-3">Summary</h3>
                                    <p>
                                        <span className="text-gray-500">Name:</span>{' '}
                                        <span className="font-medium text-navy-950">{formData.name || '—'}</span>
                                    </p>
                                    <p>
                                        <span className="text-gray-500">Languages:</span>{' '}
                                        {formData.languages.length ? formData.languages.join(', ') : '—'}
                                    </p>
                                    <p>
                                        <span className="text-gray-500">Location:</span>{' '}
                                        {formData.area || '—'}, {formData.city} {formData.pincode}
                                    </p>
                                    <p>
                                        <span className="text-gray-500">Mode:</span> {formData.mode}{' '}
                                        {formData.travelRadius ? `· ${formData.travelRadius} km radius` : ''}
                                    </p>
                                    <p>
                                        <span className="text-gray-500">Subjects:</span>{' '}
                                        {formData.subjects.length ? formData.subjects.join(', ') : '—'}
                                    </p>
                                    <p>
                                        <span className="text-gray-500">Rate:</span> ₹{formData.hourlyRate || '—'}/hr ·{' '}
                                        <span className="text-gray-500">Exp:</span>{' '}
                                        {formData.experienceYears !== '' ? `${formData.experienceYears} yrs` : '—'}
                                    </p>
                                    <p className="text-gray-600 line-clamp-4">
                                        <span className="text-gray-500">Bio:</span> {formData.bio || '—'}
                                    </p>
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    By submitting, you confirm the information is accurate. Approved tutors appear in
                                    search and can receive booking requests.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-6 sm:px-8 py-5 bg-gradient-to-r from-gray-50 to-white border-t border-gray-100">
                        <div className="flex flex-wrap gap-2">
                            {step > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setStep(step - 1)}
                                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-gray-300 text-navy-950 text-sm font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    Back
                                </button>
                            )}
                            {step < 5 && (
                                <button
                                    type="button"
                                    onClick={() => setStep(step + 1)}
                                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-navy-950 text-white text-sm font-semibold hover:bg-navy-900 transition-colors"
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => handleSave(false)}
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-royal text-royal text-sm font-semibold hover:bg-royal/5 disabled:opacity-50 transition-colors"
                            >
                                {saving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {saving ? 'Saving…' : 'Save progress'}
                            </button>
                            {step === 5 && (
                                <button
                                    type="button"
                                    onClick={handleSubmitForApproval}
                                    disabled={submitting || saving}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-lime to-lime-dark text-navy-950 text-sm font-bold shadow-lg shadow-lime/20 hover:brightness-95 disabled:opacity-50 transition-all"
                                >
                                    {submitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    {submitting ? 'Submitting…' : 'Submit for approval'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TutorProfileForm;
