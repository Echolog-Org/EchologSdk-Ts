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
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
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
    if (obj === undefined) {
        return null;
    }
    if (obj === null) {
        return obj;
    }
    // Handle arrays
    if (Array.isArray(obj)) {
        // Return null for empty arrays (PostgreSQL preference)
        if (obj.length === 0) {
            return null;
        }
        return obj.map(transformJsonForServer);
    }
    // Handle objects
    if (typeof obj === 'object') {
        // Return null for empty objects
        if (Object.keys(obj).length === 0) {
            return null;
        }
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            // Fix field name if needed
            const fixedKey = key === 'user' ? 'user_data' : key;
            // Transform the value recursively
            result[fixedKey] = transformJsonForServer(value);
        }
        return result;
    }
    return obj;
}
