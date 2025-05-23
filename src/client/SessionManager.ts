// src/client/SessionManager.ts
import { LogEvent, LogLevel, Session, UserData } from '../core/types';
import { generateUniqueId } from '../core/utilities/utility';
import { EventManager } from './EventManager';

export class SessionManager {
  private eventManager?: EventManager<any>; // Make eventManager optional initially
  private serviceName: string;
  private sessionId?: string;
  private sessionStartTime?: Date;
  private userData?: UserData;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  // Add a setter to initialize eventManager after construction
  public setEventManager(eventManager: EventManager<any>): void {
    this.eventManager = eventManager;
  }

  public startSession(): void {
    this.sessionId = generateUniqueId();
    this.sessionStartTime = new Date();

    this.eventManager?.captureEvent({
      id: generateUniqueId(),
      timestamp: new Date().toISOString(),
      service_name: this.serviceName,
      level: LogLevel.INFO,
      message: 'Session started',
      session: {
        id: this.sessionId,
        started_at: this.sessionStartTime.toISOString(),
      },
    });
  }

  public endSession(): void {
    if (!this.sessionId || !this.sessionStartTime) {
      return;
    }

    const sessionEndTime = new Date();
    const sessionDuration = sessionEndTime.getTime() - this.sessionStartTime.getTime();

    this.eventManager?.captureEvent({
      id: generateUniqueId(),
      timestamp: new Date().toISOString(),
      service_name: this.serviceName,
      level: LogLevel.INFO,
      message: 'Session ended',
      session: {
        id: this.sessionId,
        started_at: this.sessionStartTime.toISOString(),
        duration: sessionDuration,
      },
    });
    

    this.sessionId = undefined;
    this.sessionStartTime = undefined;
    this.eventManager?.flush(true);
  }
  //setUser


  public getSessionId(): string | undefined {
    return this.sessionId;
  }

  public getSessionStartTime(): Date | undefined {
    return this.sessionStartTime;
  }
  //get session object
  public getSession(): Session | undefined {
    if (!this.sessionId || !this.sessionStartTime) {
      return undefined;
    }
    return {
      id: this.sessionId,
      started_at: this.sessionStartTime.toISOString(),
      duration: new Date().getTime() - this.sessionStartTime.getTime(),
    };
  }
  public setUser(userData: UserData): void {
    this.userData = userData;
  }
}