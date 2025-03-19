// Client Types File

// Generic metadata type for extensibility
export interface EventMetadata {
  [key: string]: any;
}

// User data structure, aligned with server's UserData
export interface UserData {
  id: string; // Maps to String
  email?: string; // Optional String
  username?: string; // Optional String
  name?: string; // Optional String
  [key: string]: any; // Maps to HashMap<String, serde_json::Value> for additional_data
}

// Log level enum, matching server's LogLevel (UPPERCASE)
export enum LogLevel {
  TRACE = "TRACE",
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  FATAL = "FATAL",
}

// Console level enum, matching server's ConsoleLevel (lowercase)
export enum ConsoleLevel {
  Log = "log",
  Info = "info",
  Warn = "warn",
  Error = "error",
  Debug = "debug",
}

// Code location structure, aligned with server's CodeLocation
export interface CodeLocation {
  file: string; // Maps to String
  line: number; // Maps to u32 (ensure non-negative)
  function: string; // Maps to String
}

// Stack trace frame structure, aligned with server's StackTrace
export interface StackTraceFrame {
  file: string; // Maps to String
  line: number; // Maps to u32 (ensure non-negative)
  function: string; // Maps to String
}

// Error details structure, fully aligned with server's ErrorEvent
export interface ErrorDetails {
  id: string; // Maps to Uuid (as String in JSON)
  timestamp: string; // ISO 8601 string, maps to DateTime<Utc>
  service_name: string; // Maps to String
  error_type: string; // Maps to String
  message: string; // Maps to String
  stack_trace?: StackTraceFrame[]; // Vec<StackTrace> for multiple frames (adjusted from single StackTrace)
  related_log_events?: string[]; // Maps to Vec<Uuid> (as Strings in JSON)
  context?: Record<string, any>; // Maps to HashMap<String, serde_json::Value>
  environment?: string; // Maps to String
  runtime_info?: {
    language: string; // Maps to String
    language_version: string; // Maps to String
    os: string; // Maps to String
    memory_usage_mb?: number; // Maps to Option<f64>
    cpu_usage_percent?: number; // Maps to Option<f64>
  }; // Maps to Option<RuntimeInfo>
  code_version?: string; // Maps to Option<String>
}

// Session structure, aligned with server's Session
export interface Session {
  id: string; // Maps to String
  started_at: string; // ISO 8601 string, maps to String (parsed as DateTime<Utc> on server)
  duration?: number; // Maps to Option<f64>
}

// Exception structure, aligned with server's Exception
export interface Exception {
  type: string; // Maps to r#type (serialized as "type" in JSON)
  value: string; // Maps to String
  stacktrace?: string; // Maps to Option<String>
}

// Network details structure, aligned with server's NetworkDetails
export interface NetworkDetails {
  url: string; // Maps to String
  method: string; // Maps to String
  status_code?: number; // Maps to Option<i32>
  duration?: number; // Maps to Option<f64>
  request_size?: number; // Maps to Option<i32>
  response_size?: number; // Maps to Option<i32>
  request_headers?: Record<string, string>; // Maps to Option<HashMap<String, String>>
  response_headers?: Record<string, string>; // Maps to Option<HashMap<String, String>>
}

// Console details structure, aligned with server's ConsoleDetails
export interface ConsoleDetails {
  level: ConsoleLevel; // Maps to ConsoleLevel enum
  args: string[]; // Maps to Vec<String>
}

// Breadcrumb structure for tracking contextual events, aligned with server expectations
export interface Breadcrumb<T = any> {
  id: string; // Maps to String (UUID)
  timestamp: string; // ISO 8601 string, maps to DateTime<Utc>
  message: string; // Maps to String
  category?: string; // Optional String (e.g., 'ui', 'network', 'custom')
  metadata?: T; // Optional custom metadata, maps to Option<serde_json::Value>
}

// Base LogEvent interface, fully aligned with server's LogEvent, now including breadcrumbs
export interface LogEvent<T extends EventMetadata = EventMetadata> {
  id: string; // Maps to String (UUID)
  timestamp: string; // ISO 8601 string, maps to DateTime<Utc>
  service_name: string; // Maps to String
  instance_id: string | null; // Maps to Option<String>
  level: LogLevel; // Maps to LogLevel enum
  message: string; // Maps to String
  context: T | null; // Maps to Option<serde_json::Value>
  thread_id: string | null; // Maps to Option<String>
  file: string | null; // Maps to Option<String>
  line: number | null; // Maps to Option<i32>
  function: string | null; // Maps to Option<String>
  trace_id: string | null; // Maps to Option<String>
  span_id: string | null; // Maps to Option<String>
  parent_span_id: string | null;
  project_id: string; // Maps to Option<String>
  duration_ms: number | null; // Maps to Option<f64>
  error_type: string | null; // Maps to Option<String>
  stack_trace: string | Record<string, any> | null; // Maps to Option<serde_json::Value> (flexible for string or structured)
  user_data: UserData | null; // Maps to Option<UserData>
  root_cause: string | null; // Maps to Option<String>
  // related_errors: string[] | null; // Maps to Option<Vec<String>> (UUIDs)
  system_metrics: Record<string, any> | null; // Maps to Option<serde_json::Value>
  code_location: CodeLocation | null; // Maps to Option<CodeLocation>
  session: Session | null; // Maps to Option<Session>
  error_details: ErrorDetails | null; // Maps to Option<ErrorEvent>
  metadata: EventMetadata | null; // Maps to Option<serde_json::Value>
  tags: Record<string, string> | null; // Maps to Option<HashMap<String, String>>
  exception: Exception | null; // Maps to Option<Exception>
  network: NetworkDetails | null; // Maps to Option<NetworkDetails>
  console: ConsoleDetails | null; // Maps to Option<ConsoleDetails>
  breadcrumbs?: Breadcrumb<T>[]; // Optional array of breadcrumbs, maps to Option<Vec<Breadcrumb>>
}

// Specialized NetworkEvent
export interface NetworkEvent extends LogEvent {
  network: NetworkDetails; // Required in this subtype
}

// Specialized ConsoleEvent
export interface ConsoleEvent extends LogEvent {
  console: ConsoleDetails; // Required in this subtype
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

  /**
   * Maximum number of events to store offline.
   * Optional, defaults to 100.
   * Maps to Option<usize> on the server.
   * @default 100
   */
  maxOfflineEvents?: number;

  /**
   * Maximum number of retry attempts.
   * Optional, defaults to 3.
   * @default 3
   */
  retryAttempts?: number;

  /**
   * Maximum number of breadcrumbs to store in memory.
   * Optional, defaults to 20.
   * Maps to Option<usize> on the server.
   * @default 20
   */
  maxBreadcrumbs?: number;

  /**
   * Whether to enable breadcrumb capturing.
   * Optional, defaults to true.
   * Maps to Option<bool> on the server.
   * @default true
   */
  enableBreadcrumbs?: boolean;
}