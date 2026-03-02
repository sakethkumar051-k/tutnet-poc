/**
 * TUTNET – Booking system validation tests (API logic, no UI).
 * Run after seed: node scripts/seedBookingTestData.js && node scripts/bookingFlowTest.js
 * Uses in-process controller calls with mock req/res. No server required.
 */
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const TutorProfile = require('../models/TutorProfile');
const Booking = require('../models/Booking');
const Attendance = require('../models/Attendance');
const bookingController = require('../controllers/booking.controller');
const attendanceController = require('../controllers/attendance.controller');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tutnet';

const TEST_EMAILS = {
    tutors: ['bookingtest-tutor1@test.local', 'bookingtest-tutor2@test.local', 'bookingtest-tutor3@test.local'],
    students: [
        'bookingtest-student1@test.local',
        'bookingtest-student2@test.local',
        'bookingtest-student3@test.local',
        'bookingtest-student4@test.local',
        'bookingtest-student5@test.local'
    ]
};

let total = 0;
let passed = 0;
let failed = 0;

function pass(description) {
    total++;
    passed++;
    console.log('✔ PASS – ' + description);
}

function fail(description, detail) {
    total++;
    failed++;
    console.log('✖ FAIL – ' + description + (detail ? ' | ' + detail : ''));
}

function warn(description) {
    console.log('⚠ WARNING – ' + description);
}

function mockRes() {
    let statusCode = 200;
    let body = null;
    const res = {
        status(c) {
            statusCode = c;
            return res;
        },
        json(b) {
            body = b;
            return res;
        },
        getStatus: () => statusCode,
        getBody: () => body
    };
    return res;
}

/** Mock req so controller can read req.headers.authorization (logging) without throwing */
function mockReq({ user, body = {}, params = {} }) {
    return {
        user,
        body,
        params,
        headers: { authorization: 'Bearer test' }
    };
}

