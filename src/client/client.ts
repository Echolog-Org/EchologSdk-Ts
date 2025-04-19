/**
 * @package Echolog
 * @version 1.0.0
 * @license MIT
 * @description A lightweight JavaScript client for capturing and reporting logs, errors, network events, and performance metrics.
 */

import { EventManager } from './EventManager';
import { SessionManager } from './SessionManager';
import { ErrorHandler } from './ErrorHandler';
import { ConsoleCapture } from './ConsoleCapture';
import { NetworkCapture } from './NetworkCapture';
import { EventSender } from './EventSender';
import { OfflineManager } from './OfflineManger';
import { ReplayManager } from './ReplayManager';
import { EchologOptions, EnhancedEventMetadata, LogEvent, LogLevel, UserData, Breadcrumb } from '../core/types';
import { createLogEvent, generateUniqueId } from '../core/utilities/utility';
import { TransactionManager } from './TransactionManager';

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
      this.breadcrumbs.shift();
    }
  }

  public getAll(): Breadcrumb<T>[] {
    return [...this.breadcrumbs];
  }

  public clear(): void {
    this.breadcrumbs = [];
  }
}

export class EchologClient<T extends EnhancedEventMetadata = EnhancedEventMetadata> {
  private projectId: string;
  private apiKey: string;
  private apiUrl: string;
  private environment: string;
  private release?: string;
  private serviceName: string;
  private options: EchologOptions<T>;

  private eventManager: EventManager<T>;
  private sessionManager: SessionManager;
  private errorHandler: ErrorHandler<T>;
  private consoleCapture: ConsoleCapture;
  private networkCapture: NetworkCapture<T>;
  private eventSender: EventSender<T>;
  private offlineManager: OfflineManager<LogEvent<T>>;
  private breadcrumbManager: BreadcrumbManager<T>;
  private transactionManager: TransactionManager<T>;
  private replayManager: ReplayManager<T>;
  private activePageLoadTraceId?: string;
  //userData
  private userData?: UserData;

  constructor(options: EchologOptions<T> & { 
    autoInstrument?: boolean; 
    enableReplay?: boolean; 
    autoReplay?: 'onLoad' | 'onSessionStart' | false; // New option for auto-replay
  }) {
    if (!options.apiKey) throw new Error('[Echolog] apiKey is required');
    if (!options.projectId) throw new Error('[Echolog] projectId is required');
    if (!options.serviceName) throw new Error('[Echolog] serviceName is required');

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
      autoInstrument: true,
      enableReplay: false,
      replaySampleRate: 1.0,
      autoReplay: false,
      ...options,
    };

    this.apiKey = options.apiKey;
    this.projectId = options.projectId;
    this.apiUrl = options.apiUrl ?? 'https://api.echolog.xyz/events';
    this.environment = options.environment ?? 'production';
    this.serviceName = options.serviceName;
    this.release = options.release;

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
    this.transactionManager = new TransactionManager(this, this.options.sampleRate);
    this.replayManager = new ReplayManager(this, this.sessionManager, this.options, this.eventSender);

    this.setupOfflineSupport();
    this.setupAutoInstrumentation();

