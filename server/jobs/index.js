/**
 * Single entry point for every background job this server runs.
 * Each job self-schedules via node-cron. No setInterval, no duplicates.
 *
 * Job           | Cadence       | Purpose
 * ------------- | ------------- | ---------------------------------
 * trialExpiry   | every 10 min  | Cancel expired pending trials
 * sessionExpiry | every 10 min  | Cancel pending sessions past date
 * reminders     | every 15 min  | Send 24h / 1h session reminders
 * reconcile     | weekly        | Fix denormalized counters (ratings, session counts)
 *
 * If you add a job, register it here. Do not schedule intervals in server.js.
 */

const cron = require('node-cron');
const {
    expirePendingTrials,
    expirePendingSessionsWithPastDate,
} = require('./trialExpiry.job');
const { sendSessionReminders } = require('./sessionReminders');
const { reconcileDenormalizedCounters } = require('./reconcileCounters.job');
const { runWeeklyPayout } = require('./weeklyPayout.job');
const { runMonthlyIncentives } = require('./monthlyIncentives.job');

const log = (tag, msg) => console.log(`[jobs:${tag}] ${msg}`);
const safe = (tag, fn) => async () => {
    try {
        await fn();
    } catch (err) {
        console.error(`[jobs:${tag}] error:`, err.message);
    }
};

function startAllJobs() {
    // Every 10 minutes — booking lifecycle
    cron.schedule('*/10 * * * *', safe('expiry', async () => {
        const [trials, sessions] = await Promise.all([
            expirePendingTrials(),
            expirePendingSessionsWithPastDate(),
        ]);
        if ((trials.modifiedCount || 0) + (sessions.modifiedCount || 0) > 0) {
            log('expiry', `trials=${trials.modifiedCount} sessions=${sessions.modifiedCount}`);
        }
    }));

    // Every 15 minutes — send upcoming-session reminders
    cron.schedule('*/15 * * * *', safe('reminders', async () => {
        const r = await sendSessionReminders();
        if (r.processed24h + r.processed1h > 0) {
            log('reminders', `sent 24h=${r.processed24h} 1h=${r.processed1h}`);
        }
    }));

    // Weekly — realign denormalized counters
    cron.schedule('0 4 * * 1', safe('reconcile', async () => {
        const r = await reconcileDenormalizedCounters();
        log('reconcile', `profiles=${r.profilesUpdated} relationships=${r.relationshipsUpdated}`);
    }));

    // Fridays 10:00 — weekly tutor payout rollup
    cron.schedule('0 10 * * 5', safe('payout', async () => {
        const r = await runWeeklyPayout();
        log('payout', `processed=${r.processed} paid=₹${r.totalPaid} errors=${r.errors.length}`);
    }));

    // 1st of month @ 02:00 — monthly incentives (volume bonus, perfect month, cliffs)
    cron.schedule('0 2 1 * *', safe('incentives', async () => {
        const r = await runMonthlyIncentives();
        log('incentives', `month=${r.month} volume=${r.volumeBonuses} perfect=${r.perfectMonths} cliffs=${r.retentionCliffsAwarded}`);
    }));

    log('scheduler', 'all cron jobs registered');
}

module.exports = { startAllJobs };
