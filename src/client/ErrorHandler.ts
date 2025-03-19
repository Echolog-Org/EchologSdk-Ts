// src/client/ErrorHandler.ts
import { EchologClient } from "./client";
import { EchologOptions, EventMetadata, UserData } from '../core/types';

export class ErrorHandler<T extends EventMetadata = EventMetadata> {
  private client: EchologClient<T>;
  private options: EchologOptions<T>;

  constructor(client: EchologClient<T>, options: EchologOptions<T>) {
    this.client = client;
    this.options = options;
  }

  public setupErrorCapture(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        if (event.defaultPrevented) return;

        this.client.captureException(event.error || new Error(event.message), {
          message: `Unhandled error: ${event.message}`,
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          } as unknown as T,
        });
      });
    }
  }

  public setupPromiseRejectionCapture(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.client.captureException(event.reason || new Error('Unhandled Promise rejection'), {
          message: 'Unhandled Promise rejection',
        });
      });
    }
  }
}