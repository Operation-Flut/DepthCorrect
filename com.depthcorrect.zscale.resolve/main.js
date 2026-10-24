'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { expressionForScale, getVectorComponents } = require('./js/fusion');
const { getCurrentFusionComp } = require('./js/resolve-comp');

const PLUGIN_ID = 'com.depthcorrect.zscale.resolve';
const ORIGINAL_SCALE_KEY = 'DepthCorrect.OriginalScale';
const nativePaths = {
    win32: path.join(__dirname, 'native', 'windows-x64', 'WorkflowIntegration.node'),
    darwin: path.join(__dirname, 'native', 'macos-universal', 'WorkflowIntegration.node')
};
const nativePath = nativePaths[process.platform];
let WorkflowIntegration;
let resolve;
let ready = false;
let window;
let fusionComp;
let selectedTools = new Map();
let cameraTools = new Map();
let cleanupStarted = false;

// ---------------------------------------------------------------------------
// Tool helpers
// ---------------------------------------------------------------------------

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

function getVector(tool, inputId) {
    return tool.GetInput(inputId, fusionComp.CurrentTime).then(function (value) {
        const vector = getVectorComponents(value);
        if (vector && vector.every(Number.isFinite)) return vector;

        // Fall back to reading sub-inputs individually.
        return Promise.all([
            tool.GetInput(inputId + '.X', fusionComp.CurrentTime),
            tool.GetInput(inputId + '.Y', fusionComp.CurrentTime),
            tool.GetInput(inputId + '.Z', fusionComp.CurrentTime)
        ]).then(function (components) {
            if (components.every(Number.isFinite)) return components;
            throw new Error('Could not read ' + inputId + ' from node "' +
                getToolName(tool.GetAttrs()) + '".');
        });
    });
}

// ---------------------------------------------------------------------------
// Scan
// ---------------------------------------------------------------------------

function getScaleInput(tool, axis) {
    if (typeof tool.FindInput === 'function') {
        const input = tool.FindInput('Scale.' + axis);
        if (input && typeof input.SetExpression === 'function') return input;
    }
    throw new Error('Fusion did not expose the Scale.' + axis +
        ' expression input on "' + getToolName(tool.GetAttrs()) + '".');
}

async function scanFusion() {
    if (!ready) throw new Error('The Resolve Workflow Integration bridge is not ready.');
    fusionComp = await getCurrentFusionComp(resolve);
    if (!fusionComp) {
        selectedTools = new Map();
        cameraTools = new Map();
        throw new Error('Open the Fusion page with a Fusion composition active, select one or more Transform3D nodes, and scan again.');
    }

    // Selected Transform3D tools.
    const rawSelected = await fusionComp.GetToolList(true);
    selectedTools = new Map();
    if (rawSelected) {
        const keys = Object.keys(rawSelected);
        for (let i = 0; i < keys.length; i += 1) {
            const tool = rawSelected[keys[i]];
            if (!tool || typeof tool !== 'object') continue;
            const attrs = tool.GetAttrs();
            const regId = getToolId(attrs);
            if (regId.indexOf('Transform3D') !== 0 && regId !== 'Transform3DOp') continue;
            const name = getToolName(attrs);
            selectedTools.set(name, { name: name, regId: regId, tool: tool });
        }
    }

    // All Camera3D tools.
    const rawAll = await fusionComp.GetToolList(false);
    cameraTools = new Map();
    if (rawAll) {
        const keys = Object.keys(rawAll);
        for (let i = 0; i < keys.length; i += 1) {
            const tool = rawAll[keys[i]];
            if (!tool || typeof tool !== 'object') continue;
            const attrs = tool.GetAttrs();
            const regId = getToolId(attrs);
            if (regId.indexOf('Camera3D') !== 0) continue;
            const name = getToolName(attrs);
            cameraTools.set(name, { name: name, regId: regId, tool: tool });
        }
    }

    const nodes = [];
    for (const [name, entry] of selectedTools) {
        assertIdentifier(name, 'Transform3D');
        const scale = await getVector(entry.tool, 'Scale');
        nodes.push({
            id: name,
            name: name,
            scaleX: scale[0],
            scaleY: scale[1],
            scaleZ: scale[2]
        });
    }

    return {
        compName: String(fusionComp.Name || 'Fusion composition'),
        nodes: nodes,
        cameras: Array.from(cameraTools.values()).map(function (camera) {
            return { id: camera.name, name: camera.name };
        })
    };
}

// ---------------------------------------------------------------------------
// Apply / Remove
// ---------------------------------------------------------------------------

