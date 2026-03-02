/**
 * Clear all data from every collection. Models (schemas) and collections stay;
 * only documents are removed. Use: npm run seed (or create-admin) to add data again.
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const User = require('../models/User');
const TutorProfile = require('../models/TutorProfile');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const CurrentTutor = require('../models/CurrentTutor');
const Favorite = require('../models/Favorite');
const Attendance = require('../models/Attendance');
const ProgressReport = require('../models/ProgressReport');
const SessionFeedback = require('../models/SessionFeedback');
const LearningGoal = require('../models/LearningGoal');
const StudyMaterial = require('../models/StudyMaterial');
const Payment = require('../models/Payment');
const Escalation = require('../models/Escalation');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tutnet';

const models = [
    Attendance,
    ProgressReport,
    SessionFeedback,
    LearningGoal,
    StudyMaterial,
    Payment,
    Escalation,
    Notification,
    Message,
    Favorite,
    CurrentTutor,
    Booking,
    Review,
    TutorProfile,
    User
];

mongoose.connect(MONGODB_URI)
    .then(async () => {
        for (const model of models) {
            const name = model.modelName || model.collection?.name || 'unknown';
            const result = await model.deleteMany({});
            console.log(`Cleared ${name}: ${result.deletedCount} document(s)`);
        }
        console.log('All data cleared. Models and collections unchanged.');
    })
    .catch((err) => {
        console.error('Failed to reset data:', err.message);
        process.exit(1);
    })
    .finally(() => {
        mongoose.disconnect();
        process.exit(0);
    });
