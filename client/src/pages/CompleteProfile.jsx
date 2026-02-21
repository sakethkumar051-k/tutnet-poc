import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { getBaseURL } from '../utils/api';

const CompleteProfile = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login, user: loginUser } = useAuth();

    // Form state
    const [role, setRole] = useState('');
    const [formData, setFormData] = useState({
        phone: '',
        location: {
            area: '',
            city: 'Hyderabad',
            pincode: ''
        },
        classGrade: '', // For students
        // Tutor specific fields
        subjects: '',
        classes: '',
        hourlyRate: '',
        experienceYears: '',
        bio: '',
        mode: 'home',
        languages: '',
        availableSlots: '',
        education: {
            degree: '',
            institution: '',
            year: ''
        },
        qualifications: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [token, setToken] = useState('');

    useEffect(() => {
        const initializeProfile = async () => {
            // If user is logged in, use their token and role
            if (loginUser) {
                const storedToken = localStorage.getItem('token');
                if (storedToken) {
                    setToken(storedToken);
                    // Pre-fill role from user's actual role (tutor or student)
                    if (loginUser.role) {
                        setRole(loginUser.role);
                    }
                    // Pre-fill existing data if available
                    if (loginUser.phone) {
                        setFormData(prev => ({
                            ...prev,
                            phone: loginUser.phone
                        }));
                    }
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
                    if (loginUser.classGrade) {
                        setFormData(prev => ({
                            ...prev,
                            classGrade: loginUser.classGrade
                        }));
                    }
                    return;
                }
            }

            // Check for token in URL (from OAuth or direct link)
            const urlToken = searchParams.get('token');
            if (urlToken) {
                setToken(urlToken);
                // Try to fetch user data with this token to get role
                try {
                    const { getBaseURL } = await import('../utils/api');
                    const apiUrl = getBaseURL();
                    const response = await axios.get(`${apiUrl}/auth/me`, {
                        headers: { Authorization: `Bearer ${urlToken}` }
                    });
                    if (response.data.role) {
                        setRole(response.data.role);
                    }
                } catch (err) {
                    console.error('Could not fetch user data:', err);
                }
            } else if (!loginUser) {
                // If no token and not logged in, go to login
                navigate('/login');
            }
        };

        initializeProfile();
    }, [searchParams, navigate, loginUser]);

    const handleChange = (e) => {
        if (e.target.name === 'area') {
            setFormData({
                ...formData,
                location: { ...formData.location, area: e.target.value }
            });
        } else if (e.target.name === 'pincode') {
            setFormData({
                ...formData,
                location: { ...formData.location, pincode: e.target.value }
            });
        } else if (e.target.name.startsWith('education.')) {
            const field = e.target.name.split('.')[1];
            setFormData({
                ...formData,
                education: { ...formData.education, [field]: e.target.value }
            });
        } else {
            setFormData({ ...formData, [e.target.name]: e.target.value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Basic validation - role should already be set from user's registration
        if (!role) {
            setError('Role not detected. Please log in again.');
            return;
        }

        if (!formData.phone || !formData.location.area) {
            setError('Please fill in phone and location');
            return;
        }

        // Student validation
        if (role === 'student' && !formData.classGrade) {
            setError('Please select your class/grade');
            return;
        }

        // Tutor validation - collect all required fields
        if (role === 'tutor') {
            if (!formData.subjects) {
                setError('Please enter at least one subject');
                return;
            }
            if (!formData.classes) {
                setError('Please enter classes/grades you teach');
                return;
            }
            if (!formData.hourlyRate || formData.hourlyRate <= 0) {
                setError('Please enter a valid hourly rate');
                return;
            }
            if (!formData.experienceYears || formData.experienceYears < 0) {
                setError('Please enter your years of experience');
                return;
            }
            if (!formData.bio || formData.bio.trim().length < 50) {
                setError('Please write a bio (minimum 50 characters)');
                return;
            }
            if (!formData.languages) {
                setError('Please enter languages you speak');
                return;
            }
        }

        setLoading(true);

        try {
            const apiUrl = getBaseURL();

            // Prepare payload
            const payload = {
                role,
                phone: formData.phone,
                location: formData.location,
                classGrade: role === 'student' ? formData.classGrade : undefined
            };

            // Add tutor-specific fields
            if (role === 'tutor') {
                payload.subjects = formData.subjects.split(',').map(s => s.trim()).filter(s => s);
                payload.classes = formData.classes.split(',').map(s => s.trim()).filter(s => s);
                payload.hourlyRate = Number(formData.hourlyRate);
                payload.experienceYears = Number(formData.experienceYears);
                payload.bio = formData.bio.trim();
                payload.mode = formData.mode;
                payload.languages = formData.languages.split(',').map(s => s.trim()).filter(s => s);
                payload.availableSlots = formData.availableSlots ? formData.availableSlots.split(',').map(s => s.trim()).filter(s => s) : [];
                payload.education = formData.education;
                payload.qualifications = formData.qualifications ? formData.qualifications.split(',').map(s => s.trim()).filter(s => s) : [];
            }

            // Use token from state or localStorage
            const authToken = token || localStorage.getItem('token');
            
            if (!authToken) {
                throw new Error('No authentication token found');
            }

            // Call update profile endpoint
            const response = await axios.put(
                `${apiUrl}/auth/profile`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000 // 30 second timeout
                }
            );

            // IMPORTANT: Use the NEW token returned from the server
            const newToken = response.data.token;

            if (newToken) {
                // Pass the new token to login
                await login(newToken);

                // Show success message
                setError(''); // Clear any errors
                setSuccess(true);
                setLoading(false);
                
                // Small delay to show success message and ensure state is updated
                setTimeout(() => {
                    // Redirect based on role
                    if (role === 'tutor') {
                        navigate('/tutor-dashboard', { replace: true });
                    } else {
                        navigate('/student-dashboard', { replace: true });
                    }
                }, 1500); // Give user time to see success message
            } else {
                throw new Error('No token returned from update');
            }
        } catch (err) {
            console.error('Profile update error:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to update profile. Please try again.';
            setError(errorMessage);
            setLoading(false); // Stop loading on error so user can retry
            // Don't reset form - keep user's data so they can fix and resubmit
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 bg-gray-50">
            <div className={`max-w-${role === 'tutor' ? '4xl' : 'md'} w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden p-8`}>
                <div className="text-center mb-8">
                    <div className="inline-flex items-center px-4 py-2 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold mb-4">
                        ⚠️ Mandatory Profile Completion
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">Complete Your Profile</h2>
                    <p className="mt-2 text-gray-600">
                        {role === 'tutor' 
                            ? 'Please provide all required details to start teaching on Tutnet. This information is essential for business development and student matching.'
                            : 'Please provide a few more details to get started.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
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
                        <div className="bg-green-50 border border-green-200 text-green-600 p-4 rounded-lg text-sm">
                            <div className="flex items-center">
                                <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Profile saved successfully! Redirecting to dashboard...</span>
                            </div>
                        </div>
                    )}

                    {/* Role Display (not selection if already set) */}
                    {role && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-indigo-900">Account Type</p>
                                    <p className="text-lg font-bold text-indigo-700 capitalize mt-1">
                                        {role === 'tutor' ? '👨‍🏫 Tutor' : '👨‍🎓 Student'}
                                    </p>
                                </div>
                                <div className="text-xs text-indigo-600">
                                    Set during registration
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Role Selection - Only show if role is not set (for OAuth users who haven't selected) */}
                    {!role && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRole('student')}
                                    className={`py-3 px-4 rounded-xl border-2 transition-all ${role === 'student'
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                                        : 'border-gray-200 hover:border-indigo-200 text-gray-600'
                                        }`}
                                >
                                    Student
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('tutor')}
                                    className={`py-3 px-4 rounded-xl border-2 transition-all ${role === 'tutor'
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                                        : 'border-gray-200 hover:border-indigo-200 text-gray-600'
                                        }`}
                                >
                                    Tutor
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Common Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                            <input
                                name="phone"
                                type="tel"
                                placeholder="+91 98765 43210"
                                required
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        {/* Location Area */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Area / Locality *</label>
                            <input
                                name="area"
                                type="text"
                                placeholder="e.g. Banjara Hills"
                                required
                                value={formData.location.area}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Pincode */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pincode (Optional)</label>
                        <input
                            name="pincode"
                            type="text"
                            placeholder="500001"
                            value={formData.location.pincode}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    {/* Student Specific: Class/Grade */}
                    {role === 'student' && (
                        <div className="animate-fade-in border-t pt-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Class / Grade *</label>
                            <select
                                name="classGrade"
                                required
                                value={formData.classGrade}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                            >
                                <option value="">Select your class</option>
                                {[...Array(12)].map((_, i) => (
                                    <option key={i} value={`Class ${i + 1}`}>Class {i + 1}</option>
                                ))}
                                <option value="Bachelors">Bachelors / Undergrad</option>
                                <option value="Masters">Masters / Postgrad</option>
                            </select>
                        </div>
                    )}

                    {/* Tutor Specific Fields */}
                    {role === 'tutor' && (
                        <div className="animate-fade-in border-t pt-6 space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900">Tutor Information</h3>

                            {/* Subjects and Classes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subjects You Teach *</label>
                                    <input
                                        name="subjects"
                                        type="text"
                                        placeholder="Math, Physics, Chemistry"
                                        required
                                        value={formData.subjects}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Classes / Grades You Teach *</label>
                                    <input
                                        name="classes"
                                        type="text"
                                        placeholder="Class 10, Class 12, Undergraduate"
                                        required
                                        value={formData.classes}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
                                </div>
                            </div>

                            {/* Hourly Rate and Experience */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate (₹) *</label>
                                    <input
                                        name="hourlyRate"
                                        type="number"
                                        min="0"
                                        required
                                        value={formData.hourlyRate}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience *</label>
                                    <input
                                        name="experienceYears"
                                        type="number"
                                        min="0"
                                        required
                                        value={formData.experienceYears}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Teaching Mode and Languages */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teaching Mode *</label>
                                    <select
                                        name="mode"
                                        required
                                        value={formData.mode}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="home">Home Tuition</option>
                                        <option value="online">Online</option>
                                        <option value="both">Both</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Languages Spoken *</label>
                                    <input
                                        name="languages"
                                        type="text"
                                        placeholder="English, Telugu, Hindi"
                                        required
                                        value={formData.languages}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
                                </div>
                            </div>

                            {/* Education */}
                            <div className="border-t pt-4">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Education</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Degree</label>
                                        <input
                                            name="education.degree"
                                            type="text"
                                            placeholder="B.Tech, M.Sc, etc."
                                            value={formData.education.degree}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
                                        <input
                                            name="education.institution"
                                            type="text"
                                            placeholder="University/College name"
                                            value={formData.education.institution}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                                        <input
                                            name="education.year"
                                            type="text"
                                            placeholder="2020"
                                            value={formData.education.year}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Qualifications */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Qualifications / Certifications</label>
                                <input
                                    name="qualifications"
                                    type="text"
                                    placeholder="B.Ed, TET, etc. (comma separated)"
                                    value={formData.qualifications}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">Separate with commas</p>
                            </div>

                            {/* Bio */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bio / Teaching Style *</label>
                                <textarea
                                    name="bio"
                                    rows={4}
                                    required
                                    minLength={50}
                                    value={formData.bio}
                                    onChange={handleChange}
                                    placeholder="Describe your teaching style, experience, and what makes you a great tutor... (minimum 50 characters)"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/50 characters minimum</p>
                            </div>

                            {/* Available Slots */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Available Time Slots</label>
                                <input
                                    name="availableSlots"
                                    type="text"
                                    placeholder="Mon-Fri 6PM-9PM, Weekends 10AM-2PM"
                                    value={formData.availableSlots}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">Separate different slots with commas</p>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creating Profile...' : 'Complete Registration'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CompleteProfile;
