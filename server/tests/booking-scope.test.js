const test = require('node:test');
const assert = require('node:assert/strict');

const {
    resolveBookingCategory,
    isCategoryMatch,
    validateRouteCategoryPayload,
    validateCategorySpecificFields
} = require('../services/bookingScope.service');

test('cannot create permanent booking via trial route', () => {
    const mismatch = validateRouteCategoryPayload('trial', { bookingCategory: 'permanent' });
    assert.ok(mismatch);
});

test('cannot approve session booking from trial category scope', () => {
    const allowed = isCategoryMatch('trial', 'session');
    assert.equal(allowed, false);
});

test('category mismatch throws validation signal', () => {
    const mismatch = validateRouteCategoryPayload('session', { bookingCategory: 'trial' });
    assert.ok(mismatch);
});

test('legacy booking category fallback still works', () => {
    assert.equal(resolveBookingCategory(undefined, 'demo'), 'trial');
    assert.equal(resolveBookingCategory(undefined, 'regular'), 'session');
    assert.equal(resolveBookingCategory('permanent', 'regular'), 'permanent');
    assert.equal(resolveBookingCategory('dedicated', 'regular'), 'dedicated');
});

test('dedicated/permanent bookings require preferredStartDate, monthsCommitted and termsAccepted', () => {
    const missingStartDate = validateCategorySpecificFields('dedicated', {
        monthsCommitted: 3,
        termsAccepted: true
    });
    assert.equal(missingStartDate.code, 'MISSING_PREFERRED_START_DATE');

    const missingMonths = validateCategorySpecificFields('dedicated', {
        preferredStartDate: '2026-03-20',
        termsAccepted: true
    });
    assert.equal(missingMonths.code, 'MISSING_MONTHS_COMMITTED');

    const missingTerms = validateCategorySpecificFields('dedicated', {
        preferredStartDate: '2026-03-20',
        monthsCommitted: 6,
        termsAccepted: false
    });
    assert.equal(missingTerms.code, 'TERMS_NOT_ACCEPTED');
});
