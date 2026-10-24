/*
 * CSInterface.js - Minimal implementation for CEP panels
 * Provides communication between HTML panel and ExtendScript
 */

var CSInterface = function() {
    this.vulcan = null;
    this.init();
};

CSInterface.prototype.init = function() {
    // Check if running in CEP environment
    if (typeof window.__adobe_cep__ !== 'undefined') {
        this.csInterface = window.__adobe_cep__;
    } else if (typeof window.__CSInterface__ !== 'undefined') {
        this.csInterface = window.__CSInterface__;
    }
};

CSInterface.prototype.evalScript = function(script, callback) {
    if (this.csInterface && this.csInterface.evalScript) {
        this.csInterface.evalScript(script, callback);
    } else if (window.cep && window.cep.evalScript) {
        window.cep.evalScript(script, callback);
    } else {
        // Fallback for testing outside CEP
        console.log('evalScript (mock):', script);
        if (callback) callback('{}');
    }
};

CSInterface.prototype.getHostEnvironment = function() {
    if (this.csInterface && this.csInterface.getHostEnvironment) {
        return this.csInterface.getHostEnvironment();
    }
    // Mock environment for testing
    return JSON.stringify({
        appName: 'AEFT',
        appVersion: '26.0',
        appSkinInfo: {
            panelBackgroundColor: { color: { red: 30, green: 30, blue: 30 } }
        }
    });
};

CSInterface.prototype.addEventListener = function(type, callback) {
    if (this.csInterface && this.csInterface.addEventListener) {
        this.csInterface.addEventListener(type, callback);
    }
};

CSInterface.prototype.removeEventListener = function(type, callback) {
    if (this.csInterface && this.csInterface.removeEventListener) {
        this.csInterface.removeEventListener(type, callback);
    }
};

CSInterface.prototype.requestOpenExtension = function(extensionId, params) {
    if (this.csInterface && this.csInterface.requestOpenExtension) {
        this.csInterface.requestOpenExtension(extensionId, params);
    }
};

CSInterface.prototype.closeExtension = function() {
    if (this.csInterface && this.csInterface.closeExtension) {
        this.csInterface.closeExtension();
    }
};

CSInterface.prototype.getSystemPath = function(pathType) {
    if (this.csInterface && this.csInterface.getSystemPath) {
        return this.csInterface.getSystemPath(pathType);
    }
    return '';
};

CSInterface.prototype.getOSInformation = function() {
    if (this.csInterface && this.csInterface.getOSInformation) {
        return this.csInterface.getOSInformation();
    }
    return 'Windows';
};

CSInterface.prototype.getScaleFactor = function() {
    if (this.csInterface && this.csInterface.getScaleFactor) {
        return this.csInterface.getScaleFactor();
    }
    return 1;
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CSInterface;
}