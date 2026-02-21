import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import LoadingSkeleton from './LoadingSkeleton';
import EmptyState from './EmptyState';

const StudyMaterials = () => {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ subject: '', classGrade: '' });
    const [showUploadModal, setShowUploadModal] = useState(false);
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();

    useEffect(() => {
        fetchMaterials();
    }, [filters]);

    const fetchMaterials = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.subject) params.append('subject', filters.subject);
            if (filters.classGrade) params.append('classGrade', filters.classGrade);

            const { data } = await api.get(`/study-materials?${params.toString()}`);
            setMaterials(data);
        } catch (err) {
            showError('Failed to fetch study materials');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (material) => {
        if (material.fileUrl) {
            window.open(material.fileUrl, '_blank');
            showSuccess('Opening material...');
        }
    };

    const getFileIcon = (fileType) => {
        const icons = {
            pdf: '📄',
            video: '🎥',
            image: '🖼️',
            document: '📝',
            link: '🔗'
        };
        return icons[fileType] || '📄';
    };

    if (loading) {
        return <LoadingSkeleton type="card" count={6} />;
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                        <select
                            value={filters.subject}
                            onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">All Subjects</option>
                            <option value="Mathematics">Mathematics</option>
                            <option value="Physics">Physics</option>
                            <option value="Chemistry">Chemistry</option>
                            <option value="Biology">Biology</option>
                            <option value="English">English</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                        <select
                            value={filters.classGrade}
                            onChange={(e) => setFilters({ ...filters, classGrade: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">All Classes</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(grade => (
                                <option key={grade} value={grade}>{grade}th</option>
                            ))}
                        </select>
                    </div>
                    {(user?.role === 'tutor' || user?.role === 'admin') && (
                        <div className="flex items-end">
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                            >
                                + Upload Material
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Materials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {materials.length === 0 ? (
                    <div className="col-span-full">
                        <EmptyState
                            icon="📚"
                            title="No study materials found"
                            description="Try adjusting your filters or check back later for new materials."
                        />
                    </div>
                ) : (
                    materials.map((material) => (
                        <div
                            key={material._id}
                            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{getFileIcon(material.fileType)}</span>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{material.title}</h3>
                                        <p className="text-xs text-gray-500">{material.subject} • {material.classGrade}</p>
                                    </div>
                                </div>
                            </div>
                            {material.description && (
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{material.description}</p>
                            )}
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                                <span>By: {material.uploadedBy?.name || 'Unknown'}</span>
                                <span>📥 {material.downloadCount} downloads</span>
                            </div>
                            <button
                                onClick={() => handleDownload(material)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleDownload(material);
                                    }
                                }}
                                className="w-full px-4 py-2 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                aria-label={`Download ${material.title}`}
                            >
                                Download / View
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Upload Modal - Simplified for now */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h2 className="text-xl font-bold mb-4">Upload Study Material</h2>
                        <p className="text-gray-600 mb-4">
                            File upload functionality requires backend file storage integration.
                            For now, you can add materials via the API.
                        </p>
                        <button
                            onClick={() => setShowUploadModal(false)}
                            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudyMaterials;

