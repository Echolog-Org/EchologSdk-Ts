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
export declare function createMetadataType<T extends EventMetadata>(metadataExample: T): (metadata: any) => metadata is T;
/**
 * Context collection helper for gathering system information
 */
export declare function collectContext(): Record<string, any>;
