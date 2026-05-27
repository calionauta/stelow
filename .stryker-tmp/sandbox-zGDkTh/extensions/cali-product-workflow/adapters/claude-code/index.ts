/**
 * Claude Code CLI Adapter
 * 
 * Adapter for Claude Code.
 * Uses Claude Code's hooks.json and skills/ directory for commands and events.
 * 
 * Events implemented:
 * - session.created: Creates workflow directory and tracking file
 * - tool_use: Monitors tool calls
 * - message_create: Parses @refs and command input
 * - post_tool: Phase change detection after tool execution
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

// ── Claude Code Adapter ──────────────────────────────────────────────

export class ClaudeCodeAdapter extends BaseAdapter {
  readonly name: CLI = "claude-code";
  
  private _eventDispatcher?: EventDispatcher;
  private _cwd: string = process.cwd();
  private _sessionId?: string;
  
  constructor() {
    super("claude-code");
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
  
  /**
   * Set the session ID.
   */
  setSessionId(sessionId: string): void {
    this._sessionId = sessionId;
  }

  /**
   * Set the API reference and ensure initialization.
   * Mirrors PiAdapter behavior for consistency.
   */
  setAPI(api: unknown): void {
    this.initialize();
  }

  initialize(): void {
    if (this._initialized) return;
    
    console.log("[ClaudeCodeAdapter] Initializing Claude Code adapter");
    
    // Claude Code uses hooks.json to define event handlers:
    // - session.created: When a new session starts
    // - tool_use: When a tool is invoked
    // - message_create: When a message is created (user or assistant)
    // - post_tool: After a tool completes
    // - pre_close: Before session closes
    //
    // The hooks.json file in the plugin directory would reference
    // handlers in the plugin code.
    
    this._registerClaudeCodeEventHandlers();
    this._initialized = true;
    super.initialize();
  }
  
  /**
   * Register Claude Code-specific event handlers.
   */
  private _registerClaudeCodeEventHandlers(): void {
    console.log("[ClaudeCodeAdapter] Event handlers registered (via hooks.json)");
  }
  
  /**
   * Handle session created event (called by Claude Code's hook system).
   */
  handleSessionCreated(sessionId: string, cwd: string): void {
    this._sessionId = sessionId;
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
   * Handle tool use event (called by Claude Code's hook system).
   */
  handleToolUse(toolName: string, input: unknown, sessionId: string): void {
    const wd = resolveProjectDir(this._cwd);
    
    // Track tool calls that modify tracking file
    if (input && typeof input === "object" && "path" in input) {
      const inp = input as { path?: string };
      if (inp.path?.includes(TRACKING_FILE)) {
        // Workflow tracking handled by the unconditional dispatch below
      }
    }
    
    // Invoke registered tool call handler
    this._invokeToolCall(toolName, input);
    
    // Also dispatch through event dispatcher
    this._eventDispatcher?.dispatchToolCall(toolName, input, this._cwd);
  }
  
  /**
   * Handle message create event (called by Claude Code's hook system).
   */
  handleMessageCreate(message: { role: string; content: string }, sessionId: string): void {
    if (message.role !== "user") return;
    
    const text = typeof message.content === "string" 
      ? message.content 
      : String(message.content);
    
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
   * Handle post tool event (called by Claude Code's hook system).
   * Used for phase change detection after tool execution.
   */
  handlePostTool(toolName: string, result: unknown, sessionId: string): void {
    // Invoke registered turn end handler (post tool = turn ended)
    this._invokeTurnEnd({ cwd: this._cwd, sessionId });
    
    // Also dispatch through event dispatcher
    this._eventDispatcher?.dispatchTurnEnd(this._cwd, sessionId);
  }
  
  /**
   * Handle pre close event (called by Claude Code's hook system).
   */
  handlePreClose(): void {
    // Dispatch final turn end event
    const wd = resolveProjectDir(this._cwd);
    this._invokeTurnEnd({ cwd: wd, sessionId: this._sessionId });
    
    console.log("[ClaudeCodeAdapter] Pre-close handler fired");
  }
  
  registerCommands(): CommandRegistration[] {
    // Claude Code uses skills in skills/ directory
    // Skills are markdown files with frontmatter:
    // ---
    // name: pw-start
    // description: Start product workflow
    // ---
    // /pw-start {args}
    return [
      // Commands registered via skills/ directory
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
    ];
  }
  
  showNotification(message: string, type: NotificationType = "info"): void {
    // Claude Code has basic notification support
    // For now, log to console
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // TODO: Implement Claude Code-specific notification via console or MCP
  }
  
  async showSelectList(options: SelectOption[]): Promise<string | null> {
    // Claude Code doesn't have native select list
    console.warn("[ClaudeCodeAdapter] Select list not supported, returning first option");
    return options[0]?.value || null;
  }
  
  showStatusLine(info: StatusInfo): void {
    // Claude Code doesn't have built-in status line
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

export function createClaudeCodeAdapter(): ClaudeCodeAdapter {
  const adapter = new ClaudeCodeAdapter();
  adapter.initialize();
  return adapter;
}