// src/client/ReplayManager.ts
import * as rrweb from 'rrweb';
import { mirror } from 'rrweb';
import { EchologClient } from './client';
import { SessionManager } from './SessionManager';
import { ReplayEvent, EchologOptions, EnhancedEventMetadata, UserAction } from '../core/types';
import { generateUniqueId } from '../core/utilities/utility';
import { deflate } from 'pako';
import { EventSender } from './EventSender';

interface eventWithTime {
  type: number;
  data: any;
  timestamp: number;
  delay?: number;
}

export class ReplayManager<T extends EnhancedEventMetadata = EnhancedEventMetadata> {
  private client: EchologClient<T>;
  private sessionManager: SessionManager;
  private options: EchologOptions<T>;
  private eventSender: EventSender<T>;
  private replayEvents: eventWithTime[] = [];
  private userActions: UserAction[] = [];
  private isRecording: boolean = false;
  private stopRecordingFn?: () => void;
  private startTime?: number;
  private totalEventCount: number = 0;
  private lastFlushTime?: number;
  private flushInterval?: ReturnType<typeof setInterval>;
  private nodeMirror: typeof mirror;

  constructor(
    client: EchologClient<T>,
    sessionManager: SessionManager,
    options: EchologOptions<T>,
    eventSender: EventSender<T>
  ) {
    this.client = client;
    this.sessionManager = sessionManager;
    this.options = {
      ...options,
      trackableElements: options.trackableElements || ['button', '[data-echolog-action]', 'a', 'input[type="submit"]'],
    };
    this.eventSender = eventSender;
    this.nodeMirror = mirror;
  }

  public startRecording(): void {
    if (this.isRecording || typeof window === 'undefined') return;

    this.isRecording = true;
    this.replayEvents = [];
    this.userActions = [];
    this.startTime = Date.now();
    this.lastFlushTime = this.startTime;
    this.totalEventCount = 0;

    window.addEventListener('beforeunload', this.handleBeforeUnload);
    window.addEventListener('click', this.handleNativeClick);

    this.flushInterval = setInterval(() => this.flush(false), 10000);

    this.stopRecordingFn = rrweb.record({
      emit: (event: any, isCheckout?: boolean | { mirror: typeof mirror }) => {
        const eventWithTime = event as eventWithTime;
        this.replayEvents.push(eventWithTime);
        this.totalEventCount++;

        if (this.options.debug) {
          console.log('[Echolog] Captured event:', {
            type: eventWithTime.type,
            source: eventWithTime.data?.source,
            id: eventWithTime.data?.id,
            timestamp: eventWithTime.timestamp,
            isCheckout,
          });
        }

        if (
          (eventWithTime.type === 3 && [2, 5].includes(eventWithTime.data?.source)) ||
          eventWithTime.type === 2
        ) {
          const action = this.processClickEvent(eventWithTime);
          if (action) {
            this.userActions.push(action);
            if (this.options.debug) {
              console.log(`[Echolog] Captured user action: ${action.action} on ${action.target}`, action);
            }
          } else if (this.options.debug) {
            console.log('[Echolog] No action captured for event:', eventWithTime);
          }
        }

        const currentBatchSize = this.options.maxBatchSize || 10;
        if (this.replayEvents.length >= currentBatchSize) {
          this.flush(false);
        }
      },
      sampling: {
        mousemove: 50,
        scroll: 150,
        input: 'last',
        mouseInteraction: true,
      },
      blockClass: 'echolog-sensitive',
      ignoreClass: 'echolog-ignore',
      maskInputOptions: { password: true },
      checkoutEveryNms: 10000,
      inlineStylesheet: true,
      recordCanvas: true,
      collectFonts: true,
    });

    if (this.options.debug) {
      console.log('[Echolog] Recording started with trackable elements:', this.options.trackableElements);
      console.log('[Echolog] Node mirror initialized:', !!this.nodeMirror);
    }
  }

