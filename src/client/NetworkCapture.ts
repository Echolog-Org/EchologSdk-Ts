import { LogEvent, LogLevel, EchologOptions, EnhancedEventMetadata } from '../core/types';
import { generateUniqueId, shouldCaptureRequest } from '../core/utilities/utility';
import { EventManager } from './EventManager';
import { SessionManager } from './SessionManager';


declare global {
  interface XMLHttpRequest {
    __echolog?: {
      method: string;
      url: string;
      startTime: number;
      isInternalRequest?: boolean;
      spanId?: string;
    };
  }
}

export class NetworkCapture <T extends EnhancedEventMetadata = EnhancedEventMetadata> {
  private eventManager: EventManager<T>;
  private sessionManager: SessionManager;
  private serviceName: string;
  private apiUrl: string;
  private options: EchologOptions<T>;
  private xhrOpen?: XMLHttpRequest['open'];
  private xhrSend?: XMLHttpRequest['send'];
  private originalFetch?: typeof fetch;
  private activePageLoadTraceId?: string;

  constructor(
    eventManager: EventManager<T>,
    sessionManager: SessionManager,
    serviceName: string,
    apiUrl: string,
    options: EchologOptions<T>
  ) {
    this.eventManager = eventManager;
    this.sessionManager = sessionManager;
    this.serviceName = serviceName;
    this.apiUrl = apiUrl;
    this.options = options;
    this.setupNetworkCapture();
  }

  public setActivePageLoadTraceId(traceId: string | undefined) {
    this.activePageLoadTraceId = traceId;
  }

  public setupNetworkCapture(): void {
    this.interceptXHR();
    this.interceptFetch();
  }

  private interceptXHR(): void {
    if (typeof XMLHttpRequest === 'undefined') return;

    this.xhrOpen = XMLHttpRequest.prototype.open;
    this.xhrSend = XMLHttpRequest.prototype.send;
    const that = this;

    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      async: boolean = true,
      username?: string | null,
      password?: string | null
    ) {
      const urlString = typeof url === 'string' ? url : url.toString();
      const isInternalRequest = urlString === that.apiUrl || urlString.includes(that.apiUrl);

      this.__echolog = {
        method,
        url: urlString,
        startTime: 0,
        isInternalRequest,
      };

      if (arguments.length === 2) {
        return that.xhrOpen!.call(this, method, url, async);
      } else if (arguments.length === 3) {
        return that.xhrOpen!.call(this, method, url, async);
      } else if (arguments.length === 4) {
        return that.xhrOpen!.call(this, method, url, async, username);
      } else {
        return that.xhrOpen!.call(this, method, url, async, username, password);
      }
    };

    XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, body?: any) {
      // If __echolog is undefined, return the original send method immediately
      if (!this.__echolog) {
        return that.xhrSend!.apply(this, [body]);
      }

      // Now TypeScript knows this.__echolog is defined, but we’ll still use optional chaining for safety
      if (this.__echolog.isInternalRequest || !shouldCaptureRequest(this.__echolog.url, that.apiUrl)) {
        return that.xhrSend!.apply(this, [body]);
      }

      this.__echolog.startTime = Date.now();
      const startTime = this.__echolog.startTime;

      if (that.options.autoInstrument && that.activePageLoadTraceId) {
        const spanId = that.eventManager['client'].startSpan(
          that.activePageLoadTraceId,
          `network: ${this.__echolog.method} ${this.__echolog.url}`,
          undefined,
          { method: this.__echolog.method, url: this.__echolog.url } as unknown as T,
          {
            description: `XHR request to ${this.__echolog.url}`,
            op: 'http.client',
            metadata: { method: this.__echolog.method, url: this.__echolog.url } as unknown as T,
          }
        );
        if (spanId) {
          this.__echolog.spanId = spanId;
        }
      }

      const handleLoadEnd = () => {
        // Guard against __echolog being undefined or modified externally
        if (!this.__echolog) return;

        const duration = Date.now() - startTime;
        const status = this.status;

        if (this.__echolog.spanId && that.activePageLoadTraceId) {
          that.eventManager['client'].finishSpan(that.activePageLoadTraceId, this.__echolog.spanId);
        }

        const resource = performance.getEntriesByName(this.__echolog.url)[0] as PerformanceResourceTiming;
        const metadata: EnhancedEventMetadata = {
          method: this.__echolog.method,
          url: this.__echolog.url,
          status,
          duration,
          ...(resource
            ? {
                dns: resource.domainLookupEnd - resource.domainLookupStart,
                tcp: resource.connectEnd - resource.connectStart,
                request: resource.responseStart - resource.requestStart,
                response: resource.responseEnd - resource.responseStart,
              }
            : {}),
        };

        that.eventManager.captureEvent({
          id: generateUniqueId(),
          timestamp: new Date().toISOString(),
          service_name: that.serviceName,
          level: status >= 400 ? LogLevel.ERROR : LogLevel.INFO,
          message: `${this.__echolog.method} ${this.__echolog.url} - ${status}`,
          duration_ms: duration,
          session: that.sessionManager.getSessionId()
            ? { id: that.sessionManager.getSessionId()!, started_at: that.sessionManager.getSessionStartTime()!.toISOString() }
            : undefined,
          metadata,
        });
      };

      this.addEventListener('loadend', handleLoadEnd);
      return that.xhrSend!.apply(this, [body]);
    };
  }

  private interceptFetch(): void {
    if (typeof fetch === 'undefined') return;

    this.originalFetch = window.fetch;
    const that = this;

    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const startTime = Date.now();
      const method = (init?.method || 'GET').toUpperCase();
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (!shouldCaptureRequest(url, that.apiUrl)) {
        return that.originalFetch!.apply(this, [input, init]);
      }

      let spanId: string | undefined = undefined;
      if (that.options.autoInstrument && that.activePageLoadTraceId) {
        const tempSpanId = that.eventManager['client'].startSpan(
          that.activePageLoadTraceId,
          `network: ${method} ${url}`,
          undefined,
          { method, url } as unknown as T,
          {
            description: `Fetch request to ${url}`,
            op: 'http.client',
            metadata: { method, url } as unknown as T,
          }
        );
        
        if (tempSpanId) {
          spanId = tempSpanId;
        }
      }

      try {
        const response = await that.originalFetch!.apply(this, [input, init]);
        const duration = Date.now() - startTime;
        const status = response.status;

        if (spanId && that.activePageLoadTraceId) {
          that.eventManager['client'].finishSpan(that.activePageLoadTraceId, spanId);
        }

        const resource = performance.getEntriesByName(url)[0] as PerformanceResourceTiming;
        const metadata: EnhancedEventMetadata = {
          method,
          url,
          status,
          duration,
          ...(resource
            ? {
                dns: resource.domainLookupEnd - resource.domainLookupStart,
                tcp: resource.connectEnd - resource.connectStart,
                request: resource.responseStart - resource.requestStart,
                response: resource.responseEnd - resource.responseStart,
              }
            : {}),
        };

        that.eventManager.captureEvent({
          id: generateUniqueId(),
          timestamp: new Date().toISOString(),
          service_name: that.serviceName,
          level: status >= 400 ? LogLevel.ERROR : LogLevel.INFO,
          message: `${method} ${url} - ${status}`,
          duration_ms: duration,
          session: that.sessionManager.getSessionId()
            ? { id: that.sessionManager.getSessionId()!, started_at: that.sessionManager.getSessionStartTime()!.toISOString() }
            : undefined,
          metadata,
        });

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        if (spanId && that.activePageLoadTraceId) {
          that.eventManager['client'].finishSpan(that.activePageLoadTraceId, spanId);
        }
        that.eventManager.captureException(error, {
          message: `Network error: ${method} ${url}`,
          metadata: { url, method, duration } as unknown as T,
        });
        throw error;
      }
    };
  }

  public restoreNetworkInterceptors(): void {
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