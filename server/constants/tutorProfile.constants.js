/**
 * Predefined options for tutor profile. No comma-separated free text for structured data.
 */

const TEACHING_MODES = ['online', 'home', 'both'];

const SUBJECTS = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
    'Hindi', 'Telugu', 'Social Studies', 'Computer Science', 'Economics',
    'Accountancy', 'Business Studies', 'Sanskrit', 'French', 'EVS',
    'General Knowledge', 'Reasoning', 'Other'
];

const CLASSES_GRADES = [
    'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
    'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10',
    'Class 11', 'Class 12', 'Undergraduate', 'Graduate', 'Competitive Exams'
];

const STRENGTH_TAGS = [
    'Concept clarity', 'Exam preparation', 'Doubt solving', 'Board exams',
    'JEE/NEET', 'Slow learners', 'Gifted students', 'Interactive teaching',
    'Practice focus', 'Revision focus', 'Bilingual', 'Structured curriculum'
];

const CERTIFICATIONS = [
    'B.Ed', 'M.Ed', 'TET', 'CTET', 'NET', 'SET', 'PhD',
    'Subject-specific degree', 'Teaching certification', 'Other'
];

const NOTICE_PERIOD_OPTIONS = [
    { value: 0, label: 'Immediate' },
    { value: 24, label: '24 hours' },
    { value: 48, label: '48 hours' },
    { value: 72, label: '72 hours' },
    { value: 168, label: '1 week' }
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Languages tutors can teach in — shown on profile and search filters */
const LANGUAGES_TEACHING = [
    'English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Marathi',
    'Bengali', 'Gujarati', 'Urdu', 'French', 'Sanskrit', 'Spanish', 'Other'
];

const BIO_MIN_LENGTH = 150;

module.exports = {
    TEACHING_MODES,
    SUBJECTS,
    CLASSES_GRADES,
    STRENGTH_TAGS,
    CERTIFICATIONS,
    NOTICE_PERIOD_OPTIONS,
    DAYS_OF_WEEK,
    LANGUAGES_TEACHING,
    BIO_MIN_LENGTH
};
