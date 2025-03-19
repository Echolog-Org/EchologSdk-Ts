/**
 * @package Echolog
 * @version 1.0.0
 * @license MIT
 * @description A lightweight JavaScript client for capturing and reporting logs, errors, and network events.
 */

import { EventManager } from './EventManager';
import { SessionManager } from './SessionManager';
import { ErrorHandler } from './ErrorHandler';
import { ConsoleCapture } from './ConsoleCapture';
import { NetworkCapture } from './NetworkCapture';
import { EventSender } from './EventSender';
import { OfflineManager } from './OfflineManger'; 
import { EchologOptions, EventMetadata, LogEvent, LogLevel, UserData, Breadcrumb } from '../core/types';
import { createLogEvent, generateUniqueId } from '../core/utilities/utility';

/**
 * Manages breadcrumbs for contextual event tracking.
 * @private
 */
class BreadcrumbManager<T> {
  private breadcrumbs: Breadcrumb<T>[] = [];
  private maxBreadcrumbs: number;

  constructor(maxBreadcrumbs: number = 20) {
    this.maxBreadcrumbs = maxBreadcrumbs;
  }

  public add(breadcrumb: Omit<Breadcrumb<T>, 'id' | 'timestamp'>): void {
    const newBreadcrumb: Breadcrumb<T> = {
      id: generateUniqueId(),
      timestamp: new Date().toISOString(),
      ...breadcrumb,
    };

    this.breadcrumbs.push(newBreadcrumb);
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift(); // Remove oldest breadcrumb
    }
  }

  public getAll(): Breadcrumb<T>[] {
    return [...this.breadcrumbs];
  }

  public clear(): void {
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
export class EchologClient<T extends EventMetadata = EventMetadata> {
  /** @private */
  private projectId: string;
  /** @private */
  private apiKey: string;
  /** @private */
  private apiUrl: string;
  /** @private */
  private environment: string;
  /** @private */
  private release?: string;
  /** @private */
  private serviceName: string;
  /** @private */
  private options: EchologOptions<T>;

  /** @private */
  private eventManager: EventManager<T>;
  /** @private */
  private sessionManager: SessionManager;
  /** @private */
  private errorHandler: ErrorHandler<T>;
  /** @private */
  private consoleCapture: ConsoleCapture;
  /** @private */
  private networkCapture: NetworkCapture;
  /** @private */
  private eventSender: EventSender<T>;
  /** @private */
  private offlineManager: OfflineManager<LogEvent<T>>;
  /** @private */
  private breadcrumbManager: BreadcrumbManager<T>;

  /**
   * Initializes the Echolog client with the provided options.
   * @param {EchologOptions<T>} options - Configuration options for the logging client.
   * @throws {Error} If required options (apiKey, projectId, serviceName) are missing.
   */
  constructor(options: EchologOptions<T>) {
    if (!options.apiKey) throw new Error('[Echolog] apiKey is required');
    if (!options.projectId) throw new Error('[Echolog] projectId is required');
    if (!options.serviceName) throw new Error('[Echolog] serviceName is required');

    // Set defaults first, then override with user-provided options
    this.options = {
      maxOfflineEvents: 100,
      maxBreadcrumbs: 20,
      enableBreadcrumbs: true,
      includeBrowserMetadata: true,
      maxRetries: 3,
      retryAttempts: 3,
      debug: false,
      enableNetworkCapture: true,
      enableConsoleCapture: true,
      maxBatchSize: 10,
      sampleRate: 1,
      flushInterval: 5000,
      environment: 'production',
      ...options, // Spread last to allow user-defined options to override defaults
    };

    // Ensure critical properties are always set (use nullish coalescing `??`)
    this.apiKey = options.apiKey;
    this.projectId = options.projectId;
    this.apiUrl = options.apiUrl ?? 'http://localhost:8080/events';
    this.environment = options.environment ?? 'production';
    this.serviceName = options.serviceName;


    if (this.options.debug) {
      console.debug('[Echolog] Initializing client with options:', this.options);
    }

    this.eventSender = new EventSender(this.apiUrl, this.apiKey, { ...options, retryAttempts: 3 });
    this.sessionManager = new SessionManager(this.serviceName);
    this.eventManager = new EventManager(this, this.sessionManager, this.options, this.eventSender);
    this.offlineManager = new OfflineManager<LogEvent<T>>();
    this.breadcrumbManager = new BreadcrumbManager<T>(this.options.maxBreadcrumbs);
    this.sessionManager.setEventManager(this.eventManager);
    this.errorHandler = new ErrorHandler(this, this.options);
    this.consoleCapture = new ConsoleCapture(this.eventManager, this.sessionManager, this.options);
    this.networkCapture = new NetworkCapture(this.eventManager, this.sessionManager, this.serviceName, this.apiUrl, this.options);

    this.setupOfflineSupport();

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush(true));
    }

    try {
      this.eventManager.captureEvent({
        id: generateUniqueId(),
        timestamp: new Date().toISOString(),
        service_name: this.serviceName,
        instance_id: null,
        level: LogLevel.INFO,
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
          ? { userAgent: navigator.userAgent } as unknown as T
          : null,
        tags: null,
        exception: null,
        network: null,
        console: null,
        breadcrumbs: this.options.enableBreadcrumbs ? this.breadcrumbManager.getAll() : undefined,
      });
    } catch (error) {
      console.error('[Echolog] Failed to log initial event:', error);
    }
  }

  /**
   * Sets up offline event handling.
   * @private
   */
  private setupOfflineSupport() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.retryOfflineEvents());
    }
  }

  /**
   * Retries sending stored offline events when the connection is restored.
   * @private
   */
  private async retryOfflineEvents() {
    try {
      const storedEvents = await this.offlineManager.retrieveEvents();
      if (storedEvents.length > 0) {
        if (this.options.debug) {
          console.debug(`[Echolog] Sending ${storedEvents.length} offline events`);
        }
        for (const event of storedEvents) {
          this.eventManager.captureEvent(event);
        }
        await this.offlineManager.clearStoredEvents();
      }
    } catch (error) {
      console.error('[Echolog] Failed to retry offline events:', error);
      if (this.options.debug) {
        console.debug('[Echolog] Offline retry error details:', error);
      }
    }
  }

  /**
   * Captures a breadcrumb to record contextual events.
   * @param message The breadcrumb message.
   * @param category Optional category (e.g., 'ui', 'network').
   * @param metadata Optional custom metadata.
   * @example
   * client.captureBreadcrumb('Clicked login button', 'ui', { buttonId: 'login-btn' });
   */
  public captureBreadcrumb(message: string, category?: string, metadata?: T): void {
    if (!this.options.enableBreadcrumbs) return;

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
  public captureException(
    error: Error | unknown,
    options: Partial<LogEvent<T>> & {
      user?: UserData;
      metadata?: T;
      tags?: Record<string, string>;
    } = {}
  ): string {
    try {
      const eventId = this.eventManager.captureException(error, {
        ...options,
        breadcrumbs: this.options.enableBreadcrumbs ? this.breadcrumbManager.getAll() : undefined,
      });
      if (!navigator.onLine) {
        this.offlineManager.storeEvent(
          { 
            ...options, 
            id: eventId, 
            level: LogLevel.ERROR, 
            breadcrumbs: this.options.enableBreadcrumbs ? this.breadcrumbManager.getAll() : undefined 
          } as LogEvent<T>,
          this.options.maxOfflineEvents,
        );
        if (this.options.debug) {
          console.debug(`[Echolog] Stored offline exception event: ${eventId}`);
        }
      }
      return eventId;
    } catch (captureError) {
      console.error('[Echolog] Failed to capture exception:', captureError);
      return generateUniqueId(); // Return a fallback ID
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
  public captureMessage(
    message: string,
    options: Partial<LogEvent<T>> & {
      level?: LogLevel;
      user?: UserData;
      metadata?: T;
      tags?: Record<string, string>;
    } = {}
  ): string {
    try {
      const eventId = this.eventManager.captureMessage(message, {
        ...options,
        breadcrumbs: this.options.enableBreadcrumbs ? this.breadcrumbManager.getAll() : null,
      });
      
      if (!navigator.onLine) {
        const offlineEvent = createLogEvent<T>({
          id: eventId,
          timestamp: new Date().toISOString(),
          service_name: this.serviceName,
          instance_id: null,
          level: options.level || LogLevel.INFO,
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
    } catch (captureError) {
      console.error('[Echolog] Failed to capture message:', captureError);
      return generateUniqueId(); // Return a fallback ID
    }
  }

  /**
   * Flushes all pending events.
   * @param {boolean} [sync=false] - Whether to flush synchronously.
   * @returns {Promise<void>} Resolves when flushing is complete.
   * @example
   * await client.flush(); // Ensure all events are sent before proceeding
   */
  public async flush(sync = false): Promise<void> {
    try {
      await this.eventManager.flush(sync);
      if (this.options.debug) {
        console.debug('[Echolog] Flush completed successfully');
      }
    } catch (error) {
      console.warn('[Echolog] Flush failed:', error);
      if (this.options.debug) {
        console.debug('[Echolog] Flush error details:', error);
      }
    }
  }

  /**
   * Destroys the client instance and removes event listeners.
   * @example
   * client.destroy(); // Clean up when done
   */
  public destroy(): void {
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
    } catch (error) {
      console.error('[Echolog] Failed to destroy client:', error);
    }
  }
}