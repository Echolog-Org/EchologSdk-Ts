import { EchologOptions, EventMetadata, LogEvent, LogLevel, UserData } from '../core/types';
export declare class EchologClient<T extends EventMetadata = EventMetadata> {
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
    constructor(options: EchologOptions<T>);
    startSession(): void;
    endSession(): void;
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
}
