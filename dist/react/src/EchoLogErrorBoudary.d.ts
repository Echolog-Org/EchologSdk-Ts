import { Component, ErrorInfo, ReactNode } from 'react';
import { EchologClient } from '../../client/client';
import { EchologOptions, EventMetadata, LogLevel } from '../../core/types';
interface ReactComponentInfo {
    componentName: string;
    componentStack: string;
    props?: Record<string, any>;
}
interface ReactErrorMetadata extends EventMetadata {
    react?: ReactComponentInfo;
}
/**
 * Initialize the EchoLog SDK for React applications
 * @param options Configuration options for the logging client
 * @returns Initialized EchologClient instance
 */
export declare function initEchoLog(options: EchologOptions<ReactErrorMetadata>): EchologClient<ReactErrorMetadata>;
/**
 * Log an error with React-specific context
 * @param error The error to log
 * @param options Additional options for the log event
 * @returns The event ID for the captured log
 */
export declare function logError(error: Error | unknown, options?: {
    componentName?: string;
    props?: Record<string, any>;
    userId?: string;
    component?: string;
    extraData?: Record<string, any>;
    tags?: Record<string, string>;
}): string;
/**
 * Log a custom event
 * @param message The message to log
 * @param options Additional options for the log event
 * @returns The event ID for the captured log
 */
export declare function logEvent(message: string, options?: {
    level?: LogLevel;
    componentName?: string;
    props?: Record<string, any>;
    userId?: string;
    metadata?: Record<string, any>;
    tags?: Record<string, string>;
}): string;
/**
 * Error boundary component for React applications
 */
export declare class EchoLogErrorBoundary extends Component<{
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}> {
    state: {
        hasError: boolean;
    };
    static getDerivedStateFromError(): {
        hasError: boolean;
    };
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void;
    render(): ReactNode;
}
/**
 * Hook to use EchoLog in functional components
 * @returns Object with log methods
 */
export declare function useEchoLog(): {
    logError: typeof logError;
    logEvent: typeof logEvent;
    captureException: (error: Error, options?: {}) => string;
    captureMessage: (message: string, options?: {}) => string;
};
export type { LogLevel, EventMetadata, EchologOptions, LogEvent } from '../../core/types';
export declare function getClient(): EchologClient<ReactErrorMetadata> | null;
