import { useEffect, useRef, useState } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

/**
 * QualificationUploader — tutor attaches degree/cert scans to their profile.
 * Uploads go to /api/uploads/qualification and the URL is persisted on
 * TutorProfile.qualificationDocs. 8 MB cap, pdf / jpg / png / docx.
 */
export default function QualificationUploader() {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [title, setTitle] = useState('');
    const inputRef = useRef(null);
    const { showSuccess, showError } = useToast();

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/tutors/me');
            setDocs(data?.qualificationDocs || []);
        } catch { /* silent */ }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const pick = () => inputRef.current?.click();

    const handleFile = async (file) => {
        if (!file) return;
        if (file.size > 8 * 1024 * 1024) {
            showError('File too large (max 8 MB)');
            return;
        }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            if (title.trim()) fd.append('title', title.trim());
            await api.post('/uploads/qualification', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showSuccess('Document uploaded');
            setTitle('');
            if (inputRef.current) inputRef.current.value = '';
            load();
        } catch (err) {
            showError(err?.response?.data?.message || 'Upload failed');
        } finally { setUploading(false); }
    };

    const remove = async (url, name) => {
        if (!window.confirm(`Remove "${name}" from your profile?`)) return;
        try {
            await api.delete('/uploads/qualification', { data: { url } });
            showSuccess('Removed');
            load();
        } catch { showError('Could not remove'); }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h4 className="text-sm font-bold text-navy-950">Qualification documents</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Upload degree scans, certificates, or ID proof. Only admins see these; they bump your profile verification level.</p>
                </div>
            </div>

            {loading ? (
                <p className="text-sm text-gray-400 py-4">Loading…</p>
            ) : docs.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-lg">No documents uploaded yet.</p>
            ) : (
                <ul className="space-y-2 mb-4">
                    {docs.map((d, i) => (
                        <li key={i} className="flex items-center justify-between p-2 border border-gray-100 rounded-lg">
                            <a href={d.url} target="_blank" rel="noopener noreferrer"
                                className="flex-1 min-w-0 flex items-center gap-2 text-sm text-royal hover:text-royal-dark">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="truncate">{d.title || 'Untitled document'}</span>
                                <span className="text-[10px] text-gray-400 ml-auto">
                                    {d.uploadedAt ? new Date(d.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                                </span>
                            </a>
                            <button onClick={() => remove(d.url, d.title || 'document')}
                                className="ml-2 px-2 py-1 text-xs text-rose-700 border border-rose-200 rounded hover:bg-rose-50">
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" placeholder="Title (e.g. B.Sc Mathematics, Osmania Univ)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal/40" />
                <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])} />
                <button onClick={pick} disabled={uploading}
                    className="px-4 py-2 bg-royal hover:bg-royal-dark text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                    {uploading ? 'Uploading…' : 'Upload document'}
                </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">PDF, DOC, DOCX, JPG, PNG, WEBP — max 8 MB.</p>
        </div>
    );
}
