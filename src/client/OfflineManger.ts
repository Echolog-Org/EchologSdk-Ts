// src/client/OfflineManager.ts
import { LogEvent } from "../core/types";

export class OfflineManager<T extends LogEvent<any>> {
    private dbName = 'EchologDB';
    private storeName = 'OfflineEvents';
    private defaultMaxEvents = 100; // Prevents excessive growth
    private debug: boolean;

    constructor(debug = false) {
        this.debug = debug;
        this.initDB(); // Initialize DB on construction
    }

    private async initDB(): Promise<IDBDatabase | null> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' }); // No autoIncrement since event IDs are provided
                }
            };

            request.onsuccess = () => {
                if (this.debug) console.debug('[Echolog] IndexedDB initialized');
                resolve(request.result);
            };
            request.onerror = () => {
                console.error('[Echolog] Failed to initialize IndexedDB');
                reject(new Error('[Echolog] Failed to initialize IndexedDB'));
            };
        });
    }

    /**
     * Stores an event in IndexedDB, removing the oldest if the limit is reached.
     * @param event The event to store.
     * @param maxEvents Maximum number of events to store.
     */
    public async storeEvent(event: T, maxEvents = this.defaultMaxEvents): Promise<void> {
        const db = await this.initDB();
        if (!db) return;

        try {
            const transaction = db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const countRequest = store.count();
            await new Promise<void>((resolve, reject) => {
                countRequest.onsuccess = async () => {
                    if (countRequest.result >= maxEvents) {
                        const cursorRequest = store.openCursor();
                        cursorRequest.onsuccess = (cursorEvent) => {
                            const cursor = (cursorEvent.target as IDBRequest<IDBCursorWithValue>).result;
                            if (cursor) {
                                cursor.delete(); // Remove oldest event
                                if (this.debug) console.debug('[Echolog] Removed oldest offline event');
                                cursor.continue(); // Ensure we only delete one
                            }
                        };
                        cursorRequest.onerror = () => reject(new Error('[Echolog] Failed to delete old event'));
                    }
                    resolve();
                };
                countRequest.onerror = () => reject(new Error('[Echolog] Failed to count events'));
            });

            const addRequest = store.add(event);
            await new Promise<void>((resolve, reject) => {
                addRequest.onsuccess = () => {
                    if (this.debug) console.debug(`[Echolog] Stored offline event: ${event.id}`);
                    resolve();
                };
                addRequest.onerror = () => reject(new Error('[Echolog] Failed to store event'));
            });
        } catch (error) {
            console.error('[Echolog] Error storing offline event:', error);
        }
    }

    /**
     * Retrieves all stored offline events.
     * @returns Array of stored events.
     */
    public async retrieveEvents(): Promise<T[]> {
        const db = await this.initDB();
        if (!db) return [];

        return new Promise((resolve) => {
            const transaction = db.transaction(this.storeName, 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                if (this.debug) console.debug(`[Echolog] Retrieved ${request.result.length} offline events`);
                resolve(request.result);
            };
            request.onerror = () => {
                console.error('[Echolog] Failed to retrieve events');
                resolve([]);
            };
        });
    }

    /**
     * Clears all stored offline events.
     */
    public async clearStoredEvents(): Promise<void> {
        const db = await this.initDB();
        if (!db) return;

        try {
            const transaction = db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();

            await new Promise<void>((resolve, reject) => {
                request.onsuccess = () => {
                    if (this.debug) console.debug('[Echolog] Cleared all offline events');
                    resolve();
                };
                request.onerror = () => reject(new Error('[Echolog] Failed to clear events'));
            });
        } catch (error) {
            console.error('[Echolog] Error clearing offline events:', error);
        }
    }
}