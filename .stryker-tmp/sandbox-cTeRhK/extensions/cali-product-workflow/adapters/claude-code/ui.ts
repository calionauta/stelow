/**
 * Claude Code UI Adapter
 * 
 * UI adapter implementation for Claude Code.
 * Uses terminal output with ANSI colors, following Claude Code's
 * conventions for tool output and notifications.
 */
// @ts-nocheck


import type { CLI } from "../../types";
import type { NotificationType, SelectOption, StatusInfo } from "../cli-adapter";
import {
  formatAnsiNotification,
  formatSelectList,
  formatStatusLine,
  detectUIFallbackLevel,
  AnsiColors,
  UIAdapter,
} from "../ui-adapter";

// ── Claude Code UI Adapter ───────────────────────────────────────────

export class ClaudeCodeUIAdapter implements UIAdapter {
  readonly cliName: CLI = "claude-code";
  
  private _fallbackLevel: "native" | "ansi" | "plain" | "silent";
  private _statusLine = "";
  
  constructor() {
    this._fallbackLevel = detectUIFallbackLevel();
  }
  
  // ── Claude Code Output Conventions ───────────────────────────────
  
  /**
   * Check if Claude Code is available.
   * Claude Code has specific output conventions.
   */
  private isClaudeCode(): boolean {
    // Check for Claude Code environment indicator
    return process.env?.CLAUDE_CODE === "true" ||
           process.env?.MCP_SERVER_CLAUDE_CODE !== undefined;
  }
  
  /**
   * Format message for Claude Code tool output.
   * Claude Code uses bracket notation for tool messages.
   */
  private formatToolOutput(message: string, type: NotificationType): string {
    const prefix = type === "error" ? "ERROR" :
                  type === "warning" ? "WARN" : "INFO";
    return `[${prefix}] ${message}`;
  }
  
  // ── Notifications ─────────────────────────────────────────────────
  
  notify(message: string, type: NotificationType = "info"): void {
    if (this._fallbackLevel === "silent") {
      // In silent mode, log to stderr for debugging
      console.error(`[${type.toUpperCase()}] ${message}`);
      return;
    }
    
    if (this._fallbackLevel === "ansi") {
      // Use ANSI formatted output
      const formatted = formatAnsiNotification(message, type);
      console.log(formatted);
    } else {
      // Plain text fallback with bracket notation
      console.log(this.formatToolOutput(message, type));
    }
  }
  
  // ── Select Lists ──────────────────────────────────────────────────
  
  async select(options: SelectOption[], title?: string): Promise<string | null> {
    if (this._fallbackLevel === "silent") {
      console.warn("[ClaudeCodeUI] Select list in silent mode, returning first option");
      return options[0]?.value || null;
    }
    
    // Format select list for Claude Code
    const lines = formatSelectList(options, title, 80).split("\n");
    
    // Apply lighter formatting for Claude Code
    if (this._fallbackLevel === "plain") {
      // Strip ANSI codes for plain output
      lines.forEach(line => console.log(line.replace(/\x1b\[[0-9;]*m/g, "")));
    } else {
      // ANSI colored output
      lines.forEach(line => console.log(line));
    }
    
    // Claude Code doesn't have native select list
    // Return first option as fallback (interactive selection would require stdin)
    console.warn("[ClaudeCodeUI] Interactive select not supported, returning first option");
    return options[0]?.value || null;
  }
  
  // ── Status Line ──────────────────────────────────────────────────
  
  setStatus(info: StatusInfo): void {
    this._statusLine = info.text;
    
    if (this._fallbackLevel === "silent") {
      return;
    }
    
    // Format and output status line
    const formatted = formatStatusLine(info, 100);
    
    // Use stderr for status to not interfere with stdout responses
    console.error(formatted);
  }
  
  clearStatus(): void {
    this._statusLine = "";
    
    if (this._fallbackLevel !== "silent") {
      // Clear status by printing empty line to stderr
      console.error("");
    }
  }
  
  // ── Fallback Detection ───────────────────────────────────────────
  
  getCapabilityLevel(): "native" | "ansi" | "plain" | "silent" {
    if (this.isClaudeCode()) {
      // Claude Code supports ANSI output
      return this._fallbackLevel;
    }
    return this._fallbackLevel;
  }
}

// ── Factory ───────────────────────────────────────────────────────────

export function createClaudeCodeUIAdapter(): ClaudeCodeUIAdapter {
  return new ClaudeCodeUIAdapter();
}