    // Start replay if enabled and autoReplay is set to onSessionStart
    if (this.options.enableReplay && this.options.autoReplay === 'onSessionStart') {
      this.startSession(); // Start session and replay together
    } else if (this.options.enableReplay && !this.options.autoReplay) {
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
        root_cause: null,
        system_metrics: null,
        code_location: null,
        session: this.sessionManager.getSession(),
        user_data: this.userData || null,
        error_details: null,
        metadata: this.options.includeBrowserMetadata !== false && typeof navigator !== 'undefined'
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
  //setUser
  public setUser(user: UserData): void {
    this.userData = user;
    this.sessionManager.setUser(user);
    this.eventManager.setUser(user);
  }
  private setupOfflineSupport() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.retryOfflineEvents());
    }
  }

  private setupAutoInstrumentation() {
    if (!this.options.autoInstrument || typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      const traceId = this.startTransaction({
        name: 'page_load',
        op: 'navigation',
        metadata: this.options.includeBrowserMetadata !== false && typeof navigator !== 'undefined'
          ? { userAgent: navigator.userAgent } as unknown as T
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
              if (transaction.metadata === null) return;
              if (entry.name === 'first-paint') transaction.metadata.firstPaint = entry.startTime;
              if (entry.name === 'first-contentful-paint') transaction.metadata.fcp = entry.startTime;
              if (entry.name === 'largest-contentful-paint') transaction.metadata.lcp = entry.startTime;
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

  public captureBreadcrumb(message: string, category?: string, metadata?: T): void {
    if (!this.options.enableBreadcrumbs) return;

    this.breadcrumbManager.add({ message, category, metadata });
    if (this.options.debug) {
      console.debug(`[Echolog] Breadcrumb captured: ${message}`);
    }
  }

  public captureException(
    error: Error | unknown,
    options: Partial<LogEvent<T>> & { user?: UserData; metadata?: T; tags?: Record<string, string> } = {}
  ): string {
    try {
      const eventManagerOptions = {
        ...options,
        user: this.userData || options.user,
        metadata: options.metadata,
        tags: options.tags,
        breadcrumbs: this.options.enableBreadcrumbs ? this.breadcrumbManager.getAll() : undefined,
        trace_id: options.trace_id ?? undefined,
        span_id: options.span_id ?? undefined,
        parent_span_id: options.parent_span_id ?? undefined,
        session: this.sessionManager.getSession(),
        
      };

      const eventId = this.eventManager.captureException(error, eventManagerOptions);

      if (!navigator.onLine) {
        this.offlineManager.storeEvent(
          { ...options, id: eventId, level: LogLevel.ERROR, breadcrumbs: this.options.enableBreadcrumbs ? this.breadcrumbManager.getAll() : undefined } as LogEvent<T>,
          this.options.maxOfflineEvents
        );
        if (this.options.debug) {
          console.debug(`[Echolog] Stored offline exception event: ${eventId}`);
        }
      }
      return eventId;
    } catch (captureError) {
      console.error('[Echolog] Failed to capture exception:', captureError);
      return generateUniqueId();
    }
  }

  public captureMessage(
    message: string,
    options: Partial<LogEvent<T>> & { level?: LogLevel; user?: UserData; metadata?: T; tags?: Record<string, string> } = {}
  ): string {
    try {
      const eventManagerOptions = {
        ...options,
        level: options.level,
        user: options.user,
        metadata: options.metadata,
        
        tags: options.tags,
        breadcrumbs: this.options.enableBreadcrumbs ? this.breadcrumbManager.getAll() : null,
        trace_id: options.trace_id ?? undefined,
        span_id: options.span_id ?? undefined,
        parent_span_id: options.parent_span_id ?? undefined,
        session: this.sessionManager.getSession(),
      };

      const eventId = this.eventManager.captureMessage(message, eventManagerOptions);

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
    } catch (captureError) {
      console.error('[Echolog] Failed to capture message:', captureError);
      return generateUniqueId();
    }
  }

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

  // Replay-specific methods
  public startReplay(): void {
    if (!this.options.enableReplay) {
      if (this.options.debug) {
        console.debug('[Echolog] Replay not enabled in options');
      }
      return;
    }
    this.replayManager.startRecording();
  }

  public stopReplay(): void {
    this.replayManager.stopRecording();
  }

  public flushReplay(): void {
    this.replayManager.flush();
  }

  public startSession(): void {
    this.sessionManager.startSession();
    // Auto-start replay if configured
    if (this.options.enableReplay && this.options.autoReplay === 'onSessionStart') {
      this.startReplay();
    }
  }

  public endSession(): void {
    this.sessionManager.endSession();
    // Stop replay if autoReplay is onSessionStart
    if (this.options.enableReplay && this.options.autoReplay === 'onSessionStart') {
      this.stopReplay();
    }
  }
  public startTransaction(options: { name: string; op?: string; metadata?: T }): string | null {
    const transaction = this.transactionManager.startTransaction(options);
    return transaction ? transaction.trace_id : null;
  }
  public startSpan(traceId: string, p0: string, undefined: undefined, p1: T, options: { description: string; op?: string; parentSpanId?: string; metadata?: T; }): string | null {
    const transaction = this.transactionManager.getTransaction(traceId);
    if (!transaction) return null;
  
    const span = this.transactionManager.startSpan(transaction, options);
    return span ? span.span_id : null;
  }

  public finishSpan(traceId: string, spanId: string): void {
    const transaction = this.transactionManager.getTransaction(traceId);
    if (!transaction) return;

    const span = transaction.spans.find((s) => s.span_id === spanId);
    if (span) {
      this.transactionManager.finishSpan(span);
    }
  }

  public finishTransaction(traceId: string): void {
    this.transactionManager.finishTransaction(traceId);
  }

  public destroy(): void {
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
    } catch (error) {
      console.error('[Echolog] Failed to destroy client:', error);
    }
  }
}