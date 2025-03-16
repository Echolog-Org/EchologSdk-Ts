export interface UserData {
    id: string;
    email?: string;
    username?: string;
    name?: string;
    [key: string]: any;
  }
  
  export interface EventMetadata {
    [key: string]: any;
  }
  
  export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';
  
  export interface EchologEvent<T extends EventMetadata = EventMetadata> {
    id?: string;
    timestamp?: string;
    level: LogLevel;
    message?: string;
    user?: UserData;
    tags?: Record<string, string>;
    metadata?: T;
    exception?: {
      type: string;
      value: string;
      stacktrace?: string;
    };
    context?: {
      browser?: {
        name?: string;
        version?: string;
        userAgent?: string;
      };
      os?: {
        name?: string;
        version?: string;
      };
      device?: {
        name?: string;
        model?: string;
        type?: string;
      };
      app?: {
        name?: string;
        version?: string;
        release?: string;
      };
    };
    session?: {
      id: string;
      startedAt: string;
      duration?: number;
    };
  }
  
  export interface NetworkEvent extends EchologEvent {
    network: {
      url: string;
      method: string;
      statusCode?: number;
      duration?: number;
      requestSize?: number;
      responseSize?: number;
      requestHeaders?: Record<string, string>;
      responseHeaders?: Record<string, string>;
    };
  }
  
  export interface ConsoleEvent extends EchologEvent {
    console: {
      level: 'log' | 'info' | 'warn' | 'error' | 'debug';
      args: string[];
    };
  }
  
  export interface EchologOptions<T extends EventMetadata = EventMetadata> {
    apiKey: string;
    apiUrl?: string;
    environment?: 'development' | 'testing' | 'production';
    release?: string;
    enableConsoleCapture?: boolean;
    enableNetworkCapture?: boolean;
    captureUnhandledErrors?: boolean;
    captureUnhandledPromiseRejections?: boolean;
    maxBatchSize?: number;
    flushInterval?: number;
    beforeSend?: (event: EchologEvent<T>) => EchologEvent<T> | null;
    sampleRate?: number;
  }