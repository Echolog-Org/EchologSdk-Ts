import { EchologClient } from './client/client';
import { EchologOptions, EventMetadata } from './core/types';
export declare function initEcholog<T extends EventMetadata = EventMetadata>(options: EchologOptions<T>): EchologClient<T>;
export * from './client/client';
export { UserData, LogEvent, EventMetadata, LogLevel, EchologOptions } from './core/types';
export { createMetadataType, collectContext, Breadcrumb } from './global';
export { initEchoLog, logError, logEvent, useEchoLog, EchoLogErrorBoundary, getClient } from "./react/src/EchoLogErrorBoudary";
