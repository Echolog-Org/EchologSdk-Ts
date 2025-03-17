import { LogEvent, EchologOptions, EventMetadata, LogLevel, UserData } from "./core/types";
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
export declare class EchologClient<T extends EventMetadata = EventMetadata> {
    private apiKey;
    private apiUrl;
    private environment;
    private release?;
    private sessionId?;
    private sessionStartTime?;
    private eventQueue;
    private flushIntervalId?;
    private isFlushing;
    private isSendingLogs;
    private options;
    private originalConsole;
    private serviceName;
    private xhrOpen?;
    private xhrSend?;
    private originalFetch?;
    constructor(options: EchologOptions<T>);
    private handleBeforeUnload;
    startSession(): void;
    endSession(): void;
    captureException(error: Error | unknown, options?: Partial<LogEvent<T>> & {
        user?: UserData;
        metadata?: T;
        tags?: Record<string, string>;
    }): string;
    captureMessage(message: string, options?: {
        level?: keyof LogLevel;
        user?: UserData;
        metadata?: T;
        tags?: Record<string, string>;
    }): string;
    private captureEvent;
    flush(sync?: boolean): void;
    destroy(): void;
    private setupFlushInterval;
    private setupErrorCapture;
    private setupPromiseRejectionCapture;
    private setupConsoleCapture;
    private setupNetworkCapture;
    private interceptXHR;
    private interceptFetch;
    private sendEvents;
    private sendEventsSync;
    private restoreConsole;
    private restoreNetworkInterceptors;
}
export declare function initEcholog<T extends EventMetadata = EventMetadata>(options: EchologOptions<T>): EchologClient<T>;
