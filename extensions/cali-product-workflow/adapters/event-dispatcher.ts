/**
 * Event Dispatcher
 * 
 * Central dispatcher that routes events to CLI-specific handlers.
 * Uses the adapter pattern to support multiple CLIs.
 */

import type { CLIAdapter } from "./cli-adapter";

/**
 * Event types that can be dispatched.
 */
export type EventType = 
  | "session_start"
  | "tool_call"
  | "turn_end"
  | "input"
  | "agent_end"
  | "pre_compact";

/**
 * Event data for session_start.
 */
export interface SessionStartEvent {
  cwd: string;
  sessionId?: string;
}

/**
 * Event data for tool_call.
 */
export interface ToolCallEvent {
  tool: string;
  input?: unknown;
  cwd: string;
}

/**
 * Event data for turn_end.
 */
export interface TurnEndEvent {
  cwd: string;
  sessionId?: string;
}

/**
 * Event data for input.
 */
export interface InputEvent {
  text: string;
  cwd: string;
  sessionId?: string;
}

/**
 * Event data for agent_end.
 */
export interface AgentEndEvent {
  cwd: string;
  sessionId?: string;
}

/**
 * Unified event dispatcher for all CLI adapters.
 * Provides a consistent interface for dispatching events.
 */
export class EventDispatcher {
  private _adapter: CLIAdapter;
  private _listeners: Map<EventType, Set<(...args: unknown[]) => void>> = new Map();
  
  constructor(adapter: CLIAdapter) {
    this._adapter = adapter;
    this._registerAdapterHandlers();
  }
  
  /**
   * Register adapter's handlers for events.
   * This wires the adapter to the dispatcher.
   */
  private _registerAdapterHandlers(): void {
    // Tool call events
    this._adapter.onToolCall((tool: string, input: unknown) => {
      this._emit("tool_call", { tool, input });
    });
    
    // Session start events
    this._adapter.onSessionStart((cwd: string) => {
      this._emit("session_start", { cwd });
    });
    
    // Turn end events
    this._adapter.onTurnEnd((ctx: { cwd: string; sessionId?: string }) => {
      this._emit("turn_end", ctx);
    });
    
    // Input events
    this._adapter.onInput((text: string, ctx: { cwd: string; sessionId?: string }) => {
      this._emit("input", { text, ...ctx });
    });
  }
  
  /**
   * Subscribe to an event type.
   * @param type - Event type to subscribe to
   * @param handler - Callback function
   * @returns Unsubscribe function
   */
  on(type: EventType, handler: (...args: unknown[]) => void): () => void {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, new Set());
    }
    this._listeners.get(type)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      this._listeners.get(type)?.delete(handler);
    };
  }
  
  /**
   * Emit an event to all listeners.
   * @param type - Event type
   * @param data - Event data
   */
  private _emit(type: EventType, data: unknown): void {
    const listeners = this._listeners.get(type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data);
        } catch (err) {
          console.error(`[EventDispatcher] Error in ${type} handler:`, err);
        }
      }
    }
  }
  
  /**
   * Dispatch a session_start event.
   */
  dispatchSessionStart(cwd: string, sessionId?: string): void {
    this._emit("session_start", { cwd, sessionId });
  }
  
  /**
   * Dispatch a tool_call event.
   */
  dispatchToolCall(tool: string, input: unknown, cwd: string): void {
    this._emit("tool_call", { tool, input, cwd });
  }
  
  /**
   * Dispatch a turn_end event.
   */
  dispatchTurnEnd(cwd: string, sessionId?: string): void {
    this._emit("turn_end", { cwd, sessionId });
  }
  
  /**
   * Dispatch an input event.
   */
  dispatchInput(text: string, cwd: string, sessionId?: string): void {
    this._emit("input", { text, cwd, sessionId });
  }
  
  /**
   * Dispatch an agent_end event.
   */
  dispatchAgentEnd(cwd: string, sessionId?: string): void {
    this._emit("agent_end", { cwd, sessionId });
  }
  
  /**
   * Get the adapter this dispatcher uses.
   */
  get adapter(): CLIAdapter {
    return this._adapter;
  }
  
  /**
   * Dispose of the dispatcher.
   */
  dispose(): void {
    this._listeners.clear();
  }
}

/**
 * Create an event dispatcher for a CLI adapter.
 * 
 * @param adapter - CLI adapter instance
 * @returns EventDispatcher instance
 */
export function createEventDispatcher(adapter: CLIAdapter): EventDispatcher {
  return new EventDispatcher(adapter);
}