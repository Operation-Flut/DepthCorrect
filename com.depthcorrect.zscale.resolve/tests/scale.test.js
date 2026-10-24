'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { correctedZoom } = require('../js/scale');

test('keeps zoom unchanged at the reference distance', function () {
    assert.equal(correctedZoom(125, 1000, 1000), 125);
});

test('increases zoom proportionally for greater depth', function () {
    assert.equal(correctedZoom(100, 2000, 1000), 200);
});

test('scales independent X and Y base zooms by the same ratio', function () {
    assert.deepEqual(
        [correctedZoom(80, 1500, 1000), correctedZoom(120, 1500, 1000)],
        [120, 180]
    );
});

test('rejects non-positive depth or reference values', function () {
    assert.throws(function () { correctedZoom(100, 0, 1000); }, RangeError);
    assert.throws(function () { correctedZoom(100, 1000, 0); }, RangeError);
});

test('rejects invalid base zoom values', function () {
    assert.throws(function () { correctedZoom(Infinity, 1000, 1000); }, RangeError);
});

test('preserves negative zoom used for a flipped clip', function () {
    assert.equal(correctedZoom(-100, 2000, 1000), -200);
});
