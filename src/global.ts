// src/global.ts

import { EventMetadata } from '../src/core/types';

/**
 * Breadcrumb for user journey tracking
 */
export interface Breadcrumb {
  type: 'navigation' | 'ui' | 'http' | 'info' | 'error';
  category?: string;
  message: string;
  data?: Record<string, any>;
  timestamp?: string;
}

/**
 * Creates a custom event metadata type helper
 * @param metadataExample An example of your metadata structure
 * @returns A type guard function for your metadata
 */
export function createMetadataType<T extends EventMetadata>(metadataExample: T): (metadata: any) => metadata is T {
  return (metadata: any): metadata is T => {
    // In reality, this just returns true - it's primarily for TypeScript typing
    return true;
  };
}

/**
 * Context collection helper for gathering system information
 */
export function collectContext(): Record<string, any> {
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