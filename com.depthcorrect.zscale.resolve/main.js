'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

const PLUGIN_ID = 'com.depthcorrect.zscale.resolve';
const ORIGINAL_SCALE_KEY = 'DepthCorrect.OriginalScale';
const nativePaths = {
    win32: path.join(__dirname, 'native', 'windows-x64', 'WorkflowIntegration.node'),
    darwin: path.join(__dirname, 'native', 'macos-universal', 'WorkflowIntegration.node')
};
const nativePath = nativePaths[process.platform];
let resolve;
let ready = false;
let window;
let fusionComp;
let selectedTools = new Map();
let cameraTools = new Map();

function assertIdentifier(name, label) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        throw new Error(label + ' node name "' + name +
            '" is not valid in a Fusion expression. Rename it to use letters, numbers, and underscores.');
    }
}

function getToolName(attrs) {
    const name = attrs && (attrs.TOOLS_Name || attrs.TOOLST_Name);
    if (!name) throw new Error('Fusion returned a node without a name.');
    return String(name);
}

function getToolId(attrs) {
    return String(attrs && (attrs.TOOLS_RegID || attrs.TOOLS_RegId || attrs.TOOLST_RegID) || '');
}

function getToolMap(tools) {
    const result = new Map();
    if (!tools) return result;
    for (const [key, tool] of Object.entries(tools)) {
        if (!tool || typeof tool !== 'object') continue;
        const attrs = tool.GetAttrs();
        const name = getToolName(attrs);
        result.set(name, { name: name, id: name, regId: getToolId(attrs), tool: tool, attrs: attrs, key: key });
    }
    return result;
}

function parameterAxis(value, axis, index) {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'number') return index === 0 ? value : undefined;
    if (Array.isArray(value)) return value[index];
    if (typeof value === 'object') {
        if (Number.isFinite(Number(value[axis]))) return Number(value[axis]);
        if (Number.isFinite(Number(value[index + 1]))) return Number(value[index + 1]);
        if (Number.isFinite(Number(value[index]))) return Number(value[index]);
    }
    return undefined;
}

async function getVector(tool, inputId) {
    const value = await tool.GetInput(inputId, fusionComp.CurrentTime);
    const axes = ['X', 'Y', 'Z'];
    const vector = axes.map(function (axis, index) {
        return parameterAxis(value, axis, index);
    });
    if (vector.some(function (component) { return !Number.isFinite(component); })) {
        throw new Error('Could not read ' + inputId + ' from node "' + getToolName(tool.GetAttrs()) + '".');
    }
    return vector;
}

function getSelectedTransformTools() {
    return fusionComp.GetToolList(true, 'Transform3D');
}

async function scanFusion() {
    if (!ready) throw new Error('The Resolve Workflow Integration bridge is not ready.');
    const fusion = await resolve.Fusion();
    fusionComp = fusion && await fusion.GetCurrentComp();
    if (!fusionComp) {
        selectedTools = new Map();
        cameraTools = new Map();
        throw new Error('Open a Fusion composition, select one or more Transform3D nodes, and scan again.');
    }

    const transforms = getToolMap(await getSelectedTransformTools());
    const cameras = getToolMap(await fusionComp.GetToolList(false, 'Camera3D'));
    selectedTools = new Map();
    cameraTools = cameras;
    const nodes = [];

    for (const [name, entry] of transforms) {
        assertIdentifier(name, 'Transform3D');
        const scale = await getVector(entry.tool, 'Scale');
        selectedTools.set(name, entry);
        nodes.push({
            id: name,
            name: name,
            type: entry.regId,
            scaleX: scale[0],
            scaleY: scale[1],
            scaleZ: scale[2]
        });
    }

    return {
        compName: String(fusionComp.Name || 'Fusion composition'),
        nodes: nodes,
        cameras: Array.from(cameras.values()).map(function (camera) {
            return { id: camera.id, name: camera.name };
        })
    };
}

