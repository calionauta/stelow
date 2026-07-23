/**
 * Generic CLI Adapter
 * 
 * Fallback adapter for unknown or generic CLI environments.
 * Provides basic functionality with no CLI-specific integrations.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { CLI } from "../types";
import { BaseAdapter } from "./base";
import type { EventDispatcher } from "./event-dispatcher";
import type { CommandRegistration, ToolDefinition } from "./cli-adapter";

export class GenericAdapter extends BaseAdapter {
  readonly name: CLI = "generic";
  
  private _eventDispatcher?: EventDispatcher;
  
  constructor() {
    super("generic");
  }
  
  /**
   * Set an event dispatcher for this adapter.
   */
  setEventDispatcher(dispatcher: EventDispatcher): void {
    this._eventDispatcher = dispatcher;
  }

  /**
   * Set the API reference and ensure initialization.
   * Mirrors PiAdapter behavior for consistency.
   */
  setAPI(api: unknown): void {
    this.initialize();
  }

  initialize(): void {
    console.log("[stelow] Initialized generic adapter (limited functionality)");
    super.initialize();
  }
  
  registerCommands(): CommandRegistration[] {
    // Generic adapter doesn't register commands by default
    // Subclasses should override if they support command registration
    return [];
  }
  
  getAvailableTools(): ToolDefinition[] {
    // Basic tools available in all environments
    return [
      { name: "read", description: "Read file contents" },
      { name: "write", description: "Write content to file" },
      { name: "bash", description: "Execute shell commands" },
      { name: "edit", description: "Edit existing files" },
    ];
  }
  
  async visualReview(filePath: string, ctx: { cwd: string; dirHash?: string }): Promise<{ decision: string; feedback?: string }> {
    const dirHash = ctx.dirHash ?? "default";
    const receiptDir = join(ctx.cwd, ".stelow", "approvals", dirHash);
    mkdirSync(receiptDir, { recursive: true });
    writeFileSync(join(receiptDir, `${basename(filePath)}.approved.md`),
      `approved: true\napproved_at: ${new Date().toISOString()}\napproved_via: generic-fallback\nsource_file: ${filePath}\n`);
    return { decision: "approved" };
  }

  showNotification(message: string, type: "info" | "warning" | "error" | "success" = "info"): void {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

// Factory function for lazy loading
export function createGenericAdapter(): GenericAdapter {
  return new GenericAdapter();
}