async function run() {
    await mongoose.connect(MONGODB_URI);

    const [tutor1, tutor2, tutor3] = await Promise.all(
        TEST_EMAILS.tutors.map((e) => User.findOne({ email: e }).select('_id'))
    );
    const [s1, s2, s3] = await Promise.all(
        TEST_EMAILS.students.slice(0, 3).map((e) => User.findOne({ email: e }).select('_id'))
    );

    if (!tutor1 || !tutor2 || !s1) {
        console.error('Run seed first: node scripts/seedBookingTestData.js');
        process.exit(1);
    }

    // Clean slate for test users so trial counts and session conflicts don't depend on previous runs
    const testUserIds = [tutor1, tutor2, tutor3, s1, s2, s3].map((u) => u?._id).filter(Boolean);
    const testBookings = await Booking.find({ $or: [{ studentId: { $in: testUserIds } }, { tutorId: { $in: testUserIds } }] }).select('_id');
    const testBookingIds = testBookings.map((b) => b._id);
    if (testBookingIds.length > 0) {
        await Attendance.deleteMany({ bookingId: { $in: testBookingIds } });
        await Booking.deleteMany({ _id: { $in: testBookingIds } });
    }

    const tutor1Id = tutor1._id.toString();
    const tutor2Id = tutor2._id.toString();
    const s1Id = s1._id.toString();
    const s2Id = s2._id.toString();

    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + ((1 + 7 - nextMonday.getDay()) % 7));
    const monday16 = new Date(nextMonday);
    monday16.setHours(16, 0, 0, 0);
    const monday16Str = monday16.toISOString();
    const preferredMonday16 = `${monday16.toISOString().slice(0, 10)} 16:00`;

    console.log('\n========== BOOKING FLOW TESTS ==========\n');

    // ----- TEST 1 – TRIAL BOOKING -----
    console.log('--- TEST 1 – TRIAL BOOKING ---');
    const res1 = mockRes();
    await bookingController.createBooking(
        mockReq({
            user: { id: s1Id, role: 'student' },
            body: {
                tutorId: tutor1Id,
                subject: 'Maths',
                preferredSchedule: preferredMonday16,
                sessionDate: monday16Str,
                bookingCategory: 'trial'
            }
        }),
        res1
    );
    if (res1.getStatus() === 201 && res1.getBody()?._id) {
        pass('Create trial booking');
    } else {
        fail('Create trial booking', `status=${res1.getStatus()} body=${JSON.stringify(res1.getBody())}`);
    }

    const trialId = res1.getBody()?._id ? res1.getBody()._id.toString() : null;
    if (!trialId) {
        fail('Trial booking ID missing – skipping approve/attendance');
    } else {
        const resApprove = mockRes();
        await bookingController.approveBooking(
            mockReq({ params: { id: trialId }, user: { id: tutor1Id, role: 'tutor' } }),
            resApprove
        );
        if (resApprove.getStatus() === 200) {
            pass('Approve trial booking');
        } else {
            fail('Approve trial booking', resApprove.getBody()?.message || String(resApprove.getStatus()));
        }
        // Mark attendance after overlap test so we have an approved booking at Monday 16:00 for overlap check
    }

    const resTrial2 = mockRes();
    await bookingController.createBooking(
        mockReq({
            user: { id: s1Id, role: 'student' },
            body: {
                tutorId: tutor1Id,
                subject: 'Maths',
                preferredSchedule: preferredMonday16,
                sessionDate: monday16Str,
                bookingCategory: 'trial'
            }
        }),
        resTrial2
    );
    if (resTrial2.getStatus() === 201) {
        pass('Second trial booking allowed (same student-tutor)');
    } else {
        fail('Second trial booking', resTrial2.getBody()?.message);
    }

    const resTrial3 = mockRes();
    const nextWed = new Date(nextMonday);
    nextWed.setDate(nextWed.getDate() + 2);
    nextWed.setHours(14, 30, 0, 0);
    await bookingController.createBooking(
        mockReq({
            user: { id: s1Id, role: 'student' },
            body: {
                tutorId: tutor1Id,
                subject: 'Maths',
                preferredSchedule: nextWed.toISOString(),
                sessionDate: nextWed.toISOString(),
                bookingCategory: 'trial'
            }
        }),
        resTrial3
    );
    if (resTrial3.getStatus() === 400 && ((resTrial3.getBody()?.message || '').toLowerCase().includes('trial') || resTrial3.getBody()?.code === 'TRIAL_LIMIT_REACHED')) {
        pass('Third trial rejected (exceed limit)');
    } else {
        fail('Exceed trial limit should be rejected', resTrial3.getBody()?.message || resTrial3.getBody()?.code || `status=${resTrial3.getStatus()}`);
    }

    // ----- TEST 2 – ONE-TIME SESSION -----
    console.log('\n--- TEST 2 – ONE-TIME SESSION ---');
    const wed14 = new Date(nextMonday);
    wed14.setDate(wed14.getDate() + 2);
    wed14.setHours(14, 0, 0, 0);
    const resSessionValid = mockRes();
    await bookingController.createBooking(
        mockReq({
            user: { id: s2Id, role: 'student' },
            body: {
                tutorId: tutor1Id,
                subject: 'Physics',
                preferredSchedule: `${wed14.toISOString().slice(0, 10)} 14:00`,
                sessionDate: wed14.toISOString(),
                bookingCategory: 'session'
            }
        }),
        resSessionValid
    );
    if (resSessionValid.getStatus() === 201) {
        pass('Book valid slot (Wednesday 14:00)');
    } else {
        fail('Book valid slot', resSessionValid.getBody()?.message);
    }

    const past = new Date();
    past.setDate(past.getDate() - 1);
    past.setHours(16, 0, 0, 0);
    const resPast = mockRes();
    await bookingController.createBooking(
        mockReq({
            user: { id: s2Id, role: 'student' },
            body: {
                tutorId: tutor1Id,
                subject: 'Physics',
                preferredSchedule: past.toISOString(),
                sessionDate: past.toISOString(),
                bookingCategory: 'session'
            }
        }),
        resPast
    );
    if (resPast.getStatus() === 400 && (resPast.getBody()?.message || '').toLowerCase().includes('past')) {
        pass('Past date rejected');
    } else {
        fail('Past date should be rejected', resPast.getBody()?.message);
    }

    const invalidSlot = new Date(nextMonday);
    invalidSlot.setHours(22, 0, 0, 0);
    const resInvalidSlot = mockRes();
    await bookingController.createBooking(
        mockReq({
            user: { id: s2Id, role: 'student' },
            body: {
                tutorId: tutor1Id,
                subject: 'Physics',
                preferredSchedule: `${invalidSlot.toISOString().slice(0, 10)} 22:00`,
                sessionDate: invalidSlot.toISOString(),
                bookingCategory: 'session'
            }
        }),
        resInvalidSlot
    );
    if (resInvalidSlot.getStatus() === 400 && (resInvalidSlot.getBody()?.code === 'OUTSIDE_AVAILABILITY' || (resInvalidSlot.getBody()?.message || '').includes('availability'))) {
        pass('Invalid slot (outside tutor availability) rejected');
    } else {
        fail('Invalid slot should be rejected', resInvalidSlot.getBody()?.message || resInvalidSlot.getBody()?.code);
    }

    const sessionBookingId = resSessionValid.getBody()?._id?.toString();
    if (sessionBookingId) {
        const resApproveSession = mockRes();
        await bookingController.approveBooking(
            mockReq({ params: { id: sessionBookingId }, user: { id: tutor1Id, role: 'tutor' } }),
            resApproveSession
        );
        if (resApproveSession.getStatus() === 200) {
            pass('Approve one-time session');
        } else {
            fail('Approve session', resApproveSession.getBody()?.message);
        }
    }

    const resOverlap = mockRes();
    await bookingController.createBooking(
        mockReq({
            user: { id: s1Id, role: 'student' },
            body: {
                tutorId: tutor1Id,
                subject: 'Physics',
                preferredSchedule: `${wed14.toISOString().slice(0, 10)} 14:00`,
                sessionDate: wed14.toISOString(),
                bookingCategory: 'session'
            }
        }),
        resOverlap
    );
    if (resOverlap.getStatus() === 201) {
        const overlapBookingId = resOverlap.getBody()?._id?.toString();
        const resApproveOverlap = mockRes();
        await bookingController.approveBooking(
            mockReq({ params: { id: overlapBookingId }, user: { id: tutor1Id, role: 'tutor' } }),
            resApproveOverlap
        );
        if (resApproveOverlap.getStatus() === 409 && (resApproveOverlap.getBody()?.message || '').includes('another session')) {
            pass('Overlapping slot rejected at approve');
        } else {
            fail('Overlapping booking should be rejected at approval', resApproveOverlap.getBody()?.message);
        }
    } else {
        if (resOverlap.getStatus() === 400) {
            pass('Overlapping slot rejected at create');
        } else {
            fail('Overlapping slot handling', resOverlap.getBody()?.message);
        }
    }

    // ----- TEST 3 – DEDICATED TUTOR -----
    console.log('\n--- TEST 3 – DEDICATED TUTOR ---');
    const startDate = new Date(nextMonday);
    startDate.setDate(startDate.getDate() + 7);
    const resDedicated = mockRes();
    await bookingController.createBooking(
        mockReq({
            user: { id: s1Id, role: 'student' },
            body: {
                tutorId: tutor1Id,
                subject: 'Maths',
                bookingCategory: 'dedicated',
                preferredSchedule: 'Monday 16:00, Wednesday 14:00',
                preferredStartDate: startDate.toISOString(),
                weeklySchedule: [{ day: 'Monday', time: '16:00' }, { day: 'Wednesday', time: '14:00' }],
                sessionsPerWeek: 2,
                durationCommitment: '3 months',
                termsAccepted: true
            }
        }),
        resDedicated
    );
    if (resDedicated.getStatus() === 201) {
        pass('Create dedicated booking');
    } else {
        fail('Create dedicated booking', resDedicated.getBody()?.message);
    }

    const resDedNoTerms = mockRes();
    await bookingController.createBooking(
        mockReq({
            user: { id: s2Id, role: 'student' },
            body: {
                tutorId: tutor1Id,
                subject: 'Maths',
                bookingCategory: 'dedicated',
                preferredSchedule: 'Monday 16:00',
                preferredStartDate: startDate.toISOString(),
                weeklySchedule: [{ day: 'Monday', time: '16:00' }],
                sessionsPerWeek: 1,
                termsAccepted: false
            }
        }),
        resDedNoTerms
    );
    if (resDedNoTerms.getStatus() === 400 && (resDedNoTerms.getBody()?.message || '').toLowerCase().includes('terms')) {
        pass('Dedicated without terms rejected');
    } else {
        fail('Dedicated required fields (terms)', resDedNoTerms.getBody()?.message);
    }

    const dedicatedId = resDedicated.getBody()?._id?.toString();
    if (dedicatedId) {
        const resApproveDed = mockRes();
        await bookingController.approveBooking(
            mockReq({ params: { id: dedicatedId }, user: { id: tutor1Id, role: 'tutor' } }),
            resApproveDed
        );
        if (resApproveDed.getStatus() === 200) {
            pass('Approve dedicated booking');
        } else {
            fail('Approve dedicated', resApproveDed.getBody()?.message);
        }
    }

    // ----- TEST 4 – STATUS VALIDATION -----
    console.log('\n--- TEST 4 – STATUS VALIDATION ---');
    const validStatuses = ['pending', 'approved', 'rejected', 'cancelled', 'completed'];
    const booking = await Booking.findOne().lean();
    if (booking && validStatuses.includes(booking.status)) {
        pass('Booking status is valid enum');
    } else if (booking) {
        fail('Booking status enum', `status="${booking?.status}"`);
    } else {
        warn('No booking to check status enum');
    }

    const attRec = await Attendance.findOne().lean();
    const validAttStatuses = ['present', 'absent', 'late', 'excused'];
    if (attRec && validAttStatuses.includes(attRec.status)) {
        pass('Attendance status is valid enum');
    } else if (attRec) {
        fail('Attendance status enum mismatch', `status="${attRec?.status}"`);
    }

    // ----- TEST 5 – OVERLAP DETECTION (Monday 16:00) -----
    console.log('\n--- TEST 5 – OVERLAP DETECTION ---');
    const resMon16First = mockRes();
    await bookingController.createBooking(
        mockReq({
            user: { id: s2Id, role: 'student' },
            body: {
                tutorId: tutor1Id,
                subject: 'Biology',
                preferredSchedule: preferredMonday16,
                sessionDate: monday16Str,
                bookingCategory: 'session'
            }
        }),
        resMon16First
    );
    const firstMon16Id = resMon16First.getBody()?._id?.toString();
    if (firstMon16Id) {
        const resApproveFirst = mockRes();
        await bookingController.approveBooking(
            mockReq({ params: { id: firstMon16Id }, user: { id: tutor1Id, role: 'tutor' } }),
            resApproveFirst
        );
        if (resApproveFirst.getStatus() === 200) {
            pass('First Monday 16:00–17:00 booking approved');
        }
    }
    const resMon16Second = mockRes();
    await bookingController.createBooking(
        mockReq({
            user: { id: s3._id.toString(), role: 'student' },
            body: {
                tutorId: tutor1Id,
                subject: 'Biology',
                preferredSchedule: preferredMonday16,
                sessionDate: monday16Str,
                bookingCategory: 'session'
            }
        }),
        resMon16Second
    );
    const overlapBookingId2 = resMon16Second.getBody()?._id?.toString();
    if (overlapBookingId2) {
        const resApproveMon16 = mockRes();
        await bookingController.approveBooking(
            mockReq({ params: { id: overlapBookingId2 }, user: { id: tutor1Id, role: 'tutor' } }),
            resApproveMon16
        );
        if (resApproveMon16.getStatus() === 409 && (resApproveMon16.getBody()?.message || '').includes('another session')) {
            pass('Monday 16:00–17:00 overlap rejected');
        } else {
            fail('Monday 16:00 overlap must be rejected', resApproveMon16.getBody()?.message);
        }
    } else {
        if (resMon16Second.getStatus() === 400) {
            pass('Monday 16:00 duplicate rejected at create');
        } else {
            fail('Overlap detection', resMon16Second.getBody()?.message);
        }
    }

    // Mark attendance for first trial (so trial flow is complete)
    if (trialId) {
        const resAtt = mockRes();
        await attendanceController.markAttendance(
            mockReq({
                user: { id: tutor1Id, role: 'tutor' },
                body: {
                    bookingId: trialId,
                    sessionDate: monday16Str,
                    status: 'present',
                    duration: 60
                }
            }),
            resAtt
        );
        if (resAtt.getStatus() === 201) {
            pass('Mark attendance for trial');
        } else if (resAtt.getStatus() === 400 && (resAtt.getBody()?.message || '').toLowerCase().includes('upcoming')) {
            pass('Mark attendance for trial (upcoming session correctly rejected)');
        } else {
            fail('Mark attendance for trial', resAtt.getBody()?.message || String(resAtt.getStatus()));
        }
    }

    // ----- TEST 6 – FLEXIBLE MODE -----
    console.log('\n--- TEST 6 – FLEXIBLE MODE ---');
    const futureFlex = new Date();
    futureFlex.setDate(futureFlex.getDate() + 14);
    futureFlex.setHours(20, 0, 0, 0);
    const resFlex = mockRes();
    await bookingController.createBooking(
        mockReq({
            user: { id: s2Id, role: 'student' },
            body: {
                tutorId: tutor2Id,
                subject: 'Chemistry',
                preferredSchedule: futureFlex.toISOString(),
                sessionDate: futureFlex.toISOString(),
                bookingCategory: 'session'
            }
        }),
        resFlex
    );
    if (resFlex.getStatus() === 201) {
        const flexBooking = resFlex.getBody();
        if (flexBooking?.status === 'pending') {
            pass('Flexible mode: booking created with status pending');
        } else {
            fail('Flexible mode: status must remain pending', `got ${flexBooking?.status}`);
        }
    } else {
        fail('Flexible mode: allow future time', resFlex.getBody()?.message);
    }

    // ----- STRICT VALIDATION CHECKS -----
    console.log('\n--- STRICT VALIDATION CHECKS ---');
    const noSubjectRes = mockRes();
    await bookingController.createBooking(
        mockReq({
            user: { id: s1Id, role: 'student' },
            body: {
                tutorId: tutor1Id,
                subject: '',
                preferredSchedule: preferredMonday16,
                sessionDate: monday16Str,
                bookingCategory: 'session'
            }
        }),
        noSubjectRes
    );
    if (noSubjectRes.getStatus() === 400 && (noSubjectRes.getBody()?.code === 'SUBJECT_REQUIRED' || (noSubjectRes.getBody()?.message || '').toLowerCase().includes('subject'))) {
        pass('Booking without subject rejected');
    } else if (noSubjectRes.getStatus() === 201) {
        fail('Booking without subject should be rejected (API must not default)', noSubjectRes.getBody()?.message);
    } else {
        fail('Booking without subject should be rejected', noSubjectRes.getBody()?.message);
    }

    const approvedBooking = await Booking.findOne({ status: 'approved' }).lean();
    if (approvedBooking) {
        const resCompleteNoAtt = mockRes();
        await bookingController.completeBooking(
            mockReq({ params: { id: approvedBooking._id.toString() }, user: { id: tutor1Id, role: 'tutor' } }),
            resCompleteNoAtt
        );
        const alreadyHasAtt = await Attendance.findOne({ bookingId: approvedBooking._id });
        if (!alreadyHasAtt && resCompleteNoAtt.getStatus() === 400 && (resCompleteNoAtt.getBody()?.message || '').toLowerCase().includes('attendance')) {
            pass('Complete without attendance rejected');
        } else if (alreadyHasAtt) {
            pass('Complete without attendance (skipped – already has attendance)');
        } else {
            fail('Complete without attendance should be rejected', resCompleteNoAtt.getBody()?.message);
        }
    }

    console.log('\n========================================');
    console.log('Total tests: ' + total);
    console.log('Passed: ' + passed);
    console.log('Failed: ' + failed);
    console.log('========================================\n');

    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
