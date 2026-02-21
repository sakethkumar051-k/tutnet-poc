const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: function () {
            return this.authProvider === 'local';
        },
        trim: true
    },
    password: {
        type: String,
        required: function () {
            return this.authProvider === 'local';
        }
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    role: {
        type: String,
        enum: ['student', 'tutor', 'admin'],
        default: 'student'
    },
    location: {
        city: {
            type: String,
            default: 'Hyderabad'
        },
        area: {
            type: String,
            // Optional in DB, enforced in CompleteProfile.jsx
            default: ''
        },
        pincode: {
            type: String,
            trim: true
        }
    },
    profilePicture: {
        type: String,
        default: ''
    },
    // Student specific fields
    classGrade: {
        type: String,
        // Optional in DB, enforced in CompleteProfile.jsx
        default: ''
    },
    // Demo tracking (for students)
    demosUsed: {
        type: Number,
        default: 0
    },
    demoLimit: {
        type: Number,
        default: 3 // Admin configurable
    },
    lastDemoDate: {
        type: Date
    },
    emergencyContact: {
        name: { type: String, default: '' },
        relationship: { type: String, default: '' },
        phone: { type: String, default: '' }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Hash password before saving (only for local auth)
userSchema.pre('save', async function (next) {
    // Skip password hashing for OAuth users
    if (this.authProvider !== 'local' || !this.password) {
        return next();
    }
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
