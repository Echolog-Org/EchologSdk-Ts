/**
 * @package Echolog
 * @version 1.0.0
 * @license MIT
 * @description A lightweight JavaScript client for capturing and reporting logs, errors, and network events.
 */
import { EchologOptions, EventMetadata, LogEvent, LogLevel, UserData } from '../core/types';
/**
 * Echolog is responsible for handling event logging, capturing errors, and sending logs to an API.
 *
 * @template T Extends EventMetadata for custom metadata structures.
 * @example
 * const client = new EchologClient({
 *   apiKey: 'your-api-key',
 *   projectId: 'my-project',
 *   serviceName: 'my-app',
 *   debug: true,
 *   maxOfflineEvents: 50,
 *   maxBreadcrumbs: 10,
 * });
 * client.captureBreadcrumb('User clicked button', 'ui');
 * client.captureMessage('App started', { level: LogLevel.INFO });
 */
export declare class EchologClient<T extends EventMetadata = EventMetadata> {
    /** @private */
    private projectId;
    /** @private */
    private apiKey;
    /** @private */
    private apiUrl;
    /** @private */
    private environment;
    /** @private */
    private release?;
    /** @private */
    private serviceName;
    /** @private */
    private options;
    /** @private */
    private eventManager;
    /** @private */
    private sessionManager;
    /** @private */
    private errorHandler;
    /** @private */
    private consoleCapture;
    /** @private */
    private networkCapture;
    /** @private */
    private eventSender;
    /** @private */
    private offlineManager;
    /** @private */
    private breadcrumbManager;
    /**
     * Initializes the Echolog client with the provided options.
     * @param {EchologOptions<T>} options - Configuration options for the logging client.
     * @throws {Error} If required options (apiKey, projectId, serviceName) are missing.
     */
    constructor(options: EchologOptions<T>);
    /**
     * Sets up offline event handling.
     * @private
     */
    private setupOfflineSupport;
    /**
     * Retries sending stored offline events when the connection is restored.
     * @private
     */
    private retryOfflineEvents;
    /**
     * Captures a breadcrumb to record contextual events.
     * @param message The breadcrumb message.
     * @param category Optional category (e.g., 'ui', 'network').
     * @param metadata Optional custom metadata.
     * @example
     * client.captureBreadcrumb('Clicked login button', 'ui', { buttonId: 'login-btn' });
     */
    captureBreadcrumb(message: string, category?: string, metadata?: T): void;
    /**
     * Captures an exception and logs it with breadcrumbs.
     * @param {Error | unknown} error - The error to log.
     * @param {Partial<LogEvent<T>> & { user?: UserData; metadata?: T; tags?: Record<string, string>; }} [options] - Additional event options.
     * @returns {string} The unique event ID.
     * @example
     * try {
     *   throw new Error('Something went wrong');
     * } catch (e) {
     *   const eventId = client.captureException(e, { tags: { severity: 'high' } });
     *   console.log('Error logged with ID:', eventId);
     * }
     */
    captureException(error: Error | unknown, options?: Partial<LogEvent<T>> & {
        user?: UserData;
        metadata?: T;
        tags?: Record<string, string>;
    }): string;
    /**
     * Captures a custom message log with breadcrumbs.
     * @param {string} message - The message to log.
     * @param {Partial<LogEvent<T>> & { level?: LogLevel; user?: UserData; metadata?: T; tags?: Record<string, string>; }} [options] - Additional event options.
     * @returns {string} The unique event ID.
     * @example
     * const eventId = client.captureMessage('User logged in', {
     *   level: LogLevel.INFO,
     *   user: { id: '123', name: 'John' },
     *   tags: { action: 'login' }
     * });
     */
    captureMessage(message: string, options?: Partial<LogEvent<T>> & {
        level?: LogLevel;
        user?: UserData;
        metadata?: T;
        tags?: Record<string, string>;
    }): string;
    /**
     * Flushes all pending events.
     * @param {boolean} [sync=false] - Whether to flush synchronously.
     * @returns {Promise<void>} Resolves when flushing is complete.
     * @example
     * await client.flush(); // Ensure all events are sent before proceeding
     */
    flush(sync?: boolean): Promise<void>;
    /**
     * startSession
     * @param {string} userId - The user ID.
     */
    startSession(): void;
    endSession(): void;
    /**
     * Destroys the client instance and removes event listeners.
     * @example
     * client.destroy(); // Clean up when done
     */
    destroy(): void;
}
