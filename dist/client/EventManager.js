"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventManager = void 0;
// src/client/EventManager.ts
const types_1 = require("../core/types");
const utility_1 = require("../core/utilities/utility");
class EventManager {
    constructor(client, sessionManager, options, eventSender) {
        this.eventQueue = [];
        this.isFlushing = false;
        this.client = client;
        this.sessionManager = sessionManager;
        this.options = options;
        this.eventSender = eventSender;
        this.setupFlushInterval();
    }
    setupFlushInterval() {
        const interval = this.options.flushInterval || 5000;
        if (typeof window !== 'undefined') {
            this.flushIntervalId = window.setInterval(() => this.flush(), interval);
        }
    }
    captureEvent(event) {
        var _a, _b, _c, _d, _e;
        if (this.eventSender.isSendingLogsActive())
            return null;
        if ((_a = event.message) === null || _a === void 0 ? void 0 : _a.includes("[Echolog Debug]"))
            return null;
        const isTransaction = 'spans' in event && 'name' in event && 'start_timestamp' in event;
        let completeEvent;
        if (isTransaction) {
            completeEvent = {
                id: event.id || (0, utility_1.generateUniqueId)(),
                timestamp: event.timestamp || new Date().toISOString(),
                service_name: event.service_name || this.client['serviceName'],
                level: event.level || types_1.LogLevel.INFO,
                message: event.message || `Transaction: ${event.name}`,
                project_id: this.client['projectId'],
                trace_id: event.trace_id || (0, utility_1.generateUniqueId)(),
                span_id: event.span_id || (0, utility_1.generateUniqueId)(),
                parent_span_id: event.parent_span_id || null,
                duration_ms: (_b = event.duration_ms) !== null && _b !== void 0 ? _b : null,
                name: event.name,
                start_timestamp: event.start_timestamp || new Date().toISOString(),
                end_timestamp: event.end_timestamp || undefined,
                spans: event.spans || [],
                instance_id: event.instance_id || null,
                context: event.context || null,
                op: event.op || 'transaction',
                thread_id: event.thread_id || null,
                file: event.file || null,
                line: (_c = event.line) !== null && _c !== void 0 ? _c : null,
                function: event.function || null,
                error_type: event.error_type || null,
                stack_trace: event.stack_trace || null,
                user_data: event.user_data || this.userData || null,
                root_cause: event.root_cause || null,
                system_metrics: event.system_metrics || null,
                code_location: event.code_location || null,
                session: event.session || (this.sessionManager.getSessionId() && this.sessionManager.getSessionStartTime()
                    ? { id: this.sessionManager.getSessionId(), started_at: this.sessionManager.getSessionStartTime().toISOString() }
                    : null),
                error_details: event.error_details || null,
                metadata: event.metadata || null,
                tags: Object.assign(Object.assign(Object.assign({}, event.tags), { environment: this.client['environment'] }), (this.client['release'] ? { release: this.client['release'] } : {})),
                exception: event.exception || null,
                network: event.network || null,
                console: event.console || null,
                breadcrumbs: event.breadcrumbs || this.client['breadcrumbManager'].getAll(),
            };
        }
        else {
            completeEvent = {
                id: event.id || (0, utility_1.generateUniqueId)(),
                timestamp: event.timestamp || new Date().toISOString(),
                service_name: event.service_name || this.client['serviceName'],
                level: event.level || types_1.LogLevel.INFO,
                message: event.message || '',
                instance_id: event.instance_id || null,
                context: event.context || null,
                thread_id: event.thread_id || null,
                file: event.file || null,
                line: (_d = event.line) !== null && _d !== void 0 ? _d : null,
                function: event.function || null,
                project_id: this.client['projectId'],
                trace_id: event.trace_id || null,
                span_id: event.span_id || null,
                parent_span_id: event.parent_span_id || null,
                duration_ms: (_e = event.duration_ms) !== null && _e !== void 0 ? _e : null,
                error_type: event.error_type || null,
                stack_trace: event.stack_trace || null,
                user_data: event.user_data || this.userData || null,
                root_cause: event.root_cause || null,
                system_metrics: event.system_metrics || null,
                code_location: event.code_location || null,
                session: event.session || (this.sessionManager.getSessionId() && this.sessionManager.getSessionStartTime()
                    ? { id: this.sessionManager.getSessionId(), started_at: this.sessionManager.getSessionStartTime().toISOString() }
                    : null),
                error_details: event.error_details || null,
                metadata: event.metadata || null,
                tags: Object.assign(Object.assign(Object.assign({}, event.tags), { environment: this.client['environment'] }), (this.client['release'] ? { release: this.client['release'] } : {})),
                exception: event.exception || null,
                network: event.network || null,
                console: event.console || null,
                breadcrumbs: event.breadcrumbs || this.client['breadcrumbManager'].getAll(),
            };
        }
        if (typeof navigator !== 'undefined') {
            completeEvent.metadata = Object.assign(Object.assign({}, (completeEvent.metadata || {})), { browser: {
                    name: (0, utility_1.getBrowserName)(),
                    userAgent: navigator.userAgent,
                } });
        }
        if (this.options.beforeSend) {
            const processedEvent = this.options.beforeSend(completeEvent);
            if (!processedEvent) {
                this.debugLog('Event skipped by beforeSend hook', completeEvent);
                return null;
            }
            Object.assign(completeEvent, processedEvent);
        }
        if (this.options.sampleRate !== undefined && Math.random() > this.options.sampleRate) {
            return null;
        }
        this.eventQueue.push(completeEvent);
        if (this.options.maxBatchSize && this.eventQueue.length >= this.options.maxBatchSize) {
            this.flush();
        }
        this.debugLog('Event captured', { eventId: completeEvent.id, queueLength: this.eventQueue.length, isTransaction });
        return completeEvent.id;
    }
    captureException(error, options = {}) {
        var _a;
        if (this.eventSender.isSendingLogsActive())
            return '';
        const errorObject = error instanceof Error ? error : new Error(String(error));
        if ((_a = errorObject.stack) === null || _a === void 0 ? void 0 : _a.includes('EchologClient')) {
            return '';
        }
        const eventId = (0, utility_1.generateUniqueId)();
        const timestamp = new Date().toISOString();
        const event = {
            id: eventId,
            timestamp,
            service_name: this.client['serviceName'],
            level: options.level || types_1.LogLevel.ERROR,
            message: options.message || errorObject.message,
            instance_id: options.instance_id || null,
            context: options.context || null,
            thread_id: options.thread_id || null,
            file: options.file || '',
            line: options.line || 0,
            function: options.function || '',
            project_id: this.client['projectId'],
            trace_id: options.trace_id || '',
            span_id: options.span_id || '',
            parent_span_id: options.parent_span_id || '',
            duration_ms: options.duration_ms || 0,
            error_type: options.error_type || errorObject.name,
            stack_trace: errorObject.stack ? { raw: errorObject.stack } : null,
            user_data: options.user || null,
            root_cause: options.root_cause || '',
            system_metrics: options.system_metrics || null,
            code_location: options.code_location || null,
            session: this.sessionManager.getSessionId()
                ? { id: this.sessionManager.getSessionId(), started_at: this.sessionManager.getSessionStartTime().toISOString() }
                : null,
            error_details: options.error_details || null,
            metadata: options.metadata || null,
            tags: options.tags || null,
            exception: {
                type: errorObject.name,
                value: errorObject.message,
                stacktrace: errorObject.stack,
            },
            network: null,
            console: null,
            breadcrumbs: this.client['breadcrumbManager'].getAll(),
        };
        return this.captureEvent(event) || '';
    }
    captureMessage(message, options = {}) {
        if (this.eventSender.isSendingLogsActive())
            return '';
        const eventId = (0, utility_1.generateUniqueId)();
        const timestamp = new Date().toISOString();
        const event = {
            id: eventId,
            timestamp,
            service_name: this.client['serviceName'],
            level: options.level || types_1.LogLevel.INFO,
            message,
            user_data: options.user || null,
            metadata: options.metadata || null,
            tags: options.tags || null,
            session: this.sessionManager.getSessionId()
                ? { id: this.sessionManager.getSessionId(), started_at: this.sessionManager.getSessionStartTime().toISOString() }
                : null,
            project_id: this.client['projectId'],
            duration_ms: 0,
            code_location: { file: '', line: 0, function: '' },
            span_id: options.span_id || '',
            console: null,
            network: { url: '', method: '', status_code: 0, duration: 0 },
            trace_id: options.trace_id || '',
            parent_span_id: options.parent_span_id || '',
            error_type: '',
            stack_trace: { raw: '' },
            system_metrics: { cpu_usage: null, memory_usage: null },
            context: {},
            instance_id: '',
            error_details: null,
            exception: { type: '', value: '', stacktrace: '' },
            thread_id: '',
            file: '',
            line: 0,
            function: '',
            root_cause: '',
            breadcrumbs: options.breadcrumbs || this.client['breadcrumbManager'].getAll(),
        };
        return this.captureEvent(event) || '';
    }
    flush(sync = false) {
        if (this.isFlushing || this.eventQueue.length === 0) {
            this.debugLog('Flush skipped', { isFlushing: this.isFlushing, queueLength: this.eventQueue.length });
            return;
        }
        this.isFlushing = true;
        const eventsToSend = [...this.eventQueue];
        this.eventQueue = [];
        this.debugLog('Flushing events', { eventCount: eventsToSend.length, sync });
        if (sync && typeof navigator !== 'undefined') {
            this.eventSender.sendEventsSync(eventsToSend);
            this.isFlushing = false;
        }
        else {
            this.eventSender.sendEvents(eventsToSend)
                .catch((error) => {
                console.error('[Echolog] Failed to send events:', error);
                this.eventQueue = [...eventsToSend, ...this.eventQueue];
            })
                .finally(() => {
                this.isFlushing = false;
            });
        }
    }
    destroy() {
        if (this.flushIntervalId) {
            clearInterval(this.flushIntervalId);
        }
    }
    ///setUser
    setUser(user) {
        this.userData = user;
    }
    debugLog(message, data) {
        if (this.options.debug && !this.eventSender.isSendingLogsActive()) {
            if (message.includes("[Echolog Debug]"))
                return;
            const timestamp = new Date().toISOString();
            console.debug(`[Echolog Debug] [${timestamp}] ${message}`, data || '');
        }
    }
}
exports.EventManager = EventManager;
