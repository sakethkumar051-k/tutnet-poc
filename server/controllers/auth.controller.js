const User = require('../models/User');
const TutorProfile = require('../models/TutorProfile');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, phone, password, role, location, adminSecret } = req.body;

        if (!name || !email || !password || !phone || !location || !location.area) {
            return res.status(400).json({ message: 'Please add all required fields' });
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

        // Create user
        const user = await User.create({
            name,
            email,
            phone,
            password,
            role,
            location
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

            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
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

        if (user && (await user.matchPassword(password))) {
            const token = generateToken(user._id);
            const fullUser = await User.findById(user._id).select('-password').lean();
            res.json({
                ...fullUser,
                _id: user.id,
                token,
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
        const user = await User.findById(req.user.id).select('-password').lean();
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

        const { name, role, phone, location, classGrade, emergencyContact, subjects, classes, hourlyRate, experienceYears, bio, mode, languages, availableSlots, education, qualifications } = req.body;

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

        // If user becomes a tutor, create/update profile with all details
        if (user.role === 'tutor') {
            console.log('Creating/updating tutor profile for user:', user._id);
            const profileExists = await TutorProfile.findOne({ userId: user._id });

            if (!profileExists) {
                // Create new tutor profile with all provided details
                // Initial profile creation does NOT require admin approval - just save it
                const newProfile = await TutorProfile.create({
                    userId: user._id,
                    subjects: subjects || [],
                    classes: classes || [],
                    hourlyRate: hourlyRate || 0,
                    experienceYears: experienceYears || 0,
                    bio: bio || '',
                    mode: mode || 'home',
                    languages: languages || [],
                    availableSlots: availableSlots || [],
                    education: education || {},
                    qualifications: qualifications || [],
                    approvalStatus: 'pending',
                    profileStatus: 'draft'
                });
                console.log('Tutor profile created successfully:', newProfile._id);
            } else {
                // Update existing profile with all provided details
                if (subjects) profileExists.subjects = subjects;
                if (classes) profileExists.classes = classes;
                if (hourlyRate !== undefined) profileExists.hourlyRate = hourlyRate;
                if (experienceYears !== undefined) profileExists.experienceYears = experienceYears;
                if (bio) profileExists.bio = bio;
                if (mode) profileExists.mode = mode;
                if (languages) profileExists.languages = languages;
                if (availableSlots) profileExists.availableSlots = availableSlots;
                if (education) profileExists.education = education;
                if (qualifications) profileExists.qualifications = qualifications;
                await profileExists.save();
                console.log('Tutor profile updated successfully:', profileExists._id);
            }
        }

        await user.save();

        // Generate NEW token with updated role
        const newToken = generateToken(user._id);

        const userObj = user.toObject ? user.toObject() : user;
        const { password: _p, ...safeUser } = userObj;
        res.json({
            ...safeUser,
            _id: user.id,
            token: newToken
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
    verifyAdminSecret,
    forgotPassword,
    resetPassword,
    updateProfile
};
