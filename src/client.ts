// src/client.ts
import { LogEvent, EchologOptions, EventMetadata, LogLevel, NetworkEvent, UserData } from "./core/types";
import { shouldCaptureRequest, generateUniqueId, getBrowserName, stringifyArg, transformJsonForServer } from "./core/utitilites/utitiliy";

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

export class EchologClient<T extends EventMetadata = EventMetadata> {
  private apiKey: string;
  private apiUrl: string;
  private environment: string;
  private release?: string;
  private sessionId?: string;
  private sessionStartTime?: Date;
  private eventQueue: LogEvent<T>[] = [];
  private flushIntervalId?: number;
  private isFlushing = false;
  private isSendingLogs = false; // Flag to prevent recursive logging
  private options: EchologOptions<T>;
  private originalConsole: Partial<Record<keyof Console, Function>> = {};
  private serviceName: string;
  private xhrOpen?: XMLHttpRequest['open'];
  private xhrSend?: XMLHttpRequest['send'];
  private originalFetch?: typeof fetch;

  constructor(options: EchologOptions<T>) {
    this.options = options;
    this.apiKey = options.apiKey;
    this.apiUrl = options.apiUrl || 'http://localhost:8080/events';
    this.environment = options.environment || 'production';
    this.release = options.release;
    this.serviceName = 'client';

    this.setupFlushInterval();

    if (options.captureUnhandledErrors) {
      this.setupErrorCapture();
    }

    if (options.captureUnhandledPromiseRejections) {
      this.setupPromiseRejectionCapture();
    }

    if (options.enableConsoleCapture) {
      this.setupConsoleCapture();
    }

    if (options.enableNetworkCapture) {
      this.setupNetworkCapture();
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  private handleBeforeUnload = () => {
    this.flush(true);
  };

  public startSession(): void {
    this.sessionId = generateUniqueId();
    this.sessionStartTime = new Date();

    this.captureEvent({
      id: generateUniqueId(),
      timestamp: new Date().toISOString(),
      service_name: this.serviceName,
      level: ('INFO' as keyof LogLevel),
      message: 'Session started',
      session: {
        id: this.sessionId,
        startedAt: this.sessionStartTime.toISOString(),
      },
    });
  }

  public endSession(): void {
    if (!this.sessionId || !this.sessionStartTime) {
      return;
    }

    const sessionEndTime = new Date();
    const sessionDuration = sessionEndTime.getTime() - this.sessionStartTime.getTime();

    this.captureEvent({
      id: generateUniqueId(),
      timestamp: new Date().toISOString(),
      service_name: this.serviceName,
      level: ('INFO' as keyof LogLevel),
      message: 'Session ended',
      session: {
        id: this.sessionId,
        startedAt: this.sessionStartTime.toISOString(),
        duration: sessionDuration,
      },
    });

    this.sessionId = undefined;
    this.sessionStartTime = undefined;
    this.flush(true);
  }

  public captureException(
    error: Error | unknown,
    options: Partial<LogEvent<T>> & {
      user?: UserData;
      metadata?: T;
      tags?: Record<string, string>;
    } = {}
  ): string {
    // Skip if we're currently sending logs to prevent recursion
    if (this.isSendingLogs) return '';
    
    const errorObject = error instanceof Error ? error : new Error(String(error));
    const eventId = generateUniqueId();
    const timestamp = new Date().toISOString();
  
    const event: LogEvent<T> = {
      id: eventId,
      timestamp,
      service_name: this.serviceName,
      level: options.level || ("TRACE" as keyof LogLevel),
      message: options.message || errorObject.message,
      // Optional fields remain undefined unless provided
      instance_id: options.instance_id || null,
      context: options.context || null,
      thread_id: options.thread_id || null,
      file: options.file || '',
      line: options.line || 0,
      function: options.function || '',
      trace_id: options.trace_id || '',
      span_id: options.span_id || '',
      parent_span_id: options.parent_span_id || '',
      duration_ms: options.duration_ms || 0,
      error_type: options.error_type || errorObject.name,
      stack_trace: errorObject.stack ? { raw: errorObject.stack } : null,
      user_data: options.user_data || null,
      root_cause: options.root_cause || '',
      related_errors: options.related_errors || [],
      system_metrics: options.system_metrics || null,
      code_location: options.code_location || null,
      session: this.sessionId ? {
        id: this.sessionId,
        startedAt: this.sessionStartTime!.toISOString(),
      } : null,
      error_details: options.error_details || {
        error_type: errorObject.name,
        stack_trace: errorObject.stack ? [{
          file: options.file || '',
          line: options.line || 0,
          function: options.function || ''
        }] : []
      },
      metadata: options.metadata || null,
      tags: options.tags || null,
      exception: {
        type: errorObject.name,
        value: errorObject.message,
        stacktrace: errorObject.stack
      },
      network: null,
      console: null
    };
  
    this.captureEvent(event);
    return eventId;
  }

  public captureMessage(
    message: string,
    options: {
      level?: keyof LogLevel;
      user?: UserData;
      metadata?: T;
      tags?: Record<string, string>;
    } = {}
  ): string {
    // Skip if we're currently sending logs to prevent recursion
    if (this.isSendingLogs) return '';
    
    const eventId = generateUniqueId();
    const timestamp = new Date().toISOString();

    const event: LogEvent<T> = {
      id: eventId,
      timestamp,
      service_name: this.serviceName,
      level: options.level || ('INFO' as keyof LogLevel),
      message: message,
      user_data: options.user || null,
      metadata: options.metadata || null,
      tags: options.tags || null,
      session: this.sessionId ? {
        id: this.sessionId,
        startedAt: this.sessionStartTime!.toISOString(),
      } : null,
      duration_ms: 0,
      code_location: {
        file: '',
        line: 0,
        function: ''
      },
      span_id: '',
      console: {
        method: '',
        args: []
      },
      network: {
        url: '',
        method: '',
        status: 0,
        duration_ms: 0
      },
      trace_id: '',
      parent_span_id: '',
      error_type: '',
      stack_trace: { raw: '' },
      system_metrics: { cpu_usage: null, memory_usage: null },
      context: {
        
      } as T,
      instance_id: '',
      related_errors: [],
      error_details: {
        error_type: '',
        stack_trace: []
      },
      exception: {
        type: '',
        value: '',
        stacktrace: ''
      },
      thread_id: '',
      file: '',
      line: 0,
      function: '',
      root_cause: ''
    };

    this.captureEvent(event);
    return eventId;
  }

  private captureEvent(event: Partial<LogEvent<T>>): string | null {
    // Skip if we're currently sending logs to prevent recursion
    if (this.isSendingLogs) return null;
    
    // Create base event with safe defaults - use null instead of empty objects
    const completeEvent: LogEvent<T> = {
      id: event.id || generateUniqueId(),
      timestamp: event.timestamp || new Date().toISOString(),
      service_name: event.service_name || this.serviceName,
      level: event.level || ('INFO' as keyof LogLevel),
      message: event.message || '',
      instance_id: event.instance_id || null,
      context: event.context || null,  // Changed from {} to null
      thread_id: event.thread_id || null,
      file: event.file || null,
      line: event.line ?? null,
      function: event.function || null,
      trace_id: event.trace_id || null,
      span_id: event.span_id || null,
      parent_span_id: event.parent_span_id || null,
      duration_ms: event.duration_ms ?? null,
      error_type: event.error_type || null,
      stack_trace: event.stack_trace || null,
      user_data: event.user_data || null,  // Changed field name to match schema
      root_cause: event.root_cause || null,
      related_errors: event.related_errors || null,
      system_metrics: event.system_metrics || null,
      code_location: event.code_location || null,
      session: event.session || (this.sessionId && this.sessionStartTime ? {
        id: this.sessionId,
        startedAt: this.sessionStartTime.toISOString(),
      } : null),  // Changed from undefined to null
      error_details: event.error_details || null,
      metadata: event.metadata || null,
      tags: {
        ...event.tags,
        environment: this.environment,
        ...(this.release ? { release: this.release } : {}),
      },
      exception: event.exception || null,
      network: event.network || null,
      console: event.console || null
    };
    
  
    // Add browser metadata if available
    if (typeof navigator !== 'undefined') {
      // Fix: Cast to unknown first, then to T
      completeEvent.metadata = {
        ...(completeEvent.metadata || {}),
        browser: {
          name: getBrowserName(),
          userAgent: navigator.userAgent,
        }
      } as unknown as T;
    }
  
    // Apply beforeSend hook if defined
    if (this.options.beforeSend) {
      const processedEvent = this.options.beforeSend(completeEvent);
      if (!processedEvent) {
        return null;
      }
      Object.assign(completeEvent, processedEvent);
    }
  
    // Apply sampling
    if (this.options.sampleRate !== undefined && Math.random() > this.options.sampleRate) {
      return null;
    }
  
    // Add to queue and handle batch size
    this.eventQueue.push(completeEvent);
    
    if (this.options.maxBatchSize && this.eventQueue.length >= this.options.maxBatchSize) {
      this.flush();
    }
  
    return completeEvent.id;
  }
  
  public flush(sync = false): void {
    if (this.isFlushing || this.eventQueue.length === 0) return;

    this.isFlushing = true;
    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    if (sync && typeof navigator !== 'undefined') {
      this.isSendingLogs = true;
      try {
        this.sendEventsSync(eventsToSend);
      } finally {
        this.isSendingLogs = false;
        this.isFlushing = false;
      }
    } else {
      this.sendEvents(eventsToSend)
        .catch((error) => {
          console.error('[Echolog] Failed to send events:', error);
          this.eventQueue = [...eventsToSend, ...this.eventQueue];
        })
        .finally(() => {
          this.isFlushing = false;
        });
    }
  }

  public destroy(): void {
    if (this.flushIntervalId) {
      clearInterval(this.flushIntervalId);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
    this.restoreConsole();
    this.restoreNetworkInterceptors();
  }

  private setupFlushInterval(): void {
    const interval = this.options.flushInterval || 5000;
    if (typeof window !== 'undefined') {
      this.flushIntervalId = window.setInterval(() => this.flush(), interval);
    }
  }

  private setupErrorCapture(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        if (event.defaultPrevented || this.isSendingLogs) return;
        
        this.captureException(event.error || new Error(event.message), {
          message: `Unhandled error: ${event.message}`,
          // Fix: Cast to unknown first, then to T
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          } as unknown as T,
        });
      });
    }
  }

  private setupPromiseRejectionCapture(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        if (this.isSendingLogs) return;
        
        this.captureException(event.reason || new Error('Unhandled Promise rejection'), {
          message: 'Unhandled Promise rejection',
        });
      });
    }
  }

  private setupConsoleCapture(): void {
    if (typeof console === 'undefined') return;
  
    const consoleMethods = ['log', 'info', 'warn', 'error', 'debug'] as const;

    const levelMap: Record<string, keyof LogLevel> = {
      log: 'INFO' as keyof LogLevel,
      info: 'INFO' as keyof LogLevel,
      warn: 'WARN' as keyof LogLevel,
      error: 'ERROR' as keyof LogLevel,
      debug: 'DEBUG' as keyof LogLevel,
    };
  
    consoleMethods.forEach((method) => {
      this.originalConsole[method] = console[method];
      console[method] = (...args: any[]) => {
        this.originalConsole[method]?.(...args);
        
        // Skip capturing if we're currently sending logs to prevent recursion
        if (!this.isSendingLogs) {
          this.captureEvent({
            id: generateUniqueId(),
            timestamp: new Date().toISOString(),
            service_name: this.serviceName,
            level: levelMap[method],
            message: args.map(stringifyArg).join(' '),
            code_location: {
              file: '',
              line: 0,
              function: ''
            },
            session: this.sessionId ? {
              id: this.sessionId,
              startedAt: this.sessionStartTime!.toISOString(),
            } : undefined,
          });
        }
      };
    });
  }

  private setupNetworkCapture(): void {
    this.interceptXHR();
    this.interceptFetch();
  }

  private interceptXHR(): void {
    if (typeof XMLHttpRequest === 'undefined') return;
  
    this.xhrOpen = XMLHttpRequest.prototype.open;
    this.xhrSend = XMLHttpRequest.prototype.send;
    const that = this;
  
    XMLHttpRequest.prototype.open = function(
      this: XMLHttpRequest, 
      method: string, 
      url: string | URL, 
      async: boolean = true, 
      username?: string | null, 
      password?: string | null
    ) {
      // Store the actual URL string
      const urlString = typeof url === 'string' ? url : url.toString();
      
      // Check if this is an internal request to the Echolog API
      const isInternalRequest = urlString === that.apiUrl || urlString.includes(that.apiUrl);
      
      this.__echolog = { 
        method, 
        url: urlString, 
        startTime: 0,
        isInternalRequest 
      };
      
      // Fix: Use proper argument passing
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
  
    XMLHttpRequest.prototype.send = function(this: XMLHttpRequest, body?: any) {
      if (!this.__echolog) {
        return that.xhrSend!.apply(this, [body]);
      }
  
      // Skip capturing if this is an internal request or if we're already sending logs
      if (this.__echolog.isInternalRequest || that.isSendingLogs) {
        return that.xhrSend!.apply(this, [body]);
      }
  
      this.__echolog.startTime = Date.now();
      const handleLoadEnd = () => {
        if (that.isSendingLogs) return;
        if (!shouldCaptureRequest(this.__echolog!.url, that.apiUrl)) return;
  
        const duration = Date.now() - this.__echolog!.startTime;
        that.captureEvent({
          id: generateUniqueId(),
          timestamp: new Date().toISOString(),
          service_name: that.serviceName,
          level: this.status >= 400 ? ('ERROR' as keyof LogLevel) : ('INFO' as keyof LogLevel),
          message: `${this.__echolog!.method} ${this.__echolog!.url} - ${this.status}`,
          duration_ms: duration,
          session: that.sessionId ? {
            id: that.sessionId,
            startedAt: that.sessionStartTime!.toISOString(),
          } : undefined,
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
  
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      const startTime = Date.now();
      const method = (init?.method || 'GET').toUpperCase();
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  
      // Skip capturing if this is an internal request or if we're already sending logs
      const isInternalRequest = url === that.apiUrl || url.includes(that.apiUrl);
      if (isInternalRequest || that.isSendingLogs || !shouldCaptureRequest(url, that.apiUrl)) {
        return that.originalFetch!.apply(this, [input, init]);
      }
  
      try {
        const response = await that.originalFetch!.apply(this, [input, init]);
        const duration = Date.now() - startTime;
  
        that.captureEvent({
          id: generateUniqueId(),
          timestamp: new Date().toISOString(),
          service_name: that.serviceName,
          level: response.status >= 400 ? ('ERROR' as keyof LogLevel) : ('INFO' as keyof LogLevel),
          message: `${method} ${url} - ${response.status}`,
          duration_ms: duration,
          session: that.sessionId ? {
            id: that.sessionId,
            startedAt: that.sessionStartTime!.toISOString(),
          } : undefined,
        });
  
        return response;
      } catch (error) {
        that.captureException(error, {
          message: `Network error: ${method} ${url}`,
          // Fix: Cast to unknown first, then to T
          metadata: { url, method } as unknown as T,
        });
        throw error;
      }
    };
  }
  
  private async sendEvents(events: LogEvent<T>[]): Promise<void> {
    this.isSendingLogs = true;
    try {
      // Transform all undefined values to null
      const transformedEvents = events.map(event => transformJsonForServer(event));
      
      console.log('[Echolog] Sending events:', transformedEvents);
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-api-key': this.apiKey,
          'x-echolog-internal': 'true'
        },
        body: JSON.stringify(transformedEvents), 
      });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[Echolog] Failed to send events:', message);
      throw error;
    } finally {
      this.isSendingLogs = false;
    }
  }
  
  private sendEventsSync(events: LogEvent<T>[]): boolean {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) return false;
    try {
      // Transform all undefined values to null
      const transformedEvents = events.map(event => transformJsonForServer(event));
      
      const blob = new Blob([JSON.stringify(transformedEvents)], { type: 'application/json' });
      return navigator.sendBeacon(`${this.apiUrl}?apiKey=${encodeURIComponent(this.apiKey)}&internal=true`, blob);
    } catch (error) {
      console.error('[Echolog] Failed to send events via Beacon API:', error);
      return false;
    }
  }
  
  private restoreConsole(): void {
    if (typeof console === 'undefined') return;
    Object.entries(this.originalConsole).forEach(([method, fn]) => {
      (console as any)[method] = fn;
    });
    this.originalConsole = {};
  }
  
  private restoreNetworkInterceptors(): void {
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
  
  export function initEcholog<T extends EventMetadata = EventMetadata>(
    options: EchologOptions<T>
  ): EchologClient<T> {
    const client = new EchologClient<T>(options);
    const globalObj = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : {};
    (globalObj as any).echolog = client;
    return client;
  }