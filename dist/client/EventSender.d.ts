import { LogEvent, ReplayEvent, EchologOptions, EventMetadata } from '../core/types';
export declare class EventSender<T extends EventMetadata = EventMetadata> {
    private apiUrl;
    private apiKey;
    private options;
    isSendingLogs: boolean;
    isSendingReplays: boolean;
    private retryCount;
    constructor(apiUrl: string, apiKey: string, options: EchologOptions<T>);
    /**
     * Checks if the sender is currently processing logs.
     * @returns {boolean} True if sending logs, false otherwise.
     */
    isSendingLogsActive(): boolean;
    /**
     * Checks if the sender is currently processing replays.
     * @returns {boolean} True if sending replays, false otherwise.
     */
    isSendingReplaysActive(): boolean;
    /**
     * Sends log events to the API asynchronously with retry support.
     * @param {LogEvent<T>[]} events - The log events to send.
     * @returns {Promise<void>} Resolves when events are sent successfully.
     * @throws {Error} If all retry attempts fail.
     */
    sendEvents(events: LogEvent<T>[]): Promise<void>;
    /**
     * Sends replay events to the API asynchronously with retry support.
     * @param {ReplayEvent<T>[]} replays - The replay events to send.
     * @param {string} [endpoint='/replay'] - The API endpoint to send replays to.
     * @returns {Promise<void>} Resolves when replays are sent successfully.
     * @throws {Error} If all retry attempts fail.
     */
    sendReplays(replays: ReplayEvent<T>[], endpoint?: string): Promise<void>;
    /**
     * Sends log events synchronously using the Beacon API if available.
     * @param {LogEvent<T>[]} events - The log events to send.
     * @returns {boolean} True if sent successfully, false otherwise.
     */
    sendEventsSync(events: LogEvent<T>[]): boolean;
    sendReplaysSync(replays: ReplayEvent<T>[]): boolean;
    /**
     * Logs debug messages if debug mode is enabled.
     * @param {string} message - The message to log.
     * @param {any} [data] - Additional data to log.
     * @private
     */
    private debugLog;
}
