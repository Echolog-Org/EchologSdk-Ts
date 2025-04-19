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
exports.NetworkCapture = void 0;
const types_1 = require("../core/types");
const utility_1 = require("../core/utilities/utility");
class NetworkCapture {
    constructor(eventManager, sessionManager, serviceName, apiUrl, options) {
        this.eventManager = eventManager;
        this.sessionManager = sessionManager;
        this.serviceName = serviceName;
        this.apiUrl = apiUrl;
        this.options = options;
        this.setupNetworkCapture();
    }
    setActivePageLoadTraceId(traceId) {
        this.activePageLoadTraceId = traceId;
    }
    setupNetworkCapture() {
        this.interceptXHR();
        this.interceptFetch();
    }
    interceptXHR() {
        if (typeof XMLHttpRequest === 'undefined')
            return;
        this.xhrOpen = XMLHttpRequest.prototype.open;
        this.xhrSend = XMLHttpRequest.prototype.send;
        const that = this;
        XMLHttpRequest.prototype.open = function (method, url, async = true, username, password) {
            const urlString = typeof url === 'string' ? url : url.toString();
            const isInternalRequest = urlString === that.apiUrl || urlString.includes(that.apiUrl);
            this.__echolog = {
                method,
                url: urlString,
                startTime: 0,
                isInternalRequest,
            };
            if (arguments.length === 2) {
                return that.xhrOpen.call(this, method, url, async);
            }
            else if (arguments.length === 3) {
                return that.xhrOpen.call(this, method, url, async);
            }
            else if (arguments.length === 4) {
                return that.xhrOpen.call(this, method, url, async, username);
            }
            else {
                return that.xhrOpen.call(this, method, url, async, username, password);
            }
        };
        XMLHttpRequest.prototype.send = function (body) {
            // If __echolog is undefined, return the original send method immediately
            if (!this.__echolog) {
                return that.xhrSend.apply(this, [body]);
            }
            // Now TypeScript knows this.__echolog is defined, but we’ll still use optional chaining for safety
            if (this.__echolog.isInternalRequest || !(0, utility_1.shouldCaptureRequest)(this.__echolog.url, that.apiUrl)) {
                return that.xhrSend.apply(this, [body]);
            }
            this.__echolog.startTime = Date.now();
            const startTime = this.__echolog.startTime;
            if (that.options.autoInstrument && that.activePageLoadTraceId) {
                const spanId = that.eventManager['client'].startSpan(that.activePageLoadTraceId, `network: ${this.__echolog.method} ${this.__echolog.url}`, undefined, { method: this.__echolog.method, url: this.__echolog.url }, {
                    description: `XHR request to ${this.__echolog.url}`,
                    op: 'http.client',
                    metadata: { method: this.__echolog.method, url: this.__echolog.url },
                });
                if (spanId) {
                    this.__echolog.spanId = spanId;
                }
            }
            const handleLoadEnd = () => {
                // Guard against __echolog being undefined or modified externally
                if (!this.__echolog)
                    return;
                const duration = Date.now() - startTime;
                const status = this.status;
                if (this.__echolog.spanId && that.activePageLoadTraceId) {
                    that.eventManager['client'].finishSpan(that.activePageLoadTraceId, this.__echolog.spanId);
                }
                const resource = performance.getEntriesByName(this.__echolog.url)[0];
                const metadata = Object.assign({ method: this.__echolog.method, url: this.__echolog.url, status,
                    duration }, (resource
                    ? {
                        dns: resource.domainLookupEnd - resource.domainLookupStart,
                        tcp: resource.connectEnd - resource.connectStart,
                        request: resource.responseStart - resource.requestStart,
                        response: resource.responseEnd - resource.responseStart,
                    }
                    : {}));
                that.eventManager.captureEvent({
                    id: (0, utility_1.generateUniqueId)(),
                    timestamp: new Date().toISOString(),
                    service_name: that.serviceName,
                    level: status >= 400 ? types_1.LogLevel.ERROR : types_1.LogLevel.INFO,
                    message: `${this.__echolog.method} ${this.__echolog.url} - ${status}`,
                    duration_ms: duration,
                    session: that.sessionManager.getSessionId()
                        ? { id: that.sessionManager.getSessionId(), started_at: that.sessionManager.getSessionStartTime().toISOString() }
                        : undefined,
                    metadata,
                });
            };
            this.addEventListener('loadend', handleLoadEnd);
            return that.xhrSend.apply(this, [body]);
        };
    }
    interceptFetch() {
        if (typeof fetch === 'undefined')
            return;
        this.originalFetch = window.fetch;
        const that = this;
        window.fetch = function (input, init) {
            return __awaiter(this, void 0, void 0, function* () {
                const startTime = Date.now();
                const method = ((init === null || init === void 0 ? void 0 : init.method) || 'GET').toUpperCase();
                const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
                if (!(0, utility_1.shouldCaptureRequest)(url, that.apiUrl)) {
                    return that.originalFetch.apply(this, [input, init]);
                }
                let spanId = undefined;
                if (that.options.autoInstrument && that.activePageLoadTraceId) {
                    const tempSpanId = that.eventManager['client'].startSpan(that.activePageLoadTraceId, `network: ${method} ${url}`, undefined, { method, url }, {
                        description: `Fetch request to ${url}`,
                        op: 'http.client',
                        metadata: { method, url },
                    });
                    if (tempSpanId) {
                        spanId = tempSpanId;
                    }
                }
                try {
                    const response = yield that.originalFetch.apply(this, [input, init]);
                    const duration = Date.now() - startTime;
                    const status = response.status;
                    if (spanId && that.activePageLoadTraceId) {
                        that.eventManager['client'].finishSpan(that.activePageLoadTraceId, spanId);
                    }
                    const resource = performance.getEntriesByName(url)[0];
                    const metadata = Object.assign({ method,
                        url,
                        status,
                        duration }, (resource
                        ? {
                            dns: resource.domainLookupEnd - resource.domainLookupStart,
                            tcp: resource.connectEnd - resource.connectStart,
                            request: resource.responseStart - resource.requestStart,
                            response: resource.responseEnd - resource.responseStart,
                        }
                        : {}));
                    that.eventManager.captureEvent({
                        id: (0, utility_1.generateUniqueId)(),
                        timestamp: new Date().toISOString(),
                        service_name: that.serviceName,
                        level: status >= 400 ? types_1.LogLevel.ERROR : types_1.LogLevel.INFO,
                        message: `${method} ${url} - ${status}`,
                        duration_ms: duration,
                        session: that.sessionManager.getSessionId()
                            ? { id: that.sessionManager.getSessionId(), started_at: that.sessionManager.getSessionStartTime().toISOString() }
                            : undefined,
                        metadata,
                    });
                    return response;
                }
                catch (error) {
                    const duration = Date.now() - startTime;
                    if (spanId && that.activePageLoadTraceId) {
                        that.eventManager['client'].finishSpan(that.activePageLoadTraceId, spanId);
                    }
                    that.eventManager.captureException(error, {
                        message: `Network error: ${method} ${url}`,
                        metadata: { url, method, duration },
                    });
                    throw error;
                }
            });
        };
    }
    restoreNetworkInterceptors() {
        if (this.xhrOpen) {
            XMLHttpRequest.prototype.open = this.xhrOpen;
            this.xhrOpen = undefined;
        }
        if (this.xhrSend) {
            XMLHttpRequest.prototype.send = this.xhrSend;
            this.xhrSend = undefined;
        }
        if (this.originalFetch) {
            window.fetch = this.originalFetch;
            this.originalFetch = undefined;
        }
    }
}
exports.NetworkCapture = NetworkCapture;
