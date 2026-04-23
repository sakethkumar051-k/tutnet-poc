const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: {
        type: String,
        required: function () { return this.authProvider === 'local'; },
        trim: true
    },
    password: {
        type: String,
        required: function () { return this.authProvider === 'local'; }
    },
    googleId: { type: String, unique: true, sparse: true },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    role: { type: String, enum: ['student', 'tutor', 'admin'], default: 'student' },
    location: {
        city: { type: String, default: 'Hyderabad' },
        area: { type: String, default: '' },
        pincode: { type: String, trim: true }
    },
    profilePicture: { type: String, default: '' },
    classGrade: { type: String, default: '' },
    demosUsed: { type: Number, default: 0 },
    demoLimit: { type: Number, default: 3 },
    lastDemoDate: { type: Date },
    emergencyContact: {
        name: { type: String, default: '' },
        relationship: { type: String, default: '' },
        phone: { type: String, default: '' }
    },
    /** IANA timezone for scheduling & reminders (e.g. Asia/Kolkata) */
    timezone: { type: String, default: 'Asia/Kolkata', trim: true },
    /** Updated on authenticated API activity (throttled in middleware) */
    lastSeenAt: { type: Date },
    /** Linked parent account for minor verification flows */
    parentUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    preferences: {
        reminderChannels: {
            type: [String],
            default: () => ['email'],
            validate: {
                validator(arr) {
                    const ok = new Set(['email', 'sms', 'push']);
                    return !arr || arr.every((c) => ok.has(c));
                },
                message: 'Invalid reminder channel'
            }
        },
        reminderLeadTimes: {
            type: [String],
            default: () => ['24h', '1h'],
            validate: {
                validator(arr) {
                    const ok = new Set(['24h', '1h']);
                    return !arr || arr.every((c) => ok.has(c));
                },
                message: 'Invalid reminder lead time'
            }
        }
    },
    deviceTokens: [{
        token: { type: String, required: true, trim: true },
        platform: { type: String, trim: true, default: '' },
        createdAt: { type: Date, default: Date.now }
    }],
    isActive: { type: Boolean, default: true },
    /**
     * In-app notification category toggles. Checked by createNotification() before insert.
     * Every user gets all-on by default except marketing — that's opt-in.
     */
    notificationPreferences: {
        session:   { type: Boolean, default: true },
        payment:   { type: Boolean, default: true },
        review:    { type: Boolean, default: true },
        message:   { type: Boolean, default: true },
        admin:     { type: Boolean, default: true },
        system:    { type: Boolean, default: true },
        marketing: { type: Boolean, default: false }
    },
    /** Admin-only CS notes — internal support context, not visible to user. */
    adminNotes: [{
        note: { type: String, required: true, trim: true, maxlength: 2000 },
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        adminName: { type: String, default: '' },
        at: { type: Date, default: Date.now }
    }],
    /** Reason on last suspension, cleared on reactivation. */
    suspensionReason: { type: String, default: '' },
    suspendedAt: { type: Date },

    /** Public referral code — generated lazily on first request. Share to earn credit. */
    referralCode: { type: String, unique: true, sparse: true, index: true },
    /** The user who referred this account (set on register via `ref=<code>`). */
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    /** Whether the referral reward has been paid out for this user's first session. */
    referralRewarded: { type: Boolean, default: false },

    /** Parent-of linkage — list of child User ids (for multi-child households). */
    children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, {
    timestamps: true,
    toJSON: {
        transform(_doc, ret) {
            delete ret.password;
            return ret;
        }
    },
    toObject: {
        transform(_doc, ret) {
            delete ret.password;
            return ret;
        }
    }
});

userSchema.pre('save', async function (next) {
    if (this.authProvider !== 'local' || !this.password) return next();
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.index({ role: 1, isActive: 1 });

module.exports = mongoose.model('User', userSchema);
