import { LogEvent } from "../core/types";
export declare class OfflineManager<T extends LogEvent<any>> {
    private dbName;
    private storeName;
    private defaultMaxEvents;
    private debug;
    constructor(debug?: boolean);
    private initDB;
    /**
     * Stores an event in IndexedDB, removing the oldest if the limit is reached.
     * @param event The event to store.
     * @param maxEvents Maximum number of events to store.
     */
    storeEvent(event: T, maxEvents?: number): Promise<void>;
    /**
     * Retrieves all stored offline events.
     * @returns Array of stored events.
     */
    retrieveEvents(): Promise<T[]>;
    /**
     * Clears all stored offline events.
     */
    clearStoredEvents(): Promise<void>;
}
