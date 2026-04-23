const User = require('../models/User');
const TutorProfile = require('../models/TutorProfile');
const bcrypt = require('bcryptjs');
const { validateStructuredFields } = require('../services/profileCompletion.service');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwtTokens');
const { setRefreshTokenCookie, clearRefreshTokenCookie } = require('../utils/authCookies');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, phone, password, role, location, adminSecret, timezone, referralCode } = req.body;

        if (!name || !email || !password || !phone || !location || !location.area) {
            return res.status(400).json({ message: 'Please add all required fields' });
        }

        if (!role || !['student', 'tutor', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Please choose account type: student or tutor.' });
        }

        // Prevent admin registration without secret
        if (role === 'admin') {
            console.log('Admin registration attempt');
            console.log('Provided secret:', adminSecret);
            console.log('Expected secret:', process.env.ADMIN_SECRET);
            console.log('Secrets match:', adminSecret === process.env.ADMIN_SECRET);

            if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
                return res.status(403).json({ message: 'Invalid admin credentials' });
            }
        }

        // Check if user exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Resolve referral code to attributing user (optional)
        let referredBy = null;
        if (referralCode && typeof referralCode === 'string') {
            const code = referralCode.trim().toUpperCase();
            if (code) {
                const referrer = await User.findOne({ referralCode: code }).select('_id').lean();
                if (referrer) referredBy = referrer._id;
            }
        }

        // Create user
        const user = await User.create({
            name,
            email,
            phone,
            password,
            role,
            location,
            ...(referredBy ? { referredBy } : {}),
            ...(timezone && typeof timezone === 'string' && timezone.trim()
                ? { timezone: timezone.trim() }
                : {})
        });

        if (user) {
            // If tutor, create profile
            if (user.role === 'tutor') {
                await TutorProfile.create({
                    userId: user._id,
                    hourlyRate: 0,
                    approvalStatus: 'pending',
                    profileStatus: 'draft'
                });
            }

            const access = generateAccessToken(user._id);
            const refresh = generateRefreshToken(user._id);
            setRefreshTokenCookie(res, refresh);

            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: access,
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check for user email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // OAuth users have no password — tell them to use Google Sign-In
        if (user.authProvider === 'google') {
            return res.status(400).json({
                message: 'This account uses Google Sign-In. Please click "Continue with Google" to log in.',
                code: 'OAUTH_ACCOUNT'
            });
        }

        if (await user.matchPassword(password)) {
            const access = generateAccessToken(user._id);
            const refresh = generateRefreshToken(user._id);
            setRefreshTokenCookie(res, refresh);
            const fullUser = await User.findById(user._id).select('-password').lean();
            res.json({
                ...fullUser,
                _id: user.id,
                token: access,
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password')
            .populate('parentUserId', 'name email role')
            .lean();
        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Verify admin secret
// @route   POST /api/auth/verify-admin
// @access  Private (Admin only)
const verifyAdminSecret = async (req, res) => {
    try {
        const { adminSecret } = req.body;

        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (adminSecret === process.env.ADMIN_SECRET) {
            return res.json({ verified: true });
        }

        res.status(401).json({ verified: false, message: 'Invalid admin secret' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const { email, phone } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify phone number matches
        if (user.phone !== phone) {
            return res.status(400).json({ message: 'Phone number does not match our records' });
        }

        // Generate reset token (simple version - in production use crypto)
        const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
        await user.save();

        res.json({
            message: 'Password reset verified',
            resetToken,
            userId: user._id
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const { resetToken, userId, newPassword } = req.body;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if token is valid and not expired
        if (user.resetPasswordToken !== resetToken) {
            return res.status(400).json({ message: 'Invalid reset token' });
        }

        if (user.resetPasswordExpire < Date.now()) {
            return res.status(400).json({ message: 'Reset token has expired' });
        }

        // Update password
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update user profile (onboarding)
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const {
            name, role, phone, location, classGrade, emergencyContact, subjects, classes, hourlyRate, experienceYears, bio, mode, languages, availableSlots, education, qualifications,
            timezone, preferences, parentUserId, registerDeviceToken, strengthTags, travelRadius
        } = req.body;

        // Update fields if provided (allow clearing optional fields with empty string)
        if (name !== undefined && name !== null) user.name = String(name).trim() || user.name;
        if (role) user.role = role;
        if (phone !== undefined) user.phone = phone;
        if (classGrade !== undefined) user.classGrade = classGrade;
        if (emergencyContact !== undefined) {
            user.emergencyContact = {
                name: emergencyContact.name || '',
                relationship: emergencyContact.relationship || '',
                phone: emergencyContact.phone || ''
            };
            user.markModified('emergencyContact');
        }

        if (location) {
            if (!user.location) user.location = { city: 'Hyderabad', area: '', pincode: '' };
            if (location.area !== undefined) user.location.area = location.area;
            if (location.city !== undefined) user.location.city = location.city;
            if (location.pincode !== undefined) user.location.pincode = location.pincode;
            user.markModified('location');
        }

        if (timezone !== undefined && timezone !== null) {
            const tz = String(timezone).trim();
            if (tz) user.timezone = tz;
        }

        if (preferences !== undefined && typeof preferences === 'object' && preferences !== null) {
            if (!user.preferences) user.preferences = {};
            if (Array.isArray(preferences.reminderChannels)) {
                user.preferences.reminderChannels = preferences.reminderChannels;
            }
            if (Array.isArray(preferences.reminderLeadTimes)) {
                user.preferences.reminderLeadTimes = preferences.reminderLeadTimes;
            }
            user.markModified('preferences');
        }

        if (parentUserId !== undefined && parentUserId !== null && parentUserId !== '') {
            if (String(parentUserId) === String(user._id)) {
                return res.status(400).json({ message: 'parentUserId cannot be the same as the user' });
            }
            const parent = await User.findById(parentUserId).select('_id');
            if (!parent) {
                return res.status(400).json({ message: 'Linked parent account not found' });
            }
            user.parentUserId = parentUserId;
        }

        if (registerDeviceToken && typeof registerDeviceToken === 'object' && registerDeviceToken.token) {
            const tok = String(registerDeviceToken.token).trim();
            if (tok) {
                const exists = (user.deviceTokens || []).some((t) => t.token === tok);
                if (!exists) {
                    if (!user.deviceTokens) user.deviceTokens = [];
                    user.deviceTokens.push({
                        token: tok,
                        platform: registerDeviceToken.platform ? String(registerDeviceToken.platform).trim() : '',
                        createdAt: new Date()
                    });
                    if (user.deviceTokens.length > 15) {
                        user.deviceTokens = user.deviceTokens.slice(-15);
                    }
                    user.markModified('deviceTokens');
                }
            }
        }

        // If user becomes a tutor, create/update profile with all details
        if (user.role === 'tutor') {
            console.log('Creating/updating tutor profile for user:', user._id);
            const profileExists = await TutorProfile.findOne({ userId: user._id });

            const normArr = (v) => (Array.isArray(v) ? v : (v ? [v] : []));
            const structTouched = [
                subjects, classes, qualifications, strengthTags
            ].some((x) => x !== undefined);

            const mergedForValidation = profileExists
                ? {
                    ...profileExists.toObject(),
                    ...(subjects !== undefined ? { subjects: normArr(subjects) } : {}),
                    ...(classes !== undefined ? { classes: normArr(classes) } : {}),
                    ...(qualifications !== undefined ? { qualifications: normArr(qualifications) } : {}),
                    ...(strengthTags !== undefined ? { strengthTags: normArr(strengthTags) } : {})
                }
                : {
                    subjects: normArr(subjects),
                    classes: normArr(classes),
                    qualifications: normArr(qualifications),
                    strengthTags: normArr(strengthTags)
                };

            if (structTouched) {
                const structErrors = validateStructuredFields(mergedForValidation);
                if (structErrors.length > 0) {
                    return res.status(400).json({
                        message: structErrors[0].message,
                        code: 'VALIDATION_ERROR',
                        errors: structErrors
                    });
                }
            }

            if (!profileExists) {
                // Create new tutor profile with all provided details
                // Initial profile creation does NOT require admin approval - just save it
                const newProfile = await TutorProfile.create({
                    userId: user._id,
                    subjects: subjects !== undefined ? normArr(subjects) : [],
                    classes: classes !== undefined ? normArr(classes) : [],
                    hourlyRate: hourlyRate !== undefined && hourlyRate !== '' ? Number(hourlyRate) : 0,
                    experienceYears: experienceYears !== undefined && experienceYears !== '' ? Number(experienceYears) : 0,
                    bio: bio || '',
                    mode: mode || 'home',
                    languages: languages !== undefined ? normArr(languages) : [],
                    availableSlots: availableSlots || [],
                    education: education || {},
                    qualifications: qualifications !== undefined ? normArr(qualifications) : [],
                    strengthTags: strengthTags !== undefined ? normArr(strengthTags) : [],
                    travelRadius: travelRadius === '' || travelRadius === undefined ? undefined : Number(travelRadius),
                    approvalStatus: 'pending',
                    profileStatus: 'draft'
                });
                console.log('Tutor profile created successfully:', newProfile._id);
            } else {
                // Update existing profile with all provided details
                if (subjects !== undefined) profileExists.subjects = normArr(subjects);
                if (classes !== undefined) profileExists.classes = normArr(classes);
                if (hourlyRate !== undefined) profileExists.hourlyRate = Number(hourlyRate);
                if (experienceYears !== undefined) profileExists.experienceYears = Number(experienceYears);
                if (bio !== undefined) profileExists.bio = bio;
                if (mode) profileExists.mode = mode;
                if (languages !== undefined) profileExists.languages = normArr(languages);
                if (availableSlots) profileExists.availableSlots = availableSlots;
                if (education) profileExists.education = education;
                if (qualifications !== undefined) profileExists.qualifications = normArr(qualifications);
                if (strengthTags !== undefined) profileExists.strengthTags = normArr(strengthTags);
                if (travelRadius !== undefined) {
                    profileExists.travelRadius = travelRadius === '' ? undefined : Number(travelRadius);
                }
                await profileExists.save();
                console.log('Tutor profile updated successfully:', profileExists._id);
            }
        }

        await user.save();

        const newAccess = generateAccessToken(user._id);
        const newRefresh = generateRefreshToken(user._id);
        setRefreshTokenCookie(res, newRefresh);

        const userObj = user.toObject ? user.toObject() : user;
        const { password: _p, ...safeUser } = userObj;
        res.json({
            ...safeUser,
            _id: user.id,
            token: newAccess
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Rotate access token using HttpOnly refresh cookie
// @route   POST /api/auth/refresh
// @access  Public (cookie)
const refreshAccessToken = async (req, res) => {
    try {
        const rt = req.cookies?.refreshToken;
        if (!rt) {
            return res.status(401).json({ message: 'No refresh session', code: 'NO_REFRESH' });
        }
        let decoded;
        try {
            decoded = verifyRefreshToken(rt);
        } catch {
            clearRefreshTokenCookie(res);
            return res.status(401).json({ message: 'Invalid or expired refresh token', code: 'REFRESH_INVALID' });
        }

        const user = await User.findById(decoded.id).select('-password');
        if (!user || user.isActive === false) {
            clearRefreshTokenCookie(res);
            return res.status(401).json({ message: 'User not found or inactive', code: 'AUTH_INVALID' });
        }

        const access = generateAccessToken(user._id);
        const refresh = generateRefreshToken(user._id);
        setRefreshTokenCookie(res, refresh);

        res.json({ token: access });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Clear refresh cookie (client drops access token in sessionStorage)
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = async (req, res) => {
    clearRefreshTokenCookie(res);
    res.json({ success: true });
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
    verifyAdminSecret,
    forgotPassword,
    resetPassword,
    updateProfile,
    refreshAccessToken,
    logoutUser
};
