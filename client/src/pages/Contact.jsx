import { useState } from 'react';
import api from '../utils/api';

const Contact = () => {
    const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
    const [status, setStatus] = useState(null); // { ok, text } | null
    const [submitting, setSubmitting] = useState(false);

    const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        try {
            await api.post('/contact', {
                ...form,
                sourceUrl: typeof window !== 'undefined' ? window.location.href : ''
            });
            setStatus({ ok: true, text: 'Message sent. Our team will get back to you within 24 hours.' });
            setForm({ name: '', email: '', phone: '', subject: '', message: '' });
        } catch (err) {
            const msg = err?.response?.data?.error?.message
                     || err?.response?.data?.message
                     || 'Could not send your message. Please try again or email support@tutnet.in.';
            setStatus({ ok: false, text: msg });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-lg mx-auto bg-white rounded-2xl shadow overflow-hidden">
                <div className="px-6 py-8">
                    <div className="text-center mb-6">
                        <h2 className="text-3xl font-bold text-navy-950">Contact Us</h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Have questions? We'd love to hear from you.
                        </p>
                    </div>

                    {status?.ok && (
                        <div className="bg-lime/20 text-navy-950 p-4 rounded-lg text-center mb-4">
                            {status.text}
                        </div>
                    )}
                    {status && !status.ok && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-lg text-center mb-4">
                            {status.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                            <input
                                id="name" type="text" required
                                value={form.name} onChange={update('name')}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-royal focus:border-royal sm:text-sm" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    id="email" type="email" required
                                    value={form.email} onChange={update('email')}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-royal focus:border-royal sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone (optional)</label>
                                <input
                                    id="phone" type="tel"
                                    value={form.phone} onChange={update('phone')}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-royal focus:border-royal sm:text-sm" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Subject (optional)</label>
                            <input
                                id="subject" type="text"
                                value={form.subject} onChange={update('subject')}
                                placeholder="What's this about?"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-royal focus:border-royal sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message</label>
                            <textarea
                                id="message" rows="5" required minLength={10}
                                value={form.message} onChange={update('message')}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-royal focus:border-royal sm:text-sm" />
                            <p className="text-xs text-gray-400 mt-1">{form.message.length}/4000</p>
                        </div>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full flex justify-center py-2.5 px-4 rounded-md shadow-sm text-sm font-semibold text-white bg-royal hover:bg-royal-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-royal disabled:opacity-60">
                            {submitting ? 'Sending…' : 'Send Message'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Contact;
