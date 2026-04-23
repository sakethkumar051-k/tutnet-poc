import { useState } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

/**
 * ReportOffPlatformButton
 * -----------------------
 * A discreet entry point in the chat / tutor profile for parents to report
 * an off-platform request. Verified reports trigger ₹500 credit to the parent
 * (see TSA §8.2 and REVENUE_MODEL.md §5.2).
 *
 * Designed to feel like a safety feature, not a surveillance one.
 * Frames the reward only AFTER the report is submitted.
 *
 * Props:
 *   tutorId
 *   bookingId (optional)
 *   compact  (boolean) — smaller inline variant for chat header
 */
export default function ReportOffPlatformButton({ tutorId, bookingId, compact = false }) {
    const [open, setOpen] = useState(false);
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { showSuccess, showError } = useToast();
    const [done, setDone] = useState(false);

    const submit = async () => {
        if (description.trim().length < 10) {
            showError('Please describe what happened (at least 10 characters).');
            return;
        }
        setSubmitting(true);
        try {
            await api.post('/off-platform-reports', {
                tutorId,
                bookingId,
                description: description.trim()
            });
            setDone(true);
            showSuccess('Report submitted. Admin will review within 72 hours.');
        } catch (err) {
            const msg = err.response?.data?.message || 'Could not submit report';
            showError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const close = () => {
        setOpen(false);
        // Reset after animation
        setTimeout(() => {
            setDescription('');
            setDone(false);
        }, 300);
    };

    if (compact) {
        return (
            <>
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    title="Safety: report concerning request"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Safety
                </button>
                {open && <Dialog {...{ open, close, done, description, setDescription, submit, submitting }} />}
            </>
        );
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-xs text-gray-500 hover:text-gray-700 underline decoration-dotted underline-offset-2 transition-colors"
            >
                Report off-platform request
            </button>
            {open && <Dialog {...{ open, close, done, description, setDescription, submit, submitting }} />}
        </>
    );
}

function Dialog({ close, done, description, setDescription, submit, submitting }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
             onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[440px] overflow-hidden">
                {done ? (
                    <div className="p-7 text-center">
                        <div className="w-12 h-12 rounded-full bg-lime/30 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-extrabold text-navy-950 tracking-tight">Report submitted</h3>
                        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                            Thanks for helping keep Tutnet safe. Our team reviews reports within 72 hours. Verified reports receive a <span className="font-bold text-navy-950">₹500 platform credit</span> on your next invoice.
                        </p>
                        <button onClick={close}
                            className="mt-6 px-5 py-2.5 bg-navy-950 hover:bg-navy-900 text-white text-sm font-bold rounded-full transition-colors">
                            Done
                        </button>
                    </div>
                ) : (
                    <div className="p-7">
                        <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Safety report</p>
                        <h3 className="text-lg font-extrabold text-navy-950 tracking-tight mt-1">
                            Report an off-platform request
                        </h3>
                        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                            Use this if a tutor asked you to move sessions, payments, or contact outside Tutnet. Your report is confidential and reviewed by our team.
                        </p>

                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What happened? (e.g., tutor asked for my UPI ID to pay directly)"
                            rows={4}
                            className="w-full mt-4 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-navy-950 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal/40 transition-all resize-none"
                            maxLength={2000}
                        />

                        <p className="text-[11px] text-gray-400 mt-2">{description.length}/2000 characters</p>

                        <div className="flex gap-2 mt-5">
                            <button onClick={close}
                                className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-full hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                            <button onClick={submit} disabled={submitting || description.trim().length < 10}
                                className="flex-1 py-2.5 bg-navy-950 hover:bg-navy-900 text-white text-sm font-bold rounded-full transition-colors disabled:opacity-50">
                                {submitting ? 'Submitting…' : 'Submit report'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
