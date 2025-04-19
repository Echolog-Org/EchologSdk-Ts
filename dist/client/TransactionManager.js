"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionManager = void 0;
const types_1 = require("../core/types");
const utility_1 = require("../core/utilities/utility");
class TransactionManager {
    constructor(client, sampleRate = 1.0) {
        this.transactions = new Map();
        this.client = client;
        this.sampleRate = sampleRate;
    }
    startTransaction(options) {
        if (Math.random() > this.sampleRate) {
            return null;
        }
        const { name, op, metadata } = options;
        const traceId = (0, utility_1.generateUniqueId)();
        const startTime = performance.now();
        const perfEntries = performance.getEntriesByType('navigation');
        const loadTime = perfEntries.length > 0
            ? perfEntries[0].loadEventEnd - perfEntries[0].startTime
            : undefined;
        const memoryUsage = performance.memory
            ? performance.memory.usedJSHeapSize / (1024 * 1024)
            : undefined;
        const enhancedMetadata = Object.assign(Object.assign(Object.assign({}, (metadata || {})), (loadTime !== undefined ? { loadTime } : {})), (memoryUsage !== undefined ? { memoryUsage } : {}));
        const transaction = {
            id: (0, utility_1.generateUniqueId)(),
            trace_id: traceId,
            span_id: null, // Transaction itself doesn't have a span_id
            name,
            op: op || 'transaction',
            start_timestamp: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            service_name: this.client['serviceName'],
            project_id: this.client['projectId'],
            level: types_1.LogLevel.INFO,
            message: `Transaction: ${name}`,
            spans: [],
            metadata: enhancedMetadata,
            breadcrumbs: this.client['breadcrumbManager'].getAll(),
            instance_id: null,
            context: null,
            thread_id: null,
            file: null,
            line: null,
            function: null,
            parent_span_id: null,
            duration_ms: null,
            error_type: null,
            stack_trace: null,
            user_data: null,
            root_cause: null,
            system_metrics: null,
            code_location: null,
            session: this.client['sessionManager'].getSession() || null,
            error_details: null,
            tags: null,
            exception: null,
            network: null,
            console: null,
            end_timestamp: undefined,
        };
        this.transactions.set(traceId, transaction);
        // Send the transaction start event to the backend via EventManager
        if (this.client['options'].debug) {
            console.debug('[TransactionManager] Starting transaction:', transaction);
        }
        this.client['eventManager'].captureEvent(transaction);
        return transaction;
    }
    startSpan(transaction, options) {
        const { description, op, parentSpanId, metadata } = options;
        const startTime = performance.now();
        const enhancedMetadata = Object.assign(Object.assign({}, (metadata || {})), { startTime });
        const span = {
            span_id: (0, utility_1.generateUniqueId)(),
            parent_span_id: parentSpanId || null,
            description,
            op: op || 'custom',
            start_timestamp: new Date().toISOString(),
            metadata: enhancedMetadata,
            end_timestamp: undefined,
            duration_ms: undefined,
        };
        transaction.spans.push(span);
        // Send the span start event to the backend via EventManager
        const spanEvent = Object.assign(Object.assign({}, transaction), { span_id: span.span_id, message: `Span: ${description}`, description,
            op, start_timestamp: span.start_timestamp, metadata: span.metadata });
        if (this.client['options'].debug) {
            console.debug('[TransactionManager] Starting span:', span);
        }
        this.client['eventManager'].captureEvent(spanEvent);
        return span;
    }
    finishSpan(span) {
        var _a;
        if (!span.end_timestamp) {
            span.end_timestamp = new Date().toISOString();
            const endTime = performance.now();
            span.duration_ms = endTime - (((_a = span.metadata) === null || _a === void 0 ? void 0 : _a.startTime) || new Date(span.start_timestamp).getTime());
            if (span.metadata) {
                span.metadata.duration = span.duration_ms;
                if (performance.memory) {
                    span.metadata.memoryUsage = performance.memory.usedJSHeapSize / (1024 * 1024);
                }
            }
            // Find the parent transaction to send the updated span
            for (const [traceId, transaction] of this.transactions) {
                if (transaction.spans.some(s => s.span_id === span.span_id)) {
                    const spanEvent = Object.assign(Object.assign({}, transaction), { span_id: span.span_id, message: `Span finished: ${span.description}`, description: span.description, op: span.op, start_timestamp: span.start_timestamp, end_timestamp: span.end_timestamp, duration_ms: span.duration_ms, metadata: span.metadata });
                    if (this.client['options'].debug) {
                        console.debug('[TransactionManager] Finishing span:', span);
                    }
                    this.client['eventManager'].captureEvent(spanEvent);
                    break;
                }
            }
        }
    }
    finishTransaction(traceId) {
        const transaction = this.transactions.get(traceId);
        if (!transaction)
            return;
        transaction.end_timestamp = new Date().toISOString();
        transaction.duration_ms = (new Date(transaction.end_timestamp).getTime() - new Date(transaction.start_timestamp).getTime()) / 1000; // Convert to seconds
        if (transaction.metadata && performance.memory) {
            transaction.metadata.memoryUsage = performance.memory.usedJSHeapSize / (1024 * 1024);
        }
        if (transaction.duration_ms > 5) { // Threshold in seconds (5000ms = 5s)
            transaction.level = types_1.LogLevel.WARN;
            transaction.message = `Slow transaction: ${transaction.name} (${transaction.duration_ms * 1000}ms)`;
        }
        if (this.client['options'].debug) {
            console.debug('[TransactionManager] Finishing transaction:', transaction);
        }
        this.client['eventManager'].captureEvent(transaction);
        this.transactions.delete(traceId);
    }
    getTransaction(traceId) {
        return this.transactions.get(traceId);
    }
}
exports.TransactionManager = TransactionManager;
