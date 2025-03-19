"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventSender = void 0;
const utitiliy_1 = require("../core/utitilites/utitiliy");
class EventSender {
    constructor(apiUrl, apiKey, options) {
        this._isSendingLogs = false; // Rename the property to avoid conflict
        this.retryCount = 0;
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
        this.options = options;
    }
    isSendingLogs() {
        return this._isSendingLogs;
    }
    sendEvents(events) {
        return __awaiter(this, void 0, void 0, function* () {
            this._isSendingLogs = true; // Update to use the renamed property
            const maxRetries = this.options.maxRetries || 3;
            try {
                const transformedEvents = events.map(event => (0, utitiliy_1.transformJsonForServer)(event));
                this.debugLog('Sending events', { eventCount: events.length, retryCount: this.retryCount });
                const response = yield fetch(this.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'x-api-key': this.apiKey,
                        'x-echolog-internal': 'true'
                    },
                    body: JSON.stringify(transformedEvents),
                });
                if (!response.ok) {
                    const responseBody = yield response.text();
                    throw new Error(`HTTP ${response.status}: ${responseBody}`);
                }
                this.retryCount = 0;
                this.debugLog('Events sent successfully', { eventCount: events.length });
            }
            catch (error) {
                this.retryCount++;
                if (this.retryCount <= maxRetries) {
                    const backoffDelay = Math.pow(2, this.retryCount) * 1000;
                    this.debugLog('Retrying event send', {
                        error: JSON.stringify(error),
                        retryCount: this.retryCount,
                        delay: backoffDelay
                    });
                    yield new Promise(resolve => setTimeout(resolve, backoffDelay));
                    return this.sendEvents(events);
                }
                this.debugLog('Failed to send events after retries', { error, retryCount: this.retryCount });
                throw error;
            }
            finally {
                this._isSendingLogs = false; // Update to use the renamed property
            }
        });
    }
    sendEventsSync(events) {
        if (typeof navigator === 'undefined' || !navigator.sendBeacon)
            return false;
        try {
            const transformedEvents = events.map(event => (0, utitiliy_1.transformJsonForServer)(event));
            const blob = new Blob([JSON.stringify(transformedEvents)], { type: 'application/json' });
            return navigator.sendBeacon(`${this.apiUrl}?apiKey=${encodeURIComponent(this.apiKey)}&sync=true`, blob);
        }
        catch (error) {
            console.error('[Echolog] Failed to send events via Beacon API:', error);
            return false;
        }
    }
    debugLog(message, data) {
        if (this.options.debug && !this._isSendingLogs) { // Update to use the renamed property
            if (message.includes("[Echolog Debug]"))
                return;
            const timestamp = new Date().toISOString();
            console.debug(`[Echolog Debug] [${timestamp}] ${message}`, data || '');
        }
    }
}
exports.EventSender = EventSender;
