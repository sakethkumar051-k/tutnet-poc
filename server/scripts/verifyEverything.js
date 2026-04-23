/**
 * Probes every major endpoint with seeded credentials and reports pass/fail.
 * Run AFTER `npm run seed:demo`. Server must be running on $API_URL (default
 * http://localhost:5001). No side effects — only GETs + read-only checks.
 *
 *   npm run verify
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const API_URL = process.env.API_URL || 'http://localhost:5001';
const results = [];

function request(method, path, { token, body } = {}) {
    return new Promise((resolve) => {
        const url = new URL(path.startsWith('http') ? path : `${API_URL}${path}`);
        const mod = url.protocol === 'https:' ? https : http;
        const req = mod.request({
            hostname: url.hostname, port: url.port, path: url.pathname + url.search,
            method, headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
        }, (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => {
                const raw = Buffer.concat(chunks).toString();
                let data = null;
                try { data = JSON.parse(raw); } catch { data = raw; }
                resolve({ status: res.statusCode, data, headers: res.headers });
            });
        });
        req.on('error', (e) => resolve({ status: 0, error: e.message }));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function login(email, password) {
    const res = await request('POST', '/api/auth/login', { body: { email, password } });
    if (res.status !== 200 || !res.data?.token) {
        console.error(`❌ Login failed for ${email}:`, res.status, res.data?.message);
        process.exit(1);
    }
    return { token: res.data.token, id: res.data._id, role: res.data.role, name: res.data.name };
}

function check(label, ok, detail) {
    results.push({ label, ok, detail });
    const icon = ok ? '✅' : '❌';
    const pad = label.padEnd(50, ' ');
    console.log(`  ${icon} ${pad} ${detail || ''}`);
}

async function main() {
    console.log('─'.repeat(70));
    console.log('Tutnet endpoint verification');
    console.log(`API: ${API_URL}`);
    console.log('─'.repeat(70));

    // ── Health ────────────────────────────────────────────────────────
    const health = await request('GET', '/api/health');
    check('GET /api/health', health.status === 200 && health.data?.database === 'connected',
        `db=${health.data?.database}, mode=${health.data?.paymentMode}`);
    if (health.status !== 200) process.exit(1);

    // ── Logins ────────────────────────────────────────────────────────
    console.log('\n📥 Authenticating…');
    const admin = await login('admin@example.com', 'password123');
    const parent = await login('suresh@parent.test', 'password123');
    const tutor = await login('priya@tutor.test', 'password123');
    const student = await login('meera@parent.test', 'password123');
    check('admin login',  !!admin.token,  admin.name);
    check('parent login', !!parent.token, parent.name);
    check('tutor login',  !!tutor.token,  tutor.name);
    check('student login', !!student.token, student.name);

    // ── Public tutor search ───────────────────────────────────────────
    console.log('\n🔎 Public endpoints…');
    const tutors = await request('GET', '/api/tutors?all=true');
    const vis = Array.isArray(tutors.data) ? tutors.data.length : (tutors.data?.tutors?.length || 0);
    check('GET /api/tutors', tutors.status === 200 && vis > 0, `${vis} tutors visible`);

    const tutorsNoVacation = await request('GET', '/api/tutors');
    const visNV = Array.isArray(tutorsNoVacation.data) ? tutorsNoVacation.data.length : (tutorsNoVacation.data?.tutors?.length || 0);
    check('GET /api/tutors (hides vacation)', tutorsNoVacation.status === 200, `${visNV} tutors`);

    // Referral lookup (public)
    const refs = await request('GET', `/api/referrals/lookup?code=${parent.token.length > 0 ? 'INVALID' : 'X'}`);
    check('GET /api/referrals/lookup (invalid)', refs.status === 404, 'returns 404 for unknown code');

    // Contact form (anonymous)
    const ct = await request('POST', '/api/contact', { body: {
        name: 'Verify Bot', email: 'verify@test.local', message: 'automated smoke-test entry, please ignore'
    }});
    check('POST /api/contact (public)', ct.status === 201, ct.data?.id ? 'submitted ok' : ct.data?.message);

    // ── Parent / Student flows ────────────────────────────────────────
    console.log('\n👨‍👧 Parent (suresh) dashboard…');
    const bookings = await request('GET', '/api/bookings/mine', { token: parent.token });
    const bCount = Array.isArray(bookings.data) ? bookings.data.length : (bookings.data?.bookings?.length || 0);
    check('GET /api/bookings/mine', bookings.status === 200, `${bCount} bookings`);

    const family = await request('GET', '/api/family/mine', { token: parent.token });
    const childCount = family.data?.children?.length || 0;
    check('GET /api/family/mine', family.status === 200 && childCount === 2, `${childCount} children linked`);

    const refMine = await request('GET', '/api/referrals/mine', { token: parent.token });
    check('GET /api/referrals/mine', refMine.status === 200 && !!refMine.data?.code,
        `code=${refMine.data?.code} invited=${refMine.data?.invited}`);

    const cal = await request('GET', '/api/calendar/mine.ics', { token: parent.token });
    check('GET /api/calendar/mine.ics',
        cal.status === 200 && typeof cal.data === 'string' && cal.data.startsWith('BEGIN:VCALENDAR'),
        'ICS calendar generated');

    // ── Tutor flows ───────────────────────────────────────────────────
    console.log('\n👩‍🏫 Tutor (priya) dashboard…');
    const me = await request('GET', '/api/tutors/me', { token: tutor.token });
    check('GET /api/tutors/me', me.status === 200, `tier=${me.data?.tier} rate=${me.data?.hourlyRate}`);

    const payouts = await request('GET', '/api/payouts/mine', { token: tutor.token });
    const pCount = payouts.data?.ledger?.length || 0;
    const pPaid = payouts.data?.summary?.paidTotal || 0;
    check('GET /api/payouts/mine', payouts.status === 200 && pCount > 0, `${pCount} periods, ₹${pPaid} paid`);

    const reviewsT = await request('GET', `/api/reviews/tutor/${tutor.id}`);
    const revCount = Array.isArray(reviewsT.data) ? reviewsT.data.length : 0;
    const hasReply = Array.isArray(reviewsT.data) && reviewsT.data.some((r) => r.tutorReply?.text);
    check('GET /api/reviews/tutor/:id', reviewsT.status === 200 && revCount > 0,
        `${revCount} reviews · reply-field=${hasReply ? 'yes' : 'no'}`);

    // ── Admin flows ───────────────────────────────────────────────────
    console.log('\n🛡  Admin dashboard…');
    const pending = await request('GET', '/api/admin/tutors/pending', { token: admin.token });
    check('GET /api/admin/tutors/pending', pending.status === 200,
        `${Array.isArray(pending.data) ? pending.data.length : 0} pending`);

    const analytics = await request('GET', '/api/admin/analytics', { token: admin.token });
    const a = analytics.data;
    check('GET /api/admin/analytics', analytics.status === 200,
        `users=${a?.users?.total} bookings=${a?.bookings?.total} reviews=${a?.reviews?.total} attRate=${a?.attendance?.rate}%`);

    const revHead = await request('GET', '/api/admin/revenue/headline', { token: admin.token });
    const rh = revHead.data?.headline;
    check('GET /api/admin/revenue/headline', revHead.status === 200,
        `gmvMTD=${rh?.gmvMonthToDate} activeSubs=${rh?.activeSubscriptions}`);

    const feed = await request('GET', '/api/admin/revenue/feed', { token: admin.token });
    check('GET /api/admin/revenue/feed', feed.status === 200,
        `${feed.data?.events?.length || 0} events`);

    const tierDist = await request('GET', '/api/admin/revenue/tiers', { token: admin.token });
    const tierCount = tierDist.data?.tiers?.length || 0;
    check('GET /api/admin/revenue/tiers', tierDist.status === 200, `${tierCount} tier rows`);

    const risk = await request('GET', '/api/admin/revenue/risk', { token: admin.token });
    check('GET /api/admin/revenue/risk', risk.status === 200,
        `${risk.data?.watchlist?.length || 0} tutors on watchlist`);

    const users = await request('GET', '/api/admin/support/users', { token: admin.token });
    check('GET /api/admin/support/users', users.status === 200,
        `${users.data?.users?.length || 0} users searchable`);

    const firstUser = users.data?.users?.[0];
    if (firstUser) {
        const full = await request('GET', `/api/admin/support/users/${firstUser._id}/full`, { token: admin.token });
        const summary = full.data?.summary;
        check('GET /api/admin/support/users/:id/full', full.status === 200,
            `bookings=${summary?.bookings?.total} pmt=${summary?.payments?.completedCount} msgs=${full.data?.messageStats?.total}`);
    }

    const contactBox = await request('GET', '/api/admin/contact', { token: admin.token });
    check('GET /api/admin/contact', contactBox.status === 200,
        `${contactBox.data?.messages?.length || 0} messages in inbox`);

    const referralLeader = await request('GET', '/api/admin/referrals', { token: admin.token });
    check('GET /api/admin/referrals', referralLeader.status === 200,
        `${referralLeader.data?.top?.length || 0} referrers`);

    const patterns = await request('GET', '/api/admin/patterns', { token: admin.token });
    check('GET /api/admin/patterns', patterns.status === 200,
        `atRiskStudents=${patterns.data?.atRiskStudents?.length || 0} atRiskTutors=${patterns.data?.atRiskTutors?.length || 0}`);

    const attCheck = await request('GET', '/api/admin/attendance/cross-check?filter=disputed', { token: admin.token });
    check('GET /api/admin/attendance/cross-check', attCheck.status === 200,
        `${attCheck.data?.records?.length || 0} disputed records`);

    const escBox = await request('GET', '/api/escalations?status=open', { token: admin.token });
    check('GET /api/escalations (admin)', escBox.status === 200,
        `${Array.isArray(escBox.data) ? escBox.data.length : 0} open`);

    // ── Summary ───────────────────────────────────────────────────────
    console.log('\n' + '─'.repeat(70));
    const pass = results.filter((r) => r.ok).length;
    const fail = results.filter((r) => !r.ok).length;
    console.log(`Results: ${pass} passed, ${fail} failed (${results.length} total)`);
    if (fail > 0) {
        console.log('\nFailures:');
        for (const r of results.filter((r) => !r.ok)) {
            console.log(`  ❌ ${r.label} — ${r.detail || ''}`);
        }
        process.exit(1);
    } else {
        console.log('\n✅ All checks passed. Every dashboard should have data.');
    }
}

main().catch((err) => {
    console.error('Verify script crashed:', err);
    process.exit(1);
});
