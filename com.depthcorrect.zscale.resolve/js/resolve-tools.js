'use strict';

async function firstValue(source, keys) {
    if (!source) return undefined;
    for (const key of keys) {
        let value = source[key];
        if (typeof value === 'function') value = value.call(source);
        value = await value;
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return undefined;
}

async function getToolAttrs(tool) {
    if (!tool) return tool;
    let attrs = tool.GetAttrs;
    if (typeof attrs === 'function') attrs = attrs.call(tool);
    attrs = await attrs;
    return attrs && typeof attrs === 'object' ? attrs : tool;
}

async function getToolInfo(tool, fallbackName) {
    const resolvedTool = await tool;
    const source = await getToolAttrs(resolvedTool);
    const name = await firstValue(source, [
        'TOOLS_Name',
        'TOOLST_Name',
        'Name',
        'name',
        'GetName'
    ]);
    const resolvedName = name || fallbackName;
    const regId = String(await firstValue(source, [
        'TOOLS_RegID',
        'TOOLS_RegId',
        'TOOLST_RegID',
        'ID',
        'id',
        'GetID'
    ]) || '');
    if (!resolvedName || /^\d+$/.test(String(resolvedName))) {
        return null;
    }
    return {
        name: String(resolvedName),
        regId: regId
    };
}

async function getToolName(tool) {
    const info = await getToolInfo(tool);
    return info ? info.name : 'unknown tool';
}

module.exports = { getToolInfo, getToolName };