  private handleNativeClick = (e: MouseEvent): void => {
    try {
      // Get the target and check if it's an HTMLElement
      const target = e.target;
      if (!target || !(target instanceof HTMLElement)) return;
  
      // Now TypeScript knows 'target' is an HTMLElement
      const isTrackable = this.options.trackableElements.some((selector) => 
        target.matches(selector)
      );
      
      if (!isTrackable) return;
  
      const action: UserAction = {
        action: 'click',
        target: this.getElementDescription(target),
        timestamp: Date.now(),
        elementId: target.id || undefined,
        elementClass: target.className || undefined,
        elementRole: target.getAttribute('role') || undefined,
        metadata: {
          tagName: target.tagName.toLowerCase(),
          textContent: this.truncateText(target.textContent || '', 50),
        },
      };
  
      const customAction = target.getAttribute('data-echolog-action');
      if (customAction) {
        action.target = customAction;
        action.metadata = action.metadata || {};
        action.metadata.customAction = customAction;
      }
  
      this.userActions.push(action);
      if (this.options.debug) {
        console.log('[Echolog] Native click action captured:', action);
      }
    } catch (err) {
      if (this.options.debug) {
        console.error('[Echolog] Error processing native click:', err);
      }
    }
  };
  private processClickEvent(event: eventWithTime): UserAction | null {
    try {
      const nodeId = event.data?.id;
      if (!nodeId) {
        if (this.options.debug) {
          console.log('[Echolog] processClickEvent: No nodeId in event data', event.data);
        }
        return null;
      }

      const targetNode = this.nodeMirror.getNode(nodeId);
      if (!targetNode || !(targetNode instanceof HTMLElement)) {
        if (this.options.debug) {
          console.log('[Echolog] processClickEvent: Invalid or non-HTMLElement node', { nodeId, targetNode });
        }
        return null;
      }

      const isTrackable = this.options.trackableElements.some((selector) => {
        const matches = targetNode.matches(selector);
        if (this.options.debug && matches) {
          console.log('[Echolog] processClickEvent: Element matches selector', {
            selector,
            element: targetNode.outerHTML,
          });
        }
        return matches;
      });

      if (!isTrackable) {
        if (this.options.debug) {
          console.log('[Echolog] processClickEvent: Element not trackable', {
            element: targetNode.outerHTML,
            selectors: this.options.trackableElements,
          });
        }
        return null;
      }

      const customAction = targetNode.getAttribute('data-echolog-action');
      const action: UserAction = {
        action: 'click',
        target: this.getElementDescription(targetNode),
        timestamp: event.timestamp,
        elementId: targetNode.id || undefined,
        elementClass: targetNode.className || undefined,
        elementRole: targetNode.getAttribute('role') || undefined,
        metadata: {
          tagName: targetNode.tagName.toLowerCase(),
          textContent: this.truncateText(targetNode.textContent || '', 50),
        },
      };

      if (customAction) {
        action.target = customAction;
        action.metadata = action.metadata || {};
        action.metadata.customAction = customAction;
      }

      if (this.options.debug) {
        console.log('[Echolog] processClickEvent: Action created', action);
      }

      return action;
    } catch (err) {
      if (this.options.debug) {
        console.error('[Echolog] Error processing click event:', err, { event });
      }
      return null;
    }
  }

