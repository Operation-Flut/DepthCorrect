'use strict';

async function firstValue(source, keys) {
    if (!source) return undefined;
    for (const key of keys) {
        const value = await source[key];
        if (value !== undefined && value !== null) return value;
    }
    return undefined;
}

async function getToolInfo(tool) {
    const source = tool && typeof tool.GetAttrs === 'function'
        ? await tool.GetAttrs()
        : tool;
    const name = await firstValue(source, [
        'TOOLS_Name',
        'TOOLST_Name',
        'Name',
        'name'
    ]);
    if (!name) throw new Error('Fusion returned a node without a name.');
    return {
        name: String(name),
        regId: String(await firstValue(source, [
            'TOOLS_RegID',
            'TOOLS_RegId',
            'TOOLST_RegID',
            'ID',
            'id'
        ]) || '')
    };
}

async function getToolName(tool) {
    return (await getToolInfo(tool)).name;
}

module.exports = { getToolInfo, getToolName };
