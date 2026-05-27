/**
 * CLI Adapter Interface and Factory
 * 
 * This module defines the abstraction layer for multi-CLI support.
 * Each CLI (Pi, OpenCode, Claude Code, Codex) implements this interface
 * to provide consistent access to commands, events, tools, and UI.
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
import type { CLI, CLICapabilities } from "../types";
import { detectCLI, getCLICapabilites } from "../state";

// ── Handler Types ────────────────────────────────────────────────────

export type ToolCallHandler = (tool: string, input: unknown) => void | Promise<void>;
export type SessionStartHandler = (cwd: string) => void | Promise<void>;
export type TurnEndHandler = (ctx: {
  cwd: string;
  sessionId?: string;
}) => void | Promise<void>;
export type InputHandler = (text: string, ctx: {
  cwd: string;
  sessionId?: string;
}) => void | Promise<void>;
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
  if (stryMutAct_9fa48("229")) {
    {}
  } else {
    stryCov_9fa48("229");
    const detected = stryMutAct_9fa48("232") ? cli && detectCLI() : stryMutAct_9fa48("231") ? false : stryMutAct_9fa48("230") ? true : (stryCov_9fa48("230", "231", "232"), cli || detectCLI());
    switch (detected) {
      case stryMutAct_9fa48("234") ? "" : (stryCov_9fa48("234"), "pi"):
        if (stryMutAct_9fa48("233")) {} else {
          stryCov_9fa48("233");
          return createPiAdapter();
        }
      case stryMutAct_9fa48("236") ? "" : (stryCov_9fa48("236"), "opencode"):
        if (stryMutAct_9fa48("235")) {} else {
          stryCov_9fa48("235");
          return createOpenCodeAdapter();
        }
      case stryMutAct_9fa48("238") ? "" : (stryCov_9fa48("238"), "claude-code"):
        if (stryMutAct_9fa48("237")) {} else {
          stryCov_9fa48("237");
          return createClaudeCodeAdapter();
        }
      case stryMutAct_9fa48("240") ? "" : (stryCov_9fa48("240"), "codex"):
        if (stryMutAct_9fa48("239")) {} else {
          stryCov_9fa48("239");
          return createCodexAdapter();
        }
      default:
        if (stryMutAct_9fa48("241")) {} else {
          stryCov_9fa48("241");
          return makeGenericAdapter();
        }
    }
  }
}

/**
 * Create the Pi adapter.
 */
function createPiAdapter(): CLIAdapter {
  if (stryMutAct_9fa48("242")) {
    {}
  } else {
    stryCov_9fa48("242");
    // Lazy import to avoid circular dependencies
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      createPiAdapter: makePiAdapter
    } = require("./pi/index.ts");
    return makePiAdapter();
  }
}

/**
 * Create the OpenCode adapter.
 */
function createOpenCodeAdapter(): CLIAdapter {
  if (stryMutAct_9fa48("243")) {
    {}
  } else {
    stryCov_9fa48("243");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      createOpenCodeAdapter: makeOpenCodeAdapter
    } = require("./opencode/index.ts");
    return makeOpenCodeAdapter();
  }
}

/**
 * Create the Claude Code adapter.
 */
function createClaudeCodeAdapter(): CLIAdapter {
  if (stryMutAct_9fa48("244")) {
    {}
  } else {
    stryCov_9fa48("244");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      createClaudeCodeAdapter: makeClaudeCodeAdapter
    } = require("./claude-code/index.ts");
    return makeClaudeCodeAdapter();
  }
}

/**
 * Create the Codex adapter.
 */
function createCodexAdapter(): CLIAdapter {
  if (stryMutAct_9fa48("245")) {
    {}
  } else {
    stryCov_9fa48("245");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      createCodexAdapter: makeCodexAdapter
    } = require("./codex/index.ts");
    return makeCodexAdapter();
  }
}

/**
 * Create a generic adapter with no-op implementations.
 * Used as fallback when no specific CLI is detected.
 */
function makeGenericAdapter(): CLIAdapter {
  if (stryMutAct_9fa48("246")) {
    {}
  } else {
    stryCov_9fa48("246");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      createGenericAdapter
    } = require("./generic.ts");
    return createGenericAdapter();
  }
}

/**
 * Public factory function for generic adapter.
 * Alias for makeGenericAdapter().
 */
export function createGenericCLIAdapter(): CLIAdapter {
  if (stryMutAct_9fa48("247")) {
    {}
  } else {
    stryCov_9fa48("247");
    return makeGenericAdapter();
  }
}