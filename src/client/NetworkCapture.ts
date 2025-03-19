// src/client/NetworkCapture.ts
import { LogEvent, LogLevel, EchologOptions } from '../core/types';
import { generateUniqueId, shouldCaptureRequest } from '../core/utilities/utility'; // Fixed the import path
import { EventManager } from './EventManager';
import { SessionManager } from './SessionManager';

/**
 * Extend the XMLHttpRequest interface to include our custom property
 */
declare global {
  interface XMLHttpRequest {
    __echolog?: {
      method: string;
      url: string;
      startTime: number;
      isInternalRequest?: boolean;
    };
  }
}

export class NetworkCapture {
  private eventManager: EventManager<any>;
  private sessionManager: SessionManager; // Add SessionManager as a property
  private serviceName: string; // Add serviceName as a property
  private apiUrl: string;
  private options: EchologOptions<any>;
  private xhrOpen?: XMLHttpRequest['open'];
  private xhrSend?: XMLHttpRequest['send'];
  private originalFetch?: typeof fetch;

  constructor(
    eventManager: EventManager<any>,
    sessionManager: SessionManager,
    serviceName: string, // Add serviceName to the constructor
    apiUrl: string,
    options: EchologOptions<any>
  ) {
    this.eventManager = eventManager;
    this.sessionManager = sessionManager;
    this.serviceName = serviceName;
    this.apiUrl = apiUrl;
    this.options = options;
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
        return that.xhrOpen!.call(this, method, url, false);
      } else if (arguments.length === 3) {
        return that.xhrOpen!.call(this, method, url, async);
      } else if (arguments.length === 4) {
        return that.xhrOpen!.call(this, method, url, async, username);
      } else {
        return that.xhrOpen!.call(this, method, url, async, username, password);
      }
    };

    XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, body?: any) {
      if (!this.__echolog) {
        return that.xhrSend!.apply(this, [body]);
      }

      if (this.__echolog.isInternalRequest) {
        return that.xhrSend!.apply(this, [body]);
      }

      this.__echolog.startTime = Date.now();
      const handleLoadEnd = () => {
        if (!shouldCaptureRequest(this.__echolog!.url, that.apiUrl)) return;

        const duration = Date.now() - this.__echolog!.startTime;
        that.eventManager.captureEvent({
          id: generateUniqueId(),
          timestamp: new Date().toISOString(),
          service_name: that.serviceName, // Use the serviceName property directly
          level: this.status >= 400 ? LogLevel.ERROR : LogLevel.INFO,
          message: `${this.__echolog!.method} ${this.__echolog!.url} - ${this.status}`,
          duration_ms: duration,
          session: that.sessionManager.getSessionId() // Use sessionManager directly
            ? {
                id: that.sessionManager.getSessionId()!,
                started_at: that.sessionManager.getSessionStartTime()!.toISOString(),
              }
            : undefined,
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

      const isInternalRequest = url === that.apiUrl || url.includes(that.apiUrl);
      if (isInternalRequest || !shouldCaptureRequest(url, that.apiUrl)) {
        return that.originalFetch!.apply(this, [input, init]);
      }

      try {
        const response = await that.originalFetch!.apply(this, [input, init]);
        const duration = Date.now() - startTime;

        that.eventManager.captureEvent({
          id: generateUniqueId(),
          timestamp: new Date().toISOString(),
          service_name: that.serviceName, // Use the serviceName property directly
          level: response.status >= 400 ? LogLevel.ERROR : LogLevel.INFO,
          message: `${method} ${url} - ${response.status}`,
          duration_ms: duration,
          session: that.sessionManager.getSessionId() // Use sessionManager directly
            ? {
                id: that.sessionManager.getSessionId()!,
                started_at: that.sessionManager.getSessionStartTime()!.toISOString(),
              }
            : undefined,
        });

        return response;
      } catch (error) {
        that.eventManager.captureException(error, {
          message: `Network error: ${method} ${url}`,
          metadata: { url, method } as unknown as any,
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