/**
 * Seed a LARGE realistic demo dataset for TutNet.
 *
 *   SEED_SCALE=small|medium|large (default: large)
 *   Examples:
 *     SEED_SCALE=small  npm run seed:demo   → ~30 users, quick smoke
 *     SEED_SCALE=medium npm run seed:demo   → ~200 users
 *     SEED_SCALE=large  npm run seed:demo   → 1000+ users, thousands of bookings
 *
 * Every collection gets proportional volume so every dashboard has enough
 * data to reveal real bugs at scale (pagination, slow queries, missing
 * indexes, etc.).
 *
 * All data is internally consistent:
 *   - Tutor profiles match tier's lifetime earnings / sessions
 *   - Reviews reference real completed bookings
 *   - Payments, Attendance, PayoutLedger align with Booking ids
 *   - Message moderation flags match the risk score bumps
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

const User = require('../models/User');
const TutorProfile = require('../models/TutorProfile');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Favorite = require('../models/Favorite');
const LearningGoal = require('../models/LearningGoal');
const CurrentTutor = require('../models/CurrentTutor');
const Escalation = require('../models/Escalation');
const PayoutLedger = require('../models/PayoutLedger');
const IncentiveLedger = require('../models/IncentiveLedger');
const ContactMessage = require('../models/ContactMessage');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tutnet';
const SCALE = process.env.SEED_SCALE || 'large';

const SIZES = {
    small:  { tutors: 12,  students: 30,  parents: 6,   bookings: 40,  messages: 25,  contacts: 5  },
    medium: { tutors: 40,  students: 180, parents: 20,  bookings: 300, messages: 150, contacts: 20 },
    large:  { tutors: 120, students: 850, parents: 50,  bookings: 2000, messages: 1200, contacts: 60 }
}[SCALE] || {};

console.log(`\n┌─ Scale: ${SCALE} ─────────────────────────────────────`);
console.log(`│ Target: ${SIZES.tutors} tutors · ${SIZES.students} students · ${SIZES.parents} parents`);
console.log(`│         ${SIZES.bookings} bookings · ${SIZES.messages} messages · ${SIZES.contacts} contact msgs`);
console.log(`└──────────────────────────────────────────────────────\n`);

// ── Data pools ────────────────────────────────────────────────────────
const FIRST_NAMES_F = ['Priya','Anjali','Meera','Kavya','Pooja','Neha','Divya','Shreya','Anisha','Swathi','Lakshmi','Nandini','Sneha','Ritu','Vidya','Ishita','Rhea','Deepa','Anushka','Mira','Aarti','Bhavya','Chandni','Dhara','Esha','Farah','Geeta','Hema','Ira','Jaya','Kiran','Leela','Maya','Nisha','Ojasvi','Parul','Rachna','Sarika','Tara','Uma','Vrinda','Yamini','Zara'];
const FIRST_NAMES_M = ['Rajesh','Vikram','Arjun','Dev','Suresh','Karan','Rohit','Aditya','Rahul','Kunal','Arnav','Ishaan','Kabir','Laksh','Mohit','Naveen','Omkar','Parth','Raghav','Sagar','Tushar','Uday','Varun','Yash','Akshay','Bhavin','Chaitanya','Dhruv','Eshan','Gaurav','Harsh','Jatin','Kartik','Manish','Nikhil','Pranav','Rohan','Siddharth','Tanay','Vedant','Yogesh'];
const LAST_NAMES = ['Sharma','Patel','Kumar','Reddy','Iyer','Menon','Singh','Agarwal','Gupta','Rao','Shah','Joshi','Malhotra','Chopra','Kapoor','Verma','Mishra','Saxena','Bansal','Mehta','Desai','Nair','Pillai','Banerjee','Chatterjee','Mukherjee','Bhattacharya','Dasgupta','Ghosh','Sen','Khan','Ali','Siddiqui','Ahmed','Qureshi','Ansari','Hussain','Baig','Fernandes','D\'Souza','Rodrigues','Pereira','Naidu','Chari','Murthy','Shetty'];

const SUBJECTS = ['Mathematics','Physics','Chemistry','Biology','English','Hindi','Telugu','Computer Science','Social Studies','Economics','Accounting','Business Studies','Sanskrit','French','Commerce','Geography','History','Political Science'];
const CLASSES = ['1','2','3','4','5','6','7','8','9','10','11','12','B.Tech','B.Sc','B.Com','MBA','IELTS','TOEFL','JEE','NEET'];
const AREAS = ['Gachibowli','Kondapur','Narsingi','Miyapur','Kukatpally','Tellapur','Madhapur','Hitec City','Jubilee Hills','Banjara Hills','Manikonda','Puppalaguda','Nanakramguda','Nizampet','Bachupally','Chandanagar','Lingampally','Nallagandla','Pragathi Nagar','Khajaguda'];
const LANGUAGES = ['English','Hindi','Telugu','Tamil','Kannada','Malayalam','Urdu','Bengali','Marathi','Gujarati'];
const CLASS_GRADES = ['4','5','6','7','8','9','10','11','12','B.Tech','B.Sc'];
const BIOS = [
    'Teaching since {n} years. My students consistently score 90%+. Patient explainer, strong in concepts.',
    '{n}-year experience teaching {s} for CBSE/ICSE. Former college professor. Loves JEE/NEET prep.',
    'I focus on building conceptual understanding — no rote learning. {n}+ years, students from Grade 6 to 12.',
    'Former corporate trainer now full-time tutor. {n} years experience, all boards, flexible hours.',
    'Ph.D. scholar teaching {s} for {n}+ years. Specialized in board exams + competitive entrance prep.',
    'Gold medalist from {inst}. Home tutor for {n} years. Patient with slow learners, pushes toppers.'
];
const EDU_INSTITUTIONS = ['IIT Madras','IIT Bombay','IIT Kanpur','BITS Pilani Hyderabad','NIT Warangal','IISc Bangalore','Osmania University','University of Hyderabad','IIM Ahmedabad','XLRI Jamshedpur','Delhi University','JNU','Anna University','Hyderabad Central University','Mumbai University'];
const DEGREES = ['M.Sc Physics','M.Sc Mathematics','M.Sc Chemistry','M.Sc Biology','M.A English','M.A Economics','M.Com','M.Tech CSE','B.Tech CSE','MBA Finance','MBA Marketing','Ph.D Mathematics','Ph.D Physics','B.Sc Chemistry','B.Sc Biology','B.A English','B.Ed'];
const REVIEW_COMMENTS_POS = [
    'Best tutor we have ever had. My child\'s confidence has grown so much.',
    'Patient, clear, always prepared. Highly recommend.',
    'Thanks to {name}, my son jumped from 60% to 92%.',
    'Every session feels well-planned. Notes are excellent.',
    'Great at breaking down tough concepts into simple steps.',
    'My daughter looks forward to each class. That says it all.',
    'On time, well-prepared, great communication.',
    'Made maths fun for my kid, which I thought impossible.',
    'Excellent IIT-level guidance. Worth every rupee.',
    'Strong subject knowledge + genuine care for student.'
];
const REVIEW_COMMENTS_MID = [
    'Good tutor, but sometimes rushes through topics.',
    'Helpful overall. Could be more interactive.',
    'Decent teaching style. My kid is improving slowly.',
    'Knowledgeable but homework follow-up can be better.',
    'Classes are good; scheduling has been a bit inconsistent.'
];
const REVIEW_COMMENTS_NEG = [
    'Cancelled too often. Not reliable for exam prep.',
    'Covered less than agreed; felt rushed.',
    'Needs to be more patient with younger students.'
];
const LEARNING_GOAL_TITLES = [
    'Score 95%+ in board exams','Clear JEE Mains 2026','Qualify NEET 2026','Improve essay writing','Master calculus','Complete NCERT by July','Improve grammar and vocab','Build programming basics','Ace next unit test','Full syllabus revision'
];

const TIER_COMMISSION = { starter: 25, silver: 22, gold: 18, platinum: 15 };

// ── Helpers ───────────────────────────────────────────────────────────
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const pickN = (a, n) => {
    const c = [...a].sort(() => Math.random() - 0.5);
    return c.slice(0, Math.min(n, a.length));
};
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const rndChance = (p) => Math.random() < p;
const oid = () => new mongoose.Types.ObjectId();
const daysAgo = (n) => new Date(Date.now() - n * 24 * 3600 * 1000);
const hoursAgo = (n) => new Date(Date.now() - n * 3600 * 1000);
const daysFromNow = (n) => new Date(Date.now() + n * 24 * 3600 * 1000);
const makeRefCode = () => crypto.randomBytes(5).toString('base64').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 7);

const jitsiUrl = (bookingId) => {
    const secret = process.env.JITSI_ROOM_SECRET || process.env.JWT_SECRET || 'tutnet';
    const h = crypto.createHash('sha256').update(`${bookingId}:${secret}`).digest('hex').slice(0, 20);
    return `https://${process.env.JITSI_DOMAIN || 'meet.jit.si'}/tutnet-${h}`;
};

function makeName(gender) {
    const first = pick(gender === 'f' ? FIRST_NAMES_F : FIRST_NAMES_M);
    return `${first} ${pick(LAST_NAMES)}`;
}
function mkEmail(name, role, i) {
    const [f, l] = name.toLowerCase().split(' ');
    return `${f}.${l || 'x'}${i || ''}@${role}.test`;
}
function mkPhone() {
    return '9' + rnd(100000000, 999999999);
}
function weekLabel(d) {
    const x = new Date(d);
    const jan1 = new Date(x.getFullYear(), 0, 1);
    const days = Math.floor((x - jan1) / (24 * 3600 * 1000));
    const w = Math.ceil((days + jan1.getDay() + 1) / 7);
    return `${x.getFullYear()}-W${String(w).padStart(2, '0')}`;
}
function progress(label, i, total) {
    if (i % Math.max(1, Math.floor(total / 20)) !== 0 && i !== total) return;
    const pct = Math.round((i / total) * 100);
    process.stdout.write(`\r  … ${label}: ${i}/${total} (${pct}%)   `);
    if (i === total) process.stdout.write('\n');
}

// ── Seeding ───────────────────────────────────────────────────────────
(async () => {
    const t0 = Date.now();
    try {
        await mongoose.connect(MONGODB_URI, { maxPoolSize: 50 });
        console.log('Connected to MongoDB\n');

        // ──────────────────────────────────────────────────────────
        // ADMINS
        // ──────────────────────────────────────────────────────────
        const admin = await User.create({
            name: 'Admin User', email: 'admin@example.com', phone: '9999999999',
            password: 'password123', role: 'admin',
            location: { city: 'Hyderabad', area: 'Admin' },
            authProvider: 'local', isActive: true, referralCode: makeRefCode()
        });
        const support = await User.create({
            name: 'Support Exec', email: 'support@example.com', phone: '9998888777',
            password: 'password123', role: 'admin',
            location: { city: 'Hyderabad', area: 'Admin' },
            authProvider: 'local', isActive: true, referralCode: makeRefCode()
        });
        console.log(`✓ admins: 2`);

        // ──────────────────────────────────────────────────────────
        // TUTORS (named leaders + bulk)
        // ──────────────────────────────────────────────────────────
        // 4 stable named tutors for demos + tests
        const namedTutorsSpec = [
            { name:'Priya Sharma',  email:'priya@tutor.test',  tier:'platinum', mode:'online', rate:800, rating:4.9, sessions:230, exp:12, vacation:false },
            { name:'Rajesh Kumar',  email:'rajesh@tutor.test', tier:'gold',     mode:'both',   rate:450, rating:4.7, sessions:95,  exp:8,  vacation:false },
            { name:'Anjali Reddy',  email:'anjali@tutor.test', tier:'silver',   mode:'home',   rate:500, rating:4.5, sessions:32,  exp:5,  vacation:false },
            { name:'Vikram Singh',  email:'vikram@tutor.test', tier:'starter',  mode:'online', rate:350, rating:4.2, sessions:3,   exp:2,  vacation:true  }
        ];
        const tutors = [];
        for (const t of namedTutorsSpec) {
            const u = await User.create({
                name: t.name, email: t.email, phone: mkPhone(),
                password: 'password123', role: 'tutor',
                location: { city: 'Hyderabad', area: pick(AREAS) },
                authProvider: 'local', isActive: true,
                referralCode: makeRefCode(),
                lastSeenAt: hoursAgo(rnd(1, 30))
            });
            const tp = await createTutorProfile(u, t, admin);
            tutors.push({ user: u, profile: tp, spec: t });
        }

        // Bulk tutors
        const bulkCount = Math.max(0, SIZES.tutors - namedTutorsSpec.length);
        for (let i = 0; i < bulkCount; i++) {
            const gender = rndChance(0.5) ? 'f' : 'm';
            const name = makeName(gender);
            const tier = pick(['starter','starter','silver','silver','gold','platinum']); // skew to lower tiers
            const mode = pick(['online','online','home','both']);
            const rate = { starter: rnd(200,400), silver: rnd(350,600), gold: rnd(500,900), platinum: rnd(700,1500) }[tier];
            const sessions = { starter: rnd(0,15), silver: rnd(15,60), gold: rnd(60,150), platinum: rnd(150,500) }[tier];
            const rating = { starter: 3.5+Math.random()*0.8, silver: 4.0+Math.random()*0.6, gold: 4.3+Math.random()*0.5, platinum: 4.6+Math.random()*0.4 }[tier];
            const spec = {
                name, email: mkEmail(name, 'tutor', i),
                tier, mode, rate, rating: +rating.toFixed(1), sessions,
                exp: tier === 'platinum' ? rnd(8,18) : tier === 'gold' ? rnd(4,10) : tier === 'silver' ? rnd(2,6) : rnd(0,3),
                vacation: rndChance(0.05),
                suspended: rndChance(0.03)
            };
            const u = await User.create({
                name: spec.name, email: spec.email, phone: mkPhone(),
                password: 'password123', role: 'tutor',
                location: { city: 'Hyderabad', area: pick(AREAS) },
                authProvider: rndChance(0.25) ? 'google' : 'local',
                isActive: !spec.suspended,
                suspendedAt: spec.suspended ? daysAgo(rnd(1,60)) : undefined,
                suspensionReason: spec.suspended ? pick(['Fraud investigation','Multiple complaints','Off-platform solicitation']) : undefined,
                referralCode: makeRefCode(),
                lastSeenAt: hoursAgo(rnd(1, 720))
            });
            const tp = await createTutorProfile(u, spec, admin);
            tutors.push({ user: u, profile: tp, spec });
            progress('tutors', i + 1, bulkCount);
        }
        console.log(`✓ tutors: ${tutors.length}`);

        // Only approved + non-suspended tutors are bookable
        const bookableTutors = tutors.filter(t => t.user.isActive && !t.spec.suspended);

        // ──────────────────────────────────────────────────────────
        // STUDENTS (parents with children + standalone)
        // ──────────────────────────────────────────────────────────
        const students = [];
        const namedParent = await User.create({
            name: 'Suresh Patel', email: 'suresh@parent.test', phone: '9111111111',
            password: 'password123', role: 'student',
            location: { city: 'Hyderabad', area: 'Kondapur' },
            classGrade: '10', authProvider: 'local', isActive: true,
            referralCode: makeRefCode()
        });
        const childA = await User.create({
            name: 'Aarav Patel', email: 'suresh+child1@parent.test', phone: '9111111111',
            password: `child-${namedParent._id}`, role: 'student', parentUserId: namedParent._id,
            classGrade: '8', location: { city: 'Hyderabad', area: 'Kondapur' },
            authProvider: 'local', isActive: true, referralCode: makeRefCode()
        });
        const childB = await User.create({
            name: 'Aanya Patel', email: 'suresh+child2@parent.test', phone: '9111111111',
            password: `child-${namedParent._id}`, role: 'student', parentUserId: namedParent._id,
            classGrade: '11', location: { city: 'Hyderabad', area: 'Kondapur' },
            authProvider: 'local', isActive: true, referralCode: makeRefCode()
        });
        await User.updateOne({ _id: namedParent._id }, { $set: { children: [childA._id, childB._id] } });
        students.push(namedParent, childA, childB);

        // Also a demo student that's easy to log into
        const demoStudent = await User.create({
            name: 'Meera Iyer', email: 'meera@parent.test', phone: mkPhone(),
            password: 'password123', role: 'student',
            classGrade: '12', location: { city: 'Hyderabad', area: 'Miyapur' },
            authProvider: 'local', isActive: true, referralCode: makeRefCode(),
            referredBy: namedParent._id
        });
        students.push(demoStudent);

        // Bulk parents with children
        const bulkParents = SIZES.parents;
        for (let i = 0; i < bulkParents; i++) {
            const gender = rndChance(0.5) ? 'f' : 'm';
            const parentName = makeName(gender);
            const parent = await User.create({
                name: parentName, email: mkEmail(parentName, 'parent', i), phone: mkPhone(),
                password: 'password123', role: 'student',
                location: { city: 'Hyderabad', area: pick(AREAS) },
                classGrade: pick(CLASS_GRADES), authProvider: 'local',
                isActive: true, referralCode: makeRefCode()
            });
            const childCount = rnd(1, 3);
            const childIds = [];
            for (let c = 0; c < childCount; c++) {
                const childName = makeName(rndChance(0.5) ? 'f' : 'm');
                const child = await User.create({
                    name: childName, email: `${parent.email.split('@')[0]}+c${c+1}@${parent.email.split('@')[1]}`,
                    phone: parent.phone, password: `child-${parent._id}`,
                    role: 'student', parentUserId: parent._id,
                    classGrade: pick(CLASS_GRADES),
                    location: parent.location, authProvider: 'local',
                    isActive: true, referralCode: makeRefCode()
                });
                childIds.push(child._id);
                students.push(child);
            }
            await User.updateOne({ _id: parent._id }, { $set: { children: childIds } });
            students.push(parent);
            progress('parents', i + 1, bulkParents);
        }

        // Standalone students
        const standaloneCount = Math.max(0, SIZES.students - students.length);
        for (let i = 0; i < standaloneCount; i++) {
            const gender = rndChance(0.5) ? 'f' : 'm';
            const name = makeName(gender);
            const s = await User.create({
                name, email: mkEmail(name, 'student', i), phone: mkPhone(),
                password: 'password123', role: 'student',
                location: { city: 'Hyderabad', area: pick(AREAS) },
                classGrade: pick(CLASS_GRADES),
                authProvider: rndChance(0.3) ? 'google' : 'local',
                isActive: !rndChance(0.01),  // tiny suspended slice
                referralCode: makeRefCode(),
                // ~30% were referred by a random earlier student (who has a ref code)
                referredBy: rndChance(0.3) && students.length > 0 ? pick(students)._id : null,
                lastSeenAt: hoursAgo(rnd(1, 2000))
            });
            students.push(s);
            progress('students', i + 1, standaloneCount);
        }
        console.log(`✓ students: ${students.length}`);

        // ──────────────────────────────────────────────────────────
        // BOOKINGS
        // ──────────────────────────────────────────────────────────
        const bookings = [];
        const completedBookings = [];
        for (let i = 0; i < SIZES.bookings; i++) {
            const tutor = pick(bookableTutors);
            const student = pick(students);
            if (!tutor || !student || String(tutor.user._id) === String(student._id)) continue;

            const category = pick(['trial','session','session','session','permanent','dedicated']);
            const subject = pick(tutor.profile.subjects);

            // Status distribution depends on category: trials more often pending, sessions more often completed
            const status = category === 'trial'
                ? pick(['pending','pending','approved','completed','completed','cancelled'])
                : pick(['approved','completed','completed','completed','completed','cancelled','rejected']);

            const whenOffset = category === 'trial' && status === 'pending'
                ? rnd(-2, 3)
                : status === 'completed' ? -rnd(1, 90) : rnd(-30, 14);
            const sessionDate = whenOffset >= 0 ? daysFromNow(whenOffset) : daysAgo(-whenOffset);

            const rate = tutor.spec.rate;
            const isPaid = ['approved','completed'].includes(status) && category !== 'trial';
            const commissionRate = TIER_COMMISSION[tutor.spec.tier];
            const commissionAmount = Math.round(rate * commissionRate / 100);

            const planData = (category === 'permanent' || category === 'dedicated') ? {
                plan: category === 'permanent' ? pick(['monthly','flex']) : pick(['committed','intensive']),
                sessionAllowance: category === 'permanent' ? 20 : pick([10, 20, 28]),
                sessionsConsumed: status === 'completed' ? rnd(5, 18) : rnd(0, 6),
                planPeriodStart: daysAgo(rnd(5, 30)),
                planPeriodEnd: daysFromNow(rnd(10, 90)),
                monthsCommitted: category === 'dedicated' ? rnd(3, 6) : 1,
                sessionsPerWeek: rnd(1, 3),
                frequency: pick(['weekly','weekly','biweekly']),
                subjects: [subject]
            } : {};

            const booking = new Booking({
                studentId: student._id, tutorId: tutor.user._id,
                subject, preferredSchedule: pick(['Weekdays 5pm','Weekends 11am','Mon/Wed 6pm','Fri/Sat 4pm']),
                sessionDate,
                bookingCategory: category, status,
                isPaid, termsAccepted: true,
                ...planData,
                ...(category === 'trial' ? {
                    trialOutcome: status === 'completed' ? pick(['converted','not_interested','no_show']) : 'pending',
                    trialExpiresAt: daysFromNow(2)
                } : {}),
                ...(status === 'cancelled' ? {
                    cancellationReason: pick(['Student unavailable','Tutor cancelled','Schedule conflict']),
                    cancelledBy: pick(['student','tutor','system'])
                } : {}),
                lockedHourlyRate: rate,
                priceLockedAt: daysAgo(rnd(1, 30)),
                commissionRate, commissionAmount,
                tutorTierAtBooking: tutor.spec.tier
            });

            // Auto-generate Jitsi URL for online bookings on approval/completion
            if (['approved','completed'].includes(status) && (tutor.spec.mode === 'online' || tutor.spec.mode === 'both')) {
                booking.sessionJoinUrl = jitsiUrl(String(booking._id));
            }
            if (status === 'completed') {
                booking.joinedSessionAt = sessionDate;
                booking.leftSessionAt = new Date(sessionDate.getTime() + rnd(45, 75) * 60_000);
            }

            await booking.save();
            bookings.push(booking);
            if (status === 'completed') completedBookings.push(booking);
            progress('bookings', i + 1, SIZES.bookings);
        }
        console.log(`✓ bookings: ${bookings.length} (${completedBookings.length} completed)`);

        // ──────────────────────────────────────────────────────────
        // TOP UP: named demo accounts get extra bookings so logging in as them shows rich data
        // ──────────────────────────────────────────────────────────
        const namedTutorUsers = tutors.slice(0, 3); // priya, rajesh, anjali (skip vikram — on vacation)
        const demoStudents = [namedParent, childA, childB, demoStudent];
        for (const s of demoStudents) {
            for (const t of namedTutorUsers) {
                for (const [status, whenDays] of [['completed', -rnd(5, 40)], ['approved', rnd(1, 10)], ['completed', -rnd(50, 90)]]) {
                    const category = pick(['session','permanent','dedicated']);
                    const subject = pick(t.profile.subjects);
                    const sessionDate = whenDays < 0 ? daysAgo(-whenDays) : daysFromNow(whenDays);
                    const planData = (category === 'permanent' || category === 'dedicated') ? {
                        plan: category === 'permanent' ? 'monthly' : 'committed',
                        sessionAllowance: 20,
                        sessionsConsumed: status === 'completed' ? 18 : 6,
                        planPeriodStart: daysAgo(15),
                        planPeriodEnd: daysFromNow(15),
                        monthsCommitted: category === 'dedicated' ? 3 : 1,
                        sessionsPerWeek: 2,
                        frequency: 'weekly',
                        subjects: [subject]
                    } : {};
                    const b = new Booking({
                        studentId: s._id, tutorId: t.user._id,
                        subject, preferredSchedule: pick(['Mon & Wed 5pm','Tue & Thu 6pm','Weekends 11am']),
                        sessionDate,
                        bookingCategory: category, status,
                        isPaid: status !== 'pending',
                        termsAccepted: true,
                        ...planData,
                        lockedHourlyRate: t.spec.rate,
                        priceLockedAt: daysAgo(20),
                        commissionRate: TIER_COMMISSION[t.spec.tier],
                        commissionAmount: Math.round(t.spec.rate * TIER_COMMISSION[t.spec.tier] / 100),
                        tutorTierAtBooking: t.spec.tier,
                    });
                    if (status === 'approved' && (t.spec.mode === 'online' || t.spec.mode === 'both')) {
                        b.sessionJoinUrl = jitsiUrl(String(b._id));
                    }
                    if (status === 'completed') {
                        b.joinedSessionAt = sessionDate;
                        b.leftSessionAt = new Date(sessionDate.getTime() + 55 * 60_000);
                    }
                    await b.save();
                    bookings.push(b);
                    if (status === 'completed') completedBookings.push(b);
                }
            }
        }
        console.log(`  ✓ named demo accounts topped up: ${demoStudents.length} × ${namedTutorUsers.length} × 3 bookings each`);

        // Guarantee CurrentTutor relationships for named demo students → tutors
        // so "My Tutors" tab is populated on login.
        for (const s of demoStudents) {
            for (const t of namedTutorUsers) {
                const subject = t.profile.subjects[0];
                await CurrentTutor.create({
                    studentId: s._id,
                    tutorId: t.user._id,
                    subject,
                    classGrade: s.classGrade || pick(CLASS_GRADES),
                    relationshipStartDate: daysAgo(rnd(15, 60)),
                    status: 'active',
                    totalSessionsBooked: rnd(10, 30),
                    sessionsCompleted: rnd(5, 20),
                    isActive: true
                }).catch(() => {});  // duplicate unique key is ok
            }
        }
        console.log(`  ✓ CurrentTutor rows seeded for named demo accounts`);

        // ──────────────────────────────────────────────────────────
        // PAYMENTS (for paid bookings)
        // ──────────────────────────────────────────────────────────
        const paidBookings = bookings.filter(b => b.isPaid);
        const payments = [];
        const paymentDocs = [];
        for (let i = 0; i < paidBookings.length; i++) {
            const b = paidBookings[i];
            const isRefund = b.status === 'cancelled' && rndChance(0.3);
            const amount = b.plan === 'monthly' ? Math.round(20 * b.lockedHourlyRate * 0.85)
                        : b.plan === 'committed' ? Math.round(b.sessionAllowance * b.lockedHourlyRate * 0.85)
                        : b.plan === 'intensive' ? Math.round(b.sessionAllowance * b.lockedHourlyRate * 0.80)
                        : b.lockedHourlyRate;

            paymentDocs.push({
                studentId: b.studentId, tutorId: b.tutorId, bookingId: b._id,
                amount, currency: 'INR',
                status: isRefund ? 'refunded' : 'completed',
                paymentMethod: pick(['online','online','online','upi']),
                razorpayOrderId: 'order_seed_' + oid().toString().slice(-14),
                razorpayPaymentId: 'pay_seed_' + oid().toString().slice(-14),
                ...(isRefund ? {
                    refundId: 'rfnd_seed_' + oid().toString().slice(-14),
                    refundStatus: 'processed',
                    refundAmount: amount,
                    refundReason: 'Booking cancelled within 24h',
                    refundedAt: b.sessionDate
                } : {}),
                paidAt: b.priceLockedAt || daysAgo(rnd(1, 60))
            });
            progress('payments', i + 1, paidBookings.length);
        }
        const insertedPayments = await Payment.insertMany(paymentDocs, { ordered: false });
        payments.push(...insertedPayments);
        console.log(`✓ payments: ${payments.length}`);

        // ──────────────────────────────────────────────────────────
        // REVIEWS (70% of completed bookings)
        // ──────────────────────────────────────────────────────────
        const reviewDocs = [];
        for (const b of completedBookings) {
            if (!rndChance(0.7)) continue;
            const rating = pick([5, 5, 5, 4, 4, 4, 3, 3, 2, 1]);  // realistic skew
            const comment = rating >= 4 ? pick(REVIEW_COMMENTS_POS)
                         : rating === 3 ? pick(REVIEW_COMMENTS_MID)
                         : pick(REVIEW_COMMENTS_NEG);
            const hasReply = rating >= 4 && rndChance(0.3);
            reviewDocs.push({
                bookingId: b._id, studentId: b.studentId, tutorId: b.tutorId,
                rating, comment: comment.replace('{name}', 'the tutor'),
                ...(hasReply ? {
                    tutorReply: {
                        text: pick([
                            'Thank you for the kind words — see you next session!',
                            'Appreciate the feedback. Let\'s cover the next chapter Tuesday.',
                            'Thanks! Reach out any time with doubts.'
                        ]),
                        repliedAt: daysAgo(rnd(1, 30))
                    }
                } : {})
            });
        }
        await Review.insertMany(reviewDocs, { ordered: false });
        console.log(`✓ reviews: ${reviewDocs.length}`);

        // ──────────────────────────────────────────────────────────
        // ATTENDANCE (for every completed booking)
        // ──────────────────────────────────────────────────────────
        const attendanceDocs = [];
        for (const b of completedBookings) {
            const status = pick(['present','present','present','present','absent','late']);
            const disputed = status === 'present' && rndChance(0.05);
            attendanceDocs.push({
                bookingId: b._id, studentId: b.studentId, tutorId: b.tutorId,
                sessionDate: b.sessionDate, status,
                duration: status === 'present' ? rnd(45, 65) : 0,
                markedBy: b.tutorId,
                parentVerificationStatus: disputed ? 'disputed' : rndChance(0.4) ? 'verified' : 'unverified',
                parentVerificationNote: disputed ? pick(['Class was short','Tutor left early','Did not happen']) : ''
            });
        }
        await Attendance.insertMany(attendanceDocs, { ordered: false });
        console.log(`✓ attendance: ${attendanceDocs.length}`);

        // ──────────────────────────────────────────────────────────
        // CURRENTTUTOR — active relationships (dedicated + permanent bookings)
        // ──────────────────────────────────────────────────────────
        const relationshipMap = new Map();
        for (const b of bookings) {
            if (!['permanent','dedicated'].includes(b.bookingCategory)) continue;
            if (!['approved','completed'].includes(b.status)) continue;
            const key = `${b.studentId}-${b.tutorId}-${b.subject}`;
            if (relationshipMap.has(key)) continue;
            relationshipMap.set(key, {
                studentId: b.studentId, tutorId: b.tutorId, subject: b.subject,
                classGrade: pick(CLASS_GRADES),
                relationshipStartDate: b.planPeriodStart || daysAgo(rnd(5,60)),
                status: 'active',
                totalSessionsBooked: b.sessionAllowance || 10,
                sessionsCompleted: b.sessionsConsumed || rnd(1,10),
                isActive: true
            });
        }
        if (relationshipMap.size > 0) {
            await CurrentTutor.insertMany([...relationshipMap.values()], { ordered: false });
        }
        console.log(`✓ currentTutor: ${relationshipMap.size}`);

        // ──────────────────────────────────────────────────────────
        // MESSAGES (some flagged for bypass)
        // ──────────────────────────────────────────────────────────
        const messageDocs = [];
        const REGULAR_MSGS = [
            'Hi, confirming the next class at 5pm.',
            'My child has a doubt in chapter 3, can we go over it?',
            'Great session today, thanks!',
            'Will the homework be due by Friday?',
            'Running late by 10 min, starting soon.',
            'Can we reschedule Tuesday\'s class to Thursday?',
            'Shared the notes via the resources tab.',
            'Thanks for the extra help with the revision.'
        ];
        const FLAGGED_MSGS = [
            { t: 'Let us chat on 9876543210 directly.', m: ['9876543210'], r: ['phone_number'] },
            { t: 'You can pay me on biology@ybl — no commission.', m: ['biology@ybl'], r: ['upi_handle'] },
            { t: 'WhatsApp me for faster coordination.', m: ['whatsapp'], r: ['off_platform'] },
            { t: 'Let us do cash only from next month.', m: ['cash only'], r: ['off_platform'] }
        ];
        for (let i = 0; i < SIZES.messages; i++) {
            const b = pick(bookings);
            if (!b) continue;
            const senderIsStudent = rndChance(0.5);
            const flagged = rndChance(0.03); // 3% flagged
            const flaggedData = flagged ? pick(FLAGGED_MSGS) : null;
            messageDocs.push({
                senderId: senderIsStudent ? b.studentId : b.tutorId,
                recipientId: senderIsStudent ? b.tutorId : b.studentId,
                text: flagged ? '[REDACTED]' : pick(REGULAR_MSGS),
                ...(flagged ? {
                    originalText: flaggedData.t,
                    moderation: {
                        flagged: true, reasons: flaggedData.r,
                        riskWeight: 30, matches: flaggedData.m
                    }
                } : {}),
                bookingId: b._id,
                read: rndChance(0.6),
                readAt: rndChance(0.6) ? daysAgo(rnd(0, 30)) : undefined,
                createdAt: daysAgo(rnd(0, 60))
            });
            progress('messages', i + 1, SIZES.messages);
        }
        await Message.insertMany(messageDocs, { ordered: false });
        // Bump tutor risk for flagged messages
        const flaggedTutorCounts = new Map();
        for (const m of messageDocs) {
            if (!m.moderation?.flagged) continue;
            flaggedTutorCounts.set(String(m.senderId), (flaggedTutorCounts.get(String(m.senderId)) || 0) + 1);
        }
        for (const [tutorId, count] of flaggedTutorCounts) {
            await TutorProfile.updateOne(
                { userId: tutorId },
                { $inc: { riskScore: 30 * count, flaggedEventsCount: count } }
            ).catch(() => {});
        }
        console.log(`✓ messages: ${messageDocs.length} (${[...flaggedTutorCounts.values()].reduce((a,b)=>a+b,0)} flagged)`);

        // ──────────────────────────────────────────────────────────
        // FAVORITES
        // ──────────────────────────────────────────────────────────
        const favDocs = [];
        for (let i = 0; i < students.length; i++) {
            const s = students[i];
            if (s.parentUserId) continue;
            if (!rndChance(0.4)) continue;
            const count = rnd(1, 5);
            const chosen = pickN(bookableTutors, count);
            for (const t of chosen) {
                favDocs.push({ studentId: s._id, tutorId: t.user._id });
            }
        }
        if (favDocs.length) await Favorite.insertMany(favDocs, { ordered: false });
        console.log(`✓ favorites: ${favDocs.length}`);

        // ──────────────────────────────────────────────────────────
        // LEARNING GOALS
        // ──────────────────────────────────────────────────────────
        const goalDocs = [];
        for (const rel of relationshipMap.values()) {
            if (!rndChance(0.5)) continue;
            goalDocs.push({
                studentId: rel.studentId, tutorId: rel.tutorId,
                subject: rel.subject, title: pick(LEARNING_GOAL_TITLES),
                description: 'Auto-seeded goal for demo purposes',
                targetDate: daysFromNow(rnd(30, 120)),
                status: pick(['not_started','in_progress','in_progress','achieved']),
                percentComplete: rnd(0, 80)
            });
        }
        if (goalDocs.length) await LearningGoal.insertMany(goalDocs, { ordered: false });
        console.log(`✓ learningGoals: ${goalDocs.length}`);

        // ──────────────────────────────────────────────────────────
        // NOTIFICATIONS — seed 3 per active user
        // ──────────────────────────────────────────────────────────
        const notifDocs = [];
        const NOTIF_TYPES = [
            { type:'booking_approved', title:'Your session is confirmed', msg:'The tutor has approved the booking.' },
            { type:'payment_success', title:'Payment successful', msg:'Your payment was received. Receipt in dashboard.' },
            { type:'session_reminder', title:'Session in 1 hour', msg:'Your upcoming class starts soon.' },
            { type:'new_review', title:'New 5-star review', msg:'A student just gave you 5 stars.' },
            { type:'attendance_marked', title:'Attendance marked', msg:'The tutor marked attendance for your session.' }
        ];
        for (const s of [...students, ...bookableTutors.map(t => t.user)]) {
            if (!s.isActive) continue;
            const count = rnd(1, 4);
            for (let i = 0; i < count; i++) {
                const n = pick(NOTIF_TYPES);
                notifDocs.push({
                    userId: s._id, type: n.type,
                    title: n.title, message: n.msg,
                    isRead: rndChance(0.5),
                    createdAt: hoursAgo(rnd(0, 72))
                });
            }
        }
        await Notification.insertMany(notifDocs, { ordered: false });
        console.log(`✓ notifications: ${notifDocs.length}`);

        // ──────────────────────────────────────────────────────────
        // PAYOUT LEDGER + INCENTIVE LEDGER
        // ──────────────────────────────────────────────────────────
        const payoutDocs = [];
        const incentiveDocs = [];
        for (const t of bookableTutors) {
            if (t.spec.sessions < 5) continue;
            const weekCount = Math.min(12, Math.floor(t.spec.sessions / 3));
            for (let w = 1; w <= weekCount; w++) {
                const periodStart = daysAgo(w * 7 + 7);
                const periodEnd = daysAgo(w * 7);
                const gross = rnd(800, 4000);
                const commRate = TIER_COMMISSION[t.spec.tier];
                const commAmount = Math.round(gross * commRate / 100);
                const bonuses = rndChance(0.2) ? pick([300, 500, 1000, 1500]) : 0;
                const reserve = Math.round(gross * 0.13);
                const net = gross - commAmount + bonuses - reserve;
                const isPaid = w >= 2;  // last week is scheduled, rest paid
                payoutDocs.push({
                    tutorId: t.user._id,
                    periodStart, periodEnd, periodLabel: weekLabel(periodStart),
                    grossEarnings: gross, commissionRate: commRate, commissionAmount: commAmount,
                    incentiveBonuses: bonuses, deductions: 0, reserveHeld: reserve,
                    netPayable: net,
                    status: isPaid ? 'paid' : 'scheduled', mode: 'mock',
                    scheduledAt: periodEnd, processedAt: isPaid ? periodEnd : undefined,
                    paidAt: isPaid ? periodEnd : undefined,
                    idempotencyKey: `payout:${t.user._id}:${weekLabel(periodStart)}:${oid()}`
                });
            }

            // Incentives for gold+ tutors
            if (['gold','platinum'].includes(t.spec.tier) && rndChance(0.6)) {
                incentiveDocs.push({
                    userId: t.user._id, userRole: 'tutor',
                    kind: pick(['perfect_month','volume_bonus','ten_sessions','retention_3mo']),
                    amount: pick([200, 300, 500, 1000, 1500, 2500]),
                    settlementType: 'bonus_payout',
                    status: pick(['paid','accrued']),
                    accruedAt: daysAgo(rnd(5, 60)),
                    paidAt: daysAgo(rnd(1, 30)),
                    trigger: { reason: 'Auto-seeded incentive' },
                    idempotencyKey: `inc:${t.user._id}:${oid()}`
                });
            }
        }

        // Student credits — 20% of students have some credit
        for (const s of students.slice(0, Math.floor(students.length * 0.2))) {
            incentiveDocs.push({
                userId: s._id, userRole: 'student',
                kind: 'credit_topup', amount: pick([100, 200, 400, 500, 1000]),
                settlementType: 'platform_credit',
                status: pick(['accrued','accrued','applied']),
                accruedAt: daysAgo(rnd(1, 60)),
                appliedAt: rndChance(0.3) ? daysAgo(rnd(1, 30)) : undefined,
                trigger: { reason: pick(['Referral reward','Renewal cashback','Goodwill credit','Off-platform report verified']) },
                idempotencyKey: `credit:${s._id}:${oid()}`
            });
        }
        await PayoutLedger.insertMany(payoutDocs, { ordered: false });
        await IncentiveLedger.insertMany(incentiveDocs, { ordered: false });
        console.log(`✓ payouts: ${payoutDocs.length}`);
        console.log(`✓ incentives: ${incentiveDocs.length}`);

        // ──────────────────────────────────────────────────────────
        // ESCALATIONS (a few open + some resolved)
        // ──────────────────────────────────────────────────────────
        const escDocs = [];
        const openCount = Math.ceil(SIZES.tutors * 0.05);
        for (let i = 0; i < openCount; i++) {
            const b = pick(bookings);
            if (!b) continue;
            escDocs.push({
                raisedBy: b.studentId, raisedByRole: 'student',
                againstUser: b.tutorId, bookingId: b._id,
                type: pick(['no_show','misconduct','payment_dispute','safety_concern']),
                description: pick([
                    'Tutor did not show up and did not respond.',
                    'Classes cancelled without notice 3 times.',
                    'Requested refund but no response.',
                    'Tutor was inappropriate during session.'
                ]),
                status: pick(['open','open','under_review','resolved','resolved','dismissed']),
                adminNotes: rndChance(0.3) ? 'Admin is investigating.' : ''
            });
        }
        if (escDocs.length) await Escalation.insertMany(escDocs, { ordered: false });
        console.log(`✓ escalations: ${escDocs.length}`);

        // ──────────────────────────────────────────────────────────
        // CONTACT INBOX
        // ──────────────────────────────────────────────────────────
        const CONTACT_SUBJECTS = ['Billing question','Feature request','Tutor complaint','Payment issue','Login help','Partnership inquiry','Refund request','Technical bug'];
        const contactDocs = [];
        for (let i = 0; i < SIZES.contacts; i++) {
            const gender = rndChance(0.5) ? 'f' : 'm';
            const name = makeName(gender);
            contactDocs.push({
                name, email: mkEmail(name, 'contact', i),
                phone: rndChance(0.5) ? mkPhone() : '',
                subject: pick(CONTACT_SUBJECTS),
                message: pick([
                    'Hi, I was charged twice for the same session.',
                    'Do you have tutors for IGCSE curriculum?',
                    'Cannot log in, keeps saying invalid credentials.',
                    'Great platform — can you add offline batch discovery?',
                    'Need help with my subscription renewal.'
                ]),
                status: pick(['new','new','in_progress','resolved']),
                createdAt: daysAgo(rnd(0, 30))
            });
        }
        if (contactDocs.length) await ContactMessage.insertMany(contactDocs, { ordered: false });
        console.log(`✓ contacts: ${contactDocs.length}`);

        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log('\n─────────────────────────────────────────');
        console.log(`✅ Seed complete in ${elapsed}s`);
        console.log('─────────────────────────────────────────');
        console.log('\nLogin with:');
        console.log('  Admin   → admin@example.com / password123');
        console.log('  Support → support@example.com / password123');
        console.log('  Parent  → suresh@parent.test / password123  (2 children)');
        console.log('  Tutor   → priya@tutor.test  / password123  (Platinum)');
        console.log('  Tutor   → rajesh@tutor.test / password123  (Gold)');
        console.log('  Tutor   → anjali@tutor.test / password123  (Silver)');
        console.log('  Tutor   → vikram@tutor.test / password123  (Starter, vacation)');
        console.log('  Student → meera@parent.test / password123');
    } catch (err) {
        console.error('\n❌ Seed failed:\n', err);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        process.exit(process.exitCode || 0);
    }
})();

// ── Helpers: profile creation ─────────────────────────────────────────
async function createTutorProfile(user, spec, admin) {
    const bio = pick(BIOS)
        .replace('{n}', String(spec.exp))
        .replace('{s}', pick(SUBJECTS))
        .replace('{inst}', pick(EDU_INSTITUTIONS));
    const edu = pick(EDU_INSTITUTIONS);
    const degree = pick(DEGREES);

    return await TutorProfile.create({
        userId: user._id,
        subjects: pickN(SUBJECTS, rnd(1, 4)),
        classes: pickN(CLASSES, rnd(2, 6)),
        hourlyRate: spec.rate,
        experienceYears: spec.exp,
        mode: spec.mode,
        languages: pickN(LANGUAGES, rnd(2, 4)),
        bio,
        availabilityMode: 'fixed',
        weeklyAvailability: [
            { day: 'Monday', slots: [{ start: '16:00', end: '20:00' }] },
            { day: 'Tuesday', slots: [{ start: '16:00', end: '20:00' }] },
            { day: 'Wednesday', slots: [{ start: '16:00', end: '20:00' }] },
            { day: 'Thursday', slots: [{ start: '16:00', end: '20:00' }] },
            { day: 'Friday', slots: [{ start: '16:00', end: '20:00' }] },
            { day: 'Saturday', slots: [{ start: '10:00', end: '18:00' }] },
            { day: 'Sunday', slots: [{ start: '10:00', end: '14:00' }] }
        ],
        travelRadius: ['home','both'].includes(spec.mode) ? rnd(3, 15) : 0,
        noticePeriodHours: 24,
        maxSessionsPerDay: rnd(4, 8),
        education: { degree, institution: edu, year: String(2000 + rnd(0, 24)) },
        qualifications: [degree, `${spec.exp}+ years teaching`, pick(['B.Ed','TEFL','Cambridge Certified'])].filter(Boolean),
        strengthTags: pickN(['Patient','Clear explainer','Fast replier','Encouraging','Exam-focused','Concepts-first','Homework checker'], 3),
        profileStatus: 'approved',
        verificationLevel: rndChance(0.7) ? 'full' : 'id',
        profileCompletionScore: rnd(70, 100),
        approvalStatus: 'approved',
        tutorCode: `TUT-${oid().toString().slice(-6).toUpperCase()}`,
        approvalHistory: [
            { action: 'submitted', timestamp: daysAgo(rnd(30, 180)), note: 'Initial submission' },
            { action: 'approved', adminId: admin._id, adminName: admin.name, timestamp: daysAgo(rnd(28, 170)), note: 'Approved' }
        ],
        averageRating: spec.rating,
        totalReviews: Math.ceil(spec.sessions * 0.4),
        tier: spec.tier,
        totalSessions: spec.sessions,
        currentCommissionRate: TIER_COMMISSION[spec.tier],
        tierUpdatedAt: daysAgo(rnd(7, 90)),
        lifetimeGrossEarnings: Math.round(spec.sessions * spec.rate * 0.8),
        lifetimeCommissionPaid: Math.round(spec.sessions * spec.rate * 0.8 * TIER_COMMISSION[spec.tier] / 100),
        lifetimeIncentivesPaid: Math.round(spec.sessions * spec.rate * 0.03),
        riskScore: spec.tier === 'starter' ? rnd(0, 30) : rnd(0, 10),
        flaggedEventsCount: rndChance(0.1) ? rnd(1, 3) : 0,
        vacation: spec.vacation ? {
            active: true, from: daysAgo(3),
            to: daysFromNow(10), message: 'Back after exams'
        } : { active: false }
    });
}
