// src/index.ts
// src/index.ts
import { EchologClient } from './client/client';
import { EchologOptions, EventMetadata } from './core/types';

export function initEcholog<T extends EventMetadata = EventMetadata>(
  options: EchologOptions<T>
): EchologClient<T> {
  const client = new EchologClient<T>(options);
  const globalObj = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : {};
  (globalObj as any).echolog = client;
  return client;
}

export * from './client/client';
export { UserData, LogEvent, EventMetadata, LogLevel, EchologOptions } from './core/types';
export { createMetadataType, collectContext, Breadcrumb } from './global';
export { initEchoLog, logError, logEvent, useEchoLog, EchoLogErrorBoundary, getClient } from "./react/src/EchoLogErrorBoudary";

