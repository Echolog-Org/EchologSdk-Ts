/**
 * Echolog SDK
 * A TypeScript client for the Echolog logging and monitoring service.
 * @version 1.0.0
 */

import { EchologEvent, EchologOptions, EventMetadata, LogLevel, NetworkEvent, UserData, ConsoleEvent } from "./core/types";
import { shouldCaptureRequest, generateUniqueId, getBrowserName, stringifyArg} from "./utitilites/utitiliy";

/**
 * Extend the XMLHttpRequest interface to include our custom property
 */
declare global {
    export interface XMLHttpRequest {
       __echolog: {
         method: string;
         url: string;
         startTime: number;
       };
     }
   }

/**
 * Main Echolog client class
 * Handles event capture, batching, and transmission to the Echolog API
 */
class EchologClient<T extends EventMetadata = EventMetadata> {
  private apiKey: string;
  private apiUrl: string;
  private environment: string;
  private release?: string;
  private sessionId?: string;
  private sessionStartTime?: Date;
  private eventQueue: EchologEvent<T>[] = [];
  private flushIntervalId?: number;
  private isFlushing = false;
  private options: EchologOptions<T>;
  private originalConsole: Record<string, Function> = {};

  /**
   * Creates a new Echolog client instance
   * @param options Configuration options for the Echolog client
   */
  constructor(options: EchologOptions<T>) {
    this.options = options;
    this.apiKey = options.apiKey;
    this.apiUrl = options.apiUrl || 'https://api.echolog.io/events';
    this.environment = options.environment || 'production';
    this.release = options.release;
    
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
    
    // Add beforeunload event listener to ensure remaining events are sent
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush(true);
      });
    }
  }

  /**
   * Starts a new user session
   * Generates a unique session ID and records the start time
   */
  public startSession(): void {
    this.sessionId = generateUniqueId();
    this.sessionStartTime = new Date();
    
    this.captureEvent({
      level: 'info',
      message: 'Session started',
      session: {
        id: this.sessionId,
        startedAt: this.sessionStartTime.toISOString(),
      },
    });
  }

  /**
   * Ends the current user session
   * Calculates session duration and sends a session ended event
   */
  public endSession(): void {
    if (!this.sessionId || !this.sessionStartTime) {
      return;
    }
    
    const sessionEndTime = new Date();
    const sessionDuration = sessionEndTime.getTime() - this.sessionStartTime.getTime();
    
    this.captureEvent({
      level: 'info',
      message: 'Session ended',
      session: {
        id: this.sessionId,
        startedAt: this.sessionStartTime.toISOString(),
        duration: sessionDuration,
      },
    });
    
    // Clear session data
    this.sessionId = undefined;
    this.sessionStartTime = undefined;
    
    // Ensure events are sent before the page unloads
    this.flush(true);
  }

  /**
   * Captures an exception with optional context information
   * @param error The error object to capture
   * @param options Additional context for the error
   */
  public captureException(
    error: Error | unknown,
    options: {
      message?: string;
      user?: UserData;
      metadata?: T;
      level?: LogLevel;
      tags?: Record<string, string>;
    } = {}
  ): string {
    const errorObject = error instanceof Error ? error : new Error(String(error));
    const eventId = generateUniqueId();
    
    const event: EchologEvent<T> = {
      id: eventId,
      timestamp: new Date().toISOString(),
      level: options.level || 'error',
      message: options.message || errorObject.message,
      user: options.user,
      metadata: options.metadata,
      tags: options.tags,
      exception: {
        type: errorObject.name,
        value: errorObject.message,
        stacktrace: errorObject.stack,
      },
      session: this.sessionId ? {
        id: this.sessionId,
        startedAt: this.sessionStartTime!.toISOString(),
      } : undefined,
    };
    
    this.captureEvent(event);
    return eventId;
  }

  /**
   * Captures a message with the specified log level and context
   * @param message The message to log
   * @param options Additional context for the message
   */
  public captureMessage(
    message: string,
    options: {
      level?: LogLevel;
      user?: UserData;
      metadata?: T;
      tags?: Record<string, string>;
    } = {}
  ): string {
    const eventId = generateUniqueId();
    
    const event: EchologEvent<T> = {
      id: eventId,
      timestamp: new Date().toISOString(),
      level: options.level || 'info',
      message,
      user: options.user,
      metadata: options.metadata,
      tags: options.tags,
      session: this.sessionId ? {
        id: this.sessionId,
        startedAt: this.sessionStartTime!.toISOString(),
      } : undefined,
    };
    
    this.captureEvent(event);
    return eventId;
  }

  /**
   * Captures a custom event with the provided data
   * @param event The event to capture
   */
  public captureEvent(event: Partial<EchologEvent<T>>): string | null {
    if (!event.id) {
      event.id = generateUniqueId();
    }
    
    if (!event.timestamp) {
      event.timestamp = new Date().toISOString();
    }
    
    if (!event.level) {
      event.level = 'info';
    }
    
    // Apply environment and release info
    event.tags = {
      ...event.tags,
      environment: this.environment,
      ...(this.release ? { release: this.release } : {}),
    };
    
    // Add browser context if available
    if (typeof navigator !== 'undefined') {
      event.context = {
        ...event.context,
        browser: {
          name: getBrowserName(),
          userAgent: navigator.userAgent,
        },
      };
    }
    
    // Allow the user to modify or filter the event
    if (this.options.beforeSend) {
      const processedEvent = this.options.beforeSend(event as EchologEvent<T>);
      if (!processedEvent) {
        return null;
      }
      event = processedEvent;
    }
    
    // Apply sampling if configured
    if (this.options.sampleRate !== undefined) {
      if (Math.random() > this.options.sampleRate) {
        return null;
      }
    }
    
    this.eventQueue.push(event as EchologEvent<T>);
    
    // Flush immediately if queue exceeds max batch size
    if (this.options.maxBatchSize && this.eventQueue.length >= this.options.maxBatchSize) {
      this.flush();
    }
    
    return event.id || null;
  }

  /**
   * Manually flush the event queue to send events to the API
   * @param sync Whether to perform a synchronous flush (used during page unload)
   */
  public flush(sync = false): void {
    if (this.isFlushing || this.eventQueue.length === 0) {
      return;
    }
    
    this.isFlushing = true;
    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];
    
    const sendEvents = async () => {
      try {
        await this.sendEvents(eventsToSend);
      } catch (error) {
        console.error('[Echolog] Failed to send events:', error);
        // Put events back in the queue if sending fails
        this.eventQueue = [...eventsToSend, ...this.eventQueue];
      } finally {
        this.isFlushing = false;
      }
    };
    
    if (sync && typeof navigator !== 'undefined') {
      // Use beacon API for synchronous sending during page unload
      this.sendEventsSync(eventsToSend);
      this.isFlushing = false;
    } else {
      sendEvents();
    }
  }

  /**
   * Sets up automatic flushing at the specified interval
   */
  private setupFlushInterval(): void {
    const interval = this.options.flushInterval || 5000; // Default to 5 seconds
    
    if (typeof window !== 'undefined') {
      this.flushIntervalId = window.setInterval(() => {
        this.flush();
      }, interval);
    }
  }

  /**
   * Sets up global error capture
   */
  private setupErrorCapture(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        // Don't capture errors that have been prevented from bubbling
        if (event.defaultPrevented) {
          return;
        }
        
        this.captureException(event.error || new Error(event.message), {
          message: `Unhandled error: ${event.message}`,
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          } as unknown as T,
        });
      });
    }
  }

  /**
   * Sets up unhandled promise rejection capture
   */
  private setupPromiseRejectionCapture(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.captureException(event.reason || new Error('Unhandled Promise rejection'), {
          message: 'Unhandled Promise rejection',
        });
      });
    }
  }

  /**
   * Sets up console method capture
   */
  private setupConsoleCapture(): void {
    if (typeof console !== 'undefined') {
      const consoleMethods = ['log', 'info', 'warn', 'error', 'debug'] as const;
      
      consoleMethods.forEach((method) => {
        this.originalConsole[method] = console[method];
        
        console[method] = (...args: any[]) => {
          this.originalConsole[method](...args);
          
          const levelMap: Record<string, LogLevel> = {
            log: 'info',
            info: 'info',
            warn: 'warning',
            error: 'error',
            debug: 'debug',
          };
          
          const consoleEvent: ConsoleEvent = {
            level: levelMap[method],
            message: args.map(arg => stringifyArg(arg)).join(' '),
            console: {
              level: method,
              args: args.map(arg => stringifyArg(arg)),
            },
            session: this.sessionId ? {
              id: this.sessionId,
              startedAt: this.sessionStartTime!.toISOString(),
            } : undefined,
          };
          
          this.captureEvent(consoleEvent as unknown as Partial<EchologEvent<T>>);
        };
      });
    }
}

  /**
   * Sets up network request capture using XHR and fetch API
   */
  private setupNetworkCapture(): void {
    this.interceptXHR();
    this.interceptFetch();
  }

  /**
   * Intercepts XMLHttpRequest to capture network events
   */
  private interceptXHR(): void {
    if (typeof XMLHttpRequest === 'undefined') {
      return;
    }
    
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    const that = this;
    
    XMLHttpRequest.prototype.open = function(
      method: string,
      url: string,
      async: boolean = true,
      username?: string,
      password?: string
    ) {
      this.__echolog = {
        method,
        url,
        startTime: 0,
      };
      
      return originalOpen.apply(this, arguments as any);
    };
    
    XMLHttpRequest.prototype.send = function(body) {
      const xhr = this;
      
      if (!xhr.__echolog) {
        return originalSend.apply(xhr, arguments as any);
      }
      
      xhr.__echolog.startTime = Date.now();
      
      const onLoadEnd = () => {
        try {
          const endTime = Date.now();
          const duration = endTime - xhr.__echolog.startTime;
          
          // Only capture requests to external domains or api endpoints
          if (!shouldCaptureRequest(xhr.__echolog.url, that.apiUrl)) {
            return;
          }
          
          const networkEvent: NetworkEvent = {
            level: xhr.status >= 400 ? 'error' : 'info',
            message: `${xhr.__echolog.method} ${xhr.__echolog.url} - ${xhr.status}`,
            network: {
              url: xhr.__echolog.url,
              method: xhr.__echolog.method,
              statusCode: xhr.status,
              duration,
              responseSize: xhr.responseText?.length,
            },
            session: that.sessionId ? {
              id: that.sessionId,
              startedAt: that.sessionStartTime!.toISOString(),
            } : undefined,
          };
          
          that.captureEvent(networkEvent as unknown as Partial<EchologEvent<T>>);
        } catch (e) {
          // Silently fail
        }
      };
      
      xhr.addEventListener('loadend', onLoadEnd);
      
      return originalSend.apply(xhr, arguments as any);
    };
  }

  /**
   * Intercepts fetch API to capture network events
   * Note: This method is only available in modern browsers, and will be skipped in older environments
   * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
   */
  private interceptFetch(): void {
    if (typeof fetch === 'undefined') {
      return;
    }
    
    const originalFetch = fetch;
    const that = this;
    
    // @ts-ignore
    window.fetch = function(input: RequestInfo, init?: RequestInit) {
      const startTime = Date.now();
      const method = (init?.method || 'GET').toUpperCase();
      const url = typeof input === 'string' ? input : input.url;
      
      if (!shouldCaptureRequest(url, that.apiUrl)) {
        return originalFetch.apply(this, arguments as any);
      }
      
      return originalFetch.apply(this, arguments as any)
        .then(async (response) => {
          try {
            const endTime = Date.now();
            const duration = endTime - startTime;
            const clonedResponse = response.clone();
            
            const networkEvent: NetworkEvent = {
              level: response.status >= 400 ? 'error' : 'info',
              message: `${method} ${url} - ${response.status}`,
              network: {
                url,
                method,
                statusCode: response.status,
                duration,
                responseSize: (await clonedResponse.text()).length,
              },
              session: that.sessionId ? {
                id: that.sessionId,
                startedAt: that.sessionStartTime!.toISOString(),
              } : undefined,
            };
            
            that.captureEvent(networkEvent as unknown as Partial<EchologEvent<T>>);
          } catch (e) {
            // Silently fail
          }
          
          return response;
        })
        .catch((error) => {
          // Capture network errors
          that.captureException(error, {
            message: `Network error: ${method} ${url}`,
            metadata: { url, method } as unknown as T,
          });
          
          throw error;
        });
    };
  }

  /**
   * Sends events to the Echolog API
   * @param events Array of events to send
   */
  private async sendEvents(events: EchologEvent<T>[]): Promise<void> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(events),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('[Echolog] Failed to send events:', error);
      throw error;
    }
  }

  /**
   * Sends events synchronously using the Beacon API (for beforeunload events)
   * @param events Array of events to send
   */
  private sendEventsSync(events: EchologEvent<T>[]): boolean {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) {
      return false;
    }
    
    try {
      const blob = new Blob([JSON.stringify(events)], {
        type: 'application/json',
      });
      
      // Note: we can't set custom headers with sendBeacon, so we append the API key to the URL
      return navigator.sendBeacon(`${this.apiUrl}?apiKey=${encodeURIComponent(this.apiKey)}`, blob);
    } catch (error) {
      console.error('[Echolog] Failed to send events via Beacon API:', error);
      return false;
    }
  }

 
}

