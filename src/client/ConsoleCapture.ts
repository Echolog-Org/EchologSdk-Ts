// src/client/ConsoleCapture.ts
import { LogEvent, LogLevel, EchologOptions } from '../core/types';
import { generateUniqueId, stringifyArg } from '../core/utilities/utility';
import { EventManager } from './EventManager';
import { SessionManager } from './SessionManager';

export class ConsoleCapture {
    private eventManager: EventManager<any>;
    private sessionManager: SessionManager; 
    private options: EchologOptions<any>;
    private originalConsole: Partial<Record<keyof Console, Function>> = {};
  
    constructor(eventManager: EventManager<any>, sessionManager: SessionManager, options: EchologOptions<any>) {
      this.eventManager = eventManager;
      this.sessionManager = sessionManager; // Store the SessionManager instance
      this.options = options;
    }
  
    public setupConsoleCapture(): void {
      if (typeof console === 'undefined') return;
  
      const consoleMethods = ['log', 'info', 'warn', 'error', 'debug'] as const;
      const levelMap: Record<string, LogLevel> = {
        log: LogLevel.INFO,
        info: LogLevel.INFO,
        warn: LogLevel.WARN,
        error: LogLevel.ERROR,
        debug: LogLevel.DEBUG,
      };
  
      consoleMethods.forEach((method) => {
        this.originalConsole[method] = console[method];
        console[method] = (...args: any[]) => {
          this.originalConsole[method]?.(...args);
  
          this.eventManager.captureEvent({
            id: generateUniqueId(),
            timestamp: new Date().toISOString(),
            service_name: this.eventManager['client']['serviceName'],
            level: levelMap[method],
            message: args.map(stringifyArg).join(' '),
            code_location: {
              file: '',
              line: 0,
              function: ''
            },
            session: this.sessionManager.getSessionId() ? { // Use sessionManager directly
              id: this.sessionManager.getSessionId()!,
              started_at: this.sessionManager.getSessionStartTime()!.toISOString(),
            } : undefined,
          });
        };
      });
    }
  
    public restoreConsole(): void {
      if (typeof console === 'undefined') return;
      Object.entries(this.originalConsole).forEach(([method, fn]) => {
        (console as any)[method] = fn;
      });
      this.originalConsole = {};
    }
  }