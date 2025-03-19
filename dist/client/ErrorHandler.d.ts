import { EchologClient } from "./client";
import { EchologOptions, EventMetadata } from '../core/types';
export declare class ErrorHandler<T extends EventMetadata = EventMetadata> {
    private client;
    private options;
    constructor(client: EchologClient<T>, options: EchologOptions<T>);
    setupErrorCapture(): void;
    setupPromiseRejectionCapture(): void;
}
