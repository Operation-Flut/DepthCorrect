'use strict';

(function () {
    const bridge = window.depthCorrect;
    const elements = {
        scan: document.getElementById('scan'),
        reference: document.getElementById('reference'),
        clips: document.getElementById('clips'),
        count: document.getElementById('clip-count'),
        status: document.getElementById('status'),
        apply: document.getElementById('apply'),
        restore: document.getElementById('restore')
    };
    let clips = [];
    let busy = false;

    function setStatus(text) {
        elements.status.textContent = text;
    }

    function setBusy(value) {
        busy = value;
        elements.scan.disabled = value;
        updateActions();
    }

    function selectedIds() {
        return Array.from(elements.clips.querySelectorAll('input[type="checkbox"]:checked'))
            .map(function (input) { return input.value; });
    }

    function updateActions() {
        const hasSelection = selectedIds().length > 0;
        elements.apply.disabled = busy || !hasSelection;
        elements.restore.disabled = busy || !hasSelection;
    }

    function readPositiveNumber(input, label) {
        const value = Number(input.value);
        if (!Number.isFinite(value) || value <= 0) {
            throw new Error(label + ' must be greater than zero.');
        }
        return value;
    }

    function renderClips() {
        elements.count.textContent = clips.length + (clips.length === 1 ? ' clip' : ' clips');
        if (clips.length === 0) {
            elements.clips.innerHTML = '<p class="empty">No video clips found on this timeline.</p>';
            updateActions();
            return;
        }

        elements.clips.replaceChildren();
        clips.forEach(function (clip) {
            const row = document.createElement('label');
            row.className = 'clip';

            const check = document.createElement('input');
            check.type = 'checkbox';
            check.value = clip.id;
            check.checked = true;
            check.addEventListener('change', updateActions);

            const info = document.createElement('span');
            const name = document.createElement('span');
            name.className = 'clip-name';
            name.textContent = clip.name;
            const meta = document.createElement('span');
            meta.className = 'clip-meta';
            meta.textContent = 'Track ' + clip.track + ' · Zoom ' + clip.zoomX.toFixed(2) + ' × ' + clip.zoomY.toFixed(2);
            info.append(name, document.createElement('br'), meta);

            const depthLabel = document.createElement('span');
            depthLabel.className = 'clip-depth';
            depthLabel.append(document.createTextNode('Depth'));
            const depth = document.createElement('input');
            depth.type = 'number';
            depth.min = '0.01';
            depth.step = 'any';
            depth.value = elements.reference.value;
            depth.setAttribute('aria-label', 'Depth for ' + clip.name);
            depthLabel.append(depth);
            row.append(check, info, depthLabel);
            elements.clips.append(row);
        });
        updateActions();
    }

    async function scan() {
        setBusy(true);
        setStatus('Scanning the current timeline…');
        try {
            const result = await bridge.scan();
            clips = result.clips;
            renderClips();
            setStatus(result.timelineName + ' · ' + clips.length + ' video clips');
        } catch (error) {
            setStatus(error.message);
        } finally {
            setBusy(false);
        }
    }

    function selectedDepths() {
        const depths = [];
        elements.clips.querySelectorAll('.clip').forEach(function (row) {
            const check = row.querySelector('input[type="checkbox"]');
            if (check.checked) {
                depths.push({
                    id: check.value,
                    distance: readPositiveNumber(row.querySelector('.clip-depth input'), 'Depth')
                });
            }
        });
        if (depths.length === 0) {
            throw new Error('Select at least one clip.');
        }
        return depths;
    }

    async function apply() {
        try {
            const referenceDistance = readPositiveNumber(elements.reference, 'Reference distance');
            const items = selectedDepths();
            setBusy(true);
            const result = await bridge.apply({ referenceDistance: referenceDistance, items: items });
            setStatus('Applied correction to ' + result.applied + ' clip(s).');
            await scan();
        } catch (error) {
            setStatus(error.message);
        } finally {
            setBusy(false);
        }
    }

    async function restore() {
        try {
            const ids = selectedIds();
            if (ids.length === 0) throw new Error('Select at least one clip.');
            setBusy(true);
            const result = await bridge.restore({ ids: ids });
            setStatus('Restored original zoom on ' + result.restored + ' clip(s).');
            await scan();
        } catch (error) {
            setStatus(error.message);
        } finally {
            setBusy(false);
        }
    }

    elements.scan.addEventListener('click', scan);
    elements.apply.addEventListener('click', apply);
    elements.restore.addEventListener('click', restore);
    bridge.onReady(function (result) {
        setStatus(result.ok ? 'Connected to DaVinci Resolve.' : result.error);
        elements.scan.disabled = !result.ok;
        if (result.ok) scan();
    });
}());
