import { EventMetadata, Span, Transaction } from "../core/types";
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
declare class TransactionManager<T extends EnhancedEventMetadata = EnhancedEventMetadata> {
    private transactions;
    private sampleRate;
    private client;
    constructor(client: EchologClient<T>, sampleRate?: number);
    startTransaction(options: {
        name: string;
        op?: string;
        metadata?: T;
    }): Transaction<T> | null;
    startSpan(transaction: Transaction<T>, options: {
        description: string;
        op?: string;
        parentSpanId?: string | null;
        metadata?: T;
    }): Span<T>;
    finishSpan(span: Span<T>): void;
    finishTransaction(traceId: string): void;
    getTransaction(traceId: string): Transaction<T> | undefined;
}
export { TransactionManager };
