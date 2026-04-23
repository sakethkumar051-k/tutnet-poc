import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { getBaseURL, getApiErrorMessage } from '../utils/api';
import { getAccessToken, setAccessToken } from '../authToken';

const emptyForm = () => ({
    phone: '',
    location: { area: '', city: 'Hyderabad', pincode: '' },
    classGrade: '',
    displayName: '',
    tutorSubjects: [],
    tutorClasses: [],
    hourlyRate: '',
    experienceYears: '',
    bio: '',
    mode: 'home',
    languages: [],
    travelRadius: '',
    education: { degree: '', institution: '', year: '' },
    qualifications: [],
    strengthTags: [],
});

const CompleteProfile = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login, user: loginUser, loading: authLoading } = useAuth();
    const exchangedRef = useRef(false);

    const [role, setRole] = useState('');
    const [formData, setFormData] = useState(emptyForm);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const [profileOptions, setProfileOptions] = useState(null);
    const [linkedStudentNote, setLinkedStudentNote] = useState(false);

    const bioMinLength = profileOptions?.bioMinLength ?? 150;

    const effectiveRole = useMemo(() => role || loginUser?.role || '', [role, loginUser?.role]);

    const toggleInList = useCallback((field, value) => {
        setFormData((prev) => {
            const arr = prev[field] || [];
            const next = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
            return { ...prev, [field]: next };
        });
    }, []);

    // OAuth code exchange (runs before auth hydrate finishes)
    useEffect(() => {
        const urlCode = searchParams.get('code');
        if (!urlCode) return;
        if (exchangedRef.current) return;
        exchangedRef.current = true;

        (async () => {
            window.history.replaceState({}, '', window.location.pathname);
            try {
                const baseURL = getBaseURL();
                const res = await fetch(`${baseURL}/auth/oauth-token/${urlCode}`, {
                    credentials: 'include',
                });
                if (!res.ok) throw new Error('Invalid or expired sign-in code. Please try again.');
                const { token: oauthToken } = await res.json();
                setAccessToken(oauthToken);
                const me = await login(oauthToken);
                if (me?.role) setRole(me.role);
            } catch (err) {
                console.error('Could not exchange OAuth code:', err);
                exchangedRef.current = false;
                navigate('/login?error=oauth_failed');
            }
        })();
    }, [searchParams, login, navigate]);

    // Sync role + basic fields from session; guard unauthenticated
    useEffect(() => {
        if (searchParams.get('code')) return;

        if (authLoading) return;

        if (loginUser) {
            if (loginUser.role) setRole(loginUser.role);
            setFormData((prev) => ({
                ...prev,
                displayName: prev.displayName || loginUser.name || '',
                phone: prev.phone || loginUser.phone || '',
                location: {
                    area: loginUser.location?.area || prev.location.area,
                    city: loginUser.location?.city || prev.location.city || 'Hyderabad',
                    pincode: loginUser.location?.pincode || prev.location.pincode || '',
                },
                classGrade: prev.classGrade || loginUser.classGrade || '',
            }));
            return;
        }

        if (!getAccessToken()) {
            navigate('/login');
        }
    }, [searchParams, loginUser, authLoading, navigate]);

    // Google linked an existing student account while user chose "tutor" on /register
    useEffect(() => {
        if (!loginUser?.role) return;
        try {
            const pending = sessionStorage.getItem('tutnet_oauth_signup_role');
            if (pending === 'tutor' && loginUser.role === 'student') {
                setLinkedStudentNote(true);
            }
            sessionStorage.removeItem('tutnet_oauth_signup_role');
        } catch {
            /* ignore */
        }
    }, [loginUser]);

    // Tutor: load form options
    useEffect(() => {
        const r = role || loginUser?.role;
        if (r !== 'tutor') return;
        let cancelled = false;
        api.get('/tutors/profile/options')
            .then(({ data }) => {
                if (!cancelled) setProfileOptions(data);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [role, loginUser?.role]);

    // Tutor: prefill from existing draft profile
    useEffect(() => {
        if (authLoading) return;
        const r = role || loginUser?.role;
        if (r !== 'tutor' || !getAccessToken()) return;
        let cancelled = false;
        (async () => {
            try {
                const { data } = await api.get('/tutors/me');
                if (cancelled) return;
                setFormData((prev) => ({
                    ...prev,
                    tutorSubjects: data.subjects?.length ? data.subjects : prev.tutorSubjects,
                    tutorClasses: data.classes?.length ? data.classes : prev.tutorClasses,
                    hourlyRate: data.hourlyRate != null && data.hourlyRate > 0 ? String(data.hourlyRate) : prev.hourlyRate,
                    experienceYears:
                        data.experienceYears != null ? String(data.experienceYears) : prev.experienceYears,
                    bio: data.bio || prev.bio,
                    mode: data.mode || prev.mode,
                    languages: data.languages?.length ? data.languages : prev.languages,
                    travelRadius: data.travelRadius != null ? String(data.travelRadius) : prev.travelRadius,
                    education: {
                        degree: data.education?.degree || prev.education.degree,
                        institution: data.education?.institution || prev.education.institution,
                        year: data.education?.year || prev.education.year,
                    },
                    qualifications: data.qualifications?.length ? data.qualifications : prev.qualifications,
                    strengthTags: data.strengthTags?.length ? data.strengthTags : prev.strengthTags,
                }));
            } catch {
                /* no profile yet */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [authLoading, role, loginUser?.role]);

    const handleChange = (e) => {
        if (e.target.name === 'area') {
            setFormData({ ...formData, location: { ...formData.location, area: e.target.value } });
        } else if (e.target.name === 'pincode') {
            setFormData({ ...formData, location: { ...formData.location, pincode: e.target.value } });
        } else if (e.target.name.startsWith('education.')) {
            const field = e.target.name.split('.')[1];
            setFormData({
                ...formData,
                education: { ...formData.education, [field]: e.target.value },
            });
        } else {
            setFormData({ ...formData, [e.target.name]: e.target.value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const r = role || loginUser?.role;
        if (!r) {
            setError('Role not detected. Please log in again.');
            return;
        }
        if (!formData.phone?.trim() || !formData.location?.area?.trim()) {
            setError('Please fill in phone and area/locality.');
            return;
        }
        if (r === 'student' && !formData.classGrade) {
            setError('Please select your class/grade.');
            return;
        }
        if (r === 'tutor') {
            const pincode = formData.location?.pincode?.trim() || '';
            if (pincode.length !== 6) {
                setError('Please enter a valid 6-digit pincode.');
                return;
            }
            if (!formData.tutorSubjects?.length) {
                setError('Select at least one subject you teach.');
                return;
            }
            if (!formData.tutorClasses?.length) {
                setError('Select at least one class/grade band.');
                return;
            }
            const rate = Number(formData.hourlyRate);
            if (!Number.isFinite(rate) || rate <= 0) {
                setError('Enter a valid hourly rate (₹).');
                return;
            }
            const exp = Number(formData.experienceYears);
            if (!Number.isFinite(exp) || exp < 0) {
                setError('Enter years of teaching experience.');
                return;
            }
            if (!formData.education.degree?.trim() || !formData.education.institution?.trim() || !formData.education.year?.trim()) {
                setError('Please complete your highest qualification (degree, institution, year).');
                return;
            }
            if (!formData.qualifications?.length) {
                setError('Select at least one certification / qualification.');
                return;
            }
            if (!formData.strengthTags?.length) {
                setError('Select at least one teaching strength.');
                return;
            }
            const bioTrim = formData.bio?.trim() || '';
            if (bioTrim.length < bioMinLength) {
                setError(`Professional bio must be at least ${bioMinLength} characters.`);
                return;
            }
            const needsTravel = formData.mode === 'home' || formData.mode === 'both';
            if (needsTravel) {
                const tr = Number(formData.travelRadius);
                if (!Number.isFinite(tr) || tr <= 0) {
                    setError('Enter how far you can travel for home visits (km).');
                    return;
                }
            }
        }

        if (!getAccessToken()) {
            setError('Session expired. Please log in again.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const basePayload = {
                phone: formData.phone.trim(),
                location: {
                    ...formData.location,
                    area: formData.location?.area?.trim() || '',
                    pincode: (formData.location?.pincode || '').trim(),
                },
                classGrade: r === 'student' ? formData.classGrade : undefined,
            };

            if (r === 'tutor') {
                basePayload.name = (formData.displayName || loginUser?.name || '').trim() || undefined;
                basePayload.subjects = formData.tutorSubjects;
                basePayload.classes = formData.tutorClasses;
                basePayload.hourlyRate = Number(formData.hourlyRate);
                basePayload.experienceYears = Number(formData.experienceYears);
                basePayload.bio = formData.bio.trim();
                basePayload.mode = formData.mode;
                basePayload.languages = formData.languages;
                basePayload.education = formData.education;
                basePayload.qualifications = formData.qualifications;
                basePayload.strengthTags = formData.strengthTags;
                if (formData.mode === 'home' || formData.mode === 'both') {
                    basePayload.travelRadius = Number(formData.travelRadius);
                }
            }

            const response = await api.put('/auth/profile', basePayload);
            const newToken = response.data?.token;
            if (newToken) {
                setAccessToken(newToken);
                login(newToken).catch(() => {});
                setSuccess(true);
                setLoading(false);
                navigate(r === 'tutor' ? '/tutor-dashboard?tab=profile' : '/student-dashboard', { replace: true });
            } else {
                throw new Error('No token returned from update');
            }
        } catch (err) {
            console.error('Profile update error:', err);
            setError(getApiErrorMessage(err) || err.message || 'Failed to update profile. Please try again.');
            setLoading(false);
        }
    };

    const maxWidthClass = effectiveRole === 'tutor' ? 'max-w-4xl' : 'max-w-md';
    const needsTravel = formData.mode === 'home' || formData.mode === 'both';

    const chipBtn = (active) =>
        `px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            active
                ? 'bg-royal text-white border-royal shadow-sm'
                : 'bg-white text-navy-900 border-gray-200 hover:border-royal/40'
        }`;

    return (
        <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 bg-gradient-to-b from-navy-950 via-[#1a2744] to-[#0f1729]">
            <div
                className={`${maxWidthClass} w-full rounded-[28px] shadow-[0_25px_80px_-20px_rgba(0,0,0,0.55)] border border-white/10 bg-white overflow-hidden`}
            >
                <div className="h-1.5 w-full bg-gradient-to-r from-lime via-royal to-navy-900" />
                <div className="p-8 sm:p-10">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center px-4 py-2 bg-lime/15 text-lime border border-lime/30 rounded-full text-xs font-bold tracking-wide mb-4">
                            Mandatory profile completion
                        </div>
                        <h2 className="text-3xl font-extrabold text-navy-950 tracking-tight">
                            {effectiveRole === 'tutor' ? 'Finish your tutor profile' : 'Complete your profile'}
                        </h2>
                        <p className="mt-2 text-gray-600 text-[15px] leading-relaxed max-w-xl mx-auto">
                            {effectiveRole === 'tutor'
                                ? 'Parents trust complete profiles. Add your teaching focus, credentials, and availability — it only takes a few minutes.'
                                : 'A few details help us match you with the right tutors and keep your account secure.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
                        {linkedStudentNote && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-950 p-4 rounded-xl text-sm leading-relaxed">
                                You chose <strong>tutor</strong>, but this Google account is already registered as a{' '}
                                <strong>student</strong>. We kept your existing account type. To apply as a tutor, use a
                                different email or contact support.
                            </div>
                        )}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="bg-lime/15 border border-lime/30 text-navy-900 p-4 rounded-xl text-sm">
                                Profile saved! Redirecting…
                            </div>
                        )}

                        {effectiveRole && (
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-royal/8 to-transparent border border-royal/20">
                                <div className="w-12 h-12 rounded-2xl bg-royal/15 flex items-center justify-center text-2xl">
                                    {effectiveRole === 'tutor' ? '👨‍🏫' : '👨‍🎓'}
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold uppercase tracking-wider text-royal">Account type</p>
                                    <p className="text-lg font-extrabold text-navy-950 capitalize">
                                        {effectiveRole === 'tutor' ? 'Tutor' : 'Student'}
                                    </p>
                                </div>
                                <span className="text-xs text-gray-500 text-right max-w-[140px]">
                                    Set when you joined (email or Google)
                                </span>
                            </div>
                        )}

                        {!effectiveRole && !authLoading && (
                            <div>
                                <label className="block text-sm font-semibold text-navy-950 mb-2">I am a…</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setRole('student')}
                                        className={`py-3 px-4 rounded-xl border-2 transition-all ${
                                            role === 'student'
                                                ? 'border-royal bg-royal/5 text-royal-dark font-bold'
                                                : 'border-gray-200 hover:border-royal/30 text-gray-600'
                                        }`}
                                    >
                                        Student
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRole('tutor')}
                                        className={`py-3 px-4 rounded-xl border-2 transition-all ${
                                            role === 'tutor'
                                                ? 'border-royal bg-royal/5 text-royal-dark font-bold'
                                                : 'border-gray-200 hover:border-royal/30 text-gray-600'
                                        }`}
                                    >
                                        Tutor
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Contact */}
                        <section className="space-y-4">
                            <h3 className="text-sm font-bold text-navy-950 uppercase tracking-wider border-b border-gray-100 pb-2">
                                Contact & location
                            </h3>
                            {effectiveRole === 'tutor' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Display name</label>
                                    <input
                                        name="displayName"
                                        type="text"
                                        value={formData.displayName}
                                        onChange={handleChange}
                                        placeholder={loginUser?.name || 'Your name'}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-royal outline-none"
                                    />
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                                    <input
                                        name="phone"
                                        type="tel"
                                        placeholder="+91 98765 43210"
                                        required
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-royal outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Area / locality *</label>
                                    <input
                                        name="area"
                                        type="text"
                                        placeholder="e.g. Banjara Hills"
                                        required
                                        value={formData.location.area}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-royal outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Pincode {effectiveRole === 'tutor' ? '*' : '(optional)'}
                                </label>
                                <input
                                    name="pincode"
                                    type="text"
                                    placeholder="500001"
                                    value={formData.location.pincode}
                                    onChange={handleChange}
                                    required={effectiveRole === 'tutor'}
                                    maxLength={6}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-royal outline-none"
                                />
                            </div>
                        </section>

                        {effectiveRole === 'student' && (
                            <section className="space-y-4 border-t border-gray-100 pt-8">
                                <h3 className="text-sm font-bold text-navy-950 uppercase tracking-wider">Learning</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Class / grade *</label>
                                    <select
                                        name="classGrade"
                                        required
                                        value={formData.classGrade}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-royal outline-none appearance-none"
                                    >
                                        <option value="">Select your class</option>
                                        {[...Array(12)].map((_, i) => (
                                            <option key={i} value={`Class ${i + 1}`}>
                                                Class {i + 1}
                                            </option>
                                        ))}
                                        <option value="Bachelors">Bachelors / Undergrad</option>
                                        <option value="Masters">Masters / Postgrad</option>
                                    </select>
                                </div>
                            </section>
                        )}

                        {effectiveRole === 'tutor' && profileOptions && (
                            <>
                                <section className="space-y-4 border-t border-gray-100 pt-8">
                                    <h3 className="text-sm font-bold text-navy-950 uppercase tracking-wider border-b border-gray-100 pb-2">
                                        Teaching focus
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Teaching mode *</label>
                                            <select
                                                name="mode"
                                                value={formData.mode}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-royal outline-none"
                                            >
                                                {profileOptions.teachingModes?.map((m) => (
                                                    <option key={m} value={m}>
                                                        {m === 'both' ? 'Online & home visits' : m.charAt(0).toUpperCase() + m.slice(1)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Hourly rate (₹) *</label>
                                            <input
                                                name="hourlyRate"
                                                type="number"
                                                min="1"
                                                step="50"
                                                placeholder="e.g. 800"
                                                value={formData.hourlyRate}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-royal outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Subjects *</label>
                                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 rounded-xl bg-gray-50 border border-gray-200">
                                            {profileOptions.subjects?.map((s) => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => toggleInList('tutorSubjects', s)}
                                                    className={chipBtn(formData.tutorSubjects.includes(s))}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Classes / grades *</label>
                                        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-3 rounded-xl bg-gray-50 border border-gray-200">
                                            {profileOptions.classes?.map((c) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => toggleInList('tutorClasses', c)}
                                                    className={chipBtn(formData.tutorClasses.includes(c))}
                                                >
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Years of experience *</label>
                                            <input
                                                name="experienceYears"
                                                type="number"
                                                min="0"
                                                max="60"
                                                value={formData.experienceYears}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-royal outline-none"
                                            />
                                        </div>
                                        {needsTravel && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Travel radius (km) *
                                                </label>
                                                <input
                                                    name="travelRadius"
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    placeholder="e.g. 8"
                                                    value={formData.travelRadius}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-royal outline-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Languages you teach in</label>
                                        <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
                                            {profileOptions.languages?.map((lang) => (
                                                <button
                                                    key={lang}
                                                    type="button"
                                                    onClick={() => toggleInList('languages', lang)}
                                                    className={chipBtn(formData.languages.includes(lang))}
                                                >
                                                    {lang}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4 border-t border-gray-100 pt-8">
                                    <h3 className="text-sm font-bold text-navy-950 uppercase tracking-wider border-b border-gray-100 pb-2">
                                        Credentials & strengths
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Degree *</label>
                                            <input
                                                name="education.degree"
                                                value={formData.education.degree}
                                                onChange={handleChange}
                                                placeholder="e.g. M.Sc Mathematics"
                                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Institution *</label>
                                            <input
                                                name="education.institution"
                                                value={formData.education.institution}
                                                onChange={handleChange}
                                                placeholder="University / college"
                                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Year *</label>
                                            <input
                                                name="education.year"
                                                value={formData.education.year}
                                                onChange={handleChange}
                                                placeholder="e.g. 2019"
                                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Certifications *</label>
                                        <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
                                            {profileOptions.certifications?.map((c) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => toggleInList('qualifications', c)}
                                                    className={chipBtn(formData.qualifications.includes(c))}
                                                >
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Teaching strengths *</label>
                                        <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
                                            {profileOptions.strengthTags?.map((t) => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => toggleInList('strengthTags', t)}
                                                    className={chipBtn(formData.strengthTags.includes(t))}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Professional bio * ({bioMinLength}+ characters)
                                        </label>
                                        <textarea
                                            name="bio"
                                            rows={6}
                                            value={formData.bio}
                                            onChange={handleChange}
                                            placeholder="Introduce your teaching style, boards you cover, and what students can expect…"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-royal outline-none text-sm leading-relaxed"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            {(formData.bio || '').trim().length} / {bioMinLength} min
                                        </p>
                                    </div>
                                </section>
                            </>
                        )}

                        {effectiveRole === 'tutor' && !profileOptions && (
                            <p className="text-sm text-gray-500 text-center">Loading tutor form options…</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading || (effectiveRole === 'tutor' && !profileOptions)}
                            className="w-full py-4 bg-gradient-to-r from-royal to-royal/90 text-white font-bold rounded-xl shadow-lg hover:shadow-royal/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Saving…' : effectiveRole === 'tutor' ? 'Save & go to dashboard' : 'Complete registration'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CompleteProfile;
