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
export declare enum LogLevel {
    TRACE = "TRACE",
    DEBUG = "DEBUG",
    INFO = "INFO",
    WARN = "WARN",
    ERROR = "ERROR",
    FATAL = "FATAL"
}
export interface CodeLocation {
    file: string;
    line: number;
    function: string;
}
export interface ErrorEvent {
    error_type: string;
    stack_trace: Array<{
        file: string;
        line: number;
        function: string;
    }>;
}
export interface LogEvent<T extends EventMetadata = EventMetadata> {
    id: string;
    timestamp: string;
    service_name: string;
    instance_id: string | null;
    level: keyof LogLevel;
    message: string;
    context: T | null;
    thread_id: string | null;
    file: string | null;
    line: number | null;
    function: string | null;
    trace_id: string | null;
    span_id: string | null;
    parent_span_id: string | null;
    duration_ms: number | null;
    error_type: string | null;
    stack_trace: Record<string, any> | null;
    user_data: UserData | null;
    root_cause: string | null;
    related_errors: string[] | null;
    system_metrics: Record<string, any> | null;
    code_location: CodeLocation | null;
    session: {
        id: string;
        startedAt: string;
        duration?: number | null;
    } | null;
    error_details: ErrorEvent | null;
    metadata: EventMetadata | null;
    tags: Record<string, string> | null;
    exception: {
        type: string;
        value: string;
        stacktrace?: string | null;
    } | null;
    network: Record<string, any> | null;
    console: Record<string, any> | null;
}
export interface NetworkEvent extends LogEvent {
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
export interface ConsoleEvent extends LogEvent {
    console: {
        level: keyof LogLevel;
        args: string[];
    };
}
export interface EchologOptions<T extends EventMetadata = EventMetadata> {
    apiKey: string;
    apiUrl?: string;
    environment?: "development" | "testing" | "production";
    release?: string;
    enableConsoleCapture?: boolean;
    enableNetworkCapture?: boolean;
    captureUnhandledErrors?: boolean;
    captureUnhandledPromiseRejections?: boolean;
    maxBatchSize?: number;
    flushInterval?: number;
    beforeSend?: (event: LogEvent<T>) => LogEvent<T> | null;
    sampleRate?: number;
}
