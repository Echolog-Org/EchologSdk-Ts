import { EchologOptions } from '../core/types';
import { EventManager } from './EventManager';
import { SessionManager } from './SessionManager';
export declare class ConsoleCapture {
    private eventManager;
    private sessionManager;
    private options;
    private originalConsole;
    constructor(eventManager: EventManager<any>, sessionManager: SessionManager, options: EchologOptions<any>);
    setupConsoleCapture(): void;
    restoreConsole(): void;
}
