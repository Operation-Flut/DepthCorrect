'use strict';

(function () {
    var bridge = window.depthCorrect;
    var elements = {
        scan: document.getElementById('scan'),
        reference: document.getElementById('reference'),
        camera: document.getElementById('camera'),
        nodes: document.getElementById('nodes'),
        count: document.getElementById('node-count'),
        status: document.getElementById('status'),
        apply: document.getElementById('apply'),
        restore: document.getElementById('restore')
    };
    var nodes = [];
    var busy = false;

    function setStatus(text) {
        elements.status.textContent = text;
    }

    function setBusy(value) {
        busy = value;
        elements.scan.disabled = value;
        updateActions();
    }

    function selectedIds() {
        return Array.from(elements.nodes.querySelectorAll('input[type="checkbox"]:checked'))
            .map(function (input) { return input.value; });
    }

    function updateActions() {
        var hasSelection = selectedIds().length > 0;
        var hasCamera = elements.camera.value !== '';
        elements.apply.disabled = busy || !hasSelection || !hasCamera;
        elements.restore.disabled = busy || !hasSelection;
    }

    function readPositiveNumber(input, label) {
        var value = Number(input.value);
        if (!Number.isFinite(value) || value <= 0) {
            throw new Error(label + ' must be greater than zero.');
        }
        return value;
    }

    function renderNodes() {
        elements.count.textContent = nodes.length + (nodes.length === 1 ? ' node' : ' nodes');
        if (nodes.length === 0) {
            elements.nodes.innerHTML = '<p class="empty">No Transform3D nodes selected.</p>';
            updateActions();
            return;
        }

        elements.nodes.replaceChildren();
        nodes.forEach(function (node) {
            var row = document.createElement('label');
            row.className = 'node';

            var check = document.createElement('input');
            check.type = 'checkbox';
            check.value = node.id;
            check.checked = true;
            check.addEventListener('change', updateActions);

            var info = document.createElement('span');
            var nameEl = document.createElement('span');
            nameEl.className = 'node-name';
            nameEl.textContent = node.name;
            var meta = document.createElement('span');
            meta.className = 'node-meta';
            meta.textContent = 'Scale ' + node.scaleX.toFixed(2) + ' \u00d7 ' +
                node.scaleY.toFixed(2) + ' \u00d7 ' + node.scaleZ.toFixed(2);
            info.append(nameEl, document.createElement('br'), meta);

            row.append(check, info);
            elements.nodes.append(row);
        });
        updateActions();
    }

    function populateCameras(cameras) {
        elements.camera.replaceChildren();
        if (cameras.length === 0) {
            var empty = document.createElement('option');
            empty.value = '';
            empty.textContent = '— No Camera3D found —';
            empty.disabled = true;
            elements.camera.append(empty);
            updateActions();
            return;
        }
        var defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = '— Select a Camera3D —';
        elements.camera.append(defaultOpt);
        cameras.forEach(function (camera) {
            var opt = document.createElement('option');
            opt.value = camera.id;
            opt.textContent = camera.name;
            elements.camera.append(opt);
        });
        if (cameras.length === 1) {
            elements.camera.value = cameras[0].id;
        }
        elements.camera.addEventListener('change', updateActions);
        updateActions();
    }

    async function scan() {
        setBusy(true);
        setStatus('Scanning the active Fusion composition\u2026');
        try {
            var result = await bridge.scan();
            nodes = result.nodes;
            renderNodes();
            populateCameras(result.cameras);
            setStatus(result.compName + ' \u00b7 ' + nodes.length + ' node(s) selected');
        } catch (error) {
            setStatus(error.message);
        } finally {
            setBusy(false);
        }
    }

    async function apply() {
        try {
            var referenceDistance = readPositiveNumber(elements.reference, 'Reference distance');
            var cameraId = elements.camera.value;
            if (!cameraId) throw new Error('Select a Camera3D node.');
            var ids = selectedIds();
            if (ids.length === 0) throw new Error('Select at least one node.');
            setBusy(true);
            var result = await bridge.apply({
                referenceDistance: referenceDistance,
                cameraId: cameraId,
                ids: ids
            });
            setStatus('Applied correction to ' + result.applied + ' node(s).');
        } catch (error) {
            setStatus(error.message);
        } finally {
            setBusy(false);
        }
    }

    async function remove() {
        try {
            var ids = selectedIds();
            if (ids.length === 0) throw new Error('Select at least one node.');
            setBusy(true);
            var result = await bridge.remove({ ids: ids });
            setStatus('Restored original scale on ' + result.removed + ' node(s).');
        } catch (error) {
            setStatus(error.message);
        } finally {
            setBusy(false);
        }
    }

    elements.scan.addEventListener('click', scan);
    elements.apply.addEventListener('click', apply);
    elements.restore.addEventListener('click', remove);
    bridge.onReady(function (result) {
        setStatus(result.ok ? 'Connected to DaVinci Resolve.' : result.error);
        elements.scan.disabled = !result.ok;
        if (result.ok) scan();
    });
})();
