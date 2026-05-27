/**
 * OpenCode CLI Adapter
 * 
 * Adapter for OpenCode.
 * Uses OpenCode's plugin hooks for commands, events, and UI.
 * 
 * Events implemented:
 * - session.created: Creates workflow directory and tracking file
 * - session.tool_called: Monitors tool calls
 * - session.turn_ended: Phase change detection
 * - user.message: Parses @refs and command input
 * - pre_compact: Cleanup before context compaction
 */
// @ts-nocheck


import type { CLI } from "../../types";
import { BaseAdapter } from "../base";
import type {
  CommandRegistration,
  NotificationType,
  SelectOption,
  StatusInfo,
  ToolDefinition,
  ToolCallHandler,
  SessionStartHandler,
  TurnEndHandler,
  InputHandler,
} from "../cli-adapter";
import type { EventDispatcher } from "../event-dispatcher";
import {
  parsedInputStore,
  readTracking,
  readGlobalTracking,
  getActiveWorkflow,
  resolveProjectDir,
  parseInputForWorkflow,
} from "../../state";
import {
  WORKFLOW_DIR,
  TRACKING_FILE,
  SCHEMA_URL,
} from "../../types";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ── OpenCode Adapter ─────────────────────────────────────────────────

export class OpenCodeAdapter extends BaseAdapter {
  readonly name: CLI = "opencode";
  
  private _eventDispatcher?: EventDispatcher;
  private _cwd: string = process.cwd();
  
  constructor() {
    super("opencode");
  }
  
  /**
   * Set an event dispatcher for this adapter.
   * Used by the main extension to receive events.
   */
  setEventDispatcher(dispatcher: EventDispatcher): void {
    this._eventDispatcher = dispatcher;
  }
  
  /**
   * Set the current working directory.
   * OpenCode may not provide cwd in all hooks.
   */
  setCwd(cwd: string): void {
    this._cwd = cwd;
  }
  
  /**
   * Get the current working directory.
   */
  getCwd(): string {
    return this._cwd;
  }
  
  initialize(): void {
    if (this._initialized) return;
    
    console.log("[OpenCodeAdapter] Initializing OpenCode adapter");
    
    // OpenCode uses plugin hooks:
    // - session.created: When a new session starts
    // - session.started: When session fully initialized
    // - session.tool_called: When a tool is invoked
    // - session.turn_ended: When a turn completes
    // - user.message: When user sends a message
    // - pre_compact: Before context compaction
    // - agent_end: When agent finishes
    //
    // These are typically configured in opencode.json or via plugin API.
    // For now, we set up the handlers that would be called by the plugin system.
    
    this._registerOpenCodeEventHandlers();
    this._initialized = true;
    super.initialize();
  }
  
  /**
   * Register OpenCode-specific event handlers.
   * These would be called by OpenCode's plugin system.
   */
  private _registerOpenCodeEventHandlers(): void {
    // Note: In OpenCode, event handlers are typically registered via
    // the plugin's hooks configuration. The adapter sets up the
    // internal handler system that responds to those hooks.
    
    // For now, we support manual dispatch via the event dispatcher
    // and the CLI-specific event methods.
    
    console.log("[OpenCodeAdapter] Event handlers registered (via plugin hooks)");
  }
  
  /**
   * Handle session created event (called by OpenCode's plugin system).
   */
  handleSessionCreated(sessionId: string, cwd: string): void {
    this._cwd = cwd;
    const wd = resolveProjectDir(cwd);
    
    // Scaffold workflow directory and tracking file
    mkdirSync(join(wd, WORKFLOW_DIR), { recursive: true });
    const trackingPath = join(wd, TRACKING_FILE);
    if (!existsSync(trackingPath)) {
      writeFileSync(trackingPath, JSON.stringify({
        $schema: SCHEMA_URL,
        version: "1.0",
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        workflows: []
      }, null, 2));
    }
    
    // Invoke registered session start handler
    this._invokeSessionStart(wd);
    
    // Also dispatch through event dispatcher if available
    this._eventDispatcher?.dispatchSessionStart(wd, sessionId);
  }
  
