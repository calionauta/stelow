/**
 * UI Adapter Interface
 * 
 * Abstract interface for UI operations across different CLI environments.
 * Each CLI implements this interface to provide consistent UI capabilities
 * with graceful fallback to terminal output.
 */

import type { NotificationType, SelectOption, StatusInfo } from "./cli-adapter";

// ── UI Adapter Interface ──────────────────────────────────────────────

/**
 * UI Adapter interface for cross-CLI UI operations.
 * Provides notifications, select lists, and status lines with fallbacks.
 */
export interface UIAdapter {
  /** CLI name for logging purposes */
  readonly cliName: string;
  
  // ── Notifications ─────────────────────────────────────────────────
  
  /**
   * Show a notification to the user.
   * @param message - Notification text
   * @param type - Notification type (info, warning, error, success)
   */
  notify(message: string, type?: NotificationType): void;
  
  // ── Select Lists ──────────────────────────────────────────────────
  
  /**
   * Show a select list and return the selected value.
   * @param options - Array of select options
   * @param title - Optional title for the select list
   * @returns Selected value or null if cancelled
   */
  select(options: SelectOption[], title?: string): Promise<string | null>;
  
  // ── Status Line ──────────────────────────────────────────────────
  
  /**
   * Update the status line.
   * @param info - Status information
   */
  setStatus(info: StatusInfo): void;
  
  /**
   * Clear the status line.
   */
  clearStatus(): void;
  
  // ── Fallback Detection ────────────────────────────────────────────
  
  /**
   * Get the UI capability level for this environment.
   * Used to determine fallback behavior.
   */
  getCapabilityLevel(): "native" | "ansi" | "plain" | "silent";
}

// ── Fallback Detection ────────────────────────────────────────────────

export type UIFallbackLevel = "native" | "ansi" | "plain" | "silent";

/**
 * Detect the UI fallback level based on environment.
 * Higher levels are preferred (native > ansi > plain > silent).
 */
export function detectUIFallbackLevel(): UIFallbackLevel {
  // Check for NO_COLOR environment variable
  if (typeof process !== "undefined" && process.env?.NO_COLOR === "1") {
    return "plain";
  }
  
  // Check for dumb terminal
  if (typeof process !== "undefined" && process.env?.TERM === "dumb") {
    return "plain";
  }
  
  // Check if we can write to stdout
  if (typeof process !== "undefined" && process.stdout) {
    // If stdout is a TTY, we can use ANSI
    if (process.stdout.isTTY) {
      return "ansi";
    }
    // If stdout is not a TTY but exists, we can still use plain output
    return "plain";
  }
  
  // Silent fallback for environments without stdout
  return "silent";
}

// ── ANSI Color Utilities ─────────────────────────────────────────────

/**
 * ANSI color codes for terminal output.
 */
export const AnsiColors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  
  // Foreground colors
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  
  // Bright foreground colors
  brightBlack: "\x1b[90m",
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
  brightWhite: "\x1b[97m",
  
  // Notification type colors
  info: "\x1b[36m",     // cyan
  success: "\x1b[32m",  // green
  warning: "\x1b[33m",  // yellow
  error: "\x1b[31m",   // red
} as const;

/**
 * Map notification type to ANSI color.
 */
function getNotificationColor(type: NotificationType): string {
  return AnsiColors[type] || AnsiColors.info;
}

/**
 * Format a notification message with ANSI colors.
 */
export function formatAnsiNotification(
  message: string,
  type: NotificationType
): string {
  const color = getNotificationColor(type);
  return `${color}[${type.toUpperCase()}]${AnsiColors.reset} ${message}`;
}

/**
 * Truncate text to fit in a width with ellipsis.
 */
function truncate(text: string, maxWidth: number): string {
  if (text.length <= maxWidth) return text;
  return text.slice(0, Math.max(0, maxWidth - 3)) + "...";
}

// ── Select List Formatter ─────────────────────────────────────────────

/**
 * Format select options for terminal display.
 */
export function formatSelectList(
  options: SelectOption[],
  title?: string,
  maxWidth = 80
): string {
  const lines: string[] = [];
  
  // Title
  if (title) {
    lines.push(`${AnsiColors.bold}${AnsiColors.cyan}◆ ${title}${AnsiColors.reset}`);
  }
  
  // Options
  options.forEach((opt, i) => {
    const prefix = `${AnsiColors.dim}[${i + 1}]${AnsiColors.reset}`;
    const label = opt.label;
    const desc = opt.description ? ` ${AnsiColors.dim}- ${opt.description}${AnsiColors.reset}` : "";
    const line = `${prefix} ${label}${desc}`;
    lines.push(truncate(line, maxWidth));
  });
  
  // Footer hint
  lines.push(`${AnsiColors.dim}↑↓ navigate  Enter:select  Esc:cancel${AnsiColors.reset}`);
  
  return lines.join("\n");
}

// ── Status Line Formatter ─────────────────────────────────────────────

/**
 * Format status line for terminal display.
 */
export function formatStatusLine(info: StatusInfo, maxWidth = 100): string {
  const text = info.text || "";
  const prefix = info.level === "error" ? AnsiColors.error :
                 info.level === "warning" ? AnsiColors.warning :
                 AnsiColors.info;
  
  const formatted = `${prefix}${text}${AnsiColors.reset}`;
  return truncate(formatted, maxWidth);
}