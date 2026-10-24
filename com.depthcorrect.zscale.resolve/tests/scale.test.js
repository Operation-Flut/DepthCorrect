'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { correctedZoom } = require('../js/scale');
const { expressionForScale, getVectorComponents, correctedScale } = require('../js/fusion');

// ---- scale.js: correctedZoom (baked mode) ----

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

// ---- fusion.js: getVectorComponents ----

test('getVectorComponents handles array input', function () {
    assert.deepEqual(getVectorComponents([1, 2, 3]), [1, 2, 3]);
});

test('getVectorComponents handles named object input', function () {
    assert.deepEqual(getVectorComponents({ X: 1.5, Y: 2.5, Z: 3.5 }), [1.5, 2.5, 3.5]);
});

test('getVectorComponents handles scalar input', function () {
    assert.deepEqual(getVectorComponents(5), [5, 5, 5]);
});

test('getVectorComponents returns null for null and undefined', function () {
    assert.equal(getVectorComponents(null), null);
    assert.equal(getVectorComponents(undefined), null);
});

// ---- fusion.js: expressionForScale ----

test('generates a valid expression referencing both nodes', function () {
    const expr = expressionForScale('Transform1', 'Camera3D1', 1.5, 1000);
    assert.ok(expr.indexOf('Transform1') >= 0);
    assert.ok(expr.indexOf('Camera3D1') >= 0);
    assert.ok(expr.indexOf('sqrt') >= 0);
    assert.ok(expr.indexOf('(1.5)') >= 0);
    assert.ok(expr.indexOf('(1000)') >= 0);
});

test('expression uses Transform3DOp.Translate for distance', function () {
    const expr = expressionForScale('A', 'B', 1, 100);
    assert.ok(expr.indexOf('Transform3DOp.Translate.X') >= 0);
    assert.ok(expr.indexOf('Transform3DOp.Translate.Y') >= 0);
    assert.ok(expr.indexOf('Transform3DOp.Translate.Z') >= 0);
});

test('rejects non-finite base scale', function () {
    assert.throws(function () { expressionForScale('A', 'B', Infinity, 1000); }, RangeError);
    assert.throws(function () { expressionForScale('A', 'B', NaN, 1000); }, RangeError);
});

test('rejects non-positive reference distance', function () {
    assert.throws(function () { expressionForScale('A', 'B', 1.0, 0); }, RangeError);
    assert.throws(function () { expressionForScale('A', 'B', 1.0, -100); }, RangeError);
});

// ---- fusion.js: correctedScale ----

test('correctedScale matches correctedZoom', function () {
    assert.equal(correctedScale(100, 2000, 1000), 200);
    assert.equal(correctedScale(125, 1000, 1000), 125);
});

test('correctedScale rejects invalid inputs', function () {
    assert.throws(function () { correctedScale(100, 0, 1000); }, RangeError);
    assert.throws(function () { correctedScale(100, 1000, -50); }, RangeError);
});
