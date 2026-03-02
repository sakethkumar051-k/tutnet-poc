/**
 * Create a single admin user so you can access the admin dashboard.
 * Does NOT wipe any existing data. Run from server folder: node scripts/create-admin.js
 *
 * Default admin: admin@example.com / password123
 * Override with env: ADMIN_EMAIL, ADMIN_PASSWORD
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin User';

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => {
        console.error('MongoDB connection failed:', err.message);
        process.exit(1);
    });

async function createAdmin() {
    try {
        const existing = await User.findOne({ email: ADMIN_EMAIL });
        if (existing) {
            if (existing.role === 'admin') {
                console.log('Admin already exists:', ADMIN_EMAIL);
                console.log('You can log in with this email and your existing password.');
            } else {
                existing.role = 'admin';
                await existing.save();
                console.log('Updated user to admin:', ADMIN_EMAIL);
            }
        } else {
            await User.create({
                name: ADMIN_NAME,
                email: ADMIN_EMAIL,
                phone: '9999999999',
                password: ADMIN_PASSWORD,
                role: 'admin',
                authProvider: 'local',
                location: { city: 'Hyderabad', area: 'Admin' }
            });
            console.log('Admin created successfully.');
            console.log('Email:', ADMIN_EMAIL);
            console.log('Password:', ADMIN_PASSWORD);
        }
        console.log('\nYou can now log in and go to the Admin dashboard.');
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

createAdmin();
