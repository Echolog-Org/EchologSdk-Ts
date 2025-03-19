"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringifyArg = stringifyArg;
exports.shouldCaptureRequest = shouldCaptureRequest;
exports.generateUniqueId = generateUniqueId;
exports.getBrowserName = getBrowserName;
exports.transformJsonForServer = transformJsonForServer;
/**
 * Utility method to convert various argument types to strings
 * @param arg The argument to stringify
 */
function stringifyArg(arg) {
    if (arg === null)
        return "null";
    if (arg === undefined)
        return "undefined";
    if (arg instanceof Error)
        return `${arg.name}: ${arg.message}\n${arg.stack || ""}`;
    try {
        if (typeof arg === "object") {
            return JSON.stringify(arg);
        }
        return String(arg);
    }
    catch (e) {
        return "[Object]";
    }
}
/**
 * Determines if a network request should be captured
 * @param url The URL of the request
 */
function shouldCaptureRequest(url, apiUrl) {
    // Don't capture requests to the Echolog API to avoid infinite loops
    if (url.includes(apiUrl)) {
        return false;
    }
    return true;
}
/**
 * Generates a unique ID for events
 * @returns A UUID v4 format string
 */
function generateUniqueId() {
    try {
        return `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    catch (error) {
        console.warn("Unique ID generation failed", error);
        return `fallback-${Math.random().toString(36).substr(2, 9)}`;
    }
}
/**
 * Detects the current browser name
 * @returns The browser name or 'unknown'
 */
function getBrowserName() {
    if (typeof navigator === "undefined")
        return "unknown";
    const userAgent = navigator.userAgent;
    if (userAgent.indexOf("Chrome") > -1)
        return "Chrome";
    if (userAgent.indexOf("Safari") > -1)
        return "Safari";
    if (userAgent.indexOf("Firefox") > -1)
        return "Firefox";
    if (userAgent.indexOf("MSIE") > -1 || userAgent.indexOf("Trident/") > -1)
        return "Internet Explorer";
    if (userAgent.indexOf("Edge") > -1)
        return "Edge";
    return "unknown";
}
/**
 * Transform JSON for PostgreSQL compatibility
 * @param obj The object to transform
 * @returns A transformed object safe for PostgreSQL
 */
function transformJsonForServer(obj) {
    if (obj === undefined || obj === null)
        return obj;
    if (Array.isArray(obj)) {
        return obj.map(transformJsonForServer);
    }
    if (typeof obj === "object") {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            const fixedKey = key === "user" ? "user_data" : key;
            // Only preserve 'level' at the root level, remove it from nested objects
            if (key === "level" && typeof value === "string" && Object.keys(obj).includes("id")) {
                result[fixedKey] = value; // Preserve 'level' if this is a root LogEvent (has 'id')
            }
            else if (key === "level" && typeof value === "string") {
                continue; // Skip 'level' in nested objects
            }
            else if (value !== undefined) {
                result[fixedKey] = transformJsonForServer(value);
            }
        }
        return result;
    }
    return obj;
}
