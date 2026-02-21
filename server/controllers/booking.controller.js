const Booking = require('../models/Booking');
const TutorProfile = require('../models/TutorProfile');
const User = require('../models/User');
const CurrentTutor = require('../models/CurrentTutor');
const { createNotification } = require('../utils/notificationHelper');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Check if a date/time falls within tutor's weeklyAvailability or availableSlots */
function isWithinTutorAvailability(tutorProfile, dateTime) {
    const d = new Date(dateTime);
    const dayName = DAY_NAMES[d.getDay()];
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

    const wa = tutorProfile.weeklyAvailability || [];
    if (wa.length > 0) {
        const daySlot = wa.find((x) => x.day === dayName);
        if (!daySlot || !daySlot.slots || daySlot.slots.length === 0) return false;
        for (const slot of daySlot.slots) {
            const start = (slot.start || '').substring(0, 5);
            const end = (slot.end || '').substring(0, 5);
            if (start && end && timeStr >= start && timeStr < end) return true;
        }
        return false;
    }

    const legacy = tutorProfile.availableSlots || [];
    const dayAbbr = dayName.substring(0, 3);
    for (const s of legacy) {
        if (typeof s !== 'string') continue;
        if (!s.toLowerCase().includes(dayAbbr.toLowerCase())) continue;
        const range = s.match(/(\d{1,2})\s*-\s*(\d{1,2})/);
        if (range) {
            const hour = d.getHours();
            const startH = parseInt(range[1], 10);
            const endH = parseInt(range[2], 10);
            if (hour >= startH && hour < endH) return true;
        }
    }
    return false;
}

// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Private (Student or Tutor)
const createBooking = async (req, res) => {
    try {
        // DEBUG LOGGING
        console.log('=== BOOKING REQUEST RECEIVED ===');
        console.log('User:', req.user);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        console.log('Headers:', req.headers.authorization);

        const {
            tutorId, studentId, subject, preferredSchedule, sessionDate, currentTutorId, bookingCategory, bookingType,
            preferredStartDate, subjects, frequency, durationCommitment, learningGoals, studyGoals, currentLevel, focusAreas, additionalNotes, termsAccepted
        } = req.body;

        // CRITICAL: Check if user is authenticated
        if (!req.user || !req.user.id) {
            console.log('ERROR: No user found in request');
            return res.status(401).json({ message: 'Authentication required. Please log in.' });
        }

        // Handle legacy bookingType → bookingCategory mapping
        let finalCategory = bookingCategory;
        if (!finalCategory && bookingType) {
            finalCategory = bookingType === 'demo' ? 'trial' : 'session';
        }
        if (!finalCategory) {
            finalCategory = 'session'; // Default
        }

        let finalTutorId, finalStudentId;

        // Determine tutor and student IDs based on user role
        if (req.user.role === 'student') {
            // Student booking a tutor
            finalStudentId = req.user.id;
            finalTutorId = tutorId;

            if (!finalTutorId) {
                return res.status(400).json({ message: 'Tutor ID is required' });
            }

            // Check if tutor exists
            const tutor = await User.findById(finalTutorId);
            if (!tutor || tutor.role !== 'tutor') {
                return res.status(404).json({ message: 'Tutor not found' });
            }

            // Check if tutor has a profile (relaxed check - don't require approval status)
            const tutorProfile = await TutorProfile.findOne({ userId: finalTutorId });
            if (!tutorProfile) {
                return res.status(400).json({ message: 'Tutor profile not found. Please contact the tutor to set up their profile.' });
            }

            // Optional: Warn if tutor is not approved, but allow booking
            if (tutorProfile.approvalStatus !== 'approved') {
                console.log(`Warning: Booking created for tutor ${finalTutorId} with approval status: ${tutorProfile.approvalStatus}`);
            }

            // TRIAL-SPECIFIC VALIDATION
            if (finalCategory === 'trial') {
                // Check active trial limit (max 2-3)
                const activeTrialCount = await Booking.countActiveTrials(finalStudentId);
                const maxActiveTrials = 3; // Configurable

                if (activeTrialCount >= maxActiveTrials) {
                    return res.status(400).json({
                        message: `You already have ${activeTrialCount} active trial bookings. Please complete or cancel existing trials before requesting more.`,
                        code: 'MAX_TRIALS_EXCEEDED'
                    });
                }

                // Check if student can request trial with this tutor (max 2 per tutor rule)
                const canRequest = await Booking.canRequestTrial(finalStudentId, finalTutorId);
                if (!canRequest) {
                    return res.status(400).json({
                        message: 'You already have 2 trial bookings with this tutor. Book a regular session instead!',
                        code: 'TRIAL_LIMIT_REACHED'
                    });
                }
            }

        } else if (req.user.role === 'tutor') {
            // Tutor booking for a student (must be a current student)
            finalTutorId = req.user.id;
            finalStudentId = studentId;

            if (!finalStudentId) {
                return res.status(400).json({ message: 'Student ID is required' });
            }

            // Verify this is a current student
            if (currentTutorId) {
                const currentTutor = await CurrentTutor.findById(currentTutorId);
                if (!currentTutor || currentTutor.tutorId.toString() !== finalTutorId ||
                    currentTutor.studentId.toString() !== finalStudentId) {
                    return res.status(403).json({ message: 'Not authorized to book for this student' });
                }
            } else {
                // Check if there's an active relationship
                const currentTutor = await CurrentTutor.findOne({
                    tutorId: finalTutorId,
                    studentId: finalStudentId,
                    isActive: true
                });
                if (!currentTutor) {
                    return res.status(403).json({ message: 'No active relationship with this student' });
                }
            }

            // Check if student exists
            const student = await User.findById(finalStudentId);
            if (!student || student.role !== 'student') {
                return res.status(404).json({ message: 'Student not found' });
            }
        } else {
            return res.status(403).json({ message: 'Only students and tutors can create bookings' });
        }

        // Parse session date
        let parsedSessionDate = null;
        if (sessionDate) {
            parsedSessionDate = new Date(sessionDate);
        } else if (preferredSchedule) {
            try {
                const dateMatch = preferredSchedule.match(/\d{4}-\d{2}-\d{2}/);
                if (dateMatch) {
                    parsedSessionDate = new Date(dateMatch[0]);
                }
            } catch (e) {
                // If parsing fails, leave as null
            }
        }

        // Block booking for past/completed dates (frontend + backend)
        if (parsedSessionDate && parsedSessionDate < new Date()) {
            return res.status(400).json({
                message: 'Cannot book a session in the past. Please choose a future date and time.',
                code: 'PAST_DATE'
            });
        }

        // Student booking: only allow within tutor-defined availability (for session/trial with a date)
        if (req.user.role === 'student' && (finalCategory === 'session' || finalCategory === 'trial') && parsedSessionDate) {
            const tutorProfile = await TutorProfile.findOne({ userId: finalTutorId });
            if (tutorProfile && !isWithinTutorAvailability(tutorProfile, parsedSessionDate)) {
                return res.status(400).json({
                    message: 'The selected date/time is not within the tutor\'s availability. Please choose a slot from their available times.',
                    code: 'OUTSIDE_AVAILABILITY'
                });
            }
        }

        // Calculate trial expiry (48 hours for pending trials)
        let trialExpiresAt = null;
        if (finalCategory === 'trial') {
            trialExpiresAt = new Date();
            trialExpiresAt.setHours(trialExpiresAt.getHours() + 48);
        }

        // Permanent engagement: require preferredStartDate (future), terms accepted
        if (finalCategory === 'permanent') {
            const startDate = preferredStartDate ? new Date(preferredStartDate) : null;
            if (!startDate || startDate < new Date()) {
                return res.status(400).json({
                    message: 'Please provide a valid preferred start date in the future for permanent engagement.',
                    code: 'INVALID_START_DATE'
                });
            }
            if (termsAccepted !== true) {
                return res.status(400).json({
                    message: 'You must accept the Terms & Conditions for permanent engagement.',
                    code: 'TERMS_NOT_ACCEPTED'
                });
            }
        }

        // IMPORTANT: Only find/create CurrentTutor relationship for REGULAR sessions, NOT trials or permanent
        let currentTutor = null;
        if (finalCategory === 'session') {
            if (currentTutorId) {
                currentTutor = await CurrentTutor.findById(currentTutorId);
            } else {
                currentTutor = await CurrentTutor.findOne({
                    studentId: finalStudentId,
                    tutorId: finalTutorId,
                    subject: subject,
                    isActive: true
                });
            }
        }

        const subjectVal = subject || (currentTutor ? currentTutor.subject : 'General');
        const bookingPayload = {
            studentId: finalStudentId,
            tutorId: finalTutorId,
            subject: Array.isArray(subjects) && subjects.length > 0 ? subjects[0] : subjectVal,
            preferredSchedule: preferredSchedule || (parsedSessionDate ? parsedSessionDate.toISOString() : ''),
            sessionDate: finalCategory === 'permanent' ? null : parsedSessionDate,
            status: req.user.role === 'tutor' && finalCategory !== 'permanent' ? 'approved' : 'pending',
            currentTutorId: currentTutor?._id,
            bookingCategory: finalCategory,
            trialExpiresAt: trialExpiresAt,
            bookingType: finalCategory === 'trial' ? 'demo' : finalCategory === 'permanent' ? 'regular' : 'regular'
        };
        if (finalCategory === 'permanent') {
            bookingPayload.preferredStartDate = new Date(preferredStartDate);
            if (Array.isArray(subjects) && subjects.length > 0) bookingPayload.subjects = subjects;
            if (frequency) bookingPayload.frequency = frequency;
            if (durationCommitment) bookingPayload.durationCommitment = durationCommitment;
            if (learningGoals) bookingPayload.learningGoals = learningGoals;
            if (studyGoals) bookingPayload.studyGoals = studyGoals;
            if (currentLevel) bookingPayload.currentLevel = currentLevel;
            if (focusAreas) bookingPayload.focusAreas = focusAreas;
            if (additionalNotes) bookingPayload.additionalNotes = additionalNotes;
            bookingPayload.termsAccepted = termsAccepted === true;
        }
        const booking = await Booking.create(bookingPayload);

        // If tutor created booking AND it's a regular session, update relationship stats
        if (req.user.role === 'tutor' && currentTutor && finalCategory === 'session') {
            currentTutor.totalSessionsBooked += 1;
            if (currentTutor.status === 'new') {
                currentTutor.status = 'active';
            }
            await currentTutor.save();
        }

        const populatedBooking = await Booking.findById(booking._id)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email');

        // Send notification to tutor (only if student created the booking)
        if (req.user.role === 'student') {
            const notificationType = finalCategory === 'trial' ? 'new_trial_request' : finalCategory === 'permanent' ? 'new_booking_request' : 'new_booking_request';
            const notificationTitle = finalCategory === 'trial' ? 'New Trial Request!' : finalCategory === 'permanent' ? 'New Permanent Engagement Request!' : 'New Booking Request';
            const notificationMessage = finalCategory === 'trial'
                ? `${populatedBooking.studentId.name} requested a free demo class for ${subjectVal}`
                : finalCategory === 'permanent'
                ? `${populatedBooking.studentId.name} requested permanent engagement for ${(subjects && subjects[0]) || subjectVal}`
                : `${populatedBooking.studentId.name} requested a session for ${subjectVal}`;

            await createNotification({
                userId: finalTutorId,
                type: notificationType,
                title: notificationTitle,
                message: notificationMessage,
                link: '/tutor-dashboard?tab=sessions',
                bookingId: booking._id
            });

            // Parent P0: Notify student/parent when demo is requested (confirmation)
            if (finalCategory === 'trial') {
                const tutorName = populatedBooking.tutorId?.name || 'your tutor';
                const scheduleText = preferredSchedule || (sessionDate ? new Date(sessionDate).toLocaleString() : '');
                await createNotification({
                    userId: finalStudentId,
                    type: 'demo_booking_created',
                    title: 'Demo request sent',
                    message: `Your free demo request with ${tutorName} for ${subject} has been sent.${scheduleText ? ` Requested: ${scheduleText}` : ''} We'll notify you when the tutor responds.`,
                    link: '/student-dashboard?tab=sessions',
                    bookingId: booking._id
                });
            }
        }

        res.status(201).json(populatedBooking);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get my bookings
// @route   GET /api/bookings/mine
// @access  Private
const getMyBookings = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'student') {
            query.studentId = req.user.id;
        } else if (req.user.role === 'tutor') {
            query.tutorId = req.user.id;
        } else {
            return res.status(400).json({ message: 'Invalid role for this route' });
        }

        const bookings = await Booking.find(query)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email')
            .sort({ createdAt: -1 });

        res.json(bookings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get centralized requests (for Student: demo, permanent, reschedule; for Tutor: session, demo, permanent)
// @route   GET /api/bookings/requests
// @access  Private
const getBookingRequests = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        let query = {};
        if (role === 'student') query.studentId = userId;
        else if (role === 'tutor') query.tutorId = userId;
        else return res.status(400).json({ message: 'Invalid role' });

        const bookings = await Booking.find(query)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email')
            .sort({ createdAt: -1 });

        const demoRequests = bookings.filter((b) => b.bookingCategory === 'trial' && b.status === 'pending');
        const permanentRequests = bookings.filter((b) => b.bookingCategory === 'permanent' && b.status === 'pending');
        const sessionRequests = bookings.filter((b) => b.bookingCategory === 'session' && b.status === 'pending');
        const rescheduleRequests = bookings.filter(
            (b) => b.status === 'approved' && b.tutorChangeRequest?.status === 'pending'
        );
        const studentRescheduleRequests = bookings.filter(
            (b) => b.status === 'approved' && b.rescheduleRequest?.status === 'pending'
        );

        if (role === 'student') {
            return res.json({
                demoRequests,
                permanentRequests,
                rescheduleRequests: rescheduleRequests,
                allPending: [...demoRequests, ...permanentRequests, ...rescheduleRequests]
            });
        }
        res.json({
            sessionRequests,
            demoRequests,
            permanentRequests,
            allPending: [...sessionRequests, ...demoRequests, ...permanentRequests]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Cancel a booking
// @route   PATCH /api/bookings/:id/cancel
// @access  Private (Student)
const cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Ensure user owns the booking
        if (booking.studentId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (booking.status === 'completed' || booking.status === 'rejected') {
            return res.status(400).json({ message: 'Cannot cancel completed or rejected booking' });
        }

        booking.status = 'cancelled';
        booking.attendanceStatus = 'cancelled';
        await booking.save();

        // Update CurrentTutor stats if relationship exists
        if (booking.currentTutorId) {
            const currentTutor = await CurrentTutor.findById(booking.currentTutorId);
            if (currentTutor) {
                currentTutor.sessionsCancelled += 1;
                await currentTutor.save();
            }
        }

        res.json({ message: 'Booking cancelled', booking });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Approve a booking (Tutor)
// @route   PATCH /api/bookings/:id/approve
// @access  Private (Tutor)
const approveBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Ensure tutor owns the booking
        if (booking.tutorId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (booking.status !== 'pending') {
            return res.status(400).json({ message: 'Only pending bookings can be approved' });
        }

        booking.status = 'approved';
        // Keep attendanceStatus as 'pending' - will be updated when session starts

        // Parse session date if not set
        if (!booking.sessionDate) {
            try {
                const dateMatch = booking.preferredSchedule.match(/\d{4}-\d{2}-\d{2}/);
                if (dateMatch) {
                    booking.sessionDate = new Date(dateMatch[0]);
                }
            } catch (e) {
                // If parsing fails, use current date
                booking.sessionDate = new Date();
            }
        }

        await booking.save();

        // CRITICAL: Only create CurrentTutor relationship for REGULAR bookings, NOT trials
        // Handle legacy bookings without bookingCategory
        const isTrialBooking = booking.bookingCategory === 'trial' || booking.bookingType === 'demo';

        let currentTutor = null;
        if (!isTrialBooking) {
            // Create or update CurrentTutor relationship for regular bookings only
            const tutorProfile = await TutorProfile.findOne({ userId: booking.tutorId });
            currentTutor = await CurrentTutor.findOne({
                studentId: booking.studentId,
                tutorId: booking.tutorId,
                subject: booking.subject,
                isActive: true
            });

            if (!currentTutor) {
                // Create new relationship
                currentTutor = await CurrentTutor.create({
                    studentId: booking.studentId,
                    tutorId: booking.tutorId,
                    subject: booking.subject,
                    classGrade: tutorProfile?.classes?.[0] || '',
                    relationshipStartDate: new Date(),
                    status: 'new',
                    totalSessionsBooked: 1,
                    isActive: true
                });
            } else {
                // Update existing relationship
                currentTutor.totalSessionsBooked += 1;
                if (currentTutor.status === 'new' && currentTutor.totalSessionsBooked > 0) {
                    currentTutor.status = 'active';
                }
                await currentTutor.save();
            }

            // Link booking to current tutor
            booking.currentTutorId = currentTutor._id;
            await booking.save();
        }
        // For trials: currentTutor remains null, no permanent relationship created

        const populatedBooking = await Booking.findById(booking._id)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email');

        // Send notification to student
        const notificationType = booking.bookingCategory === 'trial' ? 'demo_accepted' : 'booking_approved';
        const notificationTitle = booking.bookingCategory === 'trial' ? 'Demo Class Approved!' : 'Booking Approved!';
        const notificationMessage = booking.bookingCategory === 'trial'
            ? `Your demo class with ${populatedBooking.tutorId.name} for ${booking.subject} has been approved`
            : `Your booking with ${populatedBooking.tutorId.name} for ${booking.subject} has been approved`;

        await createNotification({
            userId: booking.studentId,
            type: notificationType,
            title: notificationTitle,
            message: notificationMessage,
            link: '/student-dashboard?tab=sessions',
            bookingId: booking._id
        });

        res.json({ message: 'Booking approved', booking: populatedBooking });
    } catch (error) {
        console.error('Error in approveBooking:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Reject a booking (Tutor)
// @route   PATCH /api/bookings/:id/reject
// @access  Private (Tutor)
const rejectBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Ensure tutor owns the booking
        if (booking.tutorId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (booking.status !== 'pending') {
            return res.status(400).json({ message: 'Only pending bookings can be rejected' });
        }

        booking.status = 'rejected';
        await booking.save();

        // Populate for notification
        const populatedBooking = await Booking.findById(booking._id)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email');

        // Send notification to student with appropriate type
        const notificationType = booking.bookingCategory === 'trial' ? 'demo_rejected' : 'booking_rejected';
        const notificationTitle = booking.bookingCategory === 'trial' ? 'Demo Request Declined' : 'Booking Update';
        const notificationMessage = booking.bookingCategory === 'trial'
            ? `Your demo request with ${populatedBooking.tutorId.name} was declined. Try another tutor?`
            : `Your booking request with ${populatedBooking.tutorId.name} was declined. Try another time slot?`;

        await createNotification({
            userId: booking.studentId,
            type: notificationType,
            title: notificationTitle,
            message: notificationMessage,
            link: '/find-tutors',
            bookingId: booking._id
        });

        res.json({ message: 'Booking rejected', booking: populatedBooking });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Complete a booking (Tutor)
// @route   PATCH /api/bookings/:id/complete
// @access  Private (Tutor)
const completeBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Ensure tutor owns the booking
        if (booking.tutorId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (booking.status !== 'approved' && booking.status !== 'scheduled') {
            return res.status(400).json({ message: 'Only approved or scheduled bookings can be marked as completed' });
        }

        booking.status = 'completed';
        // AttendanceStatus should already be 'present' or 'absent' - don't change it
        await booking.save();

        // Update CurrentTutor stats
        if (booking.currentTutorId) {
            const currentTutor = await CurrentTutor.findById(booking.currentTutorId);
            if (currentTutor) {
                currentTutor.sessionsCompleted += 1;
                // Update status based on completion
                if (currentTutor.sessionsCompleted >= 10 && currentTutor.sessionsCompleted < 20) {
                    currentTutor.status = 'near_completion';
                }
                await currentTutor.save();
            }
        }

        // Send notification to student
        const populatedBooking = await Booking.findById(booking._id)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email');

        await createNotification({
            userId: booking.studentId,
            type: 'session_completed',
            title: 'Session Completed',
            message: `Your session with ${populatedBooking.tutorId.name} for ${booking.subject} has been marked as completed.`,
            link: '/student-dashboard?tab=sessions',
            bookingId: booking._id
        });

        res.json({ message: 'Booking marked as completed', booking });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get trial status between student and tutor
// @route   GET /api/bookings/trial-status/:tutorId
// @access  Private (Student)
const getTrialStatus = async (req, res) => {
    try {
        const { tutorId } = req.params;
        const studentId = req.user.id;

        // Find any trial bookings between this student and tutor
        const trials = await Booking.find({
            studentId,
            tutorId,
            bookingCategory: 'trial'
        }).sort({ createdAt: -1 });

        if (trials.length === 0) {
            return res.json({
                status: null,
                count: 0,
                hasTriedTutor: false
            });
        }

        const latestTrial = trials[0];

        return res.json({
            status: latestTrial.status,
            count: trials.length,
            maxReached: trials.length >= 2,
            hasTriedTutor: true,
            latestTrial: {
                _id: latestTrial._id,
                status: latestTrial.status,
                subject: latestTrial.subject,
                preferredSchedule: latestTrial.preferredSchedule,
                createdAt: latestTrial.createdAt
            }
        });
    } catch (error) {
        console.error('Error fetching trial status:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Request a reschedule (student)
// @route   PATCH /api/bookings/:id/reschedule-request
// @access  Private (Student)
const requestReschedule = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (booking.studentId.toString() !== req.user.id)
            return res.status(403).json({ message: 'Not authorized' });
        if (!['pending', 'approved'].includes(booking.status))
            return res.status(400).json({ message: 'Cannot reschedule this booking' });

        const { proposedDate, proposedSchedule, reason } = req.body;
        if (!proposedSchedule && !proposedDate)
            return res.status(400).json({ message: 'Proposed date/schedule is required' });

        booking.rescheduleRequest = {
            requestedBy: req.user._id,
            proposedDate: proposedDate ? new Date(proposedDate) : null,
            proposedSchedule: proposedSchedule || '',
            reason: reason || '',
            status: 'pending',
            requestedAt: new Date()
        };
        await booking.save();

        const populated = await Booking.findById(booking._id)
            .populate('studentId', 'name')
            .populate('tutorId', 'name');

        await createNotification({
            userId: booking.tutorId,
            type: 'reschedule_request',
            title: 'Reschedule Requested',
            message: `${populated.studentId.name} wants to reschedule the ${booking.subject} session${reason ? ': ' + reason : ''}`,
            link: '/tutor-dashboard?tab=sessions',
            bookingId: booking._id
        });

        res.json({ message: 'Reschedule request sent', booking });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Respond to reschedule request (tutor approves/declines)
// @route   PATCH /api/bookings/:id/reschedule-respond
// @access  Private (Tutor)
const respondReschedule = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (booking.tutorId.toString() !== req.user.id)
            return res.status(403).json({ message: 'Not authorized' });
        if (!booking.rescheduleRequest || booking.rescheduleRequest.status !== 'pending')
            return res.status(400).json({ message: 'No pending reschedule request' });

        const { action } = req.body; // 'approve' | 'decline'
        if (!['approve', 'decline'].includes(action))
            return res.status(400).json({ message: 'action must be approve or decline' });

        booking.rescheduleRequest.status = action === 'approve' ? 'approved' : 'declined';

        if (action === 'approve') {
            if (booking.rescheduleRequest.proposedDate)
                booking.sessionDate = booking.rescheduleRequest.proposedDate;
            if (booking.rescheduleRequest.proposedSchedule)
                booking.preferredSchedule = booking.rescheduleRequest.proposedSchedule;
        }
        await booking.save();

        const populated = await Booking.findById(booking._id)
            .populate('studentId', 'name')
            .populate('tutorId', 'name');

        await createNotification({
            userId: booking.studentId,
            type: action === 'approve' ? 'reschedule_approved' : 'reschedule_declined',
            title: action === 'approve' ? 'Reschedule Approved' : 'Reschedule Declined',
            message: action === 'approve'
                ? `Your reschedule for the ${booking.subject} session with ${populated.tutorId.name} was approved`
                : `Your reschedule request for the ${booking.subject} session was declined`,
            link: '/student-dashboard?tab=sessions',
            bookingId: booking._id
        });

        res.json({ message: `Reschedule ${action}d`, booking });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc  Tutor proposes a schedule/subject change → notifies student
// @route PATCH /api/bookings/:id/tutor-change-request
// @access Private (Tutor)
const tutorRequestChange = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (booking.tutorId.toString() !== req.user.id)
            return res.status(403).json({ message: 'Not authorized' });
        if (!['approved', 'pending'].includes(booking.status))
            return res.status(400).json({ message: 'Cannot request change for this booking' });

        const { type = 'reschedule', proposedDate, proposedSchedule, proposedSubject, reason } = req.body;
        if (!reason?.trim()) return res.status(400).json({ message: 'Reason is required' });

        booking.tutorChangeRequest = {
            type,
            proposedDate: proposedDate ? new Date(proposedDate) : null,
            proposedSchedule: proposedSchedule || '',
            proposedSubject: proposedSubject || '',
            reason,
            status: 'pending',
            requestedAt: new Date()
        };
        await booking.save();

        const populated = await Booking.findById(booking._id)
            .populate('studentId', 'name')
            .populate('tutorId', 'name');

        await createNotification({
            userId: booking.studentId,
            type: 'tutor_change_request',
            title: 'Tutor Requested a Change',
            message: `${populated.tutorId.name} is requesting a ${type === 'subject' ? 'subject change' : 'schedule change'} for your ${booking.subject} session. Reason: ${reason}`,
            link: '/student-dashboard?tab=sessions',
            bookingId: booking._id
        });

        res.json({ message: 'Change request sent to student', booking });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc  Student/parent approves or declines tutor's change request
// @route PATCH /api/bookings/:id/tutor-change-respond
// @access Private (Student)
const respondTutorChange = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (booking.studentId.toString() !== req.user.id)
            return res.status(403).json({ message: 'Not authorized' });
        if (!booking.tutorChangeRequest || booking.tutorChangeRequest.status !== 'pending')
            return res.status(400).json({ message: 'No pending change request' });

        const { action } = req.body;
        if (!['approve', 'decline'].includes(action))
            return res.status(400).json({ message: 'action must be approve or decline' });

        booking.tutorChangeRequest.status = action === 'approve' ? 'approved' : 'declined';

        if (action === 'approve') {
            const tcr = booking.tutorChangeRequest;
            if (tcr.proposedSchedule) booking.preferredSchedule = tcr.proposedSchedule;
            if (tcr.proposedDate) booking.sessionDate = tcr.proposedDate;
            if (tcr.proposedSubject) booking.subject = tcr.proposedSubject;
        }
        await booking.save();

        const populated = await Booking.findById(booking._id)
            .populate('studentId', 'name')
            .populate('tutorId', 'name');

        await createNotification({
            userId: booking.tutorId,
            type: action === 'approve' ? 'change_request_approved' : 'change_request_declined',
            title: action === 'approve' ? 'Change Request Approved' : 'Change Request Declined',
            message: action === 'approve'
                ? `${populated.studentId.name} approved your change request for the ${booking.subject} session`
                : `${populated.studentId.name} declined your change request for the ${booking.subject} session`,
            link: '/tutor-dashboard?tab=sessions',
            bookingId: booking._id
        });

        res.json({ message: `Change request ${action}d`, booking });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    createBooking,
    getMyBookings,
    getBookingRequests,
    cancelBooking,
    approveBooking,
    rejectBooking,
    completeBooking,
    getTrialStatus,
    requestReschedule,
    respondReschedule,
    tutorRequestChange,
    respondTutorChange
};