  private getElementDescription(element: HTMLElement): string {
    const customAction = element.getAttribute('data-echolog-action');
    if (customAction) return customAction;

    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    const text = element.textContent?.trim();
    if (text && text.length > 0) {
      return this.truncateText(text, 30);
    }

    const id = element.id;
    if (id) return `Element #${id}`;

    return element.tagName.toLowerCase();
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  public stopRecording(): void {
    if (!this.isRecording || !this.stopRecordingFn) return;

    this.stopRecordingFn();
    this.isRecording = false;

    clearInterval(this.flushInterval);
    this.flushInterval = undefined;
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('click', this.handleNativeClick);

    this.flush(true);

    this.replayEvents = [];
    this.userActions = [];
    this.stopRecordingFn = undefined;

    if (this.options.debug) {
      console.log('[Echolog] Session replay stopped, total events captured:', this.totalEventCount);
    }
  }

  public flush(isFinalFlush: boolean = false): void {
    if (this.replayEvents.length === 0 && this.userActions.length === 0) return;

    const sessionId = this.sessionManager.getSessionId();
    const now = Date.now();
    const batchDurationMs = this.lastFlushTime ? now - this.lastFlushTime : 0;
    if (!sessionId) {
      if (this.options.debug) {
        console.log('[Echolog] Flushing replay events aborted: No session ID', {
          eventCount: this.replayEvents.length,
          actionCount: this.userActions.length,
          totalEventCount: this.totalEventCount,
          isFinalFlush,
          batchDurationMs,
        });
      }
      return;
    }

    if (this.options.replaySampleRate && Math.random() > this.options.replaySampleRate) {
      const skippedCount = this.replayEvents.length;
      const skippedActions = this.userActions.length;
      this.replayEvents = [];
      this.userActions = [];
      if (this.options.debug) {
        console.log(
          `[Echolog] Replay batch skipped due to sampling (${skippedCount} events, ${skippedActions} actions)`
        );
      }
      return;
    }

    const eventsJson = JSON.stringify(this.replayEvents);
    const compressed = deflate(eventsJson);
    const compressedBase64 = btoa(String.fromCharCode(...compressed));

    const eventDurationMs =
      this.replayEvents.length > 1
        ? this.replayEvents[this.replayEvents.length - 1].timestamp - this.replayEvents[0].timestamp
        : 0;

    const event: ReplayEvent<T> = {
      id: generateUniqueId(),
      project_id: this.client['projectId'],
      session_id: sessionId,
      service_name: this.client['serviceName'],
      timestamp: new Date().toISOString(),
      events: compressedBase64,
      user_actions: this.userActions.length > 0 ? this.userActions : undefined,
      duration_ms: eventDurationMs,
      batch_duration_ms: batchDurationMs,
      is_final_batch: isFinalFlush,
      batch_index: this.lastFlushTime === this.startTime ? 0 : Math.floor((this.lastFlushTime! - this.startTime!) / 1000),
      event_count: this.replayEvents.length,
      total_event_count: this.totalEventCount,
      metadata: this.options.includeBrowserMetadata
        ? {
            userAgent: navigator.userAgent,
            platform: 'web',
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio,
          } as unknown as T
        : undefined,
      auto_replay: this.getValidAutoReplay(),
      created_at: undefined,
    };

    this.eventSender
      .sendReplays([event], `https://api.echolog.xyz/replay`)
      .then(() => {
        if (this.options.debug) {
          console.log('[Echolog] Replay event sent successfully', {
            id: event.id,
            userActions: event.user_actions,
          });
        }
      })
      .catch((error) => {
        console.error('[Echolog] Failed to send replay event:', error);
      });

    this.lastFlushTime = now;
    this.replayEvents = [];
    this.userActions = [];

    if (this.options.debug) {
      console.log('[Echolog] Flushed replay events', {
        id: event.id,
        eventCount: event.event_count,
        actionCount: event.user_actions?.length || 0,
        totalCount: this.totalEventCount,
        durationMs: eventDurationMs,
        batchDurationMs,
        isFinalBatch: isFinalFlush,
      });
    }
  }

  private handleBeforeUnload = (): void => {
    try {
      if (!this.isRecording || (this.replayEvents.length === 0 && this.userActions.length === 0)) return;

      const sessionId = this.sessionManager.getSessionId();
      if (!sessionId) return;

      const eventsJson = JSON.stringify(this.replayEvents);
      const compressed = deflate(eventsJson);
      const compressedBase64 = btoa(String.fromCharCode(...compressed));

      const eventDurationMs =
        this.replayEvents.length > 1
          ? this.replayEvents[this.replayEvents.length - 1].timestamp - this.replayEvents[0].timestamp
          : 0;

      const replay: ReplayEvent<T> = {
        id: generateUniqueId(),
        project_id: this.client['projectId'],
        session_id: sessionId,
        service_name: this.client['serviceName'],
        timestamp: new Date().toISOString(),
        events: compressedBase64,
        user_actions: this.userActions.length > 0 ? this.userActions : undefined,
        duration_ms: eventDurationMs,
        batch_duration_ms: this.lastFlushTime ? Date.now() - this.lastFlushTime : 0,
        is_final_batch: true,
        batch_index: Math.floor(((this.lastFlushTime || Date.now()) - (this.startTime || Date.now())) / 1000),
        event_count: this.replayEvents.length,
        total_event_count: this.totalEventCount,
        metadata: this.options.includeBrowserMetadata
          ? {
              userAgent: navigator.userAgent,
              platform: 'web',
              viewportWidth: window.innerWidth,
              viewportHeight: window.innerHeight,
              devicePixelRatio: window.devicePixelRatio,
            } as unknown as T
          : undefined,
        auto_replay: this.getValidAutoReplay(),
        created_at: undefined,
      };

      this.eventSender.sendReplaysSync([replay]);
    } catch (err) {
      console.error('[Echolog] Error during beforeunload replay flush:', err);
    }
  };

  public manualFlush(): void {
    if (this.isRecording && (this.replayEvents.length > 0 || this.userActions.length > 0)) {
      this.flush(false);
    }
  }

  private getValidAutoReplay(): 'onLoad' | 'onSessionStart' | null {
    return typeof this.options.autoReplay === 'string' ? this.options.autoReplay : null;
  }
}