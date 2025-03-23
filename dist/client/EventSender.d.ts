import { LogEvent, EchologOptions, EventMetadata } from '../core/types';
export declare class EventSender<T extends EventMetadata = EventMetadata> {
    private apiUrl;
    private apiKey;
    private options;
    isSendingLogs: boolean;
    private retryCount;
    constructor(apiUrl: string, apiKey: string, options: EchologOptions<T>);
    /**
     * Checks if the sender is currently processing logs.
     * @returns {boolean} True if sending logs, false otherwise.
     */
    isSendingLogsActive(): boolean;
    /**
     * Sends events to the API asynchronously with retry support.
     * @param {LogEvent<T>[]} events - The events to send.
     * @returns {Promise<void>} Resolves when events are sent successfully.
     * @throws {Error} If all retry attempts fail.
     */
    sendEvents(events: LogEvent<T>[]): Promise<void>;
    /**
     * Sends events synchronously using the Beacon API if available.
     * @param {LogEvent<T>[]} events - The events to send.
     * @returns {boolean} True if sent successfully, false otherwise.
     */
    sendEventsSync(events: LogEvent<T>[]): boolean;
    /**
     * Logs debug messages if debug mode is enabled.
     * @param {string} message - The message to log.
     * @param {any} [data] - Additional data to log.
     * @private
     */
    private debugLog;
}
