'use strict';

/**
 * Resolve's Workflow Integration bridge exposes the Resolve scripting API,
 * but the Fusion object does not consistently expose Fusion's standalone
 * GetCurrentComp() method. Resolve's documented API exposes the active
 * timeline item and its Fusion compositions instead.
 *
 * @param {object} resolve - Resolve scripting root returned by the bridge.
 * @returns {Promise<object|null>} The active Fusion composition, if available.
 */
async function getCurrentFusionComp(resolve) {
    if (!resolve) return null;

    const fusion = typeof resolve.Fusion === 'function'
        ? await resolve.Fusion()
        : null;
    if (fusion) {
        if (typeof fusion.GetCurrentComp === 'function') {
            return await fusion.GetCurrentComp();
        }
        if (fusion.CurrentComp) {
            return await fusion.CurrentComp;
        }
    }

    const project = typeof resolve.GetCurrentProject === 'function'
        ? await resolve.GetCurrentProject()
        : null;
    const timeline = project && typeof project.GetCurrentTimeline === 'function'
        ? await project.GetCurrentTimeline()
        : null;
    if (!timeline) return null;

    let videoItem = null;
    if (typeof timeline.GetCurrentVideoItem === 'function') {
        videoItem = await timeline.GetCurrentVideoItem();
    }
    if (!videoItem && typeof timeline.GetSelectedClips === 'function') {
        const selectedClips = await timeline.GetSelectedClips();
        videoItem = selectedClips && selectedClips.length > 0 ? selectedClips[0] : null;
    }
    if (!videoItem || typeof videoItem.GetFusionCompCount !== 'function') return null;

    const count = await videoItem.GetFusionCompCount();
    if (!count || typeof videoItem.GetFusionCompByIndex !== 'function') return null;
    return await videoItem.GetFusionCompByIndex(1);
}

module.exports = { getCurrentFusionComp };
