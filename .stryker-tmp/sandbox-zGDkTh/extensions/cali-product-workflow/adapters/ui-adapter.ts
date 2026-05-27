/**
 * UI Adapter Interface
 * 
 * Abstract interface for UI operations across different CLI environments.
 * Each CLI implements this interface to provide consistent UI capabilities
 * with graceful fallback to terminal output.
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
  if (stryMutAct_9fa48("491")) {
    {}
  } else {
    stryCov_9fa48("491");
    // Check for NO_COLOR environment variable
    if (stryMutAct_9fa48("494") ? typeof process !== "undefined" || process.env?.NO_COLOR === "1" : stryMutAct_9fa48("493") ? false : stryMutAct_9fa48("492") ? true : (stryCov_9fa48("492", "493", "494"), (stryMutAct_9fa48("496") ? typeof process === "undefined" : stryMutAct_9fa48("495") ? true : (stryCov_9fa48("495", "496"), typeof process !== (stryMutAct_9fa48("497") ? "" : (stryCov_9fa48("497"), "undefined")))) && (stryMutAct_9fa48("499") ? process.env?.NO_COLOR !== "1" : stryMutAct_9fa48("498") ? true : (stryCov_9fa48("498", "499"), (stryMutAct_9fa48("500") ? process.env.NO_COLOR : (stryCov_9fa48("500"), process.env?.NO_COLOR)) === (stryMutAct_9fa48("501") ? "" : (stryCov_9fa48("501"), "1")))))) {
      if (stryMutAct_9fa48("502")) {
        {}
      } else {
        stryCov_9fa48("502");
        return stryMutAct_9fa48("503") ? "" : (stryCov_9fa48("503"), "plain");
      }
    }

    // Check for dumb terminal
    if (stryMutAct_9fa48("506") ? typeof process !== "undefined" || process.env?.TERM === "dumb" : stryMutAct_9fa48("505") ? false : stryMutAct_9fa48("504") ? true : (stryCov_9fa48("504", "505", "506"), (stryMutAct_9fa48("508") ? typeof process === "undefined" : stryMutAct_9fa48("507") ? true : (stryCov_9fa48("507", "508"), typeof process !== (stryMutAct_9fa48("509") ? "" : (stryCov_9fa48("509"), "undefined")))) && (stryMutAct_9fa48("511") ? process.env?.TERM !== "dumb" : stryMutAct_9fa48("510") ? true : (stryCov_9fa48("510", "511"), (stryMutAct_9fa48("512") ? process.env.TERM : (stryCov_9fa48("512"), process.env?.TERM)) === (stryMutAct_9fa48("513") ? "" : (stryCov_9fa48("513"), "dumb")))))) {
      if (stryMutAct_9fa48("514")) {
        {}
      } else {
        stryCov_9fa48("514");
        return stryMutAct_9fa48("515") ? "" : (stryCov_9fa48("515"), "plain");
      }
    }

    // Check if we can write to stdout
    if (stryMutAct_9fa48("518") ? typeof process !== "undefined" || process.stdout : stryMutAct_9fa48("517") ? false : stryMutAct_9fa48("516") ? true : (stryCov_9fa48("516", "517", "518"), (stryMutAct_9fa48("520") ? typeof process === "undefined" : stryMutAct_9fa48("519") ? true : (stryCov_9fa48("519", "520"), typeof process !== (stryMutAct_9fa48("521") ? "" : (stryCov_9fa48("521"), "undefined")))) && process.stdout)) {
      if (stryMutAct_9fa48("522")) {
        {}
      } else {
        stryCov_9fa48("522");
        // If stdout is a TTY, we can use ANSI
        if (stryMutAct_9fa48("524") ? false : stryMutAct_9fa48("523") ? true : (stryCov_9fa48("523", "524"), process.stdout.isTTY)) {
          if (stryMutAct_9fa48("525")) {
            {}
          } else {
            stryCov_9fa48("525");
            return stryMutAct_9fa48("526") ? "" : (stryCov_9fa48("526"), "ansi");
          }
        }
        // If stdout is not a TTY but exists, we can still use plain output
        return stryMutAct_9fa48("527") ? "" : (stryCov_9fa48("527"), "plain");
      }
    }

    // Silent fallback for environments without stdout
    return stryMutAct_9fa48("528") ? "" : (stryCov_9fa48("528"), "silent");
  }
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
  info: "\x1b[36m",
  // cyan
  success: "\x1b[32m",
  // green
  warning: "\x1b[33m",
  // yellow
  error: "\x1b[31m" // red
} as const;

/**
 * Map notification type to ANSI color.
 */
export function getNotificationColor(type: NotificationType): string {
  if (stryMutAct_9fa48("529")) {
    {}
  } else {
    stryCov_9fa48("529");
    return stryMutAct_9fa48("532") ? AnsiColors[type] && AnsiColors.info : stryMutAct_9fa48("531") ? false : stryMutAct_9fa48("530") ? true : (stryCov_9fa48("530", "531", "532"), AnsiColors[type] || AnsiColors.info);
  }
}

/**
 * Format a notification message with ANSI colors.
 */
export function formatAnsiNotification(message: string, type: NotificationType): string {
  if (stryMutAct_9fa48("533")) {
    {}
  } else {
    stryCov_9fa48("533");
    const color = getNotificationColor(type);
    return stryMutAct_9fa48("534") ? `` : (stryCov_9fa48("534"), `${color}[${stryMutAct_9fa48("535") ? type.toLowerCase() : (stryCov_9fa48("535"), type.toUpperCase())}]${AnsiColors.reset} ${message}`);
  }
}

/**
 * Get ANSI prefix for a foreground color.
 */