  /**
   * Handle tool called event (called by OpenCode's plugin system).
   */
  handleToolCalled(tool: string, input: unknown, sessionId: string): void {
    const wd = resolveProjectDir(this._cwd);
    
    // Track tool calls that modify tracking file
    if (input && typeof input === "object" && "path" in input) {
      const inp = input as { path?: string };
      if (inp.path?.includes(TRACKING_FILE)) {
        // Workflow tracking handled by the unconditional dispatch below
      }
    }
    
    // Invoke registered tool call handler
    this._invokeToolCall(tool, input);
    
    // Also dispatch through event dispatcher
    this._eventDispatcher?.dispatchToolCall(tool, input, this._cwd);
  }
  
  /**
   * Handle turn ended event (called by OpenCode's plugin system).
   */
  handleTurnEnded(sessionId: string): void {
    // Invoke registered turn end handler
    this._invokeTurnEnd({ cwd: this._cwd, sessionId });
    
    // Also dispatch through event dispatcher
    this._eventDispatcher?.dispatchTurnEnd(this._cwd, sessionId);
  }
  
  /**
   * Handle user message event (called by OpenCode's plugin system).
   */
  handleUserMessage(text: string, sessionId: string): void {
    // Parse @refs and command input
    if (text.startsWith("/pw-start") ||
        text.startsWith("/pw-start")) {
      const parsed = parseInputForWorkflow(text);
      if (parsed.sources.length > 0 || parsed.draftText) {
        parsedInputStore.set(sessionId, parsed);
      }
    }
    
    // Invoke registered input handler
    this._invokeInput(text, { cwd: this._cwd, sessionId });
    
    // Also dispatch through event dispatcher
    this._eventDispatcher?.dispatchInput(text, this._cwd, sessionId);
  }
  
  /**
   * Handle pre-compact event (called by OpenCode's plugin system).
   */
  handlePreCompact(): void {
    // Dispatch pre-compact event
    const wd = resolveProjectDir(this._cwd);
    this._invokeTurnEnd({ cwd: wd });
    
    console.log("[OpenCodeAdapter] Pre-compact handler fired");
  }
  
  registerCommands(): CommandRegistration[] {
    // OpenCode supports slash commands via plugin hooks
    // Commands are registered via the skills/ directory in the plugin
    return [
      // Commands would be implemented as OpenCode skills
    ];
  }
  
  getAvailableTools(): ToolDefinition[] {
    return [
      { name: "read", description: "Read file contents" },
      { name: "write", description: "Write content to file" },
      { name: "bash", description: "Execute shell commands" },
      { name: "edit", description: "Edit existing files" },
      { name: "subagent", description: "Launch subagent for parallel tasks" },
      { name: "Grep", description: "Search file contents" },
      { name: "Glob", description: "Find files by pattern" },
      { name: "WebSearch", description: "Search the web" },
    ];
  }
  
  showNotification(message: string, type: NotificationType = "info"): void {
    // OpenCode has tui.toast.show() for notifications
    // For now, log to console
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // TODO: Implement OpenCode-specific notification:
    // if (this._opencode?.tui?.toast) {
    //   this._opencode.tui.toast.show({ message, type });
    // }
  }
  
  async showSelectList(options: SelectOption[]): Promise<string | null> {
    // OpenCode doesn't have native select list
    console.warn("[OpenCodeAdapter] Select list not supported, returning first option");
    return options[0]?.value || null;
  }
  
  showStatusLine(info: StatusInfo): void {
    // OpenCode doesn't have built-in status line
    super.showStatusLine(info);
  }
  
  clearStatusLine(): void {
    super.clearStatusLine();
  }
  
  // ── Override BaseAdapter event setters ─────────────────────────────
  
  onToolCall(handler: ToolCallHandler): void {
    if (!this._capabilities.hasToolCall) {
      console.warn(`[${this.name}] Tool call events not supported`);
      return;
    }
    this._handlers.toolCall = handler;
  }
  
  onSessionStart(handler: SessionStartHandler): void {
    if (!this._capabilities.hasSessionStart) {
      console.warn(`[${this.name}] Session start events not supported`);
      return;
    }
    this._handlers.sessionStart = handler;
  }
  
  onTurnEnd(handler: TurnEndHandler): void {
    if (!this._capabilities.hasTurnEnd) {
      console.warn(`[${this.name}] Turn end events not supported`);
      return;
    }
    this._handlers.turnEnd = handler;
  }
  
  onInput(handler: InputHandler): void {
    this._handlers.input = handler;
  }
}

// ── Factory ───────────────────────────────────────────────────────────

export function createOpenCodeAdapter(): OpenCodeAdapter {
  const adapter = new OpenCodeAdapter();
  adapter.initialize();
  return adapter;
}