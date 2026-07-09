/**
 * CLI Adapter Interface and Factory
 *
 * This module defines the abstraction layer for harness adapter support.
 * The shipped extension targets Pi (full integration: TUI, gates, auto-sync).
 * Other harnesses can pick up the skills via the agentskills.io standard
 * (`~/.agents/skills/<name>/SKILL.md`). Anyone wanting a full adapter for a
 * new harness implements `CLIAdapter` + `UIAdapter` and adds a case here.
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
   * Execute a task non-interactively using this CLI's headless mode.
   * Runs the CLI as a subprocess with a prompt, captures stdout.
   * Used for agnostic subagent fallback and checkpoint supervision.
   * Uses the user's default model — no model override.
   * 
   * @param task - Prompt/instruction to execute
   * @param cwd - Working directory for the subprocess
   * @returns stdout from the headless execution
   */
  execHeadless(task: string, cwd?: string): string;

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
