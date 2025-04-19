import { Session, UserData } from '../core/types';
import { EventManager } from './EventManager';
export declare class SessionManager {
    private eventManager?;
    private serviceName;
    private sessionId?;
    private sessionStartTime?;
    private userData?;
    constructor(serviceName: string);
    setEventManager(eventManager: EventManager<any>): void;
    startSession(): void;
    endSession(): void;
    getSessionId(): string | undefined;
    getSessionStartTime(): Date | undefined;
    getSession(): Session | undefined;
    setUser(userData: UserData): void;
}
