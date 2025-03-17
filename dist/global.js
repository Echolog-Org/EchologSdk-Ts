"use strict";
// src/global.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMetadataType = createMetadataType;
exports.collectContext = collectContext;
/**
 * Creates a custom event metadata type helper
 * @param metadataExample An example of your metadata structure
 * @returns A type guard function for your metadata
 */
function createMetadataType(metadataExample) {
    return (metadata) => {
        // In reality, this just returns true - it's primarily for TypeScript typing
        return true;
    };
}
/**
 * Context collection helper for gathering system information
 */
function collectContext() {
    if (typeof window === 'undefined') {
        return {};
    }
    return {
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        screenResolution: {
            width: window.screen.width,
            height: window.screen.height,
        },
        windowSize: {
            width: window.innerWidth,
            height: window.innerHeight,
        },
        devicePixelRatio: window.devicePixelRatio,
        language: navigator.language,
    };
}