function requireSelectedNodes(ids) {
    if (!Array.isArray(ids) || ids.length === 0 || ids.some(function (id) { return typeof id !== 'string'; })) {
        throw new Error('Select one or more Transform3D nodes in the Fusion node graph, then scan again.');
    }
    const selected = [];
    for (const id of ids) {
        const entry = selectedTools.get(id);
        if (!entry) {
            throw new Error('The Fusion selection changed. Select the intended Transform3D nodes and scan again.');
        }
        selected.push(entry);
    }
    return selected;
}

function expressionForAxis(nodeName, cameraName, baseScale, referenceDistance) {
    const dx = '(' + nodeName + '.Translation.X-' + cameraName + '.Transform3DOp.Translate.X)';
    const dy = '(' + nodeName + '.Translation.Y-' + cameraName + '.Transform3DOp.Translate.Y)';
    const dz = '(' + nodeName + '.Translation.Z-' + cameraName + '.Transform3DOp.Translate.Z)';
    const distance = 'sqrt(' + dx + '^2+' + dy + '^2+' + dz + '^2)';
    return '(' + baseScale + ')*(' + distance + ')/(' + referenceDistance + ')';
}

function getScaleComponent(tool, axis) {
    const scaleInput = tool.FindInput('Scale');
    const input = scaleInput && scaleInput[axis];
    if (!input || typeof input.SetExpression !== 'function') {
        throw new Error('Fusion did not expose the Scale.' + axis + ' expression input.');
    }
    return input;
}

function getTranslationInput(tool) {
    const input = tool.FindInput('Translation');
    if (!input) throw new Error('Fusion did not expose the Translation input for the selected Transform3D node.');
    return input;
}

async function applyCorrection(options) {
    const referenceDistance = Number(options && options.referenceDistance);
    if (!Number.isFinite(referenceDistance) || referenceDistance <= 0) {
        throw new Error('Reference distance must be a finite number greater than zero.');
    }
    const camera = cameraTools.get(options && options.cameraId);
    if (!camera) throw new Error('Choose a Camera3D node from the active Fusion composition.');
    assertIdentifier(camera.name, 'Camera3D');
    const nodes = requireSelectedNodes(options && options.ids);
    const changes = [];

    fusionComp.StartUndo('Apply DepthCorrect live scale');
    try {
        for (const entry of nodes) {
            const tool = entry.tool;
            const scale = await getVector(tool, 'Scale');
            const translation = await getVector(tool, 'Translation');
            const stored = tool.GetData(ORIGINAL_SCALE_KEY);
            const original = stored ? JSON.parse(stored) : scale;
            const inputs = ['X', 'Y', 'Z'].map(function (axis) {
                return getScaleComponent(tool, axis);
            });
            changes.push({ tool: tool, inputs: inputs, scale: scale, stored: stored });
            tool.SetData(ORIGINAL_SCALE_KEY, JSON.stringify(original));

            for (let axis = 0; axis < 3; axis += 1) {
                const expression = expressionForAxis(entry.name, camera.name, original[axis], referenceDistance);
                const result = inputs[axis].SetExpression(expression);
                if (result === false) {
                    throw new Error('Could not set the Scale.' + ['X', 'Y', 'Z'][axis] + ' expression on "' + entry.name + '".');
                }
            }

            const translationInput = getTranslationInput(tool);
            if (translationInput && typeof translationInput.SetExpression === 'function') {
                throw new Error('The selected Transform3D translation is expression-driven; DepthCorrect requires a directly controlled Translation input.');
            }
        }
        fusionComp.EndUndo(true);
    } catch (error) {
        for (const change of changes.reverse()) {
            for (let axis = 0; axis < 3; axis += 1) {
                change.inputs[axis].SetExpression('');
                change.tool.SetInput('Scale.' + ['X', 'Y', 'Z'][axis], change.scale[axis], fusionComp.CurrentTime);
            }
            if (change.stored) change.tool.SetData(ORIGINAL_SCALE_KEY, change.stored);
            else change.tool.SetData(ORIGINAL_SCALE_KEY, nil);
        }
        fusionComp.EndUndo(false);
        throw error;
    }
    return { applied: nodes.length };
}

