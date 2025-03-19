export interface EventMetadata {
    [key: string]: any;
}
export interface UserData {
    id: string;
    email?: string;
    username?: string;
    name?: string;
    [key: string]: any;
}
export declare enum LogLevel {
    TRACE = "TRACE",
    DEBUG = "DEBUG",
    INFO = "INFO",
    WARN = "WARN",
    ERROR = "ERROR",
    FATAL = "FATAL"
}
export declare enum ConsoleLevel {
    Log = "log",
    Info = "info",
    Warn = "warn",
    Error = "error",
    Debug = "debug"
}
export interface CodeLocation {
    file: string;
    line: number;
    function: string;
}
export interface StackTraceFrame {
    file: string;
    line: number;
    function: string;
}
export interface ErrorDetails {
    id: string;
    timestamp: string;
    service_name: string;
    error_type: string;
    message: string;
    stack_trace?: StackTraceFrame[];
    related_log_events?: string[];
    context?: Record<string, any>;
    environment?: string;
    runtime_info?: {
        language: string;
        language_version: string;
        os: string;
        memory_usage_mb?: number;
        cpu_usage_percent?: number;
    };
    code_version?: string;
}
export interface Session {
    id: string;
    started_at: string;
    duration?: number;
}
export interface Exception {
    type: string;
    value: string;
    stacktrace?: string;
}
export interface NetworkDetails {
    url: string;
    method: string;
    status_code?: number;
    duration?: number;
    request_size?: number;
    response_size?: number;
    request_headers?: Record<string, string>;
    response_headers?: Record<string, string>;
}
export interface ConsoleDetails {
    level: ConsoleLevel;
    args: string[];
}
export interface LogEvent<T extends EventMetadata = EventMetadata> {
    id: string;
    timestamp: string;
    service_name: string;
    instance_id: string | null;
    level: LogLevel;
    message: string;
    context: T | null;
    thread_id: string | null;
    file: string | null;
    line: number | null;
    function: string | null;
    trace_id: string | null;
    span_id: string | null;
    parent_span_id: string | null;
    project_id: string;
    duration_ms: number | null;
    error_type: string | null;
    stack_trace: string | Record<string, any> | null;
    user_data: UserData | null;
    root_cause: string | null;
    system_metrics: Record<string, any> | null;
    code_location: CodeLocation | null;
    session: Session | null;
    error_details: ErrorDetails | null;
    metadata: EventMetadata | null;
    tags: Record<string, string> | null;
    exception: Exception | null;
    network: NetworkDetails | null;
    console: ConsoleDetails | null;
}
export interface NetworkEvent extends LogEvent {
    network: NetworkDetails;
}
export interface ConsoleEvent extends LogEvent {
    console: ConsoleDetails;
}
/**
 * Configuration options for the Echolog client, aligned with server expectations.
 * @template T - The type of metadata extending EventMetadata, defaults to EventMetadata.
 */
export interface EchologOptions<T extends EventMetadata = EventMetadata> {
    /**
     * API key for authenticating requests to the Echolog server.
     * Required and must be a non-empty string.
     * Maps to String on the server.
     */
    apiKey: string;
    /**
     * Project ID for identifying the source of logs.
     * Required and must be a non-empty string.
     * Maps to String on the server.
     * @example 'my-project-id'
     */
    projectId: string;
    /**
     * Base URL for the Echolog server API.
     * Optional, defaults to 'http://localhost:8080/events'.
     * Maps to Option<String> on the server.
     * @default 'http://localhost:8080/events'
     */
    apiUrl?: string;
    /**
     * Environment in which the client is running.
     * Optional, defaults to 'production'.
     * Matches server-side convention: "development", "testing", or "production".
     * Maps to Option<String> on the server.
     * @default 'production'
     */
    environment?: 'development' | 'testing' | 'production';
    /**
     * Release version of the application.
     * Optional, used for tracking specific builds.
     * Maps to Option<String> on the server.
     */
    release?: string;
    /**
     * Whether to capture console logs (log, info, warn, error, debug).
     * Optional, defaults to true.
     * Maps to Option<bool> on the server.
     * @default true
     */
    enableConsoleCapture?: boolean;
    /**
     * Whether to capture network requests (XHR and fetch).
     * Optional, defaults to true.
     * Maps to Option<bool> on the server.
     * @default true
     */
    enableNetworkCapture?: boolean;
    /**
     * Whether to capture unhandled errors (window.onerror).
     * Optional, defaults to true.
     * Maps to Option<bool> on the server.
     * @default true
     */
    captureUnhandledErrors?: boolean;
    /**
     * Whether to capture unhandled promise rejections (window.onunhandledrejection).
     * Optional, defaults to true.
     * Maps to Option<bool> on the server.
     * @default true
     */
    captureUnhandledPromiseRejections?: boolean;
    /**
     * Maximum number of events to batch before flushing to the server.
     * Optional, defaults to 10.
     * Maps to Option<usize> on the server.
     * @default 10
     */
    maxBatchSize?: number;
    /**
     * Interval in milliseconds between automatic flushes of the event queue.
     * Optional, defaults to 5000 (5 seconds).
     * Maps to Option<usize> on the server.
     * @default 5000
     */
    flushInterval?: number;
    /**
     * Name of the service or application using the client.
     * Required, used to identify the source of logs.
     * Maps to String on the server.
     */
    serviceName: string;
    /**
     * Callback function to modify or filter events before sending.
     * Return null to discard the event.
     * Optional, no default.
     * @example
     *   beforeSend: (event) => {
     *     event.tags = { ...event.tags, custom: 'value' };
     *     return event;
     *   }
     */
    beforeSend?: (event: LogEvent<T>) => LogEvent<T> | null;
    /**
     * Sampling rate for events, between 0.0 (none) and 1.0 (all).
     * Optional, defaults to 1.0.
     * Maps to Option<f32> on the server.
     * @default 1.0
     */
    sampleRate?: number;
    /**
     * Enable debug mode to log internal operations to the console.
     * Optional, defaults to false.
     * Useful for troubleshooting SDK behavior.
     * @default false
     */
    debug?: boolean;
    /**
     * Maximum number of retries for failed event submissions.
     * Optional, defaults to 3.
     * Used with exponential backoff to improve reliability.
     * @default 3
     */
    maxRetries?: number;
    /**
     * Whether to include browser metadata (e.g., userAgent) in events.
     * Optional, defaults to true.
     * Helps reduce overhead if not needed.
     * @default true
     */
    includeBrowserMetadata?: boolean;
}
