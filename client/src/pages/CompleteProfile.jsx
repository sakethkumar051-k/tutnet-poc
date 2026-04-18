import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { getBaseURL } from '../utils/api';

const CompleteProfile = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login, user: loginUser } = useAuth();
    const exchangedRef = useRef(false);

    const [role, setRole] = useState('');
    const [formData, setFormData] = useState({
        phone: '',
        location: { area: '', city: 'Hyderabad', pincode: '' },
        classGrade: '',
        subjects: '',
        classes: '',
        hourlyRate: '',
        experienceYears: '',
        bio: '',
        mode: 'home',
        languages: '',
        availableSlots: '',
        education: { degree: '', institution: '', year: '' },
        qualifications: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [token, setToken] = useState('');

    useEffect(() => {
        const initializeProfile = async () => {
            const urlCode = searchParams.get('code');

            if (urlCode) {
                if (exchangedRef.current) return;
                exchangedRef.current = true;
                window.history.replaceState({}, '', window.location.pathname);
                try {
                    const baseURL = getBaseURL();
                    const res = await fetch(`${baseURL}/auth/oauth-token/${urlCode}`);
                    if (!res.ok) throw new Error('Invalid or expired sign-in code. Please try again.');
                    const { token: oauthToken } = await res.json();
                    localStorage.setItem('token', oauthToken);
                    setToken(oauthToken);
                    const userResponse = await api.get('/auth/me');
                    if (userResponse.data?.role) setRole(userResponse.data.role);
                } catch (err) {
                    console.error('Could not exchange OAuth code:', err);
                    navigate('/login?error=oauth_failed');
                }
                return;
            }

            if (loginUser) {
                const storedToken = localStorage.getItem('token');
                if (storedToken) setToken(storedToken);
                if (loginUser.role) setRole(loginUser.role);
                if (loginUser.phone) setFormData(prev => ({ ...prev, phone: loginUser.phone }));
                if (loginUser.location) {
                    setFormData(prev => ({
                        ...prev,
                        location: {
                            area: loginUser.location.area || '',
                            city: loginUser.location.city || 'Hyderabad',
                            pincode: loginUser.location.pincode || ''
                        }
                    }));
                }
                if (loginUser.classGrade) setFormData(prev => ({ ...prev, classGrade: loginUser.classGrade }));
                return;
            }

            navigate('/login');
        };

        initializeProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleChange = (e) => {
        if (e.target.name === 'area') {
            setFormData({ ...formData, location: { ...formData.location, area: e.target.value } });
        } else if (e.target.name === 'pincode') {
            setFormData({ ...formData, location: { ...formData.location, pincode: e.target.value } });
        } else if (e.target.name.startsWith('education.')) {
            const field = e.target.name.split('.')[1];
            setFormData({ ...formData, education: { ...formData.education, [field]: e.target.value } });
        } else {
            setFormData({ ...formData, [e.target.name]: e.target.value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const effectiveRole = role || loginUser?.role;
        if (!effectiveRole) { setError('Role not detected. Please log in again.'); return; }
        if (!formData.phone?.trim() || !formData.location?.area?.trim()) { setError('Please fill in phone and area/locality'); return; }
        if (effectiveRole === 'student' && !formData.classGrade) { setError('Please select your class/grade'); return; }
        if (effectiveRole === 'tutor') {
            const pincode = formData.location?.pincode?.trim() || '';
            if (pincode.length !== 6) { setError('Please enter a valid 6-digit pincode'); return; }
        }
        if (!localStorage.getItem('token')) { setError('Session expired. Please log in again.'); return; }

        setLoading(true);
        setError('');

        try {
            const payload = {
                phone: formData.phone.trim(),
                location: {
                    ...formData.location,
                    area: formData.location?.area?.trim() || '',
                    pincode: (formData.location?.pincode || '').trim()
                },
                classGrade: effectiveRole === 'student' ? formData.classGrade : undefined
            };

            const response = await api.put('/auth/profile', payload);
            const newToken = response.data?.token;
            if (newToken) {
                localStorage.setItem('token', newToken);
                login(newToken).catch(() => {});
                setSuccess(true);
                setLoading(false);
                navigate(effectiveRole === 'tutor' ? '/tutor-dashboard?tab=profile' : '/student-dashboard', { replace: true });
            } else {
                throw new Error('No token returned from update');
            }
        } catch (err) {
            console.error('Profile update error:', err);
            setError(err.response?.data?.message || err.message || 'Failed to update profile. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 bg-gray-50">
            <div className={`max-w-${role === 'tutor' ? '4xl' : 'md'} w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden p-8`}>
                <div className="text-center mb-8">
                    <div className="inline-flex items-center px-4 py-2 bg-lime/30 text-navy-950 rounded-full text-sm font-semibold mb-4">
                        ⚠️ Mandatory Profile Completion
                    </div>
                    <h2 className="text-3xl font-bold text-navy-950">Complete Your Profile</h2>
                    <p className="mt-2 text-gray-600">
                        {role === 'tutor'
                            ? 'Please provide all required details to start teaching on Tutnet.'
                            : 'Please provide a few more details to get started.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg text-sm">
                            <div className="flex items-center">
                                <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="bg-lime/20 border border-lime/40 text-lime-dark p-4 rounded-lg text-sm">
                            <div className="flex items-center">
                                <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Profile saved successfully! Redirecting to dashboard...</span>
                            </div>
                        </div>
                    )}

                    {role && (
                        <div className="bg-royal/5 border border-royal/30 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-navy-950">Account Type</p>
                                    <p className="text-lg font-bold text-royal-dark capitalize mt-1">
                                        {role === 'tutor' ? '👨‍🏫 Tutor' : '👨‍🎓 Student'}
                                    </p>
                                </div>
                                <div className="text-xs text-royal">Set during registration</div>
                            </div>
                        </div>
                    )}

                    {!role && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => setRole('student')}
                                    className={`py-3 px-4 rounded-xl border-2 transition-all ${role === 'student' ? 'border-royal bg-royal/5 text-royal-dark font-bold' : 'border-gray-200 hover:border-royal/30 text-gray-600'}`}>
                                    Student
                                </button>
                                <button type="button" onClick={() => setRole('tutor')}
                                    className={`py-3 px-4 rounded-xl border-2 transition-all ${role === 'tutor' ? 'border-royal bg-royal/5 text-royal-dark font-bold' : 'border-gray-200 hover:border-royal/30 text-gray-600'}`}>
                                    Tutor
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                            <input name="phone" type="tel" placeholder="+91 98765 43210" required value={formData.phone} onChange={handleChange}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-royal outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Area / Locality *</label>
                            <input name="area" type="text" placeholder="e.g. Banjara Hills" required value={formData.location.area} onChange={handleChange}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-royal outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pincode {role === 'tutor' ? '*' : '(Optional)'}</label>
                        <input name="pincode" type="text" placeholder="500001" value={formData.location.pincode} onChange={handleChange}
                            required={role === 'tutor'} maxLength={6}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-royal outline-none" />
                    </div>

                    {role === 'student' && (
                        <div className="animate-fade-in border-t pt-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Class / Grade *</label>
                            <select name="classGrade" required value={formData.classGrade} onChange={handleChange}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-royal outline-none appearance-none">
                                <option value="">Select your class</option>
                                {[...Array(12)].map((_, i) => (
                                    <option key={i} value={`Class ${i + 1}`}>Class {i + 1}</option>
                                ))}
                                <option value="Bachelors">Bachelors / Undergrad</option>
                                <option value="Masters">Masters / Postgrad</option>
                            </select>
                        </div>
                    )}

                    {role === 'tutor' && (
                        <div className="animate-fade-in border-t pt-6">
                            <div className="bg-royal/5 border border-royal/30 rounded-xl p-4 text-sm text-navy-900">
                                After saving phone and location, you will complete your tutor profile in a short 5-step form on your dashboard.
                            </div>
                        </div>
                    )}

                    <button type="button" disabled={loading} onClick={() => handleSubmit({ preventDefault: () => {} })}
                        className="w-full py-3.5 bg-gradient-to-r from-royal to-royal/100 text-white font-semibold rounded-xl shadow-lg hover:shadow-royal/30 transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed">
                        {loading ? 'Creating Profile...' : 'Complete Registration'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CompleteProfile;
