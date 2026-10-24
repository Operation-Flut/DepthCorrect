'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

function correctedScale(distance, referenceDistance) {
    return distance / Math.max(0.001, referenceDistance);
}

test('corrected scale is one at the reference distance', () => {
    assert.equal(correctedScale(10, 10), 1);
});

test('corrected scale grows with camera distance', () => {
    assert.equal(correctedScale(20, 10), 2);
});

test('reference distance is clamped to avoid division by zero', () => {
    assert.equal(correctedScale(2, 0), 2000);
});
