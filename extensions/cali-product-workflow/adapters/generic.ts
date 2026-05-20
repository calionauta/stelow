/**
 * Generic CLI Adapter
 * 
 * Fallback adapter for unknown or generic CLI environments.
 * Provides basic functionality with no CLI-specific integrations.
 */

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
  
  initialize(): void {
    console.log("[cali-product-workflow] Initialized generic adapter (limited functionality)");
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
  
  showNotification(message: string, type: "info" | "warning" | "error" | "success" = "info"): void {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

// Factory function for lazy loading
export function createGenericAdapter(): GenericAdapter {
  return new GenericAdapter();
}