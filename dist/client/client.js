"use strict";
/**
 * @package Echolog
 * @version 1.0.0
 * @license MIT
 * @description A lightweight JavaScript client for capturing and reporting logs, errors, network events, and performance metrics.
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
const ReplayManager_1 = require("./ReplayManager");
const types_1 = require("../core/types");
const utility_1 = require("../core/utilities/utility");
const TransactionManager_1 = require("./TransactionManager");
class BreadcrumbManager {
    constructor(maxBreadcrumbs = 20) {
        this.breadcrumbs = [];
        this.maxBreadcrumbs = maxBreadcrumbs;
    }
    add(breadcrumb) {
        const newBreadcrumb = Object.assign({ id: (0, utility_1.generateUniqueId)(), timestamp: new Date().toISOString() }, breadcrumb);
        this.breadcrumbs.push(newBreadcrumb);
        if (this.breadcrumbs.length > this.maxBreadcrumbs) {
            this.breadcrumbs.shift();
        }
    }
    getAll() {
        return [...this.breadcrumbs];
    }
    clear() {
        this.breadcrumbs = [];
    }
}
class EchologClient {
    constructor(options) {
        var _a, _b;
        if (!options.apiKey)
            throw new Error('[Echolog] apiKey is required');
        if (!options.projectId)
            throw new Error('[Echolog] projectId is required');
        if (!options.serviceName)
            throw new Error('[Echolog] serviceName is required');
        this.options = Object.assign({ maxOfflineEvents: 100, maxBreadcrumbs: 20, enableBreadcrumbs: true, includeBrowserMetadata: true, maxRetries: 3, retryAttempts: 3, debug: false, enableNetworkCapture: true, enableConsoleCapture: true, maxBatchSize: 10, sampleRate: 1, flushInterval: 5000, environment: 'production', autoInstrument: true, enableReplay: false, replaySampleRate: 1.0, autoReplay: false }, options);
        this.apiKey = options.apiKey;
        this.projectId = options.projectId;
        this.apiUrl = (_a = options.apiUrl) !== null && _a !== void 0 ? _a : 'https://api.echolog.xyz/events';
        this.environment = (_b = options.environment) !== null && _b !== void 0 ? _b : 'production';
        this.serviceName = options.serviceName;
        this.release = options.release;
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
        this.transactionManager = new TransactionManager_1.TransactionManager(this, this.options.sampleRate);
        this.replayManager = new ReplayManager_1.ReplayManager(this, this.sessionManager, this.options, this.eventSender);
        this.setupOfflineSupport();
        this.setupAutoInstrumentation();
        // Start replay if enabled and autoReplay is set to onSessionStart
        if (this.options.enableReplay && this.options.autoReplay === 'onSessionStart') {
            this.startSession(); // Start session and replay together
        }
        else if (this.options.enableReplay && !this.options.autoReplay) {
            this.startReplay(); // Manual replay start if no autoReplay
        }
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                this.flush(true);
                this.flushReplay();
            });
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
                root_cause: null,
                system_metrics: null,
                code_location: null,
                session: this.sessionManager.getSession(),
                user_data: this.userData || null,
                error_details: null,
                metadata: this.options.includeBrowserMetadata !== false && typeof navigator !== 'undefined'
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
    //setUser
    setUser(user) {
        this.userData = user;
        this.sessionManager.setUser(user);
        this.eventManager.setUser(user);
    }
    setupOfflineSupport() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.retryOfflineEvents());
        }
    }
    setupAutoInstrumentation() {
        if (!this.options.autoInstrument || typeof window === 'undefined')
            return;
        window.addEventListener('load', () => {
            const traceId = this.startTransaction({
                name: 'page_load',
                op: 'navigation',
                metadata: this.options.includeBrowserMetadata !== false && typeof navigator !== 'undefined'
                    ? { userAgent: navigator.userAgent }
                    : undefined,
            });
            if (traceId) {
                this.activePageLoadTraceId = traceId;
                this.networkCapture.setActivePageLoadTraceId(traceId);
                const observer = new PerformanceObserver((entryList) => {
                    const entries = entryList.getEntries();
                    const transaction = this.transactionManager.getTransaction(traceId);
                    if (transaction && transaction.metadata) {
                        entries.forEach((entry) => {
                            if (transaction.metadata === null)
                                return;
                            if (entry.name === 'first-paint')
                                transaction.metadata.firstPaint = entry.startTime;
                            if (entry.name === 'first-contentful-paint')
                                transaction.metadata.fcp = entry.startTime;
                            if (entry.name === 'largest-contentful-paint')
                                transaction.metadata.lcp = entry.startTime;
                        });
                    }
                });
                observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
                this.finishTransaction(traceId);
            }
            // Auto-start replay on page load if enabled
            if (this.options.enableReplay && this.options.autoReplay === 'onLoad') {
                this.startReplay();
            }
        });
    }
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
    captureBreadcrumb(message, category, metadata) {
        if (!this.options.enableBreadcrumbs)
            return;
        this.breadcrumbManager.add({ message, category, metadata });
        if (this.options.debug) {
            console.debug(`[Echolog] Breadcrumb captured: ${message}`);
        }
    }
    captureException(error, options = {}) {
        var _a, _b, _c;
        try {
            const eventManagerOptions = Object.assign(Object.assign({}, options), { user: this.userData || options.user, metadata: options.metadata, tags: options.tags, breadcrumbs: this.options.enableBreadcrumbs ? this.breadcrumbManager.getAll() : undefined, trace_id: (_a = options.trace_id) !== null && _a !== void 0 ? _a : undefined, span_id: (_b = options.span_id) !== null && _b !== void 0 ? _b : undefined, parent_span_id: (_c = options.parent_span_id) !== null && _c !== void 0 ? _c : undefined, session: this.sessionManager.getSession() });
            const eventId = this.eventManager.captureException(error, eventManagerOptions);
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
            return (0, utility_1.generateUniqueId)();
        }
    }
    captureMessage(message, options = {}) {
        var _a, _b, _c;
        try {
            const eventManagerOptions = Object.assign(Object.assign({}, options), { level: options.level, user: options.user, metadata: options.metadata, tags: options.tags, breadcrumbs: this.options.enableBreadcrumbs ? this.breadcrumbManager.getAll() : null, trace_id: (_a = options.trace_id) !== null && _a !== void 0 ? _a : undefined, span_id: (_b = options.span_id) !== null && _b !== void 0 ? _b : undefined, parent_span_id: (_c = options.parent_span_id) !== null && _c !== void 0 ? _c : undefined, session: this.sessionManager.getSession() });
            const eventId = this.eventManager.captureMessage(message, eventManagerOptions);
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
                    session: this.sessionManager.getSession(),
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
            return (0, utility_1.generateUniqueId)();
        }
    }
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
    // Replay-specific methods
    startReplay() {
        if (!this.options.enableReplay) {
            if (this.options.debug) {
                console.debug('[Echolog] Replay not enabled in options');
            }
            return;
        }
        this.replayManager.startRecording();
    }
    stopReplay() {
        this.replayManager.stopRecording();
    }
    flushReplay() {
        this.replayManager.flush();
    }
    startSession() {
        this.sessionManager.startSession();
        // Auto-start replay if configured
        if (this.options.enableReplay && this.options.autoReplay === 'onSessionStart') {
            this.startReplay();
        }
    }
    endSession() {
        this.sessionManager.endSession();
        // Stop replay if autoReplay is onSessionStart
        if (this.options.enableReplay && this.options.autoReplay === 'onSessionStart') {
            this.stopReplay();
        }
    }
    startTransaction(options) {
        const transaction = this.transactionManager.startTransaction(options);
        return transaction ? transaction.trace_id : null;
    }
    startSpan(traceId, p0, undefined, p1, options) {
        const transaction = this.transactionManager.getTransaction(traceId);
        if (!transaction)
            return null;
        const span = this.transactionManager.startSpan(transaction, options);
        return span ? span.span_id : null;
    }
    finishSpan(traceId, spanId) {
        const transaction = this.transactionManager.getTransaction(traceId);
        if (!transaction)
            return;
        const span = transaction.spans.find((s) => s.span_id === spanId);
        if (span) {
            this.transactionManager.finishSpan(span);
        }
    }
    finishTransaction(traceId) {
        this.transactionManager.finishTransaction(traceId);
    }
    destroy() {
        try {
            this.eventManager.destroy();
            this.consoleCapture.restoreConsole();
            this.networkCapture.restoreNetworkInterceptors();
            this.breadcrumbManager.clear();
            this.replayManager.stopRecording();
            this.flushReplay();
            if (typeof window !== 'undefined') {
                window.removeEventListener('beforeunload', () => {
                    this.flush(true);
                    this.flushReplay();
                });
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
