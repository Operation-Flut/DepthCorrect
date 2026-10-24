/**
 * DepthCorrect - ExtendScript Host Script for After Effects
 * Streamlined dynamic perspective expressions & layer management
 */

// JSON polyfill for ExtendScript (ES3)
if (typeof JSON !== 'object') {
    JSON = {};
}
(function() {
    'use strict';
    var rx_escapable = /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    var meta = {
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"': '\\"',
        '\\': '\\\\'
    };

    function quote(string) {
        rx_escapable.lastIndex = 0;
        return rx_escapable.test(string) ? '"' + string.replace(rx_escapable, function(a) {
            var c = meta[a];
            return typeof c === 'string' ? c : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }

    function str(key, holder) {
        var i, k, v, length, partial, value = holder[key];
        switch (typeof value) {
            case 'string':
                return quote(value);
            case 'number':
                return isFinite(value) ? String(value) : 'null';
            case 'boolean':
            case 'null':
                return String(value);
            case 'object':
                if (!value) return 'null';
                partial = [];
                if (Object.prototype.toString.apply(value) === '[object Array]') {
                    length = value.length;
                    for (i = 0; i < length; i += 1) {
                        partial[i] = str(i, value) || 'null';
                    }
                    return '[' + partial.join(',') + ']';
                }
                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + ':' + v);
                        }
                    }
                }
                return '{' + partial.join(',') + '}';
        }
    }

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function(value) {
            return str('', { '': value });
        };
    }
}());

var DepthCorrect = DepthCorrect || {};

/**
 * Find active camera in composition
 */
DepthCorrect.findCamera = function() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) return null;

    for (var i = 1; i <= comp.numLayers; i++) {
        var layer = comp.layer(i);
        if (layer instanceof CameraLayer && layer.enabled) {
            return layer;
        }
    }
    return null;
};

/**
 * Calculate 3D distance between a layer and camera
 */
DepthCorrect.getLayerDistanceToCamera = function(layer, cam) {
    try {
        cam = cam || DepthCorrect.findCamera();
        if (!cam) return 1000;

        var camPos = cam.property("Transform").property("Position").value;
        var layerPos = layer.property("Transform").property("Position").value;

        var dx = layerPos[0] - camPos[0];
        var dy = layerPos[1] - camPos[1];
        var dz = (layerPos.length > 2 && camPos.length > 2) ? (layerPos[2] - camPos[2]) : 1000;

        var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        return d > 0 ? d : 1000;
    } catch(e) {
        return 1000;
    }
};

/**
 * Scan composition for 3D layers and check expression state
 */
DepthCorrect.scanLayers = function(referenceDistance) {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ success: false, error: 'No active composition' });
        }

        var cam = DepthCorrect.findCamera();
        var layers = [];
        var selectedCount = (comp.selectedLayers && comp.selectedLayers.length) || 0;

        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            if (layer !== cam && (layer.threeDLayer || layer.selected)) {
                var baseScale = DepthCorrect.getLayerScale(layer);
                var currentDist = DepthCorrect.getLayerDistanceToCamera(layer, cam);

                var scaleProp = layer.property("Transform").property("Scale");
                var hasExpr = false;
                try {
                    hasExpr = scaleProp.expressionEnabled && scaleProp.expression.indexOf("DepthCorrect") !== -1;
                } catch(e) {}

                layers.push({
                    name: layer.name,
                    index: layer.index,
                    is3D: layer.threeDLayer,
                    baseScale: { x: baseScale.x * 100, y: baseScale.y * 100, z: baseScale.z * 100 },
                    currentZ: Math.round(currentDist),
                    hasExpression: hasExpr,
                    selected: layer.selected
                });
            }
        }

        return JSON.stringify({
            success: true,
            hasCamera: (cam !== null),
            selectedCount: selectedCount,
            layers: layers
        });
    } catch (e) {
        return JSON.stringify({ success: false, error: e.toString() });
    }
};

/**
 * Apply dynamic Z-Scale expression to selected layer(s) or specified layer
 *
 * @param {number} referenceDistance
 * @param {boolean} useCurrentDistance
 * @param {string} specificLayerName (optional)
 */