/**
 * Initialize the Echolog SDK with the provided options
 * @param options Configuration options for the Echolog client
 * @returns An instance of the Echolog client
 */
export function initEcholog<T extends EventMetadata = EventMetadata>(
  options: EchologOptions<T>
): EchologClient<T> {
  const client = new EchologClient<T>(options);
  
  // Create a global echolog object
  const globalObj = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : {};
  (globalObj as any).echolog = client;
  
  return client;
}

// Utility Types and Functions

/**
 * Creates a custom event metadata type helper
 * @param metadataExample An example of your metadata structure
 * @returns A type guard function for your metadata
 */
export function createMetadataType<T extends EventMetadata>(metadataExample: T): (metadata: any) => metadata is T {
  return (metadata: any): metadata is T => {
    // In reality, this just returns true - it's primarily for TypeScript typing
    return true;
  };
}

/**
 * Breadcrumb for user journey tracking
 */
export interface Breadcrumb {
  type: 'navigation' | 'ui' | 'http' | 'info' | 'error';
  category?: string;
  message: string;
  data?: Record<string, any>;
  timestamp?: string;
}

/**
 * Context collection helper for gathering system information
 */
export function collectContext(): Record<string, any> {
  if (typeof window === 'undefined') {
    return {};
  }
  
  return {
    url: window.location.href,
    referrer: document.referrer,
    userAgent: navigator.userAgent,
    screenResolution: {
      width: window.screen.width,
      height: window.screen.height,
    },
    windowSize: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    devicePixelRatio: window.devicePixelRatio,
    language: navigator.language,
  };
}

// Export default for convenience
export default {
  initEcholog,
  createMetadataType,
  collectContext,
};


//echo log on 