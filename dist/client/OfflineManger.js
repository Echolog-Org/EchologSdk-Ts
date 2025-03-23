"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfflineManager = void 0;
class OfflineManager {
    constructor(debug = false) {
        this.dbName = 'EchologDB';
        this.storeName = 'OfflineEvents';
        this.defaultMaxEvents = 100; // Prevents excessive growth
        this.debug = debug;
        this.initDB(); // Initialize DB on construction
    }
    initDB() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, 1);
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        db.createObjectStore(this.storeName, { keyPath: 'id' }); // No autoIncrement since event IDs are provided
                    }
                };
                request.onsuccess = () => {
                    if (this.debug)
                        console.debug('[Echolog] IndexedDB initialized');
                    resolve(request.result);
                };
                request.onerror = () => {
                    console.error('[Echolog] Failed to initialize IndexedDB');
                    reject(new Error('[Echolog] Failed to initialize IndexedDB'));
                };
            });
        });
    }
    /**
     * Stores an event in IndexedDB, removing the oldest if the limit is reached.
     * @param event The event to store.
     * @param maxEvents Maximum number of events to store.
     */
    storeEvent(event_1) {
        return __awaiter(this, arguments, void 0, function* (event, maxEvents = this.defaultMaxEvents) {
            const db = yield this.initDB();
            if (!db)
                return;
            try {
                const transaction = db.transaction(this.storeName, 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const countRequest = store.count();
                yield new Promise((resolve, reject) => {
                    countRequest.onsuccess = () => __awaiter(this, void 0, void 0, function* () {
                        if (countRequest.result >= maxEvents) {
                            const cursorRequest = store.openCursor();
                            cursorRequest.onsuccess = (cursorEvent) => {
                                const cursor = cursorEvent.target.result;
                                if (cursor) {
                                    cursor.delete(); // Remove oldest event
                                    if (this.debug)
                                        console.debug('[Echolog] Removed oldest offline event');
                                    cursor.continue(); // Ensure we only delete one
                                }
                            };
                            cursorRequest.onerror = () => reject(new Error('[Echolog] Failed to delete old event'));
                        }
                        resolve();
                    });
                    countRequest.onerror = () => reject(new Error('[Echolog] Failed to count events'));
                });
                const addRequest = store.add(event);
                yield new Promise((resolve, reject) => {
                    addRequest.onsuccess = () => {
                        if (this.debug)
                            console.debug(`[Echolog] Stored offline event: ${event.id}`);
                        resolve();
                    };
                    addRequest.onerror = () => reject(new Error('[Echolog] Failed to store event'));
                });
            }
            catch (error) {
                console.error('[Echolog] Error storing offline event:', error);
            }
        });
    }
    /**
     * Retrieves all stored offline events.
     * @returns Array of stored events.
     */
    retrieveEvents() {
        return __awaiter(this, void 0, void 0, function* () {
            const db = yield this.initDB();
            if (!db)
                return [];
            return new Promise((resolve) => {
                const transaction = db.transaction(this.storeName, 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.getAll();
                request.onsuccess = () => {
                    if (this.debug)
                        console.debug(`[Echolog] Retrieved ${request.result.length} offline events`);
                    resolve(request.result);
                };
                request.onerror = () => {
                    console.error('[Echolog] Failed to retrieve events');
                    resolve([]);
                };
            });
        });
    }
    /**
     * Clears all stored offline events.
     */
    clearStoredEvents() {
        return __awaiter(this, void 0, void 0, function* () {
            const db = yield this.initDB();
            if (!db)
                return;
            try {
                const transaction = db.transaction(this.storeName, 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.clear();
                yield new Promise((resolve, reject) => {
                    request.onsuccess = () => {
                        if (this.debug)
                            console.debug('[Echolog] Cleared all offline events');
                        resolve();
                    };
                    request.onerror = () => reject(new Error('[Echolog] Failed to clear events'));
                });
            }
            catch (error) {
                console.error('[Echolog] Error clearing offline events:', error);
            }
        });
    }
}
exports.OfflineManager = OfflineManager;
