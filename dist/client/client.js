"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EchologClient = void 0;
// src/client/EchologClient.ts
const EventManager_1 = require("./EventManager");
const SessionManager_1 = require("./SessionManager");
const ErrorHandler_1 = require("./ErrorHandler");
const ConsoleCapture_1 = require("./ConsoleCapture");
const NetworkCapture_1 = require("./NetworkCapture");
const EventSender_1 = require("./EventSender");
const types_1 = require("../core/types");
const utitiliy_1 = require("../core/utitilites/utitiliy");
class EchologClient {
    constructor(options) {
        this.options = options;
        this.apiKey = options.apiKey;
        this.projectId = options.projectId || '';
        this.apiUrl = options.apiUrl || 'http://localhost:8080/events';
        this.environment = options.environment || 'production';
        this.release = options.release;
        this.serviceName = options.serviceName;
        if (options.debug) {
            console.debug('[Echolog] Initializing client with options:', options);
        }
        // Initialize sub-modules
        this.eventSender = new EventSender_1.EventSender(this.apiUrl, this.apiKey, options);
        this.sessionManager = new SessionManager_1.SessionManager(this.serviceName);
        this.eventManager = new EventManager_1.EventManager(this, this.sessionManager, options, this.eventSender);
        this.sessionManager.setEventManager(this.eventManager);
        this.errorHandler = new ErrorHandler_1.ErrorHandler(this, options);
        this.consoleCapture = new ConsoleCapture_1.ConsoleCapture(this.eventManager, this.sessionManager, options);
        this.networkCapture = new NetworkCapture_1.NetworkCapture(this.eventManager, this.sessionManager, this.serviceName, this.apiUrl, options);
        // Setup based on options
        if (options.captureUnhandledErrors !== false) {
            this.errorHandler.setupErrorCapture();
        }
        if (options.captureUnhandledPromiseRejections !== false) {
            this.errorHandler.setupPromiseRejectionCapture();
        }
        if (options.enableConsoleCapture !== false) {
            this.consoleCapture.setupConsoleCapture();
        }
        if (options.enableNetworkCapture !== false) {
            this.networkCapture.setupNetworkCapture();
        }
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => this.eventManager.flush(true));
        }
        this.eventManager.captureEvent({
            id: (0, utitiliy_1.generateUniqueId)(),
            timestamp: new Date().toISOString(),
            service_name: this.serviceName,
            level: types_1.LogLevel.INFO,
            message: 'App opened',
            metadata: options.includeBrowserMetadata !== false && typeof navigator !== 'undefined'
                ? { userAgent: navigator.userAgent }
                : null,
        });
    }
    startSession() {
        this.sessionManager.startSession();
    }
    endSession() {
        this.sessionManager.endSession();
    }
    captureException(error, options = {}) {
        return this.eventManager.captureException(error, options);
    }
    captureMessage(message, options = {}) {
        return this.eventManager.captureMessage(message, options);
    }
    flush(sync = false) {
        this.eventManager.flush(sync);
    }
    destroy() {
        this.eventManager.destroy();
        this.consoleCapture.restoreConsole();
        this.networkCapture.restoreNetworkInterceptors();
        if (typeof window !== 'undefined') {
            window.removeEventListener('beforeunload', () => this.eventManager.flush(true));
        }
    }
}
exports.EchologClient = EchologClient;
