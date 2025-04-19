/**
 * @package Echolog
 * @version 1.0.0
 * @license MIT
 * @description A lightweight JavaScript client for capturing and reporting logs, errors, network events, and performance metrics.
 */
import { EchologOptions, EnhancedEventMetadata, LogEvent, LogLevel, UserData } from '../core/types';
export declare class EchologClient<T extends EnhancedEventMetadata = EnhancedEventMetadata> {
    private projectId;
    private apiKey;
    private apiUrl;
    private environment;
    private release?;
    private serviceName;
    private options;
    private eventManager;
    private sessionManager;
    private errorHandler;
    private consoleCapture;
    private networkCapture;
    private eventSender;
    private offlineManager;
    private breadcrumbManager;
    private transactionManager;
    private replayManager;
    private activePageLoadTraceId?;
    private userData?;
    constructor(options: EchologOptions<T> & {
        autoInstrument?: boolean;
        enableReplay?: boolean;
        autoReplay?: 'onLoad' | 'onSessionStart' | false;
    });
    setUser(user: UserData): void;
    private setupOfflineSupport;
    private setupAutoInstrumentation;
    private retryOfflineEvents;
    captureBreadcrumb(message: string, category?: string, metadata?: T): void;
    captureException(error: Error | unknown, options?: Partial<LogEvent<T>> & {
        user?: UserData;
        metadata?: T;
        tags?: Record<string, string>;
    }): string;
    captureMessage(message: string, options?: Partial<LogEvent<T>> & {
        level?: LogLevel;
        user?: UserData;
        metadata?: T;
        tags?: Record<string, string>;
    }): string;
    flush(sync?: boolean): Promise<void>;
    startReplay(): void;
    stopReplay(): void;
    flushReplay(): void;
    startSession(): void;
    endSession(): void;
    startTransaction(options: {
        name: string;
        op?: string;
        metadata?: T;
    }): string | null;
    startSpan(traceId: string, p0: string, undefined: undefined, p1: T, options: {
        description: string;
        op?: string;
        parentSpanId?: string;
        metadata?: T;
    }): string | null;
    finishSpan(traceId: string, spanId: string): void;
    finishTransaction(traceId: string): void;
    destroy(): void;
}
