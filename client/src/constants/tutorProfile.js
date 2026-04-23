/**
 * Client-side mirror of server constants for fallback and types.
 * Prefer fetching from GET /api/tutors/profile/options when available.
 */

export const TEACHING_MODES = [
    { value: 'online', label: 'Online' },
    { value: 'home', label: 'Home Visit' },
    { value: 'both', label: 'Both' }
];

export const LANGUAGE_OPTIONS = [
    'English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Marathi',
    'Bengali', 'Gujarati', 'Urdu', 'French', 'Sanskrit', 'Spanish', 'Other'
];

export const TIMEZONE_OPTIONS = [
    { value: 'Asia/Kolkata', label: 'India — IST (Asia/Kolkata)' },
    { value: 'Asia/Dubai', label: 'UAE — GST' },
    { value: 'Asia/Singapore', label: 'Singapore' },
    { value: 'Europe/London', label: 'UK — London' },
    { value: 'America/New_York', label: 'US — Eastern' }
];

export const DEFAULT_OPTIONS = {
    languages: LANGUAGE_OPTIONS,
    subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi', 'Telugu', 'Social Studies', 'Computer Science', 'Economics', 'Accountancy', 'Business Studies', 'Sanskrit', 'French', 'EVS', 'General Knowledge', 'Reasoning', 'Other'],
    classes: ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'Undergraduate', 'Graduate', 'Competitive Exams'],
    strengthTags: ['Concept clarity', 'Exam preparation', 'Doubt solving', 'Board exams', 'JEE/NEET', 'Slow learners', 'Gifted students', 'Interactive teaching', 'Practice focus', 'Revision focus', 'Bilingual', 'Structured curriculum'],
    certifications: ['B.Ed', 'M.Ed', 'TET', 'CTET', 'NET', 'SET', 'PhD', 'Subject-specific degree', 'Teaching certification', 'Other'],
    noticePeriodOptions: [
        { value: 0, label: 'Immediate' },
        { value: 24, label: '24 hours' },
        { value: 48, label: '48 hours' },
        { value: 72, label: '72 hours' },
        { value: 168, label: '1 week' }
    ],
    daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    bioMinLength: 150
};

export const TIME_SLOTS = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];
