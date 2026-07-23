/**
 * Pi CLI Adapter
 *
 * Adapter for the Pi coding agent.
 * Uses Pi's native ExtensionAPI for commands, events, and UI.
 *
 * Command behavior lives in `extensions/stelow/commands.ts`; the adapter
 * only handles registration. The legacy `handleCommand`/per-command handler
 * stubs are removed — they were dead code reachable only through
 * `registerCommands().handler`, which the real Pi path (in
 * `extensions/stelow/adapters/pi/commands.ts` → `registerCommands(pi)`)
 * never invoked. The actual command dispatch goes through the
 * `WORKFLOW_COMMANDS` registry + `HANDLER_BY_NAME` map in commands.ts.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { execSync } from "node:child_process";
import type { CLI } from "../../types";
import { BaseAdapter } from "../base";
import { registerPiHooks } from "./hooks";
import { registerPiCommands } from "./commands";
import { registerPlannotatorTool } from "./tools/plannotator";
import type {
  CommandRegistration,
  NotificationType,
  SelectOption,
  StatusInfo,
  ToolDefinition,
} from "../cli-adapter";
import { WORKFLOW_COMMANDS } from "../commands/dispatcher";

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
    if (this._initialized) return;

    registerPlannotatorTool(this._pi);
    registerPiCommands(this._pi);
    registerPiHooks(this._pi, this);
    super.initialize();
  }

  /**
   * Register commands for Pi consumption.
   *
   * The actual `pi.registerCommand()` call lives in
   * `extensions/stelow/adapters/pi/commands.ts` (via `registerCommands(pi)`
   * from `commands.ts`). This method returns the descriptor list for
   * registry-side introspection only — the Pi `registerCommands` happens
   * inside `initialize()` above, before any consumer can ask for the
   * descriptor list. Returning the descriptors here means tests and
   * downstream tooling can iterate the registered command set without
   * poking at Pi internals.
   *
   * Note: we filter out `piOnly` commands only when a non-Pi host later
   * asks for the list. For Pi itself, all commands are Pi-compatible by
   * definition, so we return the full WORKFLOW_COMMANDS array.
   */
  registerCommands(): CommandRegistration[] {
    if (!this._pi || this._commandsRegistered) return [];

    // Mark so repeat calls (from a different adapter consumer) are idempotent.
    this._commandsRegistered = true;

    return WORKFLOW_COMMANDS.map((cmd) => ({
      name: cmd.name,
      description: cmd.description,
      handler: () => {
        // No-op: real Pi commands are registered via `registerPiCommands(this._pi)`
        // which delegates to `commands.ts#registerCommands` and calls
        // `pi.registerCommand()` directly. This adapter contract only
        // returns descriptors for inspection.
      },
    }));
  }

  async visualReview(filePath: string, ctx: { cwd: string; dirHash?: string }): Promise<{ decision: string; feedback?: string }> {
    const result = execSync(`plannotator annotate ${JSON.stringify(join(ctx.cwd, filePath))} --gate --json`, { cwd: ctx.cwd, encoding: "utf8" });
    const decision = result.includes('"decision":"approved"') ? "approved" : "unknown";
    if (decision === "approved") {
      const hash = ctx.dirHash ?? "default";
      for (const root of [".stelow/approvals", ".plannotator/approvals"]) {
        const dir = join(ctx.cwd, root, hash);
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, `${basename(filePath)}.approved.md`), `approved: true\napproved_at: ${new Date().toISOString()}\napproved_via: plannotator\nsource_file: ${filePath}\n`);
      }
    }
    return { decision };
  }

  getAvailableTools(): ToolDefinition[] {
    return [
      { name: "read", description: "Read file contents" },
      { name: "write", description: "Write content to file" },
      { name: "bash", description: "Execute shell commands" },
      { name: "edit", description: "Edit existing files" },
      { name: "subagent", description: "Launch subagent for parallel tasks" },
      { name: "ask_user_question", description: "Ask user a question" },
      { name: "visual_review", description: "Run the Pi visual review implementation" },
      { name: "goal", description: "Manage goals" },
      { name: "intercom", description: "Send inter-agent messages" },
      { name: "supervise", description: "Supervise subagent execution" },
    ];
  }

  toAgnosticName(cliName: string): string {
    // Map Pi-specific tool names to agnostic names from stages.yaml.
    // Tools with matching names (read, write, bash, edit) pass through.
    switch (cliName) {
      case "ask_user_question": return "ask_user_question";
      case "plannotator":       return "visual_review";
      case "subagent":          return "subagent";
      case "goal":              return "goal";
      case "intercom":          return "intercom";
      case "supervise":         return "supervise";
      default:                  return cliName;  // identity
    }
  }

  execHeadless(task: string, cwd?: string): string {
    // Run pi in non-interactive mode with default model (user's default).
    return execSync(`pi --print ${JSON.stringify(task)}`, {
      cwd: cwd || process.cwd(),
      encoding: "utf-8",
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
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