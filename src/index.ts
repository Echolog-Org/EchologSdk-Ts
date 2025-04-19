// src/index.ts
// src/index.ts
import { EchologClient } from './client/client';
import { EchologOptions, EventMetadata } from './core/types';

export function initEcholog<T extends EventMetadata = EventMetadata>(
  options: EchologOptions<T>
): EchologClient<T> {
  const client = new EchologClient<T>(sanitizeOptions(options));
  
  const globalObj = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : {};
  (globalObj as any).echolog = client;
  return client;
}
function sanitizeOptions<T extends EventMetadata>(options: EchologOptions<T>): EchologOptions<T> & {
  autoReplay: 'onLoad' | 'onSessionStart' | false;
} {
  return {
    ...options,
    autoReplay: options.autoReplay ?? false,
  };
}


export * from './client/client';
export { UserData, LogEvent, EventMetadata, LogLevel, EchologOptions } from './core/types';
export { createMetadataType, collectContext, Breadcrumb } from './global';
export { initEchoLog, logError, logEvent, useEchoLog, EchoLogErrorBoundary, getClient } from "./react/src/EchoLogErrorBoudary";

