"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleCapture = void 0;
// src/client/ConsoleCapture.ts
const types_1 = require("../core/types");
const utitiliy_1 = require("../core/utitilites/utitiliy");
class ConsoleCapture {
    constructor(eventManager, sessionManager, options) {
        this.originalConsole = {};
        this.eventManager = eventManager;
        this.sessionManager = sessionManager; // Store the SessionManager instance
        this.options = options;
    }
    setupConsoleCapture() {
        if (typeof console === 'undefined')
            return;
        const consoleMethods = ['log', 'info', 'warn', 'error', 'debug'];
        const levelMap = {
            log: types_1.LogLevel.INFO,
            info: types_1.LogLevel.INFO,
            warn: types_1.LogLevel.WARN,
            error: types_1.LogLevel.ERROR,
            debug: types_1.LogLevel.DEBUG,
        };
        consoleMethods.forEach((method) => {
            this.originalConsole[method] = console[method];
            console[method] = (...args) => {
                var _a, _b;
                (_b = (_a = this.originalConsole)[method]) === null || _b === void 0 ? void 0 : _b.call(_a, ...args);
                this.eventManager.captureEvent({
                    id: (0, utitiliy_1.generateUniqueId)(),
                    timestamp: new Date().toISOString(),
                    service_name: this.eventManager['client']['serviceName'],
                    level: levelMap[method],
                    message: args.map(utitiliy_1.stringifyArg).join(' '),
                    code_location: {
                        file: '',
                        line: 0,
                        function: ''
                    },
                    session: this.sessionManager.getSessionId() ? {
                        id: this.sessionManager.getSessionId(),
                        started_at: this.sessionManager.getSessionStartTime().toISOString(),
                    } : undefined,
                });
            };
        });
    }
    restoreConsole() {
        if (typeof console === 'undefined')
            return;
        Object.entries(this.originalConsole).forEach(([method, fn]) => {
            console[method] = fn;
        });
        this.originalConsole = {};
    }
}
exports.ConsoleCapture = ConsoleCapture;
