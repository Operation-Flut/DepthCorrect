'use strict';

function correctedZoom(baseZoom, distance, referenceDistance) {
    if (!Number.isFinite(baseZoom)) {
        throw new RangeError('Base zoom must be a finite number.');
    }
    if (!Number.isFinite(distance) || distance <= 0) {
        throw new RangeError('Depth must be a finite number greater than zero.');
    }
    if (!Number.isFinite(referenceDistance) || referenceDistance <= 0) {
        throw new RangeError('Reference distance must be a finite number greater than zero.');
    }
    return baseZoom * distance / referenceDistance;
}

if (typeof module !== 'undefined') {
    module.exports = { correctedZoom };
}
