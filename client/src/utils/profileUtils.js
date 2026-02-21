import api from './api';

/**
 * Check if tutor profile is complete with all required fields for business development
 * @returns {Promise<{isComplete: boolean, missingFields: string[]}>}
 */
export const checkTutorProfileComplete = async () => {
    try {
        const { data } = await api.get('/tutors/profile/complete');
        // Ensure we always return a valid response
        return {
            isComplete: data?.isComplete || false,
            missingFields: data?.missingFields || [],
            profile: data?.profile || null
        };
    } catch (error) {
        // Handle any error gracefully - endpoint should now always return 200
        // But just in case, handle errors here too
        if (error.response?.status === 404 || error.response?.status === 500) {
            return { 
                isComplete: false, 
                missingFields: ['profile'], 
                profile: null,
                message: 'Profile check failed'
            };
        }
        console.error('Error checking profile completeness:', error);
        return { 
            isComplete: false, 
            missingFields: [],
            profile: null
        };
    }
};

/**
 * Check if user profile is complete (basic fields)
 * @param {Object} user - User object from AuthContext
 * @returns {boolean}
 */
export const isUserProfileComplete = (user) => {
    if (!user) return false;
    
    // Basic required fields
    const hasPhone = user.phone && user.phone.trim().length > 0;
    const hasLocation = user.location && user.location.area && user.location.area.trim().length > 0;
    
    return hasPhone && hasLocation;
};
