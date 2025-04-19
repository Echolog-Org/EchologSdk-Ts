import { EventMetadata, LogLevel, Span, Transaction } from "../core/types";
import { generateUniqueId } from "../core/utilities/utility";
import { EchologClient } from "./client";

interface EnhancedEventMetadata extends EventMetadata {
  startTime?: number;
  duration?: number;
  memoryUsage?: number;
  loadTime?: number;
  firstPaint?: number;
  fcp?: number;
  lcp?: number;
  dns?: number;
  tcp?: number;
  request?: number;
  response?: number;
}

class TransactionManager<T extends EnhancedEventMetadata = EnhancedEventMetadata> {
  private transactions: Map<string, Transaction<T>> = new Map();
  private sampleRate: number;
  private client: EchologClient<T>;

  constructor(client: EchologClient<T>, sampleRate: number = 1.0) {
    this.client = client;
    this.sampleRate = sampleRate;
  }

  public startTransaction(options: { name: string; op?: string; metadata?: T }): Transaction<T> | null {
    if (Math.random() > this.sampleRate) {
      return null;
    }

    const { name, op, metadata } = options;
    const traceId = generateUniqueId();
    const startTime = performance.now();
    const perfEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const loadTime = perfEntries.length > 0
      ? perfEntries[0].loadEventEnd - perfEntries[0].startTime
      : undefined;
    const memoryUsage = (performance as any).memory
      ? (performance as any).memory.usedJSHeapSize / (1024 * 1024)
      : undefined;

    const enhancedMetadata: T = {
      ...(metadata || ({} as T)),
      ...(loadTime !== undefined ? { loadTime } : {}),
      ...(memoryUsage !== undefined ? { memoryUsage } : {}),
    } as T;

    const transaction: Transaction<T> = {
      id: generateUniqueId(),
      trace_id: traceId,
      span_id: null, // Transaction itself doesn't have a span_id
      name,
      op : op || 'transaction',
      start_timestamp: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      service_name: this.client['serviceName'],
      project_id: this.client['projectId'],
      level: LogLevel.INFO,
      message: `Transaction: ${name}`,
      spans: [],
      metadata: enhancedMetadata,
      breadcrumbs: this.client['breadcrumbManager'].getAll(),
      instance_id: null,
      context: null,
      thread_id: null,
      file: null,
      line: null,
      function: null,
      parent_span_id: null,
      duration_ms: null,
      error_type: null,
      stack_trace: null,
      user_data: null,
      root_cause: null,
      system_metrics: null,
      code_location: null,
      session: this.client['sessionManager'].getSession() || null,
      error_details: null,
      tags: null,
      exception: null,
      network: null,
      console: null,
      end_timestamp: undefined,
    };

    this.transactions.set(traceId, transaction);

    // Send the transaction start event to the backend via EventManager
    if (this.client['options'].debug) {
      console.debug('[TransactionManager] Starting transaction:', transaction);
    }
    this.client['eventManager'].captureEvent(transaction);

    return transaction;
  }

  public startSpan(
    transaction: Transaction<T>,
    options: { description: string; op?: string; parentSpanId?: string | null; metadata?: T }
  ): Span<T> {
    const { description, op, parentSpanId, metadata } = options;
    const startTime = performance.now();
    const enhancedMetadata: T = {
      ...(metadata || ({} as T)),
      startTime,
    } as T;

    const span: Span<T> = {
      span_id: generateUniqueId(),
      parent_span_id: parentSpanId || null,
      description,
      op: op || 'custom',
      start_timestamp: new Date().toISOString(),
      metadata: enhancedMetadata,
      end_timestamp: undefined,
      duration_ms: undefined,
    };
    transaction.spans.push(span);

    // Send the span start event to the backend via EventManager
    const spanEvent = {
      ...transaction,
      span_id: span.span_id,
      message: `Span: ${description}`,
      description,
      op,
      start_timestamp: span.start_timestamp,
      metadata: span.metadata,
    };
    if (this.client['options'].debug) {
      console.debug('[TransactionManager] Starting span:', span);
    }
    this.client['eventManager'].captureEvent(spanEvent);

    return span;
  }

  public finishSpan(span: Span<T>): void {
    if (!span.end_timestamp) {
      span.end_timestamp = new Date().toISOString();
      const endTime = performance.now();
      span.duration_ms = endTime - (span.metadata?.startTime || new Date(span.start_timestamp).getTime());

      if (span.metadata) {
        span.metadata.duration = span.duration_ms;
        if ((performance as any).memory) {
          span.metadata.memoryUsage = (performance as any).memory.usedJSHeapSize / (1024 * 1024);
        }
      }

      // Find the parent transaction to send the updated span
      for (const [traceId, transaction] of this.transactions) {
        if (transaction.spans.some(s => s.span_id === span.span_id)) {
          const spanEvent = {
            ...transaction,
            span_id: span.span_id,
            message: `Span finished: ${span.description}`,
            description: span.description,
            op: span.op,
            start_timestamp: span.start_timestamp,
            end_timestamp: span.end_timestamp,
            duration_ms: span.duration_ms,
            metadata: span.metadata,
          };
          if (this.client['options'].debug) {
            console.debug('[TransactionManager] Finishing span:', span);
          }
          this.client['eventManager'].captureEvent(spanEvent);
          break;
        }
      }
    }
  }

  public finishTransaction(traceId: string): void {
    const transaction = this.transactions.get(traceId);
    if (!transaction) return;

    transaction.end_timestamp = new Date().toISOString();
    transaction.duration_ms = (new Date(transaction.end_timestamp).getTime() - new Date(transaction.start_timestamp).getTime()) / 1000; // Convert to seconds

    if (transaction.metadata && (performance as any).memory) {
      transaction.metadata.memoryUsage = (performance as any).memory.usedJSHeapSize / (1024 * 1024);
    }

    if (transaction.duration_ms > 5) { // Threshold in seconds (5000ms = 5s)
      transaction.level = LogLevel.WARN;
      transaction.message = `Slow transaction: ${transaction.name} (${transaction.duration_ms * 1000}ms)`;
    }

    if (this.client['options'].debug) {
      console.debug('[TransactionManager] Finishing transaction:', transaction);
    }
    this.client['eventManager'].captureEvent(transaction);
    this.transactions.delete(traceId);
  }

  public getTransaction(traceId: string): Transaction<T> | undefined {
    return this.transactions.get(traceId);
  }
}

export { TransactionManager };