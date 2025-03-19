import { EchologOptions } from '../core/types';
import { EventManager } from './EventManager';
import { SessionManager } from './SessionManager';
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
export declare class NetworkCapture {
    private eventManager;
    private sessionManager;
    private serviceName;
    private apiUrl;
    private options;
    private xhrOpen?;
    private xhrSend?;
    private originalFetch?;
    constructor(eventManager: EventManager<any>, sessionManager: SessionManager, serviceName: string, // Add serviceName to the constructor
    apiUrl: string, options: EchologOptions<any>);
    setupNetworkCapture(): void;
    private interceptXHR;
    private interceptFetch;
    restoreNetworkInterceptors(): void;
}
