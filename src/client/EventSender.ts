// src/client/EventSender.ts
import { LogEvent, EchologOptions, EventMetadata } from '../core/types';
import { transformJsonForServer } from '../core/utilities/utility';

export class EventSender<T extends EventMetadata = EventMetadata> {
    private apiUrl: string;
    private apiKey: string;
    private options: EchologOptions<T>;
    public isSendingLogs: boolean = false; 
    private retryCount: number = 0;

    constructor(apiUrl: string, apiKey: string, options: EchologOptions<T>) {
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
        this.options = options;
    }

    /**
     * Checks if the sender is currently processing logs.
     * @returns {boolean} True if sending logs, false otherwise.
     */
    public isSendingLogsActive(): boolean {
        return this.isSendingLogs;
    }

    /**
     * Sends events to the API asynchronously with retry support.
     * @param {LogEvent<T>[]} events - The events to send.
     * @returns {Promise<void>} Resolves when events are sent successfully.
     * @throws {Error} If all retry attempts fail.
     */
    public async sendEvents(events: LogEvent<T>[]): Promise<void> {
        if (!events.length) return;

        this.isSendingLogs = true;
        const maxRetryAttempts = this.options.retryAttempts ?? 3; // Default to 3 if not specified

        try {
            const transformedEvents = events.map(event => transformJsonForServer(event));
            this.debugLog('Sending events', { eventCount: events.length, retryCount: this.retryCount });

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'x-api-key': this.apiKey,
                    'x-echolog-internal': 'true',
                },
                body: JSON.stringify(transformedEvents),
            });

            if (!response.ok) {
                const responseBody = await response.text();
                throw new Error(`HTTP ${response.status}: ${responseBody}`);
            }

            this.retryCount = 0; // Reset on success
            this.debugLog('Events sent successfully', { eventCount: events.length });
        } catch (error) {
            this.retryCount++;
            if (this.retryCount <= maxRetryAttempts) {
                const backoffDelay = Math.pow(2, this.retryCount) * 1000; // Exponential backoff
                this.debugLog('Retrying event send', {
                    error: error instanceof Error ? error.message : String(error),
                    retryCount: this.retryCount,
                    delay: backoffDelay,
                });

                await new Promise(resolve => setTimeout(resolve, backoffDelay));
                return this.sendEvents(events); // Recursive retry
            }

            this.debugLog('Failed to send events after all retries', {
                error: error instanceof Error ? error.message : String(error),
                retryCount: this.retryCount,
            });
            throw error; // Re-throw after exhausting retries
        } finally {
            this.isSendingLogs = false;
        }
    }

    /**
     * Sends events synchronously using the Beacon API if available.
     * @param {LogEvent<T>[]} events - The events to send.
     * @returns {boolean} True if sent successfully, false otherwise.
     */
    public sendEventsSync(events: LogEvent<T>[]): boolean {
        if (!events.length || typeof navigator === 'undefined' || !navigator.sendBeacon) {
            return false;
        }

        try {
            const transformedEvents = events.map(event => transformJsonForServer(event));
            this.debugLog('Sending events via Beacon API', { eventCount: events.length });
            const blob = new Blob([JSON.stringify(transformedEvents)], { type: 'application/json' });
            const success = navigator.sendBeacon(
                `${this.apiUrl}?apiKey=${encodeURIComponent(this.apiKey)}&sync=true`,
                blob
            );
            if (success) {
                this.debugLog('Events sent successfully via Beacon API', { eventCount: events.length });
            }
            return success;
        } catch (error) {
            console.error('[Echolog] Failed to send events via Beacon API:', error);
            this.debugLog('Beacon API send failed', { error });
            return false;
        }
    }

    /**
     * Logs debug messages if debug mode is enabled.
     * @param {string} message - The message to log.
     * @param {any} [data] - Additional data to log.
     * @private
     */
    private debugLog(message: string, data?: any): void {
        if (this.options.debug) {
            const timestamp = new Date().toISOString();
            console.debug(`[Echolog Debug] [${timestamp}] ${message}`, data || '');
        }
    }
}