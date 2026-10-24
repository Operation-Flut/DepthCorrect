/**
 * DepthCorrect CEP Panel - Consolidated & Streamlined JavaScript
 */

(function() {
    'use strict';

    // Global state
    const state = {
        csInterface: null,
        referenceDistance: 1000,
        useCurrentDist: true,
        baseScale: 100,
        baseScaleX: 100,
        baseScaleY: 100,
        baseScaleZ: 100,
        uncoupledAxes: false,
        trackedLayers: [],
        selectedLayer: null,
        selectedCount: 0
    };

    // DOM Elements
    const elements = {};
    let toastTimeout = null;

    /**
     * Initialize the panel
     */
    function init() {
        cacheElements();

        state.csInterface = new CSInterface();
        setupCSInterface();
        setupEventListeners();
        loadState();

        // Initial scan of composition
        scanLayers();

        console.log('DepthCorrect CEP panel initialized');
    }

    /**
     * Cache DOM element references
     */
    function cacheElements() {
        elements.scanBtn = document.getElementById('scan-btn');
        elements.applyBtn = document.getElementById('apply-btn');
        elements.applyBtnLabel = document.getElementById('apply-btn-label');
        elements.layerList = document.getElementById('layer-list');
        elements.layerCount = document.getElementById('layer-count');
        elements.useCurrentDist = document.getElementById('use-current-dist');
        elements.customDistRow = document.getElementById('custom-dist-row');
        elements.refDistance = document.getElementById('ref-distance');
        elements.baseScaleUniform = document.getElementById('base-scale-uniform');
        elements.toggleAxesBtn = document.getElementById('toggle-axes-btn');
        elements.axesGrid = document.getElementById('axes-grid');
        elements.baseScaleX = document.getElementById('base-scale-x');
        elements.baseScaleY = document.getElementById('base-scale-y');
        elements.baseScaleZ = document.getElementById('base-scale-z');
        elements.toast = document.getElementById('toast');
        elements.toastText = document.getElementById('toast-text');
    }

    /**
     * Setup CSInterface event listeners
     */
    function setupCSInterface() {
        state.csInterface.addEventListener('com.adobe.csxs.events.ThemeColorChanged', updateTheme);
        updateTheme();
    }

    /**
     * Update panel theme based on host app
     */
    function updateTheme() {
        try {
            const env = state.csInterface.getHostEnvironment();
            const skinInfo = (typeof env === 'string') ? JSON.parse(env).appSkinInfo : (env ? env.appSkinInfo : null);
            if (skinInfo && skinInfo.panelBackgroundColor) {
                const bg = skinInfo.panelBackgroundColor.color;
                document.documentElement.style.setProperty('--md-surface', `rgb(${bg.red}, ${bg.green}, ${bg.blue})`);
            }
        } catch (e) {
            // Keep M3 dark default
        }
    }

    /**
     * Setup UI event listeners
     */
    function setupEventListeners() {
        // Primary button
        if (elements.applyBtn) {
            elements.applyBtn.addEventListener('click', function() {
                applyExpression();
            });
        }

        // Header scan button
        if (elements.scanBtn) {
            elements.scanBtn.addEventListener('click', scanLayers);
        }

        // Toggle: Lock to current distance
        if (elements.useCurrentDist) {
            elements.useCurrentDist.addEventListener('change', function() {
                state.useCurrentDist = this.checked;
                if (elements.customDistRow) {
                    elements.customDistRow.style.display = this.checked ? 'none' : 'flex';
                }
            });
        }

        // Custom reference distance input
        if (elements.refDistance) {
            elements.refDistance.addEventListener('change', function() {
                state.referenceDistance = parseInt(this.value) || 1000;
            });
        }

        // Base Scale Uniform
        if (elements.baseScaleUniform) {
            elements.baseScaleUniform.addEventListener('change', function() {
                const val = parseFloat(this.value) || 100;
                state.baseScale = val;
                state.baseScaleX = val;
                state.baseScaleY = val;
                state.baseScaleZ = val;
                if (elements.baseScaleX) elements.baseScaleX.value = val;
                if (elements.baseScaleY) elements.baseScaleY.value = val;
                if (elements.baseScaleZ) elements.baseScaleZ.value = val;
                applyBaseScaleToSelected();
            });
        }

        // Toggle axes uncoupling
        if (elements.toggleAxesBtn) {
            elements.toggleAxesBtn.addEventListener('click', function() {
                state.uncoupledAxes = !state.uncoupledAxes;
                elements.axesGrid.style.display = state.uncoupledAxes ? 'grid' : 'none';
                elements.toggleAxesBtn.querySelector('span').textContent = state.uncoupledAxes ? 'Link X, Y, Z axes' : 'Uncouple X, Y, Z';
            });
        }

        // Uncoupled axes inputs
        [elements.baseScaleX, elements.baseScaleY, elements.baseScaleZ].forEach(function(input) {
            if (input) {
                input.addEventListener('change', function() {
                    state.baseScaleX = parseFloat(elements.baseScaleX.value) || 100;
                    state.baseScaleY = parseFloat(elements.baseScaleY.value) || 100;
                    state.baseScaleZ = parseFloat(elements.baseScaleZ.value) || 100;
                    applyBaseScaleToSelected();
                });
            }
        });

        // Prevent drag on interactive elements
        ['input', 'button', 'details', 'summary'].forEach(function(tag) {
            document.querySelectorAll(tag).forEach(function(el) {
                el.style.webkitAppRegion = 'no-drag';
            });
        });
    }

    /**
     * Load initial state
     */
    function loadState() {
        state.referenceDistance = parseInt(elements.refDistance.value) || 1000;
        state.useCurrentDist = elements.useCurrentDist ? elements.useCurrentDist.checked : true;
        if (elements.customDistRow) {
            elements.customDistRow.style.display = state.useCurrentDist ? 'none' : 'flex';
        }
    }

    /**
     * Subtle floating Toast notification
     */
    function showToast(message) {
        if (!elements.toast || !elements.toastText) return;

        elements.toastText.textContent = message;
        elements.toast.style.display = 'block';

        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(function() {
            elements.toast.style.display = 'none';
        }, 2400);
    }

    /**
     * Call ExtendScript function via CSInterface
     */
    function callExtendScript(functionName, args, callback) {
        const argList = (args || []).map(function(arg) {
            return JSON.stringify(arg);
        }).join(', ');
        const script = 'DepthCorrect.' + functionName + '(' + argList + ')';
        state.csInterface.evalScript(script, function(result) {
            try {
                const parsed = (result && typeof result === 'string') ? JSON.parse(result) : result;
                if (callback) callback(parsed);
            } catch (e) {
                console.error('ExtendScript error:', e, 'Result:', result);
                if (callback) callback(null);
            }
        });
    }

    // ==================== Core Operations ====================

    /**
     * Apply dynamic perspective expression
     */
    function applyExpression(specificLayerName) {
        elements.applyBtn.disabled = true;

        callExtendScript('applyExpression', [state.referenceDistance, state.useCurrentDist, specificLayerName || ''], function(result) {
            elements.applyBtn.disabled = false;

            if (result && result.success) {
                showToast(result.message || 'Applied dynamic scale');
                scanLayers();
            } else {
                showToast(result ? result.error : 'Failed to apply expression');
            }
        });
    }

    /**
     * Remove dynamic expression from layer(s)
     */
    function removeExpression(specificLayerName) {
        callExtendScript('removeExpression', [specificLayerName || ''], function(result) {
            if (result && result.success) {
                showToast(result.message || 'Removed expression');
                scanLayers();
            } else {
                showToast(result ? result.error : 'Failed to remove expression');
            }
        });
    }

    /**
     * Scan composition for 3D layers and their expression states
     */
    function scanLayers() {
        callExtendScript('scanLayers', [state.referenceDistance], function(result) {
            if (result && result.success) {
                state.trackedLayers = result.layers || [];
                state.selectedCount = result.selectedCount || 0;
                updateSmartButton();
                populateLayerList();
            } else {
                state.trackedLayers = [];
                populateLayerList();
            }
        });
    }

    /**
     * Update primary button based on context
     */
    function updateSmartButton() {
        if (!elements.applyBtnLabel) return;

        if (state.selectedCount > 0) {
            elements.applyBtnLabel.textContent = 'Apply to Selected (' + state.selectedCount + ')';
        } else if (state.trackedLayers.length > 0) {
            elements.applyBtnLabel.textContent = 'Apply to All 3D Layers';
        } else {
            elements.applyBtnLabel.textContent = 'Scan Timeline';
        }
    }

    /**
     * Apply base scale change to selected layer
     */
    function applyBaseScaleToSelected() {
        const scale = {
            x: state.baseScaleX,
            y: state.baseScaleY,
            z: state.baseScaleZ
        };

        callExtendScript('setBaseScale', ['', scale], function(result) {
            if (result && result.success) {
                showToast('Updated base scale: ' + Math.round(scale.x) + '%');
            }
        });
    }

    // ==================== UI Rendering ====================

    /**
     * Populate lean layer list
     */
    function populateLayerList() {
        const activeCount = state.trackedLayers.filter(function(l) { return l.hasExpression; }).length;
        const totalCount = state.trackedLayers.length;

        if (elements.layerCount) {
            elements.layerCount.textContent = activeCount + ' active / ' + totalCount + ' total';
            if (activeCount > 0) {
                elements.layerCount.classList.add('has-active');
            } else {
                elements.layerCount.classList.remove('has-active');
            }
        }

        if (totalCount === 0) {
            elements.layerList.innerHTML = '<div class="empty-state">' +
                '<svg class="empty-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>' +
                '<p>No 3D layers found</p>' +
                '<span>Select a layer in AE or click Scan</span>' +
                '</div>';
            return;
        }

        elements.layerList.innerHTML = state.trackedLayers.map(function(layer) {
            const isSelectedClass = layer.selected ? ' is-selected' : '';

            // Right-side action: If dynamic, show chip + remove button. If static, show add button.
            let actionHtml = '';
            if (layer.hasExpression) {
                actionHtml = '<span class="m3-chip-active">Dynamic</span>' +
                    '<button class="layer-btn layer-btn-remove" data-action="remove" data-layer-name="' + escapeHtml(layer.name) + '" title="Remove expression">' +
                        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
                    '</button>';
            } else {
                actionHtml = '<button class="layer-btn layer-btn-apply" data-action="apply" data-layer-name="' + escapeHtml(layer.name) + '" title="Apply expression to this layer">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>' +
                    '</button>';
            }

            return '<div class="layer-item' + isSelectedClass + '">' +
                '<div class="layer-info" data-layer-name="' + escapeHtml(layer.name) + '" title="Click to select in AE">' +
                    '<span class="layer-name">' + escapeHtml(layer.name) + '</span>' +
                    '<span class="layer-meta">Dist: ' + (layer.currentZ || 0) + 'px • ' + Math.round(layer.baseScale.x) + '%</span>' +
                '</div>' +
                '<div class="layer-actions">' +
                    actionHtml +
                '</div>' +
            '</div>';
        }).join('');

        // Row selection click listener
        elements.layerList.querySelectorAll('.layer-info').forEach(function(info) {
            info.addEventListener('click', function() {
                const name = this.getAttribute('data-layer-name');
                if (name) {
                    callExtendScript('selectLayer', [name], function() {
                        scanLayers();
                    });
                }
            });
        });

        // Inline quick action buttons (apply/remove per layer)
        elements.layerList.querySelectorAll('.layer-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const action = this.getAttribute('data-action');
                const name = this.getAttribute('data-layer-name');
                if (action === 'remove') {
                    removeExpression(name);
                } else if (action === 'apply') {
                    applyExpression(name);
                }
            });
        });
    }

    /**
     * Escape HTML for safe display
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
