/**
 * CLI Adapter Interface and Factory
 * 
 * This module defines the abstraction layer for multi-CLI support.
 * Each CLI (Pi, OpenCode, Claude Code, Codex) implements this interface
 * to provide consistent access to commands, events, tools, and UI.
 */

import type { CLI, CLICapabilities } from "../types";
import { detectCLI, getCLICapabilites } from "../state";

// ── Handler Types ────────────────────────────────────────────────────

export type ToolCallHandler = (tool: string, input: unknown) => void | Promise<void>;
export type SessionStartHandler = (cwd: string) => void | Promise<void>;
export type TurnEndHandler = (ctx: { cwd: string; sessionId?: string }) => void | Promise<void>;
export type InputHandler = (text: string, ctx: { cwd: string; sessionId?: string }) => void | Promise<void>;

export interface CommandRegistration {
  name: string;
  description?: string;
  handler: (args: string) => void | Promise<void>;
}

export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

export type NotificationType = "info" | "warning" | "error" | "success";

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
}

export interface StatusInfo {
  text: string;
  level?: "info" | "warning" | "error";
}

// ── CLI Adapter Interface ────────────────────────────────────────────

export interface CLIAdapter {
  /** CLI identifier */
  readonly name: CLI;
  
  /** Capabilities supported by this CLI */
  readonly capabilities: CLICapabilities;
  
  // ── Commands ──────────────────────────────────────────────────────
  
  /**
   * Register command handlers for this CLI.
   * Commands should be registered once per session.
   */
  registerCommands(): CommandRegistration[];
  
  /**
   * Get the command prefix for this CLI.
   * e.g., "/" for slash commands, or empty for skill-based commands.
   */
  getCommandPrefix(): string;
  
  // ── Events ───────────────────────────────────────────────────────
  
  /**
   * Register handler for tool call events.
   * @param handler - Called when a tool is invoked
   */
  onToolCall(handler: ToolCallHandler): void;
  
  /**
   * Register handler for session start events.
   * @param handler - Called when a new session begins
   */
  onSessionStart(handler: SessionStartHandler): void;
  
  /**
   * Register handler for turn end events.
   * @param handler - Called when a turn completes
   */
  onTurnEnd(handler: TurnEndHandler): void;
  
  /**
   * Register handler for input events (slash commands, etc.).
   * @param handler - Called when user input is received
   */
  onInput(handler: InputHandler): void;
  
  // ── Tools ─────────────────────────────────────────────────────────
  
  /**
   * Get all available tools for this CLI.
   */
  getAvailableTools(): ToolDefinition[];

  /**
   * Convert a CLI-specific tool name to its agnostic equivalent.
   * Agnostic tool names are defined in stages.yaml (e.g. "ask", "read",
   * "subagent"). Each adapter maps its CLI's native tool names to these.
   * Returns the input unchanged if no mapping exists (identity).
   */
  toAgnosticName(cliName: string): string;
  
  /**
   * Check if a specific capability is supported.
   */
  hasCapability(capability: keyof CLICapabilities): boolean;
  
  // ── UI ─────────────────────────────────────────────────────────────
  
  /**
   * Show a notification to the user.
   * @param message - Notification text
   * @param type - Notification type (info, warning, error, success)
   */
  showNotification(message: string, type?: NotificationType): void;
  
  /**
   * Show a select list and wait for user choice.
   * @param options - Select options
   * @returns Selected value
   */
  showSelectList(options: SelectOption[]): Promise<string | null>;
  
  /**
   * Update the status line.
   * @param info - Status information
   */
  showStatusLine(info: StatusInfo): void;
  
  /**
   * Clear the status line.
   */
  clearStatusLine(): void;
  
  // ── Lifecycle ──────────────────────────────────────────────────────
  
  /**
   * Initialize the adapter.
   * Called once when the extension loads.
   */
  initialize(): void;
  
  /**
   * Dispose of the adapter.
   * Called when the extension unloads.
   */
  dispose(): void;
}

// ── Adapter Factory ──────────────────────────────────────────────────

/**
 * Factory function to create the appropriate CLI adapter.
 * Uses detectCLI() to determine which adapter to instantiate.
 * 
 * @param cli - Optional CLI override (defaults to detected CLI)
 * @returns CLIAdapter instance
 */
export function createAdapter(cli?: CLI): CLIAdapter {
  const detected = cli || detectCLI();
  
  switch (detected) {
    case "pi":
      return createPiAdapter();
    case "opencode":
      return createOpenCodeAdapter();
    case "claude-code":
      return createClaudeCodeAdapter();
    case "codex":
      return createCodexAdapter();
    default:
      return makeGenericAdapter();
  }
}

/**
 * Create the Pi adapter.
 */
function createPiAdapter(): CLIAdapter {
  // Lazy import to avoid circular dependencies
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createPiAdapter: makePiAdapter } = require("./pi/index.ts");
  return makePiAdapter();
}

/**
 * Create the OpenCode adapter.
 */
function createOpenCodeAdapter(): CLIAdapter {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createOpenCodeAdapter: makeOpenCodeAdapter } = require("./opencode/index.ts");
  return makeOpenCodeAdapter();
}

/**
 * Create the Claude Code adapter.
 */
function createClaudeCodeAdapter(): CLIAdapter {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createClaudeCodeAdapter: makeClaudeCodeAdapter } = require("./claude-code/index.ts");
  return makeClaudeCodeAdapter();
}

/**
 * Create the Codex adapter.
 */
function createCodexAdapter(): CLIAdapter {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createCodexAdapter: makeCodexAdapter } = require("./codex/index.ts");
  return makeCodexAdapter();
}

/**
 * Create a generic adapter with no-op implementations.
 * Used as fallback when no specific CLI is detected.
 */
function makeGenericAdapter(): CLIAdapter {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createGenericAdapter } = require("./generic.ts");
  return createGenericAdapter();
}

/**
 * Public factory function for generic adapter.
 * Alias for makeGenericAdapter().
 */
export function createGenericCLIAdapter(): CLIAdapter {
  return makeGenericAdapter();
}
