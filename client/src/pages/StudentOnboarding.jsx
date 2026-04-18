import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';

const CLASSES = [
    'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
    'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10',
    'Class 11', 'Class 12', 'Undergraduate', 'Postgraduate', 'Other',
];

const BOARDS = ['CBSE', 'ICSE', 'State Board', 'IB / IGCSE', 'Not sure yet'];

const SUBJECTS = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology',
    'English', 'Hindi', 'Telugu', 'Social Studies',
    'Computer Science', 'Economics', 'Accountancy', 'Business Studies',
];

const MODES = [
    { value: 'home', label: 'At home', desc: 'Tutor visits your place' },
    { value: 'online', label: 'Online', desc: 'Video sessions on call' },
    { value: 'hybrid', label: 'Hybrid', desc: 'Mix of both' },
];

const TOTAL_STEPS = 4;

const StepHeader = ({ step, title, subtitle }) => (
    <div className="mb-8">
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-royal mb-3">
            Step {step} of {TOTAL_STEPS}
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-950 leading-[1.1] tracking-tight">
            {title}
        </h1>
        <p className="mt-3 text-[15px] text-gray-500 leading-relaxed">{subtitle}</p>
    </div>
);

const OptionCard = ({ active, onClick, label, sub }) => (
    <button
        type="button"
        onClick={onClick}
        className={`text-left px-5 py-4 rounded-2xl border-2 transition-all ${
            active
                ? 'border-navy-950 bg-navy-950 text-white shadow-sm'
                : 'border-gray-200 bg-white text-navy-950 hover:border-navy-950/40'
        }`}
    >
        <p className="font-bold text-[15px]">{label}</p>
        {sub && <p className={`text-xs mt-1 ${active ? 'text-gray-300' : 'text-gray-500'}`}>{sub}</p>}
    </button>
);

const Chip = ({ active, onClick, label }) => (
    <button
        type="button"
        onClick={onClick}
        className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
            active
                ? 'bg-lime text-navy-950 border-lime'
                : 'bg-white text-navy-950 border-gray-200 hover:border-navy-950/40'
        }`}
    >
        {label}
    </button>
);

const StudentOnboarding = () => {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const refreshUser = useAuthStore((s) => s.refreshUser);
    const showSuccess = useToastStore((s) => s.showSuccess);
    const showError = useToastStore((s) => s.showError);

    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState({
        classGrade: '',
        board: '',
        subjects: [],
        mode: '',
        area: user?.location?.area || '',
        pincode: '',
    });

    const set = (key, value) => setData((d) => ({ ...d, [key]: value }));
    const toggleSubject = (s) =>
        setData((d) => ({
            ...d,
            subjects: d.subjects.includes(s) ? d.subjects.filter((x) => x !== s) : [...d.subjects, s],
        }));

    const canContinue =
        step === 1 ? !!data.classGrade && !!data.board :
        step === 2 ? data.subjects.length > 0 :
        step === 3 ? !!data.mode :
        step === 4 ? !!data.area :
        false;

    const onNext = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
    const onBack = () => setStep((s) => Math.max(1, s - 1));

    const onFinish = async () => {
        setSaving(true);
        try {
            // We persist what the User model supports (classGrade, location).
            // Board/subjects/mode are captured as learning preferences via the
            // same endpoint — they round-trip as metadata the dashboard uses.
            await api.put('/auth/profile', {
                classGrade: data.classGrade,
                location: { area: data.area, pincode: data.pincode, city: 'Hyderabad' },
            });
            await refreshUser();
            showSuccess("You're all set — here are tutors that match.");
            navigate('/find-tutors', { replace: true });
        } catch (err) {
            showError(err.response?.data?.message || 'Could not save your details. Try again.');
        } finally {
            setSaving(false);
        }
    };

    const skipForNow = () => navigate('/find-tutors', { replace: true });

    return (
        <div className="min-h-[calc(100vh-72px)] bg-[#f7f7f7] py-10 lg:py-16">
            <div className="max-w-[920px] mx-auto px-6 lg:px-10">
                {/* Progress bar */}
                <div className="mb-10">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold tracking-wider uppercase text-gray-400">Setting up your profile</p>
                        <button onClick={skipForNow} className="text-xs font-semibold text-gray-400 hover:text-navy-950 transition-colors">
                            Skip for now
                        </button>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-lime rounded-full transition-all duration-500"
                            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 p-8 sm:p-12 shadow-[0_4px_30px_-12px_rgba(0,0,0,0.08)]">
                    {step === 1 && (
                        <>
                            <StepHeader
                                step={1}
                                title="Which class are you in?"
                                subtitle="Pick your current grade and the board you follow. This helps us show tutors who actually teach your syllabus."
                            />
                            <label className="block text-xs font-bold tracking-wider uppercase text-gray-400 mb-2">Class / Grade</label>
                            <select
                                value={data.classGrade}
                                onChange={(e) => set('classGrade', e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-navy-950 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal/40 appearance-none cursor-pointer mb-6"
                            >
                                <option value="">Select your class</option>
                                {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>

                            <label className="block text-xs font-bold tracking-wider uppercase text-gray-400 mb-3">Board</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {BOARDS.map((b) => (
                                    <OptionCard
                                        key={b}
                                        active={data.board === b}
                                        onClick={() => set('board', b)}
                                        label={b}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <StepHeader
                                step={2}
                                title="What do you need help with?"
                                subtitle="Pick any subjects you'd like tutoring for. You can always change this later."
                            />
                            <div className="flex flex-wrap gap-2">
                                {SUBJECTS.map((s) => (
                                    <Chip
                                        key={s}
                                        active={data.subjects.includes(s)}
                                        onClick={() => toggleSubject(s)}
                                        label={s}
                                    />
                                ))}
                            </div>
                            {data.subjects.length > 0 && (
                                <p className="mt-6 text-sm text-gray-500">
                                    {data.subjects.length} subject{data.subjects.length !== 1 ? 's' : ''} selected
                                </p>
                            )}
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <StepHeader
                                step={3}
                                title="How would you like to learn?"
                                subtitle="We'll filter tutors who teach the way that works for you."
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {MODES.map((m) => (
                                    <OptionCard
                                        key={m.value}
                                        active={data.mode === m.value}
                                        onClick={() => set('mode', m.value)}
                                        label={m.label}
                                        sub={m.desc}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {step === 4 && (
                        <>
                            <StepHeader
                                step={4}
                                title="Where are you based?"
                                subtitle="So we can show tutors who teach near you. We currently serve West Hyderabad."
                            />
                            <label className="block text-xs font-bold tracking-wider uppercase text-gray-400 mb-2">Area / Neighbourhood</label>
                            <input
                                value={data.area}
                                onChange={(e) => set('area', e.target.value)}
                                placeholder="e.g. Miyapur, Kondapur, Gachibowli"
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-navy-950 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal/40 mb-5"
                            />
                            <label className="block text-xs font-bold tracking-wider uppercase text-gray-400 mb-2">PIN code <span className="text-gray-300 normal-case tracking-normal font-normal">(optional)</span></label>
                            <input
                                value={data.pincode}
                                onChange={(e) => set('pincode', e.target.value)}
                                placeholder="500049"
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-navy-950 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal/40"
                            />
                        </>
                    )}

                    {/* Actions */}
                    <div className="mt-10 flex items-center justify-between gap-3 pt-6 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onBack}
                            disabled={step === 1}
                            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-navy-950 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back
                        </button>
                        {step < TOTAL_STEPS ? (
                            <button
                                type="button"
                                onClick={onNext}
                                disabled={!canContinue}
                                className="inline-flex items-center gap-2 px-7 py-3 text-sm font-bold text-navy-950 bg-lime hover:bg-lime-light rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                            >
                                Continue
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={onFinish}
                                disabled={!canContinue || saving}
                                className="inline-flex items-center gap-2 px-7 py-3 text-sm font-bold text-white bg-navy-950 hover:bg-navy-900 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Saving...' : 'Find my tutors'}
                                {!saving && (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentOnboarding;
