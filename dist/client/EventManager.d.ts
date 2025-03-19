import { LogEvent, EchologOptions, EventMetadata, LogLevel, UserData } from '../core/types';
import { EventSender } from './EventSender';
import { EchologClient } from './client';
import { SessionManager } from './SessionManager';
export declare class EventManager<T extends EventMetadata = EventMetadata> {
    private client;
    private sessionManager;
    private options;
    private eventSender;
    private eventQueue;
    private flushIntervalId?;
    private isFlushing;
    constructor(client: EchologClient<T>, sessionManager: SessionManager, options: EchologOptions<T>, eventSender: EventSender<T>);
    private setupFlushInterval;
    captureEvent(event: Partial<LogEvent<T>>): string | null;
    captureException(error: Error | unknown, options?: Partial<LogEvent<T>> & {
        user?: UserData;
        metadata?: T;
        tags?: Record<string, string>;
    }): string;
    captureMessage(message: string, options?: {
        level?: LogLevel;
        user?: UserData;
        metadata?: T;
        tags?: Record<string, string>;
    }): string;
    flush(sync?: boolean): void;
    destroy(): void;
    private debugLog;
}
