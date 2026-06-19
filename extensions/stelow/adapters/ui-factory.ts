/**
 * UI Adapter Factory
 * 
 * Factory function to create the appropriate UI adapter based on CLI.
 */

import type { CLI } from "../types";
import type { SelectOption, StatusInfo } from "./cli-adapter";
import { UIAdapter } from "./ui-adapter";
import { createPiUIAdapter } from "./pi/ui";
import { createOpenCodeUIAdapter } from "./opencode/ui";
import { createClaudeCodeUIAdapter } from "./claude-code/ui";
import { createCodexUIAdapter } from "./codex/ui";

// ── Factory Function ──────────────────────────────────────────────────

/**
 * Create a UI adapter for the specified CLI.
 * @param cli - CLI identifier (defaults to "generic")
 * @returns UIAdapter instance
 */
export function createUIAdapter(cli: CLI = "generic"): UIAdapter {
  switch (cli) {
    case "pi":
      return createPiUIAdapter();
    case "opencode":
      return createOpenCodeUIAdapter();
    case "claude-code":
      return createClaudeCodeUIAdapter();
    case "codex":
      return createCodexUIAdapter();
    default:
      // Return a generic no-op adapter
      return createGenericUIAdapter();
  }
}

// ── Generic UI Adapter (Fallback) ────────────────────────────────────

/**
 * Generic UI adapter with no-op implementations.
 * Used when no specific CLI is detected.
 */
class GenericUIAdapter implements UIAdapter {
  readonly cliName: string = "generic";
  
  notify(message: string, type = "info"): void {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
  
  async select(options: SelectOption[], _title?: string): Promise<string | null> {
    console.warn("[GenericUI] Select not supported, returning first option");
    return options[0]?.value || null;
  }
  
  setStatus(_info: StatusInfo): void {
    // No-op for generic
  }
  
  clearStatus(): void {
    // No-op for generic
  }
  
  getCapabilityLevel(): "native" | "ansi" | "plain" | "silent" {
    return "plain";
  }
}

/**
 * Create a generic UI adapter (fallback).
 */
function createGenericUIAdapter(): UIAdapter {
  return new GenericUIAdapter();
}

// Re-export UIAdapter interface
export type { UIAdapter } from "./ui-adapter";
export {
  detectUIFallbackLevel,
  formatAnsiNotification,
  formatSelectList,
  formatStatusLine,
  AnsiColors,
} from "./ui-adapter";