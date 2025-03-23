"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
// src/client/SessionManager.ts
const types_1 = require("../core/types");
const utility_1 = require("../core/utilities/utility");
class SessionManager {
    constructor(serviceName) {
        this.serviceName = serviceName;
    }
    // Add a setter to initialize eventManager after construction
    setEventManager(eventManager) {
        this.eventManager = eventManager;
    }
    startSession() {
        var _a;
        this.sessionId = (0, utility_1.generateUniqueId)();
        this.sessionStartTime = new Date();
        (_a = this.eventManager) === null || _a === void 0 ? void 0 : _a.captureEvent({
            id: (0, utility_1.generateUniqueId)(),
            timestamp: new Date().toISOString(),
            service_name: this.serviceName,
            level: types_1.LogLevel.INFO,
            message: 'Session started',
            session: {
                id: this.sessionId,
                started_at: this.sessionStartTime.toISOString(),
            },
        });
    }
    endSession() {
        var _a, _b;
        if (!this.sessionId || !this.sessionStartTime) {
            return;
        }
        const sessionEndTime = new Date();
        const sessionDuration = sessionEndTime.getTime() - this.sessionStartTime.getTime();
        (_a = this.eventManager) === null || _a === void 0 ? void 0 : _a.captureEvent({
            id: (0, utility_1.generateUniqueId)(),
            timestamp: new Date().toISOString(),
            service_name: this.serviceName,
            level: types_1.LogLevel.INFO,
            message: 'Session ended',
            session: {
                id: this.sessionId,
                started_at: this.sessionStartTime.toISOString(),
                duration: sessionDuration,
            },
        });
        this.sessionId = undefined;
        this.sessionStartTime = undefined;
        (_b = this.eventManager) === null || _b === void 0 ? void 0 : _b.flush(true);
    }
    getSessionId() {
        return this.sessionId;
    }
    getSessionStartTime() {
        return this.sessionStartTime;
    }
}
exports.SessionManager = SessionManager;
