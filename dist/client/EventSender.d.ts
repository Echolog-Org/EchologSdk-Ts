import { LogEvent, EchologOptions, EventMetadata } from '../core/types';
export declare class EventSender<T extends EventMetadata = EventMetadata> {
    private apiUrl;
    private apiKey;
    private options;
    private _isSendingLogs;
    private retryCount;
    constructor(apiUrl: string, apiKey: string, options: EchologOptions<T>);
    isSendingLogs(): boolean;
    sendEvents(events: LogEvent<T>[]): Promise<void>;
    sendEventsSync(events: LogEvent<T>[]): boolean;
    private debugLog;
}
