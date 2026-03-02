const { SUBJECTS, CLASSES_GRADES, STRENGTH_TAGS, CERTIFICATIONS, BIO_MIN_LENGTH } = require('../constants/tutorProfile.constants');

/**
 * Compute profile completion score (0-100) and list of missing/invalid fields.
 * Used for validation and review step.
 */
function computeProfileCompletion(profile, user) {
    const errors = [];
    let score = 0;
    const weights = {
        basic: 20,
        teaching: 25,
        availability: 20,
        professional: 25,
        review: 10
    };

    // Basic info (phone, area, pincode, mode, travelRadius if home/both)
    const hasPhone = user?.phone && String(user.phone).trim().length > 0;
    const hasArea = user?.location?.area && String(user.location.area).trim().length > 0;
    const hasPincode = user?.location?.pincode && String(user.location.pincode).trim().length > 0;
    const hasMode = !!profile?.mode;
    const needsTravelRadius = profile?.mode === 'home' || profile?.mode === 'both';
    const hasTravelRadius = !needsTravelRadius || (profile?.travelRadius != null && profile.travelRadius >= 0);

    if (hasPhone) score += weights.basic * 0.25;
    else errors.push({ step: 1, field: 'phone', message: 'Phone is required' });
    if (hasArea) score += weights.basic * 0.25;
    else errors.push({ step: 1, field: 'area', message: 'Area is required' });
    if (hasPincode) score += weights.basic * 0.2;
    else errors.push({ step: 1, field: 'pincode', message: 'Pincode is required' });
    if (hasMode) score += weights.basic * 0.15;
    if (hasTravelRadius) score += weights.basic * 0.15;
    else if (needsTravelRadius) errors.push({ step: 1, field: 'travelRadius', message: 'Travel radius required for home visit' });

    // Teaching details
    const hasSubjects = profile?.subjects?.length > 0;
    const hasClasses = profile?.classes?.length > 0;
    const hasExperience = profile?.experienceYears != null && profile.experienceYears >= 0;
    const hasHourlyRate = profile?.hourlyRate != null && profile.hourlyRate > 0;

    if (hasSubjects) score += weights.teaching * 0.3;
    else errors.push({ step: 2, field: 'subjects', message: 'Select at least one subject' });
    if (hasClasses) score += weights.teaching * 0.3;
    else errors.push({ step: 2, field: 'classes', message: 'Select at least one class/grade' });
    if (hasExperience) score += weights.teaching * 0.2;
    else errors.push({ step: 2, field: 'experienceYears', message: 'Years of experience is required' });
    if (hasHourlyRate) score += weights.teaching * 0.2;
    else errors.push({ step: 2, field: 'hourlyRate', message: 'Hourly rate is required' });

    // Availability
    if (profile?.availabilityMode === 'fixed') {
        const hasSlots = profile?.weeklyAvailability?.some(d => d.slots?.length > 0);
        if (hasSlots) score += weights.availability;
        else errors.push({ step: 3, field: 'weeklyAvailability', message: 'Add at least one weekly slot' });
    } else {
        const hasNotice = profile?.noticePeriodHours != null;
        const hasMaxSessions = profile?.maxSessionsPerDay != null && profile.maxSessionsPerDay >= 1;
        if (hasNotice) score += weights.availability * 0.5;
        else errors.push({ step: 3, field: 'noticePeriodHours', message: 'Notice period is required' });
        if (hasMaxSessions) score += weights.availability * 0.5;
        else errors.push({ step: 3, field: 'maxSessionsPerDay', message: 'Max sessions per day is required' });
    }

    // Professional info
    const hasDegree = profile?.education?.degree?.trim?.();
    const hasInstitution = profile?.education?.institution?.trim?.();
    const hasYear = profile?.education?.year?.trim?.();
    const hasBio = profile?.bio?.trim && profile.bio.trim().length >= BIO_MIN_LENGTH;
    const hasStrengthTags = profile?.strengthTags?.length > 0;

    if (hasDegree) score += weights.professional * 0.2;
    else errors.push({ step: 4, field: 'degree', message: 'Degree is required' });
    if (hasInstitution) score += weights.professional * 0.2;
    else errors.push({ step: 4, field: 'institution', message: 'Institution is required' });
    if (hasYear) score += weights.professional * 0.15;
    else errors.push({ step: 4, field: 'year', message: 'Year is required' });
    if (profile?.qualifications?.length > 0) score += weights.professional * 0.15;
    if (hasStrengthTags) score += weights.professional * 0.15;
    else errors.push({ step: 4, field: 'strengthTags', message: 'Select at least one teaching strength' });
    if (hasBio) score += weights.professional * 0.15;
    else errors.push({ step: 4, field: 'bio', message: `Bio must be at least ${BIO_MIN_LENGTH} characters` });

    // Review step: no extra fields, just readiness
    score += weights.review;

    const completionScore = Math.min(100, Math.round(score));
    return { completionScore, errors, isValid: errors.length === 0 };
}

/**
 * Validate subject/class values against predefined lists (backend enforcement).
 */
function validateStructuredFields(profile) {
    const { SUBJECTS: allowedSubjects, CLASSES_GRADES: allowedClasses, STRENGTH_TAGS: allowedStrengths, CERTIFICATIONS: allowedCerts } = require('../constants/tutorProfile.constants');
    const err = [];

    if (profile.subjects?.length) {
        const invalid = profile.subjects.filter(s => !allowedSubjects.includes(s));
        if (invalid.length) err.push({ field: 'subjects', message: `Invalid subjects: ${invalid.join(', ')}` });
    }
    if (profile.classes?.length) {
        const invalid = profile.classes.filter(c => !allowedClasses.includes(c));
        if (invalid.length) err.push({ field: 'classes', message: `Invalid classes: ${invalid.join(', ')}` });
    }
    if (profile.strengthTags?.length) {
        const invalid = profile.strengthTags.filter(t => !allowedStrengths.includes(t));
        if (invalid.length) err.push({ field: 'strengthTags', message: `Invalid strength tags: ${invalid.join(', ')}` });
    }
    if (profile.qualifications?.length) {
        const invalid = profile.qualifications.filter(q => !allowedCerts.includes(q));
        if (invalid.length) err.push({ field: 'qualifications', message: `Invalid certifications: ${invalid.join(', ')}` });
    }
    return err;
}

module.exports = {
    computeProfileCompletion,
    validateStructuredFields
};
