const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const TutorProfile = require('../models/TutorProfile');
const Booking = require('../models/Booking');
const Review = require('../models/Review');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

const seedData = async () => {
    try {
        // Clear existing data
        await User.deleteMany({});
        await TutorProfile.deleteMany({});
        await Booking.deleteMany({});
        await Review.deleteMany({});

        console.log('Data Cleared');

        // Create Admin
        const admin = await User.create({
            name: 'Admin User',
            email: 'admin@example.com',
            phone: '9999999999',
            password: 'password123',
            role: 'admin',
            location: { area: 'West Hyderabad' }
        });

        console.log('Admin Created');

        // Create Students
        const student1 = await User.create({
            name: 'Student One',
            email: 'student1@example.com',
            phone: '8888888881',
            password: 'password123',
            role: 'student',
            location: { area: 'Miyapur' }
        });

        const student2 = await User.create({
            name: 'Student Two',
            email: 'student2@example.com',
            phone: '8888888882',
            password: 'password123',
            role: 'student',
            location: { area: 'Kukatpally' }
        });

        console.log('Students Created');

        // Create Tutors
        const tutor1 = await User.create({
            name: 'Tutor Math',
            email: 'tutor1@example.com',
            phone: '7777777771',
            password: 'password123',
            role: 'tutor',
            location: { area: 'Miyapur' }
        });

        const tutorProfile1 = await TutorProfile.create({
            userId: tutor1._id,
            subjects: ['Maths', 'Physics'],
            classes: ['10th', 'Intermediate'],
            hourlyRate: 500,
            experienceYears: 5,
            bio: 'Experienced Math tutor with 5 years of teaching.',
            availableSlots: ['Mon 10-12', 'Wed 14-16'],
            approvalStatus: 'approved',
            averageRating: 4.5,
            totalReviews: 2
        });

        const tutor2 = await User.create({
            name: 'Tutor English',
            email: 'tutor2@example.com',
            phone: '7777777772',
            password: 'password123',
            role: 'tutor',
            location: { area: 'Kukatpally' }
        });

        const tutorProfile2 = await TutorProfile.create({
            userId: tutor2._id,
            subjects: ['English'],
            classes: ['8th', '9th'],
            hourlyRate: 400,
            experienceYears: 3,
            bio: 'Passionate English teacher.',
            availableSlots: ['Tue 10-12', 'Thu 14-16'],
            approvalStatus: 'pending'
        });

        console.log('Tutors Created');

        // Create Bookings
        await Booking.create({
            studentId: student1._id,
            tutorId: tutor1._id,
            subject: 'Maths',
            preferredSchedule: 'Mon 10-12',
            status: 'completed'
        });

        await Booking.create({
            studentId: student2._id,
            tutorId: tutor1._id,
            subject: 'Physics',
            preferredSchedule: 'Wed 14-16',
            status: 'pending'
        });

        console.log('Bookings Created');

        // Create Reviews
        // Note: In a real app, we'd link this to the completed booking above
        // For seeding, we'll just create a dummy review linked to the completed booking if we had its ID easily
        // But let's just create a review for tutor1 from student1 without strict booking link for simplicity in seed
        // actually, let's do it right
        const completedBooking = await Booking.findOne({ status: 'completed' });

        await Review.create({
            bookingId: completedBooking._id,
            studentId: student1._id,
            tutorId: tutor1._id,
            rating: 5,
            comment: 'Great tutor!'
        });

        // Update tutor stats manually for seed
        // (In app, controller handles this)

        console.log('Reviews Created');

        console.log('Seeding Complete');
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedData();
