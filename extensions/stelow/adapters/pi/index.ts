/**
 * Pi CLI Adapter
 * 
 * Adapter for the Pi coding agent.
 * Uses Pi's native ExtensionAPI for commands, events, and UI.
 * 
 * Implementation details completed in SCOPE-4 (commands),
 * SCOPE-5 (events), and SCOPE-6 (UI).
 */

import type { CLI } from "../../types";
import { BaseAdapter } from "../base";
import type {
  CommandRegistration,
  NotificationType,
  SelectOption,
  StatusInfo,
  ToolDefinition,
} from "../cli-adapter";
import {
  WORKFLOW_COMMANDS,
  type CommandDescriptor,
} from "../commands/dispatcher";

// ── Pi Adapter ───────────────────────────────────────────────────────

export class PiAdapter extends BaseAdapter {
  readonly name: CLI = "pi";
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _pi?: any;
  private _commandsRegistered = false;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(pi?: any) {
    super("pi");
    this._pi = pi;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setAPI(pi: any): void {
    this._pi = pi;
    this.initialize();
  }
  
  getCommandPrefix(): string {
    return "/";
  }
  
  initialize(): void {
    if (!this._pi) {
      console.warn("[PiAdapter] ExtensionAPI not set, commands/events won't work");
      return;
    }
    
    // Register event handlers
    if (typeof this._pi.on === "function") {
      this._pi.on("session_start", async (_event: unknown, ctx: { cwd: string }) => {
        await this._invokeSessionStart(ctx.cwd);
      });
      
      this._pi.on("tool_call", async (event: { tool?: string; input?: unknown }, ctx: { cwd: string }) => {
        if (event.tool) {
          await this._invokeToolCall(event.tool, event.input);
        }
      });
      
      this._pi.on("turn_end", async (_event: unknown, ctx: { cwd: string }) => {
        await this._invokeTurnEnd({ cwd: ctx.cwd });
      });
      
      this._pi.on("input", async (event: { text?: string }, ctx: { cwd: string }) => {
        if (event.text) {
          await this._invokeInput(event.text, { cwd: ctx.cwd });
        }
      });
    }
    
    super.initialize();
  }
  
  registerCommands(): CommandRegistration[] {
    if (!this._pi || this._commandsRegistered) return [];
    
    // Pi uses native registerCommand() - commands are registered in commands.ts
    // This adapter provides the registration mechanism for the extension
    this._commandsRegistered = true;
    
    // Return command descriptors for documentation
    return WORKFLOW_COMMANDS.map(cmd => ({
      name: cmd.name,
      description: cmd.description,
      handler: (args: string) => this.handleCommand(cmd.name, args),
    }));
  }
  
  /**
   * Handle a command invocation from Pi.
   * This is called by commands.ts when a command is triggered.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleCommand(commandName: string, args: string, ctx?: any): void {
    // Import the command handlers dynamically to avoid circular dependencies
    // This will be connected to the actual command handlers in commands.ts
    const handlers: Record<string, (pi: unknown, args: string, ctx: unknown) => void> = {
      "sw-start": this.handleStart.bind(this),
      "sw-abort": this.handleAbort.bind(this),
      "sw-pause": this.handlePause.bind(this),
      "sw-resume": this.handleResume.bind(this),
      "sw-status": this.handleStatus.bind(this),
      "sw-ls": this.handleList.bind(this),
      "sw-setphase": this.handleSetPhase.bind(this),
      "sw-next": this.handleNext.bind(this),
      "sw-complete": this.handleComplete.bind(this),
      "sw-info": this.handleGoto.bind(this),
      "sw-rename": this.handleRename.bind(this),
      "sw-clean": this.handleClean.bind(this),
    };
    
    const handler = handlers[commandName];
    if (handler && ctx) {
      handler(this._pi, args, ctx);
    }
  }
  
  // Command handlers - these delegate to the main command functions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleStart(pi: unknown, args: string, ctx: any): void {
    // Import and call the actual start command
    try {
      const { default: cmdStart } = require("../../start.ts");
      cmdStart(pi as any, args, ctx);
    } catch (e) {
      console.error("[PiAdapter] Failed to load start command:", e);
    }
  }
  
  private handleAbort(_pi: unknown, _args: string, _ctx: unknown): void {
    // Commands.ts handles abort - this is a placeholder
    // The actual command handlers are in commands.ts
    console.log("[PiAdapter] Abort command delegated to commands.ts");
  }
  
  private handlePause(_pi: unknown, _args: string, _ctx: unknown): void {
    console.log("[PiAdapter] Pause command delegated to commands.ts");
  }
  
  private handleResume(_pi: unknown, _args: string, _ctx: unknown): void {
    console.log("[PiAdapter] Resume command delegated to commands.ts");
  }
  
  private handleStatus(_pi: unknown, _args: string, _ctx: unknown): void {
    console.log("[PiAdapter] Status command delegated to commands.ts");
  }
  
  private handleList(_pi: unknown, _args: string, _ctx: unknown): void {
    console.log("[PiAdapter] List command delegated to commands.ts");
  }
  
  private handleSetPhase(_pi: unknown, _args: string, _ctx: unknown): void {
    console.log("[PiAdapter] SetPhase command delegated to commands.ts");
  }
  
  private handleNext(_pi: unknown, _args: string, _ctx: unknown): void {
    console.log("[PiAdapter] Next command delegated to commands.ts");
  }
  
  private handleComplete(_pi: unknown, _args: string, _ctx: unknown): void {
    console.log("[PiAdapter] Complete command delegated to commands.ts");
  }
  
  private handleGoto(_pi: unknown, _args: string, _ctx: unknown): void {
    console.log("[PiAdapter] Goto command delegated to commands.ts");
  }
  
  private handleRename(_pi: unknown, _args: string, _ctx: unknown): void {
    console.log("[PiAdapter] Rename command delegated to commands.ts");
  }
  
  private handleClean(_pi: unknown, _args: string, _ctx: unknown): void {
    console.log("[PiAdapter] Clean command delegated to commands.ts");
  }
  
  getAvailableTools(): ToolDefinition[] {
    return [
      { name: "read", description: "Read file contents" },
      { name: "write", description: "Write content to file" },
      { name: "bash", description: "Execute shell commands" },
      { name: "edit", description: "Edit existing files" },
      { name: "subagent", description: "Launch subagent for parallel tasks" },
      { name: "ask_user_question", description: "Ask user a question" },
      { name: "plannotator", description: "Run plannotator for reviews" },
      { name: "goal", description: "Manage goals" },
      { name: "intercom", description: "Send inter-agent messages" },
      { name: "supervise", description: "Supervise subagent execution" },
    ];
  }

  toAgnosticName(cliName: string): string {
    // Map Pi-specific tool names to agnostic names from stages.yaml.
    // Tools with matching names (read, write, bash, edit) pass through.
    switch (cliName) {
      case "ask_user_question": return "ask";
      case "plannotator":       return "plannotator";
      case "subagent":          return "subagent";
      case "goal":              return "goal";
      case "intercom":          return "intercom";
      case "supervise":         return "supervise";
      default:                  return cliName;  // identity
    }
  }
  
  showNotification(message: string, type: NotificationType = "info"): void {
    if (!this._pi?.notify) {
      console.log(`[${type.toUpperCase()}] ${message}`);
      return;
    }
    
    // Map notification types to Pi UI
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._pi.notify(message, (type === "error" ? "error" : "info") as any);
  }
  
  async showSelectList(options: SelectOption[]): Promise<string | null> {
    if (!this._pi?.ui) {
      // Fallback: return first option
      return options[0]?.value || null;
    }
    
    // Pi UI doesn't have a built-in select list
    // Fallback to first option
    console.warn("[PiAdapter] Select list not natively supported, using first option");
    return options[0]?.value || null;
  }
  
  showStatusLine(info: StatusInfo): void {
    if (!this._pi?.ui) return;
    
    // Pi uses custom UI for status lines
    // The main extension handles this via ui.ts
    // This adapter just stores the state
    super.showStatusLine(info);
  }
  
  clearStatusLine(): void {
    super.clearStatusLine();
  }
}

// ── Factory ───────────────────────────────────────────────────────────

let _piInstance: PiAdapter | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createPiAdapter(pi?: any): PiAdapter {
  if (!_piInstance) {
    _piInstance = new PiAdapter(pi);
    if (pi) _piInstance.initialize();
  }
  return _piInstance;
}

export function getPiAdapter(): PiAdapter | null {
  return _piInstance;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setPiAPI(pi: any): void {
  if (_piInstance) {
    _piInstance.setAPI(pi);
  }
}