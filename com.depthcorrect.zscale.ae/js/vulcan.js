/*
 * vulcan.js - Minimal Vulcan message bus for CEP
 * Allows communication between panels/extensions
 */

var Vulcan = function() {
    this.csInterface = new CSInterface();
    this.listeners = {};
};

Vulcan.prototype.addMessageListener = function(type, callback) {
    if (!this.listeners[type]) {
        this.listeners[type] = [];
    }
    this.listeners[type].push(callback);
};

Vulcan.prototype.removeMessageListener = function(type, callback) {
    if (this.listeners[type]) {
        var index = this.listeners[type].indexOf(callback);
        if (index > -1) {
            this.listeners[type].splice(index, 1);
        }
    }
};

Vulcan.prototype.dispatchMessage = function(message) {
    if (this.csInterface && this.csInterface.evalScript) {
        var script = 'VulcanInterface.dispatchMessage(' + JSON.stringify(message) + ')';
        this.csInterface.evalScript(script);
    }
};

Vulcan.prototype._receiveMessage = function(message) {
    if (this.listeners[message.type]) {
        this.listeners[message.type].forEach(function(callback) {
            callback(message);
        });
    }
};

// Global instance
var vulcan = new Vulcan();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Vulcan;
}