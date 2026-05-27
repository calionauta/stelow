/**
 * Codex UI Adapter
 * 
 * UI adapter implementation for Codex.
 * Uses terminal output with plain text fallbacks.
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

// ── Codex UI Adapter ─────────────────────────────────────────────────

export class CodexUIAdapter implements UIAdapter {
  readonly cliName: CLI = "codex";
  
  private _fallbackLevel: "native" | "ansi" | "plain" | "silent";
  private _statusLine = "";
  
  constructor() {
    this._fallbackLevel = detectUIFallbackLevel();
  }
  
  // ── Codex Output Conventions ──────────────────────────────────────
  
  /**
   * Check if Codex is available.
   */
  private isCodex(): boolean {
    return process.env?.CODEX === "true" ||
           process.env?.CODEX_API_KEY !== undefined;
  }
  
  /**
   * Format message for Codex.
   * Codex uses simple text output.
   */
  private formatMessage(message: string, type: NotificationType): string {
    return `[PW] ${type === "error" ? "ERROR: " : type === "warning" ? "WARN: " : ""}${message}`;
  }
  
  // ── Notifications ─────────────────────────────────────────────────
  
  notify(message: string, type: NotificationType = "info"): void {
    if (this._fallbackLevel === "silent") {
      console.error(this.formatMessage(message, type));
      return;
    }
    
    if (this._fallbackLevel === "ansi") {
      const formatted = formatAnsiNotification(message, type);
      console.log(`[PW] ${formatted}`);
    } else {
      // Plain text with [PW] prefix
      console.log(this.formatMessage(message, type));
    }
  }
  
  // ── Select Lists ──────────────────────────────────────────────────
  
  async select(options: SelectOption[], title?: string): Promise<string | null> {
    if (this._fallbackLevel === "silent") {
      console.warn("[PW] Select list in silent mode, returning first option");
      return options[0]?.value || null;
    }
    
    // Format select list for Codex
    const lines = formatSelectList(options, title, 80).split("\n");
    
    // Strip ANSI codes for cleaner Codex output
    lines.forEach(line => {
      const clean = line.replace(/\x1b\[[0-9;]*m/g, "");
      console.log(`[PW] ${clean}`);
    });
    
    // Return first option as fallback
    console.warn("[PW] Interactive select not supported, returning first option");
    return options[0]?.value || null;
  }
  
  // ── Status Line ──────────────────────────────────────────────────
  
  setStatus(info: StatusInfo): void {
    this._statusLine = info.text;
    
    if (this._fallbackLevel === "silent") {
      return;
    }
    
    // Format status line with [PW] prefix
    const text = info.text || "";
    const prefix = info.level === "error" ? AnsiColors.error :
                   info.level === "warning" ? AnsiColors.warning :
                   AnsiColors.dim;
    
    console.log(`[PW] ${prefix}${text}${AnsiColors.reset}`);
  }
  
  clearStatus(): void {
    this._statusLine = "";
    
    if (this._fallbackLevel !== "silent") {
      console.log("[PW]");
    }
  }
  
  // ── Fallback Detection ────────────────────────────────────────────
  
  getCapabilityLevel(): "native" | "ansi" | "plain" | "silent" {
    if (this.isCodex()) {
      return this._fallbackLevel;
    }
    return "plain";
  }
}

// ── Factory ───────────────────────────────────────────────────────────

export function createCodexUIAdapter(): CodexUIAdapter {
  return new CodexUIAdapter();
}