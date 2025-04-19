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
        this.isSendingReplays = false; // New flag for replays
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
     * Checks if the sender is currently processing replays.
     * @returns {boolean} True if sending replays, false otherwise.
     */
    isSendingReplaysActive() {
        return this.isSendingReplays;
    }
    /**
     * Sends log events to the API asynchronously with retry support.
     * @param {LogEvent<T>[]} events - The log events to send.
     * @returns {Promise<void>} Resolves when events are sent successfully.
     * @throws {Error} If all retry attempts fail.
     */
    sendEvents(events) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!events.length)
                return;
            this.isSendingLogs = true;
            const maxRetryAttempts = (_a = this.options.retryAttempts) !== null && _a !== void 0 ? _a : 3;
            try {
                const transformedEvents = events.map(event => (0, utility_1.transformJsonForServer)(event));
                this.debugLog('Sending log events', { eventCount: events.length, retryCount: this.retryCount });
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
                this.retryCount = 0;
                this.debugLog('Log events sent successfully', { eventCount: events.length });
            }
            catch (error) {
                this.retryCount++;
                if (this.retryCount <= maxRetryAttempts) {
                    const backoffDelay = Math.pow(2, this.retryCount) * 1000;
                    this.debugLog('Retrying log event send', {
                        error: error instanceof Error ? error.message : String(error),
                        retryCount: this.retryCount,
                        delay: backoffDelay,
                    });
                    yield new Promise(resolve => setTimeout(resolve, backoffDelay));
                    return this.sendEvents(events);
                }
                this.debugLog('Failed to send log events after all retries', {
                    error: error instanceof Error ? error.message : String(error),
                    retryCount: this.retryCount,
                });
                throw error;
            }
            finally {
                this.isSendingLogs = false;
            }
        });
    }
    /**
     * Sends replay events to the API asynchronously with retry support.
     * @param {ReplayEvent<T>[]} replays - The replay events to send.
     * @param {string} [endpoint='/replay'] - The API endpoint to send replays to.
     * @returns {Promise<void>} Resolves when replays are sent successfully.
     * @throws {Error} If all retry attempts fail.
     */
    sendReplays(replays_1) {
        return __awaiter(this, arguments, void 0, function* (replays, endpoint = '/replay') {
            var _a;
            if (!replays.length)
                return;
            this.isSendingReplays = true;
            const maxRetryAttempts = (_a = this.options.retryAttempts) !== null && _a !== void 0 ? _a : 3;
            try {
                const transformedReplays = replays.map(replay => (0, utility_1.transformJsonForServer)(replay));
                this.debugLog('Sending replay events', { replayCount: replays.length, retryCount: this.retryCount });
                const response = yield fetch(`${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'x-api-key': this.apiKey,
                        'x-echolog-internal': 'true',
                    },
                    body: JSON.stringify(transformedReplays),
                });
                if (!response.ok) {
                    const responseBody = yield response.text();
                    throw new Error(`HTTP ${response.status}: ${responseBody}`);
                }
                this.retryCount = 0;
                this.debugLog('Replay events sent successfully', { replayCount: replays.length });
            }
            catch (error) {
                this.retryCount++;
                if (this.retryCount <= maxRetryAttempts) {
                    const backoffDelay = Math.pow(2, this.retryCount) * 1000;
                    this.debugLog('Retrying replay event send', {
                        error: error instanceof Error ? error.message : String(error),
                        retryCount: this.retryCount,
                        delay: backoffDelay,
                    });
                    yield new Promise(resolve => setTimeout(resolve, backoffDelay));
                    return this.sendReplays(replays, endpoint);
                }
                this.debugLog('Failed to send replay events after all retries', {
                    error: error instanceof Error ? error.message : String(error),
                    retryCount: this.retryCount,
                });
                throw error;
            }
            finally {
                this.isSendingReplays = false;
            }
        });
    }
    /**
     * Sends log events synchronously using the Beacon API if available.
     * @param {LogEvent<T>[]} events - The log events to send.
     * @returns {boolean} True if sent successfully, false otherwise.
     */
    sendEventsSync(events) {
        if (!events.length || typeof navigator === 'undefined' || !navigator.sendBeacon) {
            return false;
        }
        try {
            const transformedEvents = events.map(event => (0, utility_1.transformJsonForServer)(event));
            this.debugLog('Sending log events via Beacon API', { eventCount: events.length });
            const blob = new Blob([JSON.stringify(transformedEvents)], { type: 'application/json' });
            const success = navigator.sendBeacon(`${this.apiUrl}?apiKey=${encodeURIComponent(this.apiKey)}&sync=true`, blob);
            if (success) {
                this.debugLog('Log events sent successfully via Beacon API', { eventCount: events.length });
            }
            return success;
        }
        catch (error) {
            console.error('[Echolog] Failed to send log events via Beacon API:', error);
            this.debugLog('Beacon API send failed', { error });
            return false;
        }
    }
    sendReplaysSync(replays) {
        if (!replays.length || typeof navigator === 'undefined' || !navigator.sendBeacon) {
            return false;
        }
        //send using fetch
        try {
            const transformedReplays = replays.map(replay => (0, utility_1.transformJsonForServer)(replay));
            this.debugLog('Sending replay events via Beacon API', { replayCount: replays.length });
            const blob = new Blob([JSON.stringify(transformedReplays)], { type: 'application/json' });
            const success = navigator.sendBeacon(`${this.apiUrl}/replay?apiKey=${encodeURIComponent(this.apiKey)}&sync=true`, blob);
            if (success) {
                this.debugLog('Replay events sent successfully via Beacon API', { replayCount: replays.length });
            }
            return success;
        }
        catch (error) {
            console.error('[Echolog] Failed to send replay events via Beacon API:', error);
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
            console.log(`[Echolog Debug] [${timestamp}] ${message}`, data || '');
        }
    }
}
exports.EventSender = EventSender;
