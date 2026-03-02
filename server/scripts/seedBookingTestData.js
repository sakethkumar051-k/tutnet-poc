/**
 * TUTNET – Booking system test seed.
 * Clears only booking-related collections and test users, then creates 3 tutors + 5 students.
 * Run: node scripts/seedBookingTestData.js (from server directory, with .env loaded)
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const TutorProfile = require('../models/TutorProfile');
const Booking = require('../models/Booking');
const Attendance = require('../models/Attendance');
const CurrentTutor = require('../models/CurrentTutor');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tutnet';

const TEST_EMAILS = {
    tutors: [
        'bookingtest-tutor1@test.local',
        'bookingtest-tutor2@test.local',
        'bookingtest-tutor3@test.local'
    ],
    students: [
        'bookingtest-student1@test.local',
        'bookingtest-student2@test.local',
        'bookingtest-student3@test.local',
        'bookingtest-student4@test.local',
        'bookingtest-student5@test.local'
    ]
};

const PASSWORD = 'TestPass123!';

async function run() {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected');

    const testEmails = [...TEST_EMAILS.tutors, ...TEST_EMAILS.students];

    const existingUsers = await User.find({ email: { $in: testEmails } }).select('_id');
    const existingIds = existingUsers.map((u) => u._id);

    await Attendance.deleteMany({});
    await CurrentTutor.deleteMany({});
    await Booking.deleteMany({});
    if (existingIds.length > 0) {
        await TutorProfile.deleteMany({ userId: { $in: existingIds } });
    }
    await User.deleteMany({ email: { $in: testEmails } });

    console.log('Cleared: Attendance, CurrentTutor, Booking, TutorProfiles (test users only), Users (test only)');

    const students = [];
    for (let i = 0; i < 5; i++) {
        const u = await User.create({
            name: `Test Student ${i + 1}`,
            email: TEST_EMAILS.students[i],
            phone: `900000000${i + 1}`,
            password: PASSWORD,
            role: 'student',
            location: { city: 'Hyderabad', area: 'Test Area' }
        });
        students.push(u);
    }

    const tutor1 = await User.create({
        name: 'Test Tutor 1 (Fixed)',
        email: TEST_EMAILS.tutors[0],
        phone: '9000010001',
        password: PASSWORD,
        role: 'tutor',
        location: { city: 'Hyderabad', area: 'Test Area' }
    });

    await TutorProfile.create({
        userId: tutor1._id,
        subjects: ['Maths', 'Physics'],
        classes: ['10th'],
        hourlyRate: 500,
        experienceYears: 3,
        bio: 'Tutor 1 fixed availability',
        approvalStatus: 'approved',
        availabilityMode: 'fixed',
        weeklyAvailability: [
            { day: 'Monday', slots: [{ start: '16:00', end: '17:00' }] },
            { day: 'Wednesday', slots: [{ start: '14:00', end: '16:00' }] }
        ]
    });

    const tutor2 = await User.create({
        name: 'Test Tutor 2 (Flexible)',
        email: TEST_EMAILS.tutors[1],
        phone: '9000010002',
        password: PASSWORD,
        role: 'tutor',
        location: { city: 'Hyderabad', area: 'Test Area' }
    });

    await TutorProfile.create({
        userId: tutor2._id,
        subjects: ['Chemistry'],
        classes: ['9th', '10th'],
        hourlyRate: 400,
        experienceYears: 2,
        bio: 'Tutor 2 flexible availability',
        approvalStatus: 'approved',
        availabilityMode: 'flexible'
    });

    const tutor3 = await User.create({
        name: 'Test Tutor 3 (Fixed Limited)',
        email: TEST_EMAILS.tutors[2],
        phone: '9000010003',
        password: PASSWORD,
        role: 'tutor',
        location: { city: 'Hyderabad', area: 'Test Area' }
    });

    await TutorProfile.create({
        userId: tutor3._id,
        subjects: ['Biology'],
        classes: ['10th'],
        hourlyRate: 450,
        experienceYears: 1,
        bio: 'Tutor 3 limited fixed slots',
        approvalStatus: 'approved',
        availabilityMode: 'fixed',
        weeklyAvailability: [
            { day: 'Friday', slots: [{ start: '10:00', end: '11:00' }] }
        ]
    });

    const tutors = [tutor1, tutor2, tutor3];

    console.log('\n========== BOOKING TEST SEED – CREDENTIALS ==========');
    console.log('Password for all: ' + PASSWORD);
    console.log('\nTutors:');
    tutors.forEach((t, i) => {
        console.log(`  Tutor ${i + 1}: ${t.email}  (ID: ${t._id})  [${i === 0 ? 'fixed' : i === 1 ? 'flexible' : 'fixed limited'}]`);
    });
    console.log('\nStudents:');
    students.forEach((s, i) => {
        console.log(`  Student ${i + 1}: ${s.email}  (ID: ${s._id})`);
    });
    console.log('====================================================\n');

    await mongoose.disconnect();
    process.exit(0);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
