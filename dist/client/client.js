"use strict";
/**
 * @package Echolog
 * @version 1.0.0
 * @license MIT
 * @description A lightweight JavaScript client for capturing and reporting logs, errors, and network events.
 */
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
exports.EchologClient = void 0;
const EventManager_1 = require("./EventManager");
const SessionManager_1 = require("./SessionManager");
const ErrorHandler_1 = require("./ErrorHandler");
const ConsoleCapture_1 = require("./ConsoleCapture");
const NetworkCapture_1 = require("./NetworkCapture");
const EventSender_1 = require("./EventSender");
const OfflineManger_1 = require("./OfflineManger");
const types_1 = require("../core/types");
const utility_1 = require("../core/utilities/utility");
/**
 * Manages breadcrumbs for contextual event tracking.
 * @private
 */
class BreadcrumbManager {
    constructor(maxBreadcrumbs = 20) {
        this.breadcrumbs = [];
        this.maxBreadcrumbs = maxBreadcrumbs;
    }
    add(breadcrumb) {
        const newBreadcrumb = Object.assign({ id: (0, utility_1.generateUniqueId)(), timestamp: new Date().toISOString() }, breadcrumb);
        this.breadcrumbs.push(newBreadcrumb);
        if (this.breadcrumbs.length > this.maxBreadcrumbs) {
            this.breadcrumbs.shift(); // Remove oldest breadcrumb
        }
    }
    getAll() {
        return [...this.breadcrumbs];
    }
    clear() {
        this.breadcrumbs = [];
    }
}
/**
 * Echolog is responsible for handling event logging, capturing errors, and sending logs to an API.
 *
 * @template T Extends EventMetadata for custom metadata structures.
 * @example
 * const client = new EchologClient({
 *   apiKey: 'your-api-key',
 *   projectId: 'my-project',
 *   serviceName: 'my-app',
 *   debug: true,
 *   maxOfflineEvents: 50,
 *   maxBreadcrumbs: 10,
 * });
 * client.captureBreadcrumb('User clicked button', 'ui');
 * client.captureMessage('App started', { level: LogLevel.INFO });
 */
