// src/client/EventSender.ts
import { LogEvent, ReplayEvent, EchologOptions, EventMetadata } from '../core/types';
import { transformJsonForServer } from '../core/utilities/utility';

export class EventSender<T extends EventMetadata = EventMetadata> {
    private apiUrl: string;
    private apiKey: string;
    private options: EchologOptions<T>;
    public isSendingLogs: boolean = false;
    public isSendingReplays: boolean = false; // New flag for replays
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
     * Checks if the sender is currently processing replays.
     * @returns {boolean} True if sending replays, false otherwise.
     */
    public isSendingReplaysActive(): boolean {
        return this.isSendingReplays;
    }

    /**
     * Sends log events to the API asynchronously with retry support.
     * @param {LogEvent<T>[]} events - The log events to send.
     * @returns {Promise<void>} Resolves when events are sent successfully.
     * @throws {Error} If all retry attempts fail.
     */
    public async sendEvents(events: LogEvent<T>[]): Promise<void> {
        if (!events.length) return;

        this.isSendingLogs = true;
        const maxRetryAttempts = this.options.retryAttempts ?? 3;

        try {
            const transformedEvents = events.map(event => transformJsonForServer(event));
            this.debugLog('Sending log events', { eventCount: events.length, retryCount: this.retryCount });

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

            this.retryCount = 0;
            this.debugLog('Log events sent successfully', { eventCount: events.length });
        } catch (error) {
            this.retryCount++;
            if (this.retryCount <= maxRetryAttempts) {
                const backoffDelay = Math.pow(2, this.retryCount) * 1000;
                this.debugLog('Retrying log event send', {
                    error: error instanceof Error ? error.message : String(error),
                    retryCount: this.retryCount,
                    delay: backoffDelay,
                });

                await new Promise(resolve => setTimeout(resolve, backoffDelay));
                return this.sendEvents(events);
            }

            this.debugLog('Failed to send log events after all retries', {
                error: error instanceof Error ? error.message : String(error),
                retryCount: this.retryCount,
            });
            throw error;
        } finally {
            this.isSendingLogs = false;
        }
    }

    /**
     * Sends replay events to the API asynchronously with retry support.
     * @param {ReplayEvent<T>[]} replays - The replay events to send.
     * @param {string} [endpoint='/replay'] - The API endpoint to send replays to.
     * @returns {Promise<void>} Resolves when replays are sent successfully.
     * @throws {Error} If all retry attempts fail.
     */
    public async sendReplays(replays: ReplayEvent<T>[], endpoint: string = '/replay'): Promise<void> {
        if (!replays.length) return;

        this.isSendingReplays = true;
        const maxRetryAttempts = this.options.retryAttempts ?? 3;

        try {
            const transformedReplays = replays.map(replay => transformJsonForServer(replay));
            this.debugLog('Sending replay events', { replayCount: replays.length, retryCount: this.retryCount });

            const response = await fetch(`${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'x-api-key': this.apiKey,
                    'x-echolog-internal': 'true',
                },
                body: JSON.stringify(transformedReplays),
            });

            if (!response.ok) {
                const responseBody = await response.text();
                throw new Error(`HTTP ${response.status}: ${responseBody}`);
            }

            this.retryCount = 0;
            this.debugLog('Replay events sent successfully', { replayCount: replays.length });
        } catch (error) {
            this.retryCount++;
            if (this.retryCount <= maxRetryAttempts) {
                const backoffDelay = Math.pow(2, this.retryCount) * 1000;
                this.debugLog('Retrying replay event send', {
                    error: error instanceof Error ? error.message : String(error),
                    retryCount: this.retryCount,
                    delay: backoffDelay,
                });

                await new Promise(resolve => setTimeout(resolve, backoffDelay));
                return this.sendReplays(replays, endpoint);
            }

            this.debugLog('Failed to send replay events after all retries', {
                error: error instanceof Error ? error.message : String(error),
                retryCount: this.retryCount,
            });
            throw error;
        } finally {
            this.isSendingReplays = false;
        }
    }

    /**
     * Sends log events synchronously using the Beacon API if available.
     * @param {LogEvent<T>[]} events - The log events to send.
     * @returns {boolean} True if sent successfully, false otherwise.
     */
    public sendEventsSync(events: LogEvent<T>[]): boolean {
        if (!events.length || typeof navigator === 'undefined' || !navigator.sendBeacon) {
            return false;
        }

        try {
            const transformedEvents = events.map(event => transformJsonForServer(event));
            this.debugLog('Sending log events via Beacon API', { eventCount: events.length });
            const blob = new Blob([JSON.stringify(transformedEvents)], { type: 'application/json' });
            const success = navigator.sendBeacon(
                `${this.apiUrl}?apiKey=${encodeURIComponent(this.apiKey)}&sync=true`,
                blob
            );
            if (success) {
                this.debugLog('Log events sent successfully via Beacon API', { eventCount: events.length });
            }
            return success;
        } catch (error) {
            console.error('[Echolog] Failed to send log events via Beacon API:', error);
            this.debugLog('Beacon API send failed', { error });
            return false;
        }
    }

    public sendReplaysSync(replays: ReplayEvent<T>[]): boolean {
        if (!replays.length || typeof navigator === 'undefined' || !navigator.sendBeacon) {
          return false;
        }
      
        //send using fetch
        try {
          const transformedReplays = replays.map(replay => transformJsonForServer(replay));
          this.debugLog('Sending replay events via Beacon API', { replayCount: replays.length });
          const blob = new Blob([JSON.stringify(transformedReplays)], { type: 'application/json' });
          const success = navigator.sendBeacon(
            `${this.apiUrl}/replay?apiKey=${encodeURIComponent(this.apiKey)}&sync=true`,
            blob
          );
          if (success) {
            this.debugLog('Replay events sent successfully via Beacon API', { replayCount: replays.length });
          }
          return success;
        } catch (error) {
          console.error('[Echolog] Failed to send replay events via Beacon API:', error);
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
            console.log(`[Echolog Debug] [${timestamp}] ${message}`, data || '');
        }
    }
}