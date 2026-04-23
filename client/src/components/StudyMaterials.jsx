import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import LoadingSkeleton from './LoadingSkeleton';
import EmptyState from './EmptyState';

/**
 * StudyMaterials (a.k.a. Resources page) — rich grid with search + filters,
 * subject chip-bar, file-type icons, inline preview, and a "your shares" shelf
 * for tutors.
 */
const TYPE_META = {
    pdf:      { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', tone: 'rose',  label: 'PDF' },
    video:    { icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', tone: 'royal', label: 'Video' },
    image:    { icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', tone: 'amber', label: 'Image' },
    document: { icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z', tone: 'royal', label: 'Doc' },
    link:     { icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1', tone: 'lime',  label: 'Link' }
};
const TONE_CLS = {
    rose:  'bg-rose-50 text-rose-700',
    royal: 'bg-royal/10 text-royal-dark',
    amber: 'bg-amber-100 text-amber-800',
    lime:  'bg-lime/30 text-navy-950'
};

const SUBJECTS = ['Mathematics','Physics','Chemistry','Biology','English','Hindi','Computer Science','Social Studies','Economics','Accounting'];
const CLASSES = ['6','7','8','9','10','11','12'];

const StudyMaterials = () => {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [subject, setSubject] = useState('');
    const [classGrade, setClassGrade] = useState('');
    const [search, setSearch] = useState('');
    const [preview, setPreview] = useState(null);
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (subject) params.append('subject', subject);
            if (classGrade) params.append('classGrade', classGrade);
            const { data } = await api.get(`/study-materials?${params.toString()}`);
            setMaterials(Array.isArray(data) ? data : []);
        } catch {
            showError('Failed to fetch study materials');
        } finally { setLoading(false); }
    }, [subject, classGrade, showError]);

    useEffect(() => { load(); }, [load]);

    // Client-side search on loaded list
    const filtered = useMemo(() => {
        if (!search.trim()) return materials;
        const q = search.trim().toLowerCase();
        return materials.filter((m) =>
            m.title?.toLowerCase().includes(q) ||
            m.description?.toLowerCase().includes(q) ||
            m.subject?.toLowerCase().includes(q) ||
            m.uploadedBy?.name?.toLowerCase().includes(q)
        );
    }, [materials, search]);

    const summary = useMemo(() => {
        const byType = materials.reduce((acc, m) => { acc[m.fileType || 'document'] = (acc[m.fileType || 'document'] || 0) + 1; return acc; }, {});
        const bySubject = materials.reduce((acc, m) => { acc[m.subject] = (acc[m.subject] || 0) + 1; return acc; }, {});
        return {
            total: materials.length,
            byType,
            topSubject: Object.entries(bySubject).sort((a, b) => b[1] - a[1])[0]?.[0]
        };
    }, [materials]);

    const open = (m) => {
        if (m.fileUrl) {
            setPreview(m);
            showSuccess('Opening material…');
            // Best-effort bump: fire-and-forget download increment if such endpoint exists.
            api.post(`/study-materials/${m._id}/download`).catch(() => {});
        } else {
            showError('No file URL for this material');
        }
    };

    return (
        <div className="space-y-5">
            {/* Header card */}
            <div className="bg-gradient-to-br from-white to-royal/[0.04] border border-gray-100 rounded-2xl p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-extrabold text-navy-950 tracking-tight">Resources</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {summary.total === 0
                                ? 'Worksheets, notes, and links your tutors share with you.'
                                : `${summary.total} item${summary.total === 1 ? '' : 's'}${summary.topSubject ? ` · mostly ${summary.topSubject}` : ''}.`}
                        </p>
                    </div>
                    {/* Quick-count chips */}
                    {summary.total > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                            {Object.entries(summary.byType).map(([t, n]) => {
                                const meta = TYPE_META[t] || TYPE_META.document;
                                return (
                                    <span key={t} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${TONE_CLS[meta.tone]}`}>
                                        {meta.label} · {n}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Search + filters */}
                <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr] gap-3">
                    <div className="relative">
                        <svg className="absolute left-3 top-3 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search title, subject, or tutor…"
                            className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-royal/40" />
                    </div>
                    <select value={subject} onChange={(e) => setSubject(e.target.value)}
                        className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-royal/40">
                        <option value="">All subjects</option>
                        {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={classGrade} onChange={(e) => setClassGrade(e.target.value)}
                        className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-royal/40">
                        <option value="">All classes</option>
                        {CLASSES.map((c) => <option key={c} value={c}>Class {c}</option>)}
                    </select>
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <LoadingSkeleton type="card" count={6} />
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon="📚"
                    title={search || subject || classGrade ? 'No matches' : 'No resources yet'}
                    description={
                        search || subject || classGrade
                            ? 'Try clearing filters or search terms.'
                            : 'Your tutors will share notes, worksheets, and links here after each session.'
                    }
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((m) => (
                        <ResourceCard key={m._id} material={m} onOpen={() => open(m)} />
                    ))}
                </div>
            )}

            {preview && <PreviewModal material={preview} onClose={() => setPreview(null)} />}
            {user?.role === 'tutor' && null /* upload UI for tutors — TBD */}
        </div>
    );
};

function ResourceCard({ material, onOpen }) {
    const meta = TYPE_META[material.fileType] || TYPE_META.document;
    const toneCls = TONE_CLS[meta.tone];
    return (
        <button
            type="button"
            onClick={onOpen}
            className="group text-left bg-white border border-gray-100 rounded-2xl p-5 hover:border-royal/30 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-start gap-3 mb-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${toneCls}`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} />
                    </svg>
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-navy-950 truncate">{material.title}</h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{meta.label}</span>
                        {material.subject && <span className="text-[10px] text-gray-400">· {material.subject}</span>}
                        {material.classGrade && <span className="text-[10px] text-gray-400">· Class {material.classGrade}</span>}
                    </div>
                </div>
            </div>
            {material.description && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{material.description}</p>
            )}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-[11px] text-gray-400 truncate">
                    {material.uploadedBy?.name ? `By ${material.uploadedBy.name}` : 'TutNet'}
                </span>
                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                    {material.downloadCount > 0 && <span>{material.downloadCount} opens</span>}
                    <span className="inline-flex items-center gap-0.5 text-royal group-hover:text-royal-dark font-semibold">
                        Open
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </span>
                </div>
            </div>
        </button>
    );
}

function PreviewModal({ material, onClose }) {
    const meta = TYPE_META[material.fileType] || TYPE_META.document;
    const toneCls = TONE_CLS[meta.tone];
    const isEmbeddable = material.fileType === 'pdf' || material.fileType === 'image';
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${toneCls}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-navy-950 truncate">{material.title}</p>
                            <p className="text-[11px] text-gray-400">{meta.label} · {material.subject}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={material.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="px-3 py-1.5 text-xs font-semibold text-royal-dark bg-royal/5 border border-royal/20 rounded-lg hover:bg-royal/10">
                            Open in new tab
                        </a>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden bg-gray-50">
                    {isEmbeddable ? (
                        material.fileType === 'pdf' ? (
                            <iframe src={material.fileUrl} title={material.title} className="w-full h-full border-0" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center p-4">
                                <img src={material.fileUrl} alt={material.title} className="max-w-full max-h-full rounded-lg" />
                            </div>
                        )
                    ) : (
                        <div className="h-full flex items-center justify-center text-center p-10">
                            <div>
                                <p className="text-sm font-semibold text-navy-950 mb-1">This file opens externally</p>
                                <p className="text-xs text-gray-500 mb-4">Videos, docs, and links open in a new tab for best quality.</p>
                                <a href={material.fileUrl} target="_blank" rel="noopener noreferrer"
                                    className="inline-block px-5 py-2.5 bg-royal hover:bg-royal-dark text-white text-sm font-semibold rounded-lg">
                                    Open in new tab
                                </a>
                            </div>
                        </div>
                    )}
                </div>
                {material.description && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-white">
                        <p className="text-xs text-gray-700">{material.description}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default StudyMaterials;
