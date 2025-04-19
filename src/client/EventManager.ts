// src/client/EventManager.ts
import { LogEvent, EchologOptions, EventMetadata, LogLevel, UserData, Breadcrumb, Span, Transaction, EnhancedEventMetadata } from '../core/types';
import { generateUniqueId, getBrowserName } from '../core/utilities/utility';
import { EventSender } from './EventSender';
import { EchologClient } from './client';
import { SessionManager } from './SessionManager';



export class EventManager<T extends EnhancedEventMetadata = EnhancedEventMetadata> {
  private client: EchologClient<T>;
  private sessionManager: SessionManager;
  private options: EchologOptions<T>;
  private eventSender: EventSender<T>;
  private eventQueue: (LogEvent<T> | Transaction<T>)[] = [];
  private flushIntervalId?: number;
  private isFlushing = false;

   private userData?: UserData;

  constructor(client: EchologClient<T>, sessionManager: SessionManager, options: EchologOptions<T>, eventSender: EventSender<T>) {
    this.client = client;
    this.sessionManager = sessionManager;
    this.options = options;
    this.eventSender = eventSender;
    this.setupFlushInterval();
  }

  private setupFlushInterval(): void {
    const interval = this.options.flushInterval || 5000;
    if (typeof window !== 'undefined') {
      this.flushIntervalId = window.setInterval(() => this.flush(), interval);
    }
  }

  public captureEvent(event: Partial<LogEvent<T> | Transaction<T>>): string | null {
    if (this.eventSender.isSendingLogsActive()) return null;
    if (event.message?.includes("[Echolog Debug]")) return null;

    const isTransaction = 'spans' in event && 'name' in event && 'start_timestamp' in event;
    let completeEvent: LogEvent<T> | Transaction<T>;

    if (isTransaction) {
      completeEvent = {
        id: event.id || generateUniqueId(),
        timestamp: event.timestamp || new Date().toISOString(),
        service_name: event.service_name || this.client['serviceName'],
        level: event.level || LogLevel.INFO,
        message: event.message || `Transaction: ${(event as Transaction<T>).name}`,
        project_id: this.client['projectId'],
        trace_id: event.trace_id || generateUniqueId(),
        span_id: event.span_id || generateUniqueId(),
        parent_span_id: event.parent_span_id || null,
        duration_ms: event.duration_ms ?? null,
        name: (event as Transaction<T>).name,
        start_timestamp: (event as Transaction<T>).start_timestamp || new Date().toISOString(),
        end_timestamp: (event as Transaction<T>).end_timestamp || undefined,
        spans: (event as Transaction<T>).spans || [],
        instance_id: event.instance_id || null,
        context: event.context || null,
        op: (event as Transaction<T>).op || 'transaction',
        thread_id: event.thread_id || null,
        file: event.file || null,
        line: event.line ?? null,
        function: event.function || null,
        error_type: event.error_type || null,
        stack_trace: event.stack_trace || null,
        user_data: event.user_data || this.userData || null,
        root_cause: event.root_cause || null,
        system_metrics: event.system_metrics || null,
        code_location: event.code_location || null,
        session: event.session || (this.sessionManager.getSessionId() && this.sessionManager.getSessionStartTime()
          ? { id: this.sessionManager.getSessionId()!, started_at: this.sessionManager.getSessionStartTime()!.toISOString() }
          : null),
        error_details: event.error_details || null,
        metadata: event.metadata || null,
        tags: {
          ...event.tags,
          environment: this.client['environment'],
          ...(this.client['release'] ? { release: this.client['release'] } : {}),
        },
        exception: event.exception || null,
        network: event.network || null,
        console: event.console || null,
        breadcrumbs: event.breadcrumbs || this.client['breadcrumbManager'].getAll(),
      } as Transaction<T>;
    } else {
      completeEvent = {
        id: event.id || generateUniqueId(),
        timestamp: event.timestamp || new Date().toISOString(),
        service_name: event.service_name || this.client['serviceName'],
        level: event.level || LogLevel.INFO,
        message: event.message || '',
        instance_id: event.instance_id || null,
        context: event.context || null,
        thread_id: event.thread_id || null,
        file: event.file || null,
        line: event.line ?? null,
        function: event.function || null,
        project_id: this.client['projectId'],
        trace_id: event.trace_id || null,
        span_id: event.span_id || null,
        parent_span_id: event.parent_span_id || null,
        duration_ms: event.duration_ms ?? null,
        error_type: event.error_type || null,
        stack_trace: event.stack_trace || null,
        user_data: event.user_data || this.userData || null,
        root_cause: event.root_cause || null,
        system_metrics: event.system_metrics || null,
        code_location: event.code_location || null,
        session: event.session || (this.sessionManager.getSessionId() && this.sessionManager.getSessionStartTime()
          ? { id: this.sessionManager.getSessionId()!, started_at: this.sessionManager.getSessionStartTime()!.toISOString() }
          : null),
        error_details: event.error_details || null,
        metadata: event.metadata || null,
        tags: {
          ...event.tags,
          environment: this.client['environment'],
          ...(this.client['release'] ? { release: this.client['release'] } : {}),
        },
        exception: event.exception || null,
        network: event.network || null,
        console: event.console || null,
        breadcrumbs: event.breadcrumbs || this.client['breadcrumbManager'].getAll(),
      } as LogEvent<T>;
    }

    if (typeof navigator !== 'undefined') {
      completeEvent.metadata = {
        ...(completeEvent.metadata || {}),
        browser: {
          name: getBrowserName(),
          userAgent: navigator.userAgent,
        },
      } as unknown as T;
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

  public captureException(
    error: Error | unknown,
    options: Partial<LogEvent<T>> & {
      user?: UserData;
      metadata?: T;
      tags?: Record<string, string>;
      trace_id?: string;
      span_id?: string;
      parent_span_id?: string;
    } = {}
  ): string {
    if (this.eventSender.isSendingLogsActive()) return '';

    const errorObject = error instanceof Error ? error : new Error(String(error));
    if (errorObject.stack?.includes('EchologClient')) {
      return '';
    }

    const eventId = generateUniqueId();
    const timestamp = new Date().toISOString();

    const event: LogEvent<T> = {
      id: eventId,
      timestamp,
      service_name: this.client['serviceName'],
      level: options.level || LogLevel.ERROR,
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
        ? { id: this.sessionManager.getSessionId()!, started_at: this.sessionManager.getSessionStartTime()!.toISOString() }
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

  public captureMessage(
    message: string,
    options: {
      level?: LogLevel;
      user?: UserData;
      metadata?: T;
      tags?: Record<string, string>;
      breadcrumbs?: Breadcrumb<T>[] | null;
      trace_id?: string;
      span_id?: string;
      parent_span_id?: string;
    } = {}
  ): string {
    if (this.eventSender.isSendingLogsActive()) return '';

    const eventId = generateUniqueId();
    const timestamp = new Date().toISOString();

    const event: LogEvent<T> = {
      id: eventId,
      timestamp,
      service_name: this.client['serviceName'],
      level: options.level || LogLevel.INFO,
      message,
      user_data: options.user || null, 
      metadata: options.metadata || null,
      tags: options.tags || null,
      session: this.sessionManager.getSessionId()
        ? { id: this.sessionManager.getSessionId()!, started_at: this.sessionManager.getSessionStartTime()!.toISOString() }
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
      context: {} as T,
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

  public flush(sync = false): void {
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
    } else {
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

  public destroy(): void {
    if (this.flushIntervalId) {
      clearInterval(this.flushIntervalId);
    }
  }
  ///setUser
  public setUser(user: UserData): void {
    this.userData = user;
  }
  private debugLog(message: string, data?: any): void {
    if (this.options.debug && !this.eventSender.isSendingLogsActive()) {
      if (message.includes("[Echolog Debug]")) return;
      const timestamp = new Date().toISOString();
      console.debug(`[Echolog Debug] [${timestamp}] ${message}`, data || '');
    }
  }
}