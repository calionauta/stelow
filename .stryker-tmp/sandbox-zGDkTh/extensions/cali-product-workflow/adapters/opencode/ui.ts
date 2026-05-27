/**
 * OpenCode UI Adapter
 * 
 * UI adapter implementation for OpenCode.
 * Uses OpenCode's TUI toast system and terminal output fallback.
 */
// @ts-nocheck


import type { CLI } from "../../types";
import type { NotificationType, SelectOption, StatusInfo } from "../cli-adapter";
import {
  UIAdapter,
  formatAnsiNotification,
  formatSelectList,
  formatStatusLine,
  detectUIFallbackLevel,
  AnsiColors,
} from "../ui-adapter";

// ── OpenCode UI Adapter ──────────────────────────────────────────────

export class OpenCodeUIAdapter implements UIAdapter {
  readonly cliName: CLI = "opencode";
  
  private _fallbackLevel: "native" | "ansi" | "plain" | "silent";
  private _statusLine = "";
  
  constructor() {
    this._fallbackLevel = detectUIFallbackLevel();
  }
  
  // ── OpenCode TUI Integration ─────────────────────────────────────
  
  /**
   * Check if OpenCode TUI is available.
   * OpenCode exposes tui.toast via global context.
   */
  private hasOpenCodeTUI(): boolean {
    //  - OpenCode global
    return typeof globalThis?.tui?.toast?.show === "function";
  }
  
  /**
   * Show toast notification in OpenCode.
   */
  private showToast(message: string, type: NotificationType): void {
    if (this.hasOpenCodeTUI()) {
      //  - OpenCode global
      globalThis.tui.toast.show({
        message,
        type: type === "error" ? "error" : type === "warning" ? "warn" : "info",
        duration: 3000,
      });
    }
  }
  
  // ── Notifications ─────────────────────────────────────────────────
  
  notify(message: string, type: NotificationType = "info"): void {
    if (this._fallbackLevel === "silent") {
      // Log to file in silent mode
      console.log(`[${type.toUpperCase()}] ${message}`);
      return;
    }
    
    if (this.hasOpenCodeTUI()) {
      this.showToast(message, type);
    } else if (this._fallbackLevel === "ansi") {
      // Use ANSI formatted output
      console.log(formatAnsiNotification(message, type));
    } else {
      // Plain text fallback
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }
  
  // ── Select Lists ──────────────────────────────────────────────────
  
  async select(options: SelectOption[], title?: string): Promise<string | null> {
    if (this._fallbackLevel === "silent") {
      console.warn("[OpenCodeUI] Select list in silent mode, returning first option");
      return options[0]?.value || null;
    }
    
    if (this._fallbackLevel === "plain") {
      // Plain text select list
      console.log(formatSelectList(options, title, 80).replace(/\x1b\[[0-9;]*m/g, ""));
      return this.promptUser(options);
    }
    
    // ANSI colored select list
    console.log(formatSelectList(options, title, 80));
    return this.promptUser(options);
  }
  
  /**
   * Prompt user for selection in terminal.
   * Uses simple numbered input for cross-platform compatibility.
   */
  private async promptUser(options: SelectOption[]): Promise<string | null> {
    // Note: In actual usage, this would need to be async
    // For now, return first option as fallback
    console.warn("[OpenCodeUI] Interactive select not fully implemented, using first option");
    return options[0]?.value || null;
  }
  
  // ── Status Line ──────────────────────────────────────────────────
  
  setStatus(info: StatusInfo): void {
    this._statusLine = info.text;
    
    if (this._fallbackLevel === "silent") {
      // Silent mode: no output
      return;
    }
    
    // Use ANSI formatted status line
    const formatted = formatStatusLine(info, 100);
    console.log(formatted);
  }
  
  clearStatus(): void {
    this._statusLine = "";
    
    // Clear status line by printing empty line
    if (this._fallbackLevel !== "silent") {
      console.log("");
    }
  }
  
  // ── Fallback Detection ───────────────────────────────────────────
  
  getCapabilityLevel(): "native" | "ansi" | "plain" | "silent" {
    if (this.hasOpenCodeTUI()) return "native";
    return this._fallbackLevel;
  }
}

// ── Factory ───────────────────────────────────────────────────────────

export function createOpenCodeUIAdapter(): OpenCodeUIAdapter {
  return new OpenCodeUIAdapter();
}