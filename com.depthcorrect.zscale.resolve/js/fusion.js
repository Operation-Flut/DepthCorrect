'use strict';

/**
 * Generate a Fusion Lua expression that dynamically scales a node based on
 * its world-space distance to a camera node.
 *
 * @param {string} nodeName - Transform3D tool name (must be a valid identifier).
 * @param {string} cameraName - Camera3D tool name (must be a valid identifier).
 * @param {number} baseScale - The original scale value for this axis.
 * @param {number} referenceDistance - Distance at which scale remains unchanged.
 * @returns {string} Fusion Lua expression string.
 */
function expressionForScale(nodeName, cameraName, baseScale, referenceDistance) {
    if (!Number.isFinite(baseScale)) {
        throw new RangeError('Base scale must be a finite number.');
    }
    if (!Number.isFinite(referenceDistance) || referenceDistance <= 0) {
        throw new RangeError('Reference distance must be a finite number greater than zero.');
    }
    var dx = '(' + nodeName + '.Transform3DOp.Translate.X-' + cameraName + '.Transform3DOp.Translate.X)';
    var dy = '(' + nodeName + '.Transform3DOp.Translate.Y-' + cameraName + '.Transform3DOp.Translate.Y)';
    var dz = '(' + nodeName + '.Transform3DOp.Translate.Z-' + cameraName + '.Transform3DOp.Translate.Z)';
    var distance = 'sqrt(' + dx + '^2+' + dy + '^2+' + dz + '^2)';
    return '(' + baseScale + ')*(' + distance + ')/(' + referenceDistance + ')';
}

/**
 * Parse a vector value returned by the Fusion bridge into [X, Y, Z] numbers.
 *
 * Handles compound input objects ({ X, Y, Z }), Lua-style indexed tables,
 * plain arrays, and scalar values.
 *
 * @param {*} value - Raw value from tool.GetInput().
 * @returns {number[]|null} Array of three finite numbers, or null.
 */
function getVectorComponents(value) {
    if (value === null || value === undefined) return null;
    if (Array.isArray(value)) return [value[0], value[1], value[2]];
    if (typeof value === 'object') {
        // Named properties (typical for compound inputs through the bridge).
        var x = value.X !== undefined ? Number(value.X) :
                value.x !== undefined ? Number(value.x) : NaN;
        var y = value.Y !== undefined ? Number(value.Y) :
                value.y !== undefined ? Number(value.y) : NaN;
        var z = value.Z !== undefined ? Number(value.Z) :
                value.z !== undefined ? Number(value.z) : NaN;
        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
            return [x, y, z];
        }
        // Numeric indices — 0-based.
        x = Number(value[0]);
        y = Number(value[1]);
        z = Number(value[2]);
        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
            return [x, y, z];
        }
        // Numeric indices — 1-based (Lua convention).
        x = Number(value[1]);
        y = Number(value[2]);
        z = Number(value[3]);
        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
            return [x, y, z];
        }
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return [value, value, value];
    }
    return null;
}

/**
 * Compute the corrected scale value for a given distance.
 *
 * @param {number} baseScale - Original scale.
 * @param {number} distance - Current camera-to-node distance.
 * @param {number} referenceDistance - Reference distance.
 * @returns {number} Corrected scale.
 */
function correctedScale(baseScale, distance, referenceDistance) {
    if (!Number.isFinite(baseScale)) throw new RangeError('Base scale must be a finite number.');
    if (!Number.isFinite(distance) || distance <= 0) throw new RangeError('Distance must be a finite number greater than zero.');
    if (!Number.isFinite(referenceDistance) || referenceDistance <= 0) throw new RangeError('Reference distance must be a finite number greater than zero.');
    return baseScale * distance / referenceDistance;
}

if (typeof module !== 'undefined') {
    module.exports = {
        expressionForScale: expressionForScale,
        getVectorComponents: getVectorComponents,
        correctedScale: correctedScale
    };
}
