/**
 * Clear all documents from every collection — keeps schemas, indexes, and
 * collections in place. Use before seeding a fresh demo dataset.
 *
 *   npm run reset-db
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Core
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

// Newer: payouts, incentives, contact, off-platform reports (inline model), cron locks
const PayoutLedger = require('../models/PayoutLedger');
const IncentiveLedger = require('../models/IncentiveLedger');
const ContactMessage = require('../models/ContactMessage');
// OffPlatformReport model is declared inside its controller — trigger the registration
require('../controllers/offPlatformReport.controller');
const OffPlatformReport = mongoose.models.OffPlatformReport;
// CronLocks model is declared inside the lock helper
require('../jobs/distributedLock');
const CronLock = mongoose.models.CronLock;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tutnet';

const models = [
    Attendance, ProgressReport, SessionFeedback, LearningGoal, StudyMaterial,
    Payment, Escalation, Notification, Message, Favorite, CurrentTutor,
    Booking, Review, TutorProfile,
    PayoutLedger, IncentiveLedger, ContactMessage, OffPlatformReport, CronLock,
    User
].filter(Boolean);

(async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
        let total = 0;
        for (const model of models) {
            const name = model.modelName || model.collection?.name || 'unknown';
            const { deletedCount } = await model.deleteMany({});
            total += deletedCount || 0;
            console.log(`  ✓ ${name.padEnd(24)} ${deletedCount} doc(s)`);
        }
        console.log(`\nDone. ${total} document(s) removed across ${models.length} collection(s).`);
    } catch (err) {
        console.error('Failed to reset data:', err);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        process.exit(process.exitCode || 0);
    }
})();
