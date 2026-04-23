#!/usr/bin/env node
/**
 * Verify Razorpay keys against the real API.
 *
 * Usage:
 *   node scripts/verify-razorpay-keys.js
 *   node scripts/verify-razorpay-keys.js rzp_test_XXXX secret_XXXX   (override .env)
 *
 * Exit codes: 0 = valid, 1 = invalid
 */

require('dotenv').config();
const Razorpay = require('razorpay');

const keyId = process.argv[2] || process.env.RAZORPAY_KEY_ID;
const keySecret = process.argv[3] || process.env.RAZORPAY_KEY_SECRET;

const c = {
    g: (s) => `\x1b[32m${s}\x1b[0m`,
    r: (s) => `\x1b[31m${s}\x1b[0m`,
    y: (s) => `\x1b[33m${s}\x1b[0m`,
    dim: (s) => `\x1b[2m${s}\x1b[0m`,
    bold: (s) => `\x1b[1m${s}\x1b[0m`
};

async function main() {
    console.log(c.bold('\n━━━ Razorpay key check ━━━'));
    if (!keyId || !keySecret) {
        console.log(c.r('✗ No key_id / key_secret provided or found in .env'));
        console.log(c.dim('  Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env'));
        process.exit(1);
    }

    console.log(`  key_id:      ${keyId}`);
    console.log(`  secret:      ${c.dim(keySecret.slice(0, 6) + '...')} (${keySecret.length} chars)`);
    const envType = keyId.startsWith('rzp_test_') ? 'TEST' : keyId.startsWith('rzp_live_') ? 'LIVE' : 'UNKNOWN';
    console.log(`  environment: ${envType === 'TEST' ? c.y(envType) : envType === 'LIVE' ? c.g(envType) : c.r(envType)}`);
    console.log('');

    const rz = new Razorpay({ key_id: keyId, key_secret: keySecret });

    try {
        // Cheapest auth-only call: list orders (count 1)
        const result = await rz.orders.all({ count: 1 });
        console.log(c.g('✓ KEYS ARE VALID'));
        console.log(c.dim(`  (Razorpay returned ${result.items?.length ?? 0} existing orders for sanity check)`));
        console.log('');
        console.log(c.bold('Next: '));
        console.log('  1) Make sure server/.env has these same values.');
        console.log('  2) Set PAYMENT_MODE=test in server/.env');
        console.log('  3) Restart server: cd server && npm run dev');
        console.log('  4) Subscribe from the app → real Razorpay checkout will open.');
        process.exit(0);
    } catch (err) {
        const desc = err?.error?.description || err?.message || 'Unknown error';
        const code = err?.error?.code || 'ERROR';
        console.log(c.r(`✗ KEYS REJECTED: ${desc}`));
        console.log(c.dim(`  code=${code}`));
        console.log('');

        if (desc.toLowerCase().includes('authentication')) {
            console.log(c.bold('Likely cause:'));
            console.log('  • Keys were regenerated in the dashboard (these old ones are dead)');
            console.log('  • Wrong key/secret pair copied (mismatched)');
            console.log('  • Account was deleted or suspended');
            console.log('');
            console.log(c.bold('Fix:'));
            console.log('  1) Open ' + c.y('https://dashboard.razorpay.com/app/keys'));
            console.log('  2) Confirm Test Mode toggle is ON (yellow banner at top)');
            console.log('  3) Click ' + c.y('"Generate Test Key"') + ' (or ' + c.y('"Regenerate"') + ' if one exists)');
            console.log('  4) Copy BOTH values shown — the secret is only visible once');
            console.log('  5) Run this script with the new values:');
            console.log(c.dim('       node scripts/verify-razorpay-keys.js rzp_test_XXX secret_XXX'));
        } else {
            console.log(c.bold('Raw error:'));
            console.log(c.dim(JSON.stringify(err?.error || err, null, 2)));
        }
        process.exit(1);
    }
}

main();
