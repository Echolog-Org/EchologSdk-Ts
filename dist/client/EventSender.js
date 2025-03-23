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
const utility_1 = require("../core/utilities/utility");
class EventSender {
    constructor(apiUrl, apiKey, options) {
        this.isSendingLogs = false;
        this.retryCount = 0;
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
        this.options = options;
    }
    /**
     * Checks if the sender is currently processing logs.
     * @returns {boolean} True if sending logs, false otherwise.
     */
    isSendingLogsActive() {
        return this.isSendingLogs;
    }
    /**
     * Sends events to the API asynchronously with retry support.
     * @param {LogEvent<T>[]} events - The events to send.
     * @returns {Promise<void>} Resolves when events are sent successfully.
     * @throws {Error} If all retry attempts fail.
     */
    sendEvents(events) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!events.length)
                return;
            this.isSendingLogs = true;
            const maxRetryAttempts = (_a = this.options.retryAttempts) !== null && _a !== void 0 ? _a : 3; // Default to 3 if not specified
            try {
                const transformedEvents = events.map(event => (0, utility_1.transformJsonForServer)(event));
                this.debugLog('Sending events', { eventCount: events.length, retryCount: this.retryCount });
                const response = yield fetch(this.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'x-api-key': this.apiKey,
                        'x-echolog-internal': 'true',
                    },
                    body: JSON.stringify(transformedEvents),
                });
                if (!response.ok) {
                    const responseBody = yield response.text();
                    throw new Error(`HTTP ${response.status}: ${responseBody}`);
                }
                this.retryCount = 0; // Reset on success
                this.debugLog('Events sent successfully', { eventCount: events.length });
            }
            catch (error) {
                this.retryCount++;
                if (this.retryCount <= maxRetryAttempts) {
                    const backoffDelay = Math.pow(2, this.retryCount) * 1000; // Exponential backoff
                    this.debugLog('Retrying event send', {
                        error: error instanceof Error ? error.message : String(error),
                        retryCount: this.retryCount,
                        delay: backoffDelay,
                    });
                    yield new Promise(resolve => setTimeout(resolve, backoffDelay));
                    return this.sendEvents(events); // Recursive retry
                }
                this.debugLog('Failed to send events after all retries', {
                    error: error instanceof Error ? error.message : String(error),
                    retryCount: this.retryCount,
                });
                throw error; // Re-throw after exhausting retries
            }
            finally {
                this.isSendingLogs = false;
            }
        });
    }
    /**
     * Sends events synchronously using the Beacon API if available.
     * @param {LogEvent<T>[]} events - The events to send.
     * @returns {boolean} True if sent successfully, false otherwise.
     */
    sendEventsSync(events) {
        if (!events.length || typeof navigator === 'undefined' || !navigator.sendBeacon) {
            return false;
        }
        try {
            const transformedEvents = events.map(event => (0, utility_1.transformJsonForServer)(event));
            this.debugLog('Sending events via Beacon API', { eventCount: events.length });
            const blob = new Blob([JSON.stringify(transformedEvents)], { type: 'application/json' });
            const success = navigator.sendBeacon(`${this.apiUrl}?apiKey=${encodeURIComponent(this.apiKey)}&sync=true`, blob);
            if (success) {
                this.debugLog('Events sent successfully via Beacon API', { eventCount: events.length });
            }
            return success;
        }
        catch (error) {
            console.error('[Echolog] Failed to send events via Beacon API:', error);
            this.debugLog('Beacon API send failed', { error });
            return false;
        }
    }
    /**
     * Logs debug messages if debug mode is enabled.
     * @param {string} message - The message to log.
     * @param {any} [data] - Additional data to log.
     * @private
     */
    debugLog(message, data) {
        if (this.options.debug) {
            const timestamp = new Date().toISOString();
            console.debug(`[Echolog Debug] [${timestamp}] ${message}`, data || '');
        }
    }
}
exports.EventSender = EventSender;