class EchologClient {
    /**
     * Initializes the Echolog client with the provided options.
     * @param {EchologOptions<T>} options - Configuration options for the logging client.
     * @throws {Error} If required options (apiKey, projectId, serviceName) are missing.
     */
    constructor(options) {
        var _a, _b;
        if (!options.apiKey)
            throw new Error('[Echolog] apiKey is required');
        if (!options.projectId)
            throw new Error('[Echolog] projectId is required');
        if (!options.serviceName)
            throw new Error('[Echolog] serviceName is required');
        // Set defaults first, then override with user-provided options
        this.options = Object.assign({ maxOfflineEvents: 100, maxBreadcrumbs: 20, enableBreadcrumbs: true, includeBrowserMetadata: true, maxRetries: 3, retryAttempts: 3, debug: false, enableNetworkCapture: true, enableConsoleCapture: true, maxBatchSize: 10, sampleRate: 1, flushInterval: 5000, environment: 'production' }, options);
        // Ensure critical properties are always set (use nullish coalescing `??`)
        this.apiKey = options.apiKey;
        this.projectId = options.projectId;
        this.apiUrl = (_a = options.apiUrl) !== null && _a !== void 0 ? _a : 'https://echolog-snowy-flower-2767-production.up.railway.app/events';
        this.environment = (_b = options.environment) !== null && _b !== void 0 ? _b : 'production';
        this.serviceName = options.serviceName;
        if (this.options.debug) {
            console.debug('[Echolog] Initializing client with options:', this.options);
        }
        this.eventSender = new EventSender_1.EventSender(this.apiUrl, this.apiKey, Object.assign(Object.assign({}, options), { retryAttempts: 3 }));
        this.sessionManager = new SessionManager_1.SessionManager(this.serviceName);
        this.eventManager = new EventManager_1.EventManager(this, this.sessionManager, this.options, this.eventSender);
        this.offlineManager = new OfflineManger_1.OfflineManager();
        this.breadcrumbManager = new BreadcrumbManager(this.options.maxBreadcrumbs);
        this.sessionManager.setEventManager(this.eventManager);
        this.errorHandler = new ErrorHandler_1.ErrorHandler(this, this.options);
        this.consoleCapture = new ConsoleCapture_1.ConsoleCapture(this.eventManager, this.sessionManager, this.options);
        this.networkCapture = new NetworkCapture_1.NetworkCapture(this.eventManager, this.sessionManager, this.serviceName, this.apiUrl, this.options);
        this.setupOfflineSupport();
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => this.flush(true));
        }
        try {
            this.eventManager.captureEvent({
                id: (0, utility_1.generateUniqueId)(),
                timestamp: new Date().toISOString(),
                service_name: this.serviceName,
                instance_id: null,
                level: types_1.LogLevel.INFO,
                message: 'App opened',
                context: null,
                thread_id: null,
                file: null,
                line: null,
                function: null,
                trace_id: null,
                span_id: null,
                parent_span_id: null,
                project_id: this.projectId,
                duration_ms: null,
                error_type: null,
                stack_trace: null,
                user_data: null,
                root_cause: null,
                system_metrics: null,
                code_location: null,
                session: null,
                error_details: null,
                metadata: options.includeBrowserMetadata !== false && typeof navigator !== 'undefined'
                    ? { userAgent: navigator.userAgent }
                    : null,
                tags: null,
                exception: null,
                network: null,
                console: null,
                breadcrumbs: this.options.enableBreadcrumbs ? this.breadcrumbManager.getAll() : undefined,
            });
        }
        catch (error) {
            console.error('[Echolog] Failed to log initial event:', error);
        }
    }
    /**
     * Sets up offline event handling.
     * @private
     */
    setupOfflineSupport() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.retryOfflineEvents());
        }
    }
    /**
     * Retries sending stored offline events when the connection is restored.
     * @private
     */
    retryOfflineEvents() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const storedEvents = yield this.offlineManager.retrieveEvents();
                if (storedEvents.length > 0) {
                    if (this.options.debug) {
                        console.debug(`[Echolog] Sending ${storedEvents.length} offline events`);
                    }
                    for (const event of storedEvents) {
                        this.eventManager.captureEvent(event);
                    }
                    yield this.offlineManager.clearStoredEvents();
                }
            }
            catch (error) {
                console.error('[Echolog] Failed to retry offline events:', error);
                if (this.options.debug) {
                    console.debug('[Echolog] Offline retry error details:', error);
                }
            }
        });
    }
    /**
     * Captures a breadcrumb to record contextual events.
     * @param message The breadcrumb message.
     * @param category Optional category (e.g., 'ui', 'network').
     * @param metadata Optional custom metadata.
     * @example
     * client.captureBreadcrumb('Clicked login button', 'ui', { buttonId: 'login-btn' });
     */
    captureBreadcrumb(message, category, metadata) {
        if (!this.options.enableBreadcrumbs)
            return;
        this.breadcrumbManager.add({
            message,
            category,
            metadata,
        });
        if (this.options.debug) {
            console.debug(`[Echolog] Breadcrumb captured: ${message}`);
        }
    }
    /**
     * Captures an exception and logs it with breadcrumbs.
     * @param {Error | unknown} error - The error to log.
     * @param {Partial<LogEvent<T>> & { user?: UserData; metadata?: T; tags?: Record<string, string>; }} [options] - Additional event options.
     * @returns {string} The unique event ID.
     * @example
     * try {
     *   throw new Error('Something went wrong');
     * } catch (e) {
     *   const eventId = client.captureException(e, { tags: { severity: 'high' } });
     *   console.log('Error logged with ID:', eventId);
     * }
     */
    captureException(error, options = {}) {
        try {
            const eventId = this.eventManager.captureException(error, Object.assign(Object.assign({}, options), { breadcrumbs: this.options.enableBreadcrumbs ? this.breadcrumbManager.getAll() : undefined }));
            if (!navigator.onLine) {
                this.offlineManager.storeEvent(Object.assign(Object.assign({}, options), { id: eventId, level: types_1.LogLevel.ERROR, breadcrumbs: this.options.enableBreadcrumbs ? this.breadcrumbManager.getAll() : undefined }), this.options.maxOfflineEvents);
                if (this.options.debug) {
                    console.debug(`[Echolog] Stored offline exception event: ${eventId}`);
                }
            }
            return eventId;
        }
        catch (captureError) {
            console.error('[Echolog] Failed to capture exception:', captureError);
            return (0, utility_1.generateUniqueId)(); // Return a fallback ID
        }
    }
    /**
     * Captures a custom message log with breadcrumbs.
     * @param {string} message - The message to log.
     * @param {Partial<LogEvent<T>> & { level?: LogLevel; user?: UserData; metadata?: T; tags?: Record<string, string>; }} [options] - Additional event options.
     * @returns {string} The unique event ID.
     * @example
     * const eventId = client.captureMessage('User logged in', {
     *   level: LogLevel.INFO,
     *   user: { id: '123', name: 'John' },
     *   tags: { action: 'login' }
     * });
     */
    captureMessage(message, options = {}) {
        try {
            const eventId = this.eventManager.captureMessage(message, Object.assign(Object.assign({}, options), { breadcrumbs: this.options.enableBreadcrumbs ? this.breadcrumbManager.getAll() : null }));
            if (!navigator.onLine) {
                const offlineEvent = (0, utility_1.createLogEvent)({
                    id: eventId,
                    timestamp: new Date().toISOString(),
                    service_name: this.serviceName,
                    instance_id: null,
                    level: options.level || types_1.LogLevel.INFO,
                    message,
                    context: null,
                    thread_id: null,
                    file: null,
                    line: null,
                    function: null,
                    trace_id: null,
                    span_id: null,
                    parent_span_id: null,
                    project_id: this.projectId,
                    duration_ms: null,
                    error_type: null,
                    stack_trace: null,
                    user_data: options.user || null,
                    root_cause: null,
                    system_metrics: null,
                    code_location: null,
                    session: null,
                    error_details: null,
                    metadata: options.metadata || null,
                    tags: options.tags || null,
                    exception: null,
                    network: null,
                    console: null,
                    breadcrumbs: this.options.enableBreadcrumbs ? this.breadcrumbManager.getAll() : undefined,
                });
                this.offlineManager.storeEvent(offlineEvent, this.options.maxOfflineEvents);
                if (this.options.debug) {
                    console.debug(`[Echolog] Stored offline message event: ${eventId}`);
                }
            }
            return eventId;
        }
        catch (captureError) {
            console.error('[Echolog] Failed to capture message:', captureError);
            return (0, utility_1.generateUniqueId)(); // Return a fallback ID
        }
    }
    /**
     * Flushes all pending events.
     * @param {boolean} [sync=false] - Whether to flush synchronously.
     * @returns {Promise<void>} Resolves when flushing is complete.
     * @example
     * await client.flush(); // Ensure all events are sent before proceeding
     */
    flush() {
        return __awaiter(this, arguments, void 0, function* (sync = false) {
            try {
                yield this.eventManager.flush(sync);
                if (this.options.debug) {
                    console.debug('[Echolog] Flush completed successfully');
                }
            }
            catch (error) {
                console.warn('[Echolog] Flush failed:', error);
                if (this.options.debug) {
                    console.debug('[Echolog] Flush error details:', error);
                }
            }
        });
    }
    /**
     * startSession
     * @param {string} userId - The user ID.
     */
    startSession() {
        this.sessionManager.startSession();
    }
    endSession() {
        this.sessionManager.endSession();
    }
    /**
     * Destroys the client instance and removes event listeners.
     * @example
     * client.destroy(); // Clean up when done
     */
    destroy() {
        try {
            this.eventManager.destroy();
            this.consoleCapture.restoreConsole();
            this.networkCapture.restoreNetworkInterceptors();
            this.breadcrumbManager.clear(); // Clear breadcrumbs on destroy
            if (typeof window !== 'undefined') {
                window.removeEventListener('beforeunload', () => this.flush(true));
                window.removeEventListener('online', () => this.retryOfflineEvents());
            }
            if (this.options.debug) {
                console.debug('[Echolog] Client destroyed');
            }
        }
        catch (error) {
            console.error('[Echolog] Failed to destroy client:', error);
        }
    }
}
exports.EchologClient = EchologClient;