async function removeCorrection(ids) {
    const nodes = requireSelectedNodes(ids);
    const changes = [];
    fusionComp.StartUndo('Remove DepthCorrect live scale');
    try {
        for (const entry of nodes) {
            const tool = entry.tool;
            const stored = tool.GetData(ORIGINAL_SCALE_KEY);
            if (!stored) continue;
            const original = JSON.parse(stored);
            const scale = await getVector(tool, 'Scale');
            const inputs = ['X', 'Y', 'Z'].map(function (axis) {
                return getScaleComponent(tool, axis);
            });
            changes.push({ tool: tool, inputs: inputs, scale: scale, original: original });
            for (let axis = 0; axis < 3; axis += 1) {
                inputs[axis].SetExpression('');
                tool.SetInput('Scale.' + ['X', 'Y', 'Z'][axis], original[axis], fusionComp.CurrentTime);
            }
            tool.SetData(ORIGINAL_SCALE_KEY, nil);
        }
        fusionComp.EndUndo(true);
    } catch (error) {
        for (const change of changes.reverse()) {
            for (let axis = 0; axis < 3; axis += 1) {
                change.inputs[axis].SetExpression(expressionForAxis(
                    getToolName(change.tool.GetAttrs()), 'Camera3D1', change.original[axis], 1000
                ));
            }
            change.tool.SetData(ORIGINAL_SCALE_KEY, JSON.stringify(change.original));
        }
        fusionComp.EndUndo(false);
        throw error;
    }
    return { removed: changes.length };
}

function registerHandler(channel, handler) {
    ipcMain.handle(channel, async function (_event, value) {
        try {
            return await handler(value);
        } catch (error) {
            throw new Error(error && error.message ? error.message : String(error));
        }
    });
}

function createWindow() {
    window = new BrowserWindow({
        width: 460,
        height: 620,
        minWidth: 350,
        minHeight: 460,
        title: 'DepthCorrect',
        backgroundColor: '#17191d',
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    window.loadFile(path.join(__dirname, 'index.html'));
    window.webContents.once('did-finish-load', function () {
        window.webContents.send('depthcorrect:ready', ready
            ? { ok: true }
            : { ok: false, error: nativePath
                ? 'Resolve bridge initialization failed. Check the plugin logs and SDK version.'
                : 'No WorkflowIntegration.node bridge is available for this operating system.' });
    });
}

app.whenReady().then(async function () {
    app.setName('DepthCorrect');
    registerHandler('depthcorrect:scan', scanFusion);
    registerHandler('depthcorrect:apply', applyCorrection);
    registerHandler('depthcorrect:remove', removeCorrection);
    createWindow();

    if (!nativePath || !require('node:fs').existsSync(nativePath)) {
        console.error('DepthCorrect could not find Resolve bridge:', nativePath || process.platform);
        return;
    }
    try {
        const WorkflowIntegration = require(nativePath);
        const initialized = await WorkflowIntegration.Initialize(PLUGIN_ID);
        if (!initialized) throw new Error('The Resolve bridge rejected initialization.');
        resolve = await WorkflowIntegration.GetResolve();
        if (!resolve) throw new Error('Could not connect to DaVinci Resolve.');
        ready = true;
        if (window && !window.isDestroyed()) {
            window.webContents.send('depthcorrect:ready', { ok: true });
        }
    } catch (error) {
        console.error('DepthCorrect Resolve initialization failed:', error);
        if (window && !window.isDestroyed()) {
            window.webContents.send('depthcorrect:ready', {
                ok: false,
                error: 'Resolve initialization failed: ' + error.message
            });
        }
    }
});

app.on('window-all-closed', function () {
    app.quit();
});
