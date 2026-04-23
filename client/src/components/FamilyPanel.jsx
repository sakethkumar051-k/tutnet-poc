import { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

/**
 * FamilyPanel — parent manages child sub-accounts (multi-child households).
 * Parents: list children, add child (creates a sub-account), unlink.
 * Children: show the linked parent + note.
 */
export default function FamilyPanel() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ name: '', classGrade: '' });
    const [linkEmail, setLinkEmail] = useState('');
    const { showSuccess, showError } = useToast();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/family/mine');
            setData(data);
        } catch (err) {
            showError(err?.response?.data?.message || 'Could not load family');
        } finally { setLoading(false); }
    }, [showError]);

    useEffect(() => { load(); }, [load]);

    const addChild = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        setCreating(true);
        try {
            await api.post('/family/children', form);
            showSuccess(`${form.name} added as a child account`);
            setForm({ name: '', classGrade: '' });
            load();
        } catch (err) {
            showError(err?.response?.data?.message || 'Could not add child');
        } finally { setCreating(false); }
    };

    const linkExisting = async (e) => {
        e.preventDefault();
        if (!linkEmail.trim()) return;
        try {
            await api.post('/family/link', { childEmail: linkEmail.trim() });
            showSuccess('Linked existing account');
            setLinkEmail('');
            load();
        } catch (err) {
            showError(err?.response?.data?.message || 'Could not link account');
        }
    };

    const unlink = async (id, name) => {
        if (!window.confirm(`Unlink ${name} from your account? Their data stays on their account.`)) return;
        try {
            await api.delete(`/family/children/${id}`);
            showSuccess('Unlinked');
            load();
        } catch { showError('Could not unlink'); }
    };

    if (loading) return <div className="py-6 text-sm text-gray-400">Loading family…</div>;

    if (data?.mode === 'child' && data.parent) {
        return (
            <div className="bg-royal/5 border border-royal/20 rounded-xl p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-royal-dark">Parent account</p>
                <p className="text-lg font-bold text-navy-950 mt-1">{data.parent.name}</p>
                <p className="text-xs text-gray-500">{data.parent.email}</p>
                <p className="text-xs text-gray-600 mt-3">
                    Your account is linked to a parent. They can view your sessions, payments, and progress.
                </p>
            </div>
        );
    }

    const children = data?.children || [];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-navy-950">Children on this account</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Manage multiple kids under one parent account. Sibling-discount pricing kicks in from the 2nd child.</p>
                </div>
            </div>

            {children.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 border border-dashed border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-500">No children linked yet.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {children.map((c) => (
                        <div key={c._id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                            <div className="min-w-0">
                                <p className="font-semibold text-navy-950 truncate">{c.name}</p>
                                <p className="text-xs text-gray-500 truncate">
                                    {c.classGrade && <>Class {c.classGrade} · </>}
                                    {c.email}
                                </p>
                            </div>
                            <button onClick={() => unlink(c._id, c.name)}
                                className="px-2 py-1 text-xs font-semibold text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-50">
                                Unlink
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <form onSubmit={addChild} className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Add a child</p>
                    <input type="text" placeholder="Child's name"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal/40 mb-2" />
                    <input type="text" placeholder="Class / grade (e.g. 8, 11, B.Tech)"
                        value={form.classGrade}
                        onChange={(e) => setForm((f) => ({ ...f, classGrade: e.target.value }))}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal/40 mb-2" />
                    <button type="submit" disabled={creating || !form.name.trim()}
                        className="w-full py-2 bg-royal hover:bg-royal-dark text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                        {creating ? 'Adding…' : 'Add child'}
                    </button>
                </form>

                <form onSubmit={linkExisting} className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Link an existing account</p>
                    <input type="email" placeholder="child's email on TutNet"
                        value={linkEmail}
                        onChange={(e) => setLinkEmail(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal/40 mb-2" />
                    <button type="submit" disabled={!linkEmail.trim()}
                        className="w-full py-2 bg-navy-950 hover:bg-navy-900 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                        Link account
                    </button>
                </form>
            </div>
        </div>
    );
}
