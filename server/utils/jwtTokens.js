const jwt = require('jsonwebtoken');

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '14d';

function generateAccessToken(userId) {
    return jwt.sign({ id: userId, typ: 'access' }, process.env.JWT_SECRET, {
        expiresIn: ACCESS_EXPIRES
    });
}

function generateRefreshToken(userId) {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    return jwt.sign({ id: userId, typ: 'refresh' }, secret, {
        expiresIn: REFRESH_EXPIRES
    });
}

function verifyRefreshToken(token) {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);
    if (decoded.typ !== 'refresh') {
        const err = new Error('Invalid refresh token');
        err.statusCode = 401;
        throw err;
    }
    return decoded;
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken
};
