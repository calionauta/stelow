/**
 * Event Dispatcher
 * 
 * Central dispatcher that routes events to CLI-specific handlers.
 * Uses the adapter pattern to support multiple CLIs.
 */
// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import type { CLIAdapter } from "./cli-adapter";

/**
 * Event types that can be dispatched.
 */
export type EventType = "session_start" | "tool_call" | "turn_end" | "input" | "agent_end" | "pre_compact";

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
    if (stryMutAct_9fa48("418")) {
      {}
    } else {
      stryCov_9fa48("418");
      this._adapter = adapter;
      this._registerAdapterHandlers();
    }
  }

  /**
   * Register adapter's handlers for events.
   * This wires the adapter to the dispatcher.
   */
  private _registerAdapterHandlers(): void {
    if (stryMutAct_9fa48("419")) {
      {}
    } else {
      stryCov_9fa48("419");
      // Tool call events
      this._adapter.onToolCall((tool: string, input: unknown) => {
        if (stryMutAct_9fa48("420")) {
          {}
        } else {
          stryCov_9fa48("420");
          this._emit(stryMutAct_9fa48("421") ? "" : (stryCov_9fa48("421"), "tool_call"), stryMutAct_9fa48("422") ? {} : (stryCov_9fa48("422"), {
            tool,
            input
          }));
        }
      });

      // Session start events
      this._adapter.onSessionStart((cwd: string) => {
        if (stryMutAct_9fa48("423")) {
          {}
        } else {
          stryCov_9fa48("423");
          this._emit(stryMutAct_9fa48("424") ? "" : (stryCov_9fa48("424"), "session_start"), stryMutAct_9fa48("425") ? {} : (stryCov_9fa48("425"), {
            cwd
          }));
        }
      });

      // Turn end events
      this._adapter.onTurnEnd((ctx: {
        cwd: string;
        sessionId?: string;
      }) => {
        if (stryMutAct_9fa48("426")) {
          {}
        } else {
          stryCov_9fa48("426");
          this._emit(stryMutAct_9fa48("427") ? "" : (stryCov_9fa48("427"), "turn_end"), ctx);
        }
      });

      // Input events
      this._adapter.onInput((text: string, ctx: {
        cwd: string;
        sessionId?: string;
      }) => {
        if (stryMutAct_9fa48("428")) {
          {}
        } else {
          stryCov_9fa48("428");
          this._emit(stryMutAct_9fa48("429") ? "" : (stryCov_9fa48("429"), "input"), stryMutAct_9fa48("430") ? {} : (stryCov_9fa48("430"), {
            text,
            ...ctx
          }));
        }
      });
    }
  }

  /**
   * Subscribe to an event type.
   * @param type - Event type to subscribe to
   * @param handler - Callback function
   * @returns Unsubscribe function
   */
  on(type: EventType, handler: (...args: unknown[]) => void): () => void {
    if (stryMutAct_9fa48("431")) {
      {}
    } else {
      stryCov_9fa48("431");
      if (stryMutAct_9fa48("434") ? false : stryMutAct_9fa48("433") ? true : stryMutAct_9fa48("432") ? this._listeners.has(type) : (stryCov_9fa48("432", "433", "434"), !this._listeners.has(type))) {
        if (stryMutAct_9fa48("435")) {
          {}
        } else {
          stryCov_9fa48("435");
          this._listeners.set(type, new Set());
        }
      }
      this._listeners.get(type)!.add(handler);

      // Return unsubscribe function
      return () => {
        if (stryMutAct_9fa48("436")) {
          {}
        } else {
          stryCov_9fa48("436");
          stryMutAct_9fa48("437") ? this._listeners.get(type).delete(handler) : (stryCov_9fa48("437"), this._listeners.get(type)?.delete(handler));
        }
      };
    }
  }

  /**
   * Emit an event to all listeners.
   * @param type - Event type
   * @param data - Event data
   */
  private _emit(type: EventType, data: unknown): void {
    if (stryMutAct_9fa48("438")) {
      {}
    } else {
      stryCov_9fa48("438");
      const listeners = this._listeners.get(type);
      if (stryMutAct_9fa48("440") ? false : stryMutAct_9fa48("439") ? true : (stryCov_9fa48("439", "440"), listeners)) {
        if (stryMutAct_9fa48("441")) {
          {}
        } else {
          stryCov_9fa48("441");
          for (const listener of listeners) {
            if (stryMutAct_9fa48("442")) {
              {}
            } else {
              stryCov_9fa48("442");
              try {
                if (stryMutAct_9fa48("443")) {
                  {}
                } else {
                  stryCov_9fa48("443");
                  listener(data);
                }
              } catch (err) {
                if (stryMutAct_9fa48("444")) {
                  {}
                } else {
                  stryCov_9fa48("444");
                  console.error(stryMutAct_9fa48("445") ? `` : (stryCov_9fa48("445"), `[EventDispatcher] Error in ${type} handler:`), err);
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * Dispatch a session_start event.
   */
  dispatchSessionStart(cwd: string, sessionId?: string): void {
    if (stryMutAct_9fa48("446")) {
      {}
    } else {
      stryCov_9fa48("446");
      this._emit(stryMutAct_9fa48("447") ? "" : (stryCov_9fa48("447"), "session_start"), stryMutAct_9fa48("448") ? {} : (stryCov_9fa48("448"), {
        cwd,
        sessionId
      }));
    }
  }

  /**
   * Dispatch a tool_call event.
   */
  dispatchToolCall(tool: string, input: unknown, cwd: string): void {
    if (stryMutAct_9fa48("449")) {
      {}
    } else {
      stryCov_9fa48("449");
      this._emit(stryMutAct_9fa48("450") ? "" : (stryCov_9fa48("450"), "tool_call"), stryMutAct_9fa48("451") ? {} : (stryCov_9fa48("451"), {
        tool,
        input,
        cwd
      }));
    }
  }

  /**
   * Dispatch a turn_end event.
   */
  dispatchTurnEnd(cwd: string, sessionId?: string): void {
    if (stryMutAct_9fa48("452")) {
      {}
    } else {
      stryCov_9fa48("452");
      this._emit(stryMutAct_9fa48("453") ? "" : (stryCov_9fa48("453"), "turn_end"), stryMutAct_9fa48("454") ? {} : (stryCov_9fa48("454"), {
        cwd,
        sessionId
      }));
    }
  }

  /**
   * Dispatch an input event.
   */
  dispatchInput(text: string, cwd: string, sessionId?: string): void {
    if (stryMutAct_9fa48("455")) {
      {}
    } else {
      stryCov_9fa48("455");
      this._emit(stryMutAct_9fa48("456") ? "" : (stryCov_9fa48("456"), "input"), stryMutAct_9fa48("457") ? {} : (stryCov_9fa48("457"), {
        text,
        cwd,
        sessionId
      }));
    }
  }

  /**
   * Dispatch an agent_end event.
   */
  dispatchAgentEnd(cwd: string, sessionId?: string): void {
    if (stryMutAct_9fa48("458")) {
      {}
    } else {
      stryCov_9fa48("458");
      this._emit(stryMutAct_9fa48("459") ? "" : (stryCov_9fa48("459"), "agent_end"), stryMutAct_9fa48("460") ? {} : (stryCov_9fa48("460"), {
        cwd,
        sessionId
      }));
    }
  }

  /**
   * Get the adapter this dispatcher uses.
   */
  get adapter(): CLIAdapter {
    if (stryMutAct_9fa48("461")) {
      {}
    } else {
      stryCov_9fa48("461");
      return this._adapter;
    }
  }

  /**
   * Dispose of the dispatcher.
   */
  dispose(): void {
    if (stryMutAct_9fa48("462")) {
      {}
    } else {
      stryCov_9fa48("462");
      this._listeners.clear();
    }
  }
}

/**
 * Create an event dispatcher for a CLI adapter.
 * 
 * @param adapter - CLI adapter instance
 * @returns EventDispatcher instance
 */
export function createEventDispatcher(adapter: CLIAdapter): EventDispatcher {
  if (stryMutAct_9fa48("463")) {
    {}
  } else {
    stryCov_9fa48("463");
    return new EventDispatcher(adapter);
  }
}