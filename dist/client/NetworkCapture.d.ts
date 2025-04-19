import { EchologOptions, EnhancedEventMetadata } from '../core/types';
import { EventManager } from './EventManager';
import { SessionManager } from './SessionManager';
declare global {
    interface XMLHttpRequest {
        __echolog?: {
            method: string;
            url: string;
            startTime: number;
            isInternalRequest?: boolean;
            spanId?: string;
        };
    }
}
export declare class NetworkCapture<T extends EnhancedEventMetadata = EnhancedEventMetadata> {
    private eventManager;
    private sessionManager;
    private serviceName;
    private apiUrl;
    private options;
    private xhrOpen?;
    private xhrSend?;
    private originalFetch?;
    private activePageLoadTraceId?;
    constructor(eventManager: EventManager<T>, sessionManager: SessionManager, serviceName: string, apiUrl: string, options: EchologOptions<T>);
    setActivePageLoadTraceId(traceId: string | undefined): void;
    setupNetworkCapture(): void;
    private interceptXHR;
    private interceptFetch;
    restoreNetworkInterceptors(): void;
}
