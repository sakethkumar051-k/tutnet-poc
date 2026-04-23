const nodemailer = require('nodemailer');

let cachedTransport = null;

function getTransport() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT, 10) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) return null;
    if (!cachedTransport) {
        cachedTransport = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass }
        });
    }
    return cachedTransport;
}

/**
 * Send email when SMTP_* env vars are set. Otherwise logs once per process (dev visibility).
 */
async function sendEmailIfConfigured({ to, subject, text, html }) {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const transport = getTransport();
    if (!transport || !from || !to) {
        if (process.env.NODE_ENV !== 'production') {
            console.log('[email] (not configured) would send:', { to, subject });
        }
        return { sent: false, reason: 'smtp_not_configured' };
    }
    try {
        await transport.sendMail({
            from,
            to,
            subject,
            text: text || undefined,
            html: html || undefined
        });
        return { sent: true };
    } catch (err) {
        console.error('[email] send failed:', err.message);
        return { sent: false, reason: err.message };
    }
}

module.exports = { sendEmailIfConfigured };