export function fg(color: string, text: string): string {
  if (stryMutAct_9fa48("536")) {
    {}
  } else {
    stryCov_9fa48("536");
    const ansiCode = stryMutAct_9fa48("539") ? AnsiColors[color as keyof typeof AnsiColors] && "" : stryMutAct_9fa48("538") ? false : stryMutAct_9fa48("537") ? true : (stryCov_9fa48("537", "538", "539"), AnsiColors[color as keyof typeof AnsiColors] || (stryMutAct_9fa48("540") ? "Stryker was here!" : (stryCov_9fa48("540"), "")));
    if (stryMutAct_9fa48("543") ? false : stryMutAct_9fa48("542") ? true : stryMutAct_9fa48("541") ? ansiCode : (stryCov_9fa48("541", "542", "543"), !ansiCode)) return text;
    return stryMutAct_9fa48("544") ? `` : (stryCov_9fa48("544"), `${ansiCode}${text}${AnsiColors.reset}`);
  }
}

/**
 * Truncate text to fit in a width with ellipsis.
 */
export function truncate(text: string, maxWidth: number): string {
  if (stryMutAct_9fa48("545")) {
    {}
  } else {
    stryCov_9fa48("545");
    if (stryMutAct_9fa48("549") ? text.length > maxWidth : stryMutAct_9fa48("548") ? text.length < maxWidth : stryMutAct_9fa48("547") ? false : stryMutAct_9fa48("546") ? true : (stryCov_9fa48("546", "547", "548", "549"), text.length <= maxWidth)) return text;
    return (stryMutAct_9fa48("550") ? text : (stryCov_9fa48("550"), text.slice(0, stryMutAct_9fa48("551") ? Math.min(0, maxWidth - 3) : (stryCov_9fa48("551"), Math.max(0, stryMutAct_9fa48("552") ? maxWidth + 3 : (stryCov_9fa48("552"), maxWidth - 3)))))) + (stryMutAct_9fa48("553") ? "" : (stryCov_9fa48("553"), "..."));
  }
}

// ── Select List Formatter ─────────────────────────────────────────────

/**
 * Format select options for terminal display.
 */
export function formatSelectList(options: SelectOption[], title?: string, maxWidth = 80): string {
  if (stryMutAct_9fa48("554")) {
    {}
  } else {
    stryCov_9fa48("554");
    const lines: string[] = stryMutAct_9fa48("555") ? ["Stryker was here"] : (stryCov_9fa48("555"), []);

    // Title
    if (stryMutAct_9fa48("557") ? false : stryMutAct_9fa48("556") ? true : (stryCov_9fa48("556", "557"), title)) {
      if (stryMutAct_9fa48("558")) {
        {}
      } else {
        stryCov_9fa48("558");
        lines.push(stryMutAct_9fa48("559") ? `` : (stryCov_9fa48("559"), `${AnsiColors.bold}${AnsiColors.cyan}◆ ${title}${AnsiColors.reset}`));
      }
    }

    // Options
    options.forEach((opt, i) => {
      if (stryMutAct_9fa48("560")) {
        {}
      } else {
        stryCov_9fa48("560");
        const prefix = stryMutAct_9fa48("561") ? `` : (stryCov_9fa48("561"), `${AnsiColors.dim}[${stryMutAct_9fa48("562") ? i - 1 : (stryCov_9fa48("562"), i + 1)}]${AnsiColors.reset}`);
        const label = opt.label;
        const desc = opt.description ? stryMutAct_9fa48("563") ? `` : (stryCov_9fa48("563"), ` ${AnsiColors.dim}- ${opt.description}${AnsiColors.reset}`) : stryMutAct_9fa48("564") ? "Stryker was here!" : (stryCov_9fa48("564"), "");
        const line = stryMutAct_9fa48("565") ? `` : (stryCov_9fa48("565"), `${prefix} ${label}${desc}`);
        lines.push(truncate(line, maxWidth));
      }
    });

    // Footer hint
    lines.push(stryMutAct_9fa48("566") ? `` : (stryCov_9fa48("566"), `${AnsiColors.dim}↑↓ navigate  Enter:select  Esc:cancel${AnsiColors.reset}`));
    return lines.join(stryMutAct_9fa48("567") ? "" : (stryCov_9fa48("567"), "\n"));
  }
}

// ── Status Line Formatter ─────────────────────────────────────────────

/**
 * Format status line for terminal display.
 */
export function formatStatusLine(info: StatusInfo, maxWidth = 100): string {
  if (stryMutAct_9fa48("568")) {
    {}
  } else {
    stryCov_9fa48("568");
    const text = stryMutAct_9fa48("571") ? info.text && "" : stryMutAct_9fa48("570") ? false : stryMutAct_9fa48("569") ? true : (stryCov_9fa48("569", "570", "571"), info.text || (stryMutAct_9fa48("572") ? "Stryker was here!" : (stryCov_9fa48("572"), "")));
    const prefix = (stryMutAct_9fa48("575") ? info.level !== "error" : stryMutAct_9fa48("574") ? false : stryMutAct_9fa48("573") ? true : (stryCov_9fa48("573", "574", "575"), info.level === (stryMutAct_9fa48("576") ? "" : (stryCov_9fa48("576"), "error")))) ? AnsiColors.error : (stryMutAct_9fa48("579") ? info.level !== "warning" : stryMutAct_9fa48("578") ? false : stryMutAct_9fa48("577") ? true : (stryCov_9fa48("577", "578", "579"), info.level === (stryMutAct_9fa48("580") ? "" : (stryCov_9fa48("580"), "warning")))) ? AnsiColors.warning : AnsiColors.info;
    const formatted = stryMutAct_9fa48("581") ? `` : (stryCov_9fa48("581"), `${prefix}${text}${AnsiColors.reset}`);
    return truncate(formatted, maxWidth);
  }
}