/**
 * Base Adapter Utilities
 * 
 * Shared utilities and base class for CLI adapters.
 * Provides common functionality used across all adapter implementations.
 */

import type { CLI, CLICapabilities } from "../types";
import { getCLICapabilites } from "../state";
import type {
  CLIAdapter,
  ToolCallHandler,
  SessionStartHandler,
  TurnEndHandler,
  InputHandler,
  NotificationType,
  SelectOption,
  StatusInfo,
  CommandRegistration,
  ToolDefinition,
} from "./cli-adapter";

// ── Base Adapter Class ────────────────────────────────────────────────

/**
 * Abstract base class for CLI adapters.
 * Provides default implementations for optional features.
 * Subclasses override only the methods their CLI supports.
 *
 * @lat: [[architecture#CLI Adapter Pattern]]
 */
export abstract class BaseAdapter implements CLIAdapter {
  abstract readonly name: CLI;
  
  protected _capabilities: CLICapabilities;
  protected _handlers: {
    toolCall?: ToolCallHandler;
    sessionStart?: SessionStartHandler;
    turnEnd?: TurnEndHandler;
    input?: InputHandler;
  } = {};
  protected _initialized = false;
  protected _statusLine?: string;
  
  constructor(cli?: CLI) {
    this._capabilities = getCLICapabilites(cli);
  }
  
  get capabilities(): CLICapabilities {
    return this._capabilities;
  }
  
  // ── Lifecycle ──────────────────────────────────────────────────────
  
  initialize(): void {
    this._initialized = true;
  }
  
  dispose(): void {
    this._initialized = false;
    this._handlers = {};
    this.clearStatusLine();
  }
  
  // ── Commands ───────────────────────────────────────────────────────
  
  registerCommands(): CommandRegistration[] {
    // Default: no commands registered
    return [];
  }
  
  getCommandPrefix(): string {
    return this._capabilities.commandPrefix || "/";
  }
  
  // ── Events ─────────────────────────────────────────────────────────
  
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
    // Input handling is always supported (via parsing)
    this._handlers.input = handler;
  }
  
  // ── Event Invokers ─────────────────────────────────────────────────
  
  /**
   * Invoke tool call handler.
   * Called by the integration code when a tool is invoked.
   */
  protected _invokeToolCall(tool: string, input: unknown): void | Promise<void> {
    if (this._handlers.toolCall) {
      return this._handlers.toolCall(tool, input);
    }
  }
  
  /**
   * Invoke session start handler.
   * Called by the integration code when a session starts.
   */
  protected _invokeSessionStart(cwd: string): void | Promise<void> {
    if (this._handlers.sessionStart) {
      return this._handlers.sessionStart(cwd);
    }
  }
  
  /**
   * Invoke turn end handler.
   * Called by the integration code when a turn ends.
   */
  protected _invokeTurnEnd(ctx: { cwd: string; sessionId?: string }): void | Promise<void> {
    if (this._handlers.turnEnd) {
      return this._handlers.turnEnd(ctx);
    }
  }
  
  /**
   * Invoke input handler.
   * Called by the integration code when input is received.
   */
  protected _invokeInput(text: string, ctx: { cwd: string; sessionId?: string }): void | Promise<void> {
    if (this._handlers.input) {
      return this._handlers.input(text, ctx);
    }
  }
  
  // ── Tools ──────────────────────────────────────────────────────────
  
  getAvailableTools(): ToolDefinition[] {
    // Default: return standard tools available in all CLIs
    return [
      { name: "read", description: "Read file contents" },
      { name: "write", description: "Write content to file" },
      { name: "bash", description: "Execute shell commands" },
      { name: "edit", description: "Edit existing files" },
    ];
  }

  toAgnosticName(cliName: string): string {
    // Default: identity — assume CLI tool names ARE agnostic names.
    // Override in adapters where tool names differ from stages.yaml.
    return cliName;
  }
  
  hasCapability(capability: keyof CLICapabilities): boolean {
    const value = this._capabilities[capability];
    // Handle boolean and non-null values
    if (typeof value === "boolean") return value;
    return value !== null && value !== undefined;
  }
  
  // ── UI ──────────────────────────────────────────────────────────────
  
  showNotification(message: string, type: NotificationType = "info"): void {
    if (!this._capabilities.hasNotifications) {
      console.log(`[${type.toUpperCase()}] ${message}`);
      return;
    }
    // Override in subclass for CLI-specific implementation
    this._showNotificationImpl(message, type);
  }
  
  protected _showNotificationImpl(message: string, type: NotificationType): void {
    // Default: log to console
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
  
  async showSelectList(options: SelectOption[]): Promise<string | null> {
    if (!this._capabilities.hasSelectList) {
      // Fallback: return first option or null
      console.warn(`[${this.name}] Select list not supported, returning first option`);
      return options[0]?.value || null;
    }
    return this._showSelectListImpl(options);
  }
  
  protected _showSelectListImpl(options: SelectOption[]): Promise<string | null> {
    // Default: return first option
    return Promise.resolve(options[0]?.value || null);
  }
  
  showStatusLine(info: StatusInfo): void {
    if (!this._capabilities.hasStatusLine) {
      return;
    }
    this._statusLine = info.text;
    this._showStatusLineImpl(info);
  }
  
  protected _showStatusLineImpl(info: StatusInfo): void {
    // Default: no-op
  }
  
  clearStatusLine(): void {
    this._statusLine = undefined;
    this._clearStatusLineImpl();
  }
  
  protected _clearStatusLineImpl(): void {
    // Default: no-op
  }
}

// ── Utility Functions ────────────────────────────────────────────────

/**
 * Parse command arguments from a string.
 * Handles quoted strings and escapes special characters.
 */
export function parseCommandArgs(args: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuote = false;
  let quoteChar = "";
  
  for (let i = 0; i < args.length; i++) {
    const char = args[i];
    
    if ((char === '"' || char === "'") && !inQuote) {
      inQuote = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuote) {
      inQuote = false;
      quoteChar = "";
    } else if (char === "\\" && i + 1 < args.length) {
      current += args[++i];
    } else if (char === " " && !inQuote) {
      if (current) {
        result.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }
  
  if (current) {
    result.push(current);
  }
  
  return result;
}

/**
 * Format a notification message with ANSI colors.
 */
export function formatNotification(
  message: string,
  type: NotificationType
): string {
  const colors: Record<NotificationType, string> = {
    info: "\x1b[36m",      // cyan
    warning: "\x1b[33m",   // yellow
    error: "\x1b[31m",    // red
    success: "\x1b[32m",  // green
  };
  const reset = "\x1b[0m";
  return `${colors[type]}[${type.toUpperCase()}]${reset} ${message}`;
}

/**
 * Truncate text to fit in status line.
 */
export function truncateStatusLine(text: string, maxWidth = 80): string {
  if (text.length <= maxWidth) return text;
  return text.slice(0, maxWidth - 3) + "...";
}

/**
 * Debounce a function call.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Check if ANSI colors are supported in the terminal.
 */
export function supportsAnsiColors(): boolean {
  if (typeof process !== "undefined" && process.env) {
    // Check for common no-color environments
    if (process.env.NO_COLOR === "1") return false;
    if (process.env.TERM === "dumb") return false;
  }
  
  // Check if stdout is a TTY (not reliable in all environments)
  if (typeof process !== "undefined" && process.stdout) {
    return process.stdout.isTTY === true;
  }
  
  return false;
}

// ── Generic Adapter (Fallback) ────────────────────────────────────────

/**
 * Generic adapter with no-op implementations.
 * Used when no specific CLI is detected.
 */
export class GenericAdapter extends BaseAdapter {
  readonly name: CLI = "generic";
  
  constructor() {
    super("generic");
  }
  
  initialize(): void {
    console.log("[stelow] Initialized generic adapter (limited functionality)");
    super.initialize();
  }
  
  showNotification(message: string, type: NotificationType = "info"): void {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}
