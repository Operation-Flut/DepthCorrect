'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('depthCorrect', {
    onReady: function (callback) {
        ipcRenderer.on('depthcorrect:ready', function (_event, result) {
            callback(result);
        });
    },
    scan: function () {
        return ipcRenderer.invoke('depthcorrect:scan');
    },
    apply: function (options) {
        return ipcRenderer.invoke('depthcorrect:apply', options);
    },
    remove: function (options) {
        return ipcRenderer.invoke('depthcorrect:remove', options);
    }
});