DepthCorrect.applyExpression = function(referenceDistance, useCurrentDistance, specificLayerName) {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ success: false, error: 'No active composition. Open a comp first.' });
        }

        var cam = DepthCorrect.findCamera();
        if (!cam) {
            try {
                cam = comp.layers.addCamera("DepthCorrect Camera", [comp.width / 2, comp.height / 2]);
            } catch (e) {
                return JSON.stringify({ success: false, error: 'Could not create camera: ' + e.toString() });
            }
        }

        var defaultRef = Number(referenceDistance) || 1000;
        var useCur = (useCurrentDistance === true || useCurrentDistance === 'true');

        var targetLayers = [];
        if (specificLayerName && specificLayerName !== '') {
            for (var s = 1; s <= comp.numLayers; s++) {
                if (comp.layer(s).name === specificLayerName) {
                    targetLayers.push(comp.layer(s));
                    break;
                }
            }
        } else if (comp.selectedLayers && comp.selectedLayers.length > 0) {
            for (var i = 0; i < comp.selectedLayers.length; i++) {
                if (comp.selectedLayers[i] !== cam) {
                    targetLayers.push(comp.selectedLayers[i]);
                }
            }
        } else {
            for (var j = 1; j <= comp.numLayers; j++) {
                var l = comp.layer(j);
                if (l !== cam && l.threeDLayer) {
                    targetLayers.push(l);
                }
            }
        }

        if (targetLayers.length === 0) {
            return JSON.stringify({ success: false, error: 'Please select a layer in After Effects.' });
        }

        var applied = 0;
        app.beginUndoGroup("Apply DepthCorrect Dynamic Scale");

        for (var k = 0; k < targetLayers.length; k++) {
            var layer = targetLayers[k];

            if (!layer.threeDLayer) {
                layer.threeDLayer = true;
            }

            var layerRef = defaultRef;
            if (useCur) {
                var curDist = DepthCorrect.getLayerDistanceToCamera(layer, cam);
                if (curDist > 1) {
                    layerRef = Math.round(curDist);
                }
            }

            var effects = layer.property("ADBE Effect Parade") || layer.property("Effects");
            var slider = null;
            if (effects) {
                try {
                    slider = effects.property("Z-Reference Distance");
                } catch(e) {}
                if (!slider && effects.canAddProperty("ADBE Slider Control")) {
                    slider = effects.addProperty("ADBE Slider Control");
                    slider.name = "Z-Reference Distance";
                }
                if (slider) {
                    try {
                        slider.property("Slider").setValue(layerRef);
                    } catch(e) {}
                }
            }

            var expr =
                "// DepthCorrect Dynamic Z-Scale\n" +
                "try {\n" +
                "    var cam = thisComp.activeCamera;\n" +
                "    var camPos = cam.toWorld([0, 0, 0]);\n" +
                "    var layerPos = toWorld(anchorPoint);\n" +
                "    var d = length(camPos, layerPos);\n" +
                "    var ref = " + layerRef + ";\n" +
                "    try {\n" +
                "        ref = effect(\"Z-Reference Distance\")(\"Slider\").value;\n" +
                "    } catch(e) {}\n" +
                "    var factor = d / Math.max(0.01, ref);\n" +
                "    [value[0] * factor, value[1] * factor, value[2] * factor];\n" +
                "} catch (err) {\n" +
                "    value;\n" +
                "}";

            var scaleProp = layer.property("Transform").property("Scale");
            scaleProp.expression = expr;
            applied++;
        }

        app.endUndoGroup();

        return JSON.stringify({
            success: true,
            appliedCount: applied,
            message: 'Applied to ' + applied + ' layer' + (applied !== 1 ? 's' : '')
        });
    } catch (e) {
        return JSON.stringify({ success: false, error: e.toString() });
    }
};

/**
 * Remove dynamic scale expression from layer(s)
 *
 * @param {string} specificLayerName (optional)
 */
DepthCorrect.removeExpression = function(specificLayerName) {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({ success: false, error: 'No active composition' });
        }

        var targetLayers = [];
        if (specificLayerName && specificLayerName !== '') {
            for (var s = 1; s <= comp.numLayers; s++) {
                if (comp.layer(s).name === specificLayerName) {
                    targetLayers.push(comp.layer(s));
                    break;
                }
            }
        } else if (comp.selectedLayers && comp.selectedLayers.length > 0) {
            for (var i = 0; i < comp.selectedLayers.length; i++) {
                targetLayers.push(comp.selectedLayers[i]);
            }
        } else {
            for (var j = 1; j <= comp.numLayers; j++) {
                targetLayers.push(comp.layer(j));
            }
        }

        var removed = 0;
        app.beginUndoGroup("Remove DepthCorrect Expression");

        for (var k = 0; k < targetLayers.length; k++) {
            var layer = targetLayers[k];
            try {
                var scaleProp = layer.property("Transform").property("Scale");
                if (scaleProp && scaleProp.expression !== "") {
                    scaleProp.expression = "";
                    removed++;
                }
            } catch(e) {}
        }

        app.endUndoGroup();

        return JSON.stringify({
            success: true,
            removedCount: removed,
            message: 'Removed from ' + removed + ' layer' + (removed !== 1 ? 's' : '')
        });
    } catch (e) {
        return JSON.stringify({ success: false, error: e.toString() });
    }
};

/**
 * Select a specific layer in After Effects timeline
 */
DepthCorrect.selectLayer = function(layerName) {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) return JSON.stringify({ success: false });

        for (var i = 1; i <= comp.numLayers; i++) {
            var l = comp.layer(i);
            l.selected = (l.name === layerName);
        }
        return JSON.stringify({ success: true });
    } catch(e) {
        return JSON.stringify({ success: false, error: e.toString() });
    }
};

/**
 * Set base scale value for selected or specific layer
 */
DepthCorrect.setBaseScale = function(layerName, scale) {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) return JSON.stringify({ success: false });

        var targetLayers = [];
        if (layerName && layerName !== '') {
            for (var i = 1; i <= comp.numLayers; i++) {
                if (comp.layer(i).name === layerName) {
                    targetLayers.push(comp.layer(i));
                    break;
                }
            }
        } else if (comp.selectedLayers && comp.selectedLayers.length > 0) {
            for (var j = 0; j < comp.selectedLayers.length; j++) {
                targetLayers.push(comp.selectedLayers[j]);
            }
        }

        if (targetLayers.length === 0) {
            return JSON.stringify({ success: false, error: 'No layer selected' });
        }

        app.beginUndoGroup("Set Base Scale");
        for (var k = 0; k < targetLayers.length; k++) {
            var scaleProp = targetLayers[k].property("Transform").property("Scale");
            scaleProp.setValue([scale.x, scale.y, scale.z]);
        }
        app.endUndoGroup();

        return JSON.stringify({ success: true });
    } catch (e) {
        return JSON.stringify({ success: false, error: e.toString() });
    }
};

/**
 * Get layer scale
 */
DepthCorrect.getLayerScale = function(layer) {
    if (!layer) return { x: 1, y: 1, z: 1 };
    try {
        var scale = layer.property("Transform").property("Scale").value;
        return {
            x: scale[0] / 100,
            y: scale[1] / 100,
            z: scale.length > 2 ? (scale[2] / 100) : 1
        };
    } catch (e) {
        return { x: 1, y: 1, z: 1 };
    }
};
