import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { Link } from 'react-router-dom';
import LoadingSkeleton from './LoadingSkeleton';
import EmptyState from './EmptyState';

const FavoriteTutors = () => {
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showSuccess, showError } = useToast();

    useEffect(() => {
        fetchFavorites();
    }, []);

    const fetchFavorites = async () => {
        try {
            const { data } = await api.get('/favorites');
            setFavorites(data);
        } catch (err) {
            showError('Failed to fetch favorite tutors');
        } finally {
            setLoading(false);
        }
    };

    const removeFavorite = async (tutorId) => {
        try {
            await api.delete(`/favorites/${tutorId}`);
            setFavorites(favorites.filter(f => f.tutorId._id !== tutorId));
            showSuccess('Removed from favorites');
        } catch (err) {
            showError('Failed to remove favorite');
        }
    };

    if (loading) {
        return <LoadingSkeleton type="card" count={3} />;
    }

    return (
        <div className="space-y-4">
            {favorites.length === 0 ? (
                <EmptyState
                    icon="⭐"
                    title="No favorite tutors yet"
                    description="Start adding tutors to your favorites! Click the star icon on any tutor card."
                    actionLabel="Find Tutors"
                    onAction={() => window.location.href = '/find-tutors'}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {favorites.map((favorite) => {
                        const tutor = favorite.tutorId;
                        const profile = favorite.tutorProfile;
                        return (
                            <div
                                key={favorite._id}
                                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-navy-950">{tutor.name}</h3>
                                        <p className="text-sm text-gray-500">{tutor.email}</p>
                                        {tutor.location && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                📍 {tutor.location.area}, {tutor.location.city}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => removeFavorite(tutor._id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                removeFavorite(tutor._id);
                                            }
                                        }}
                                        className="text-red-500 hover:text-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1"
                                        title="Remove from favorites"
                                        aria-label="Remove from favorites"
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                                {profile && (
                                    <div className="space-y-2 mb-3">
                                        {profile.subjects && profile.subjects.length > 0 && (
                                            <div>
                                                <p className="text-xs text-gray-500">Subjects:</p>
                                                <p className="text-sm text-gray-700">{profile.subjects.join(', ')}</p>
                                            </div>
                                        )}
                                        {profile.hourlyRate > 0 && (
                                            <p className="text-sm text-gray-700">
                                                💰 ₹{profile.hourlyRate}/hr
                                            </p>
                                        )}
                                    </div>
                                )}
                                <Link
                                    to={`/tutor/${profile._id}`}
                                    className="block w-full text-center px-4 py-2 bg-royal/5 text-royal rounded-md hover:bg-royal/10 transition-colors text-sm font-medium"
                                >
                                    View Profile
                                </Link>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default FavoriteTutors;

