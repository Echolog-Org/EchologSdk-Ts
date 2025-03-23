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
// src/client/NetworkCapture.ts
const types_1 = require("../core/types");
const utility_1 = require("../core/utilities/utility"); // Fixed the import path
class NetworkCapture {
    constructor(eventManager, sessionManager, serviceName, // Add serviceName to the constructor
    apiUrl, options) {
        this.eventManager = eventManager;
        this.sessionManager = sessionManager;
        this.serviceName = serviceName;
        this.apiUrl = apiUrl;
        this.options = options;
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
                return that.xhrOpen.call(this, method, url, false);
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
            if (!this.__echolog) {
                return that.xhrSend.apply(this, [body]);
            }
            if (this.__echolog.isInternalRequest) {
                return that.xhrSend.apply(this, [body]);
            }
            this.__echolog.startTime = Date.now();
            const handleLoadEnd = () => {
                if (!(0, utility_1.shouldCaptureRequest)(this.__echolog.url, that.apiUrl))
                    return;
                const duration = Date.now() - this.__echolog.startTime;
                that.eventManager.captureEvent({
                    id: (0, utility_1.generateUniqueId)(),
                    timestamp: new Date().toISOString(),
                    service_name: that.serviceName, // Use the serviceName property directly
                    level: this.status >= 400 ? types_1.LogLevel.ERROR : types_1.LogLevel.INFO,
                    message: `${this.__echolog.method} ${this.__echolog.url} - ${this.status}`,
                    duration_ms: duration,
                    session: that.sessionManager.getSessionId() // Use sessionManager directly
                        ? {
                            id: that.sessionManager.getSessionId(),
                            started_at: that.sessionManager.getSessionStartTime().toISOString(),
                        }
                        : undefined,
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
                const isInternalRequest = url === that.apiUrl || url.includes(that.apiUrl);
                if (isInternalRequest || !(0, utility_1.shouldCaptureRequest)(url, that.apiUrl)) {
                    return that.originalFetch.apply(this, [input, init]);
                }
                try {
                    const response = yield that.originalFetch.apply(this, [input, init]);
                    const duration = Date.now() - startTime;
                    that.eventManager.captureEvent({
                        id: (0, utility_1.generateUniqueId)(),
                        timestamp: new Date().toISOString(),
                        service_name: that.serviceName, // Use the serviceName property directly
                        level: response.status >= 400 ? types_1.LogLevel.ERROR : types_1.LogLevel.INFO,
                        message: `${method} ${url} - ${response.status}`,
                        duration_ms: duration,
                        session: that.sessionManager.getSessionId() // Use sessionManager directly
                            ? {
                                id: that.sessionManager.getSessionId(),
                                started_at: that.sessionManager.getSessionStartTime().toISOString(),
                            }
                            : undefined,
                    });
                    return response;
                }
                catch (error) {
                    that.eventManager.captureException(error, {
                        message: `Network error: ${method} ${url}`,
                        metadata: { url, method },
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