function requireSelectedNodes(ids) {
    if (!Array.isArray(ids) || ids.length === 0 || ids.some(function (id) { return typeof id !== 'string'; })) {
        throw new Error('Select one or more Transform3D nodes in the Fusion node graph, then scan again.');
    }
    const selected = [];
    for (let i = 0; i < ids.length; i += 1) {
        const entry = selectedTools.get(ids[i]);
        if (!entry) {
            throw new Error('The Fusion selection changed. Select the intended Transform3D nodes and scan again.');
        }
        selected.push(entry);
    }
    return selected;
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
        const axes = ['X', 'Y', 'Z'];
        for (let n = 0; n < nodes.length; n += 1) {
            const entry = nodes[n];
            const tool = entry.tool;
            const scale = await getVector(tool, 'Scale');
            const stored = tool.GetData(ORIGINAL_SCALE_KEY);
            const original = stored ? JSON.parse(stored) : scale;
            const inputs = axes.map(function (axis) { return getScaleInput(tool, axis); });
            changes.push({ tool: tool, inputs: inputs, scale: scale, stored: stored });
            tool.SetData(ORIGINAL_SCALE_KEY, JSON.stringify(original));

            for (let axis = 0; axis < 3; axis += 1) {
                const expression = expressionForScale(
                    entry.name, camera.name, original[axis], referenceDistance
                );
                const result = inputs[axis].SetExpression(expression);
                if (result === false) {
                    throw new Error('Could not set Scale.' + axes[axis] + ' expression on "' + entry.name + '".');
                }
            }
        }
        fusionComp.EndUndo(true);
    } catch (error) {
        const axes = ['X', 'Y', 'Z'];
        for (let i = changes.length - 1; i >= 0; i -= 1) {
            const change = changes[i];
            for (let axis = 0; axis < 3; axis += 1) {
                change.inputs[axis].SetExpression('');
                change.tool.SetInput('Scale.' + axes[axis], change.scale[axis], fusionComp.CurrentTime);
            }
            if (change.stored) {
                change.tool.SetData(ORIGINAL_SCALE_KEY, change.stored);
            } else {
                change.tool.SetData(ORIGINAL_SCALE_KEY, '');
            }
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
        const axes = ['X', 'Y', 'Z'];
        for (let n = 0; n < nodes.length; n += 1) {
            const entry = nodes[n];
            const tool = entry.tool;
            const stored = tool.GetData(ORIGINAL_SCALE_KEY);
            if (!stored) continue;
            const original = JSON.parse(stored);
            const inputs = axes.map(function (axis) { return getScaleInput(tool, axis); });
            changes.push({ tool: tool, inputs: inputs, original: original });

            for (let axis = 0; axis < 3; axis += 1) {
                inputs[axis].SetExpression('');
                tool.SetInput('Scale.' + axes[axis], original[axis], fusionComp.CurrentTime);
            }
            tool.SetData(ORIGINAL_SCALE_KEY, '');
        }
        fusionComp.EndUndo(true);
    } catch (error) {
        fusionComp.EndUndo(false);
        throw error;
    }
    return { removed: changes.length };
}

// ---------------------------------------------------------------------------
// IPC / Window / Lifecycle
// ---------------------------------------------------------------------------

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

    if (!nativePath || !fs.existsSync(nativePath)) {
        console.error('DepthCorrect could not find Resolve bridge:', nativePath || process.platform);
        return;
    }
    try {
        WorkflowIntegration = require(nativePath);
        const initialize = typeof WorkflowIntegration.InitializePromise === 'function'
            ? WorkflowIntegration.InitializePromise(PLUGIN_ID)
            : WorkflowIntegration.Initialize(PLUGIN_ID);
        const initialized = await initialize;
        if (!initialized) throw new Error('The Resolve bridge rejected initialization.');
        resolve = typeof WorkflowIntegration.GetResolvePromise === 'function'
            ? await WorkflowIntegration.GetResolvePromise()
            : await WorkflowIntegration.GetResolve();
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

async function cleanupBridge() {
    if (cleanupStarted || !WorkflowIntegration || typeof WorkflowIntegration.CleanUp !== 'function') return;
    cleanupStarted = true;
    try {
        await WorkflowIntegration.CleanUp();
    } catch (error) {
        console.error('DepthCorrect Resolve cleanup failed:', error);
    }
}

app.on('before-quit', function (event) {
    if (cleanupStarted) return;
    event.preventDefault();
    cleanupBridge().finally(function () { app.exit(0); });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
