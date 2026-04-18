import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const CLASS_GRADES = [
    'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
    'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10',
    'Class 11', 'Class 12', 'Undergraduate', 'Postgraduate', 'Other'
];

export default function StudentProfileForm() {
    const { user, refreshUser } = useAuth();
    const { showSuccess, showError } = useToast();
    const [form, setForm] = useState({
        name: '',
        phone: '',
        classGrade: '',
        location: { city: 'Hyderabad', area: '', pincode: '' },
        emergencyContact: { name: '', relationship: '', phone: '' }
    });
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (user) {
            setForm({
                name: user.name || '',
                phone: user.phone || '',
                classGrade: user.classGrade || '',
                location: {
                    city: user.location?.city || 'Hyderabad',
                    area: user.location?.area || '',
                    pincode: user.location?.pincode || ''
                },
                emergencyContact: {
                    name: user.emergencyContact?.name || '',
                    relationship: user.emergencyContact?.relationship || '',
                    phone: user.emergencyContact?.phone || ''
                }
            });
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'area' || name === 'city' || name === 'pincode') {
            setForm(f => ({ ...f, location: { ...f.location, [name]: value } }));
        } else if (name === 'ec_name' || name === 'ec_relationship' || name === 'ec_phone') {
            const key = name.replace('ec_', '');
            setForm(f => ({ ...f, emergencyContact: { ...f.emergencyContact, [key]: value } }));
        } else {
            setForm(f => ({ ...f, [name]: value }));
        }
        setSaved(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { showError('Name is required'); return; }
        setLoading(true);
        try {
            const { data } = await api.put('/auth/profile', {
                name: form.name.trim(),
                phone: form.phone.trim(),
                classGrade: form.classGrade,
                location: form.location,
                emergencyContact: form.emergencyContact
            });
            if (data?.token) {
                localStorage.setItem('token', data.token);
            }
            // Update form immediately from response so saved data shows right away
            setForm({
                name: data.name || '',
                phone: data.phone || '',
                classGrade: data.classGrade || '',
                location: {
                    city: data.location?.city || 'Hyderabad',
                    area: data.location?.area || '',
                    pincode: data.location?.pincode || ''
                },
                emergencyContact: {
                    name: data.emergencyContact?.name || '',
                    relationship: data.emergencyContact?.relationship || '',
                    phone: data.emergencyContact?.phone || ''
                }
            });
            await refreshUser();
            showSuccess('Profile updated successfully');
            setSaved(true);
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Avatar / Identity */}
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-royal/10 flex items-center justify-center text-royal-dark text-2xl font-bold flex-shrink-0">
                    {form.name ? form.name[0].toUpperCase() : '?'}
                </div>
                <div>
                    <p className="text-base font-semibold text-navy-950">{form.name || 'Your Name'}</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                    <p className="text-xs text-royal font-medium mt-0.5 capitalize">{user?.role}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Full Name *</label>
                    <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-royal/40"
                        placeholder="Your full name"
                        required
                    />
                </div>

                {/* Phone */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone Number</label>
                    <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-royal/40"
                        placeholder="+91 9876543210"
                    />
                </div>

                {/* Class / Grade */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Class / Grade</label>
                    <select
                        name="classGrade"
                        value={form.classGrade}
                        onChange={handleChange}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-royal/40"
                    >
                        <option value="">Select your class</option>
                        {CLASS_GRADES.map(g => (
                            <option key={g} value={g}>{g}</option>
                        ))}
                    </select>
                </div>

                {/* Location */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Location</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                            type="text"
                            name="area"
                            value={form.location.area}
                            onChange={handleChange}
                            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-royal/40"
                            placeholder="Area / Colony"
                        />
                        <input
                            type="text"
                            name="city"
                            value={form.location.city}
                            onChange={handleChange}
                            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-royal/40"
                            placeholder="City"
                        />
                        <input
                            type="text"
                            name="pincode"
                            value={form.location.pincode}
                            onChange={handleChange}
                            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-royal/40"
                            placeholder="Pincode"
                        />
                    </div>
                </div>

                {/* Emergency Contact */}
                <div className="pt-2">
                    <p className="text-xs font-bold text-gray-700 mb-0.5 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Emergency Contact
                    </p>
                    <p className="text-xs text-gray-400 mb-3">In case of emergency, this person will be contacted</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                            type="text"
                            name="ec_name"
                            value={form.emergencyContact.name}
                            onChange={handleChange}
                            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                            placeholder="Full name"
                        />
                        <input
                            type="text"
                            name="ec_relationship"
                            value={form.emergencyContact.relationship}
                            onChange={handleChange}
                            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                            placeholder="Relationship (e.g. Parent)"
                        />
                        <input
                            type="tel"
                            name="ec_phone"
                            value={form.emergencyContact.phone}
                            onChange={handleChange}
                            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                            placeholder="Phone number"
                        />
                    </div>
                </div>

                {/* Email (read-only) */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address</label>
                    <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="w-full border border-gray-100 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                </div>

                <div className="flex items-center gap-3 pt-1">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2.5 bg-royal text-white rounded-lg text-sm font-semibold hover:bg-royal-dark disabled:opacity-60 flex items-center gap-2 transition-colors"
                    >
                        {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        Save Changes
                    </button>
                    {saved && (
                        <span className="flex items-center gap-1.5 text-sm text-lime-dark font-medium">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Saved
                        </span>
                    )}
                </div>
            </form>
        </div>
    );
}
