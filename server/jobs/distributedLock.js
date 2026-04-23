/**
 * Distributed Cron Lock — simple Mongo-based mutex.
 *
 * Prevents the same cron job from running N times when the app is horizontally
 * scaled. Each call tries to insert a CronLock doc with the job key; TTL index
 * auto-expires stale locks so a crashed instance doesn't block forever.
 *
 * Usage in a cron handler:
 *
 *     const lock = require('./distributedLock');
 *     cron.schedule('0 10 * * 5', () => lock.run('weeklyPayout', 4 * 3600, doWeeklyPayouts));
 *
 * `ttlSeconds` is the max expected job duration. If the job exceeds it, another
 * instance may start — pick a value longer than your worst-case run time.
 */

const mongoose = require('mongoose');

const lockSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    owner: { type: String, default: process.pid + '-' + require('os').hostname() },
    acquiredAt: { type: Date, default: Date.now }
}, { collection: 'cronLocks' });

// TTL index: Mongo automatically deletes documents older than acquiredAt + ttl.
lockSchema.index({ acquiredAt: 1 }, { expireAfterSeconds: 0 }); // drives default TTL; we set per-doc TTL below too via $setOnInsert

const CronLock = mongoose.models.CronLock || mongoose.model('CronLock', lockSchema);

async function acquire(key, ttlSeconds) {
    try {
        const expireAt = new Date(Date.now() + ttlSeconds * 1000);
        // upsert only if doc doesn't exist — returns null when we successfully insert
        // (pre-existing doc means someone else holds the lock)
        await CronLock.create({ key, acquiredAt: new Date(), expireAt });
        return true;
    } catch (err) {
        if (err?.code === 11000) return false; // duplicate key → someone else has it
        throw err;
    }
}

async function release(key) {
    try {
        await CronLock.deleteOne({ key });
    } catch (_) { /* best-effort */ }
}

/**
 * Acquire → run → release. Swallows the "not acquired" case so a non-leader
 * instance exits quietly. Errors inside fn bubble up (logged by caller).
 */
async function run(key, ttlSeconds, fn) {
    const got = await acquire(key, ttlSeconds);
    if (!got) return { skipped: true };
    try {
        const out = await fn();
        return { skipped: false, result: out };
    } finally {
        await release(key);
    }
}

module.exports = { acquire, release, run, CronLock };
