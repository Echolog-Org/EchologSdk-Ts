import { Component, ErrorInfo, ReactNode } from 'react';
import { EchologClient } from '../../client/client';
import { EchologOptions, EventMetadata, LogLevel } from '../../core/types';
import React from 'react';

interface ReactComponentInfo {
    componentName: string;
    componentStack: string;
    props?: Record<string, any>;
  }
  
  interface ReactErrorMetadata extends EventMetadata {
    react?: ReactComponentInfo;
  }
  
  let echologClient: EchologClient<ReactErrorMetadata> | null = null;
  
  /**
   * Initialize the EchoLog SDK for React applications
   * @param options Configuration options for the logging client
   * @returns Initialized EchologClient instance
   */
  export function initEchoLog(options: EchologOptions<ReactErrorMetadata>): EchologClient<ReactErrorMetadata> {
    if (echologClient) {
      return echologClient;
    }
  
    const defaultOptions: Partial<EchologOptions<ReactErrorMetadata>> = {
      captureUnhandledErrors: true,
      captureUnhandledPromiseRejections: true,
      enableConsoleCapture: true,
      enableNetworkCapture: true,
      flushInterval: 5000,
      projectId: '',
      maxBatchSize: 10,
      serviceName: 'react-app',
      sampleRate: 1.0,
      debug: false, 
      maxRetries: 3, 
      includeBrowserMetadata: true,
      trackableElements: [],
      beforeSend: (event) => {
        if (typeof window !== 'undefined') {
          event.metadata = {
            ...event.metadata,
            react: {
              ...event.metadata?.react,
              version: React.version,
            },
          };
        }
        return event;
      },
    };
   /**
    * Create a new EchologClient instance with the provided options
    * and store it in the global variable
    * @type {EchologClient<ReactErrorMetadata>}
    */
    echologClient = new EchologClient<ReactErrorMetadata>({
      ...defaultOptions,
      ...options,
      apiKey: options.apiKey,
      serviceName: options.serviceName || defaultOptions.serviceName || 'react-app',
      autoReplay: options.autoReplay ?? false,
    });
  
    echologClient.startSession();
    return echologClient;
  }
  
  /**
   * Log an error with React-specific context
   * @param error The error to log
   * @param options Additional options for the log event
   * @returns The event ID for the captured log
   */
  export function logError(
    error: Error | unknown,
    options: {
      componentName?: string;
      props?: Record<string, any>;
      userId?: string;
      component?: string;
      extraData?: Record<string, any>;
      tags?: Record<string, string>;
    } = {}
  ): string {
    if (!echologClient) {
      console.warn('[EchoLog] SDK not initialized. Call initEchoLog first.');
      return '';
    }
  
    const metadata: ReactErrorMetadata = {
      react: {
        componentName: options.componentName || options.component || '',
        componentStack: '',
        props: options.props || {},
      },
      ...options.extraData,
    };
  
    const userData = options.userId ? { id: options.userId } : undefined;
  
    return echologClient.captureException(error, {
      metadata,
      user: userData,
      tags: options.tags,
    });
  }
  
  /**
   * Log a custom event
   * @param message The message to log
   * @param options Additional options for the log event
   * @returns The event ID for the captured log
   */
  export function logEvent(
    message: string,
    options: {
      level?: LogLevel;
      componentName?: string;
      props?: Record<string, any>;
      userId?: string;
      metadata?: Record<string, any>;
      tags?: Record<string, string>;
    } = {}
  ): string {
    if (!echologClient) {
      console.warn('[EchoLog] SDK not initialized. Call initEchoLog first.');
      return '';
    }
  
    const metadata: ReactErrorMetadata = {
      react: {
        componentName: options.componentName || '',
        componentStack: '',
        props: options.props || {},
      },
      ...options.metadata,
    };
  
    const userData = options.userId ? { id: options.userId } : undefined;
  
    return echologClient.captureMessage(message, {
      level: options.level || LogLevel.INFO,
      metadata,
      user: userData,
      tags: options.tags,
    });
  }
  
  /**
   * Error boundary component for React applications
   */
  export class EchoLogErrorBoundary extends Component<{
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
  }> {
    state = { hasError: false };
  
    static getDerivedStateFromError() {
      return { hasError: true };
    }
  
    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
      // Extract component name from component stack
      const componentMatch = errorInfo.componentStack &&  errorInfo.componentStack.match(/^\s*in\s(.+)$/);
      const componentName = componentMatch ? componentMatch[1] : 'Unknown';
  
      // Log the error with React-specific context
      logError(error, {
        componentName,
        extraData: {
          react: {
            componentName,
            componentStack: errorInfo.componentStack,
          },
        },
      });
  
      // Call the onError prop if provided
      if (this.props.onError) {
        this.props.onError(error, errorInfo);
      }
    }
  
    render() {
      if (this.state.hasError) {
        return this.props.fallback || null;
      }
  
      return this.props.children;
    }
  }
  
  /**
   * Hook to use EchoLog in functional components
   * @returns Object with log methods
   */
  export function useEchoLog() {
    return {
      logError,
      logEvent,
      captureException: (error: Error, options = {}) => logError(error, options),
      captureMessage: (message: string, options = {}) => logEvent(message, options),
    };
  }
  
  // Re-export types from the client
  export type { LogLevel, EventMetadata, EchologOptions, LogEvent } from '../../core/types';
  
  // Export the client instance getter
  export function getClient(): EchologClient<ReactErrorMetadata> | null {
    return echologClient;
  }
  