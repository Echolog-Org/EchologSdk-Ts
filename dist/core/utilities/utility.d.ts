import { EventMetadata, LogEvent } from "../types";
/**
 * Utility method to convert various argument types to strings
 * @param arg The argument to stringify
 */
export declare function stringifyArg(arg: any): string;
/**
 * Determines if a network request should be captured
 * @param url The URL of the request
 */
export declare function shouldCaptureRequest(url: string, apiUrl: string): boolean;
/**
 * Generates a unique ID for events
 * @returns A UUID v4 format string
 */
export declare function generateUniqueId(): string;
/**
 * Detects the current browser name
 * @returns The browser name or 'unknown'
 */
export declare function getBrowserName(): string;
/**
 * Transform JSON for PostgreSQL compatibility
 * @param obj The object to transform
 * @returns A transformed object safe for PostgreSQL
 */
export declare function transformJsonForServer<T>(obj: T): T;
export declare function createLogEvent<T extends EventMetadata = EventMetadata>(overrides?: Partial<LogEvent<T>>): LogEvent<T>;
