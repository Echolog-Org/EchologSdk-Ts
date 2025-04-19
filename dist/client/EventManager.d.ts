import { LogEvent, EchologOptions, LogLevel, UserData, Breadcrumb, Transaction, EnhancedEventMetadata } from '../core/types';
import { EventSender } from './EventSender';
import { EchologClient } from './client';
import { SessionManager } from './SessionManager';
export declare class EventManager<T extends EnhancedEventMetadata = EnhancedEventMetadata> {
    private client;
    private sessionManager;
    private options;
    private eventSender;
    private eventQueue;
    private flushIntervalId?;
    private isFlushing;
    private userData?;
    constructor(client: EchologClient<T>, sessionManager: SessionManager, options: EchologOptions<T>, eventSender: EventSender<T>);
    private setupFlushInterval;
    captureEvent(event: Partial<LogEvent<T> | Transaction<T>>): string | null;
    captureException(error: Error | unknown, options?: Partial<LogEvent<T>> & {
        user?: UserData;
        metadata?: T;
        tags?: Record<string, string>;
        trace_id?: string;
        span_id?: string;
        parent_span_id?: string;
    }): string;
    captureMessage(message: string, options?: {
        level?: LogLevel;
        user?: UserData;
        metadata?: T;
        tags?: Record<string, string>;
        breadcrumbs?: Breadcrumb<T>[] | null;
        trace_id?: string;
        span_id?: string;
        parent_span_id?: string;
    }): string;
    flush(sync?: boolean): void;
    destroy(): void;
    setUser(user: UserData): void;
    private debugLog;
}
