/**
 * Fusion CLI Adapter
 *
 * Host adapter for the Fusion orchestrator. Fusion is the AI-orchestrated
 * task board that consumes stelow as a workflow library through generated
 * artifacts (`.fusion/commands/<name>.md`, `.fusion/settings.json`,
 * `.fusion/workflows/<id>.json`, etc.). The adapter itself runs *inside*
 * the Fusion engine — the engine hosts the lifecycle, the agent lifecycle,
 * the gate reviews, and the tool dispatch. This adapter implements only
 * the methods the stelow extension needs at runtime.
 *
 * The richer integration — workflow specs, settings.json, command
 * artifacts — is generated at install/build time by
 * `scripts/generate-cli-commands.ts`, NOT at runtime. This file only
 * handles the runtime adapter contract.
 *
 * ## Tool vocabulary (per docs/design/fusion-integration-facts.md §4)
 *
 * The Fusion engine exposes these `fn_*` tools at runtime:
 *
 * | Canonical (agnostic) | Fusion-native | Notes |
 * |----------------------|---------------|-------|
 * | `ask_user_question`  | `fn_ask_question` | Chat lanes only. For workflow-step lanes, use the `===FUSION_AWAIT_INPUT===` sentinel. |
 * | `subagent`           | `fn_spawn_agent`  | Executor only. |
 * | `visual_review`      | (none)           | Fusion has NO native visual review. The adapter writes a Fusion-stamped fallback receipt at `.stelow/approvals/{dirHash}/{file}.approved.md` and returns `{ decision: "approved" }`. |
 * | `read`, `write`, `edit`, `bash`, `ls`, `grep` | identical | Both layers share these names via Fusion's Pi integration (`createFnAgent`). |
 *
 * `getAvailableTools()` returns the Fusion-native names so consumers
 * know which `fn_*` tool to invoke. `toAgnosticName(cliName)` maps
 * Fusion-native → canonical, so downstream stages can resolve tools
 * uniformly across hosts (per `stages.yaml#tools:`).
 *
 * @see docs/design/fusion-integration-facts.md for the facts that drove
 * this implementation.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { getCLICapabilities, type CLI } from "../types";
import { GenericAdapter } from "./generic";
import type { CommandRegistration, ToolDefinition } from "./cli-adapter";
import { WORKFLOW_COMMANDS } from "./commands/dispatcher";

/** Fusion uses generated plugin/workflow artifacts and generic safe fallbacks. */
export class FusionAdapter extends GenericAdapter {
  readonly name: CLI = "fusion";

  constructor() {
    super();
    this._capabilities = getCLICapabilities("fusion");
  }

  initialize(): void {
    // Fusion lifecycle is managed by its engine/plugin host. The extension
    // entrypoint (`extensions/stelow/index.ts`) does not own the lifecycle
    // here — Fusion boots the extension, and we mark ourselves initialized
    // so subsequent capability/handler queries are idempotent.
    this._initialized = true;
  }

  /**
   * Register commands for Fusion consumption. Fusion does not run code from
   * the extension process to register commands; instead it reads file-based
   * command artifacts from `.fusion/commands/`. We return the descriptors
   * here for the registry-side introspection (and for tests that exercise
   * the adapter contract); the actual deployment happens through
   * `scripts/generate-cli-commands.ts` writing to disk.
   *
   * Filters out `piOnly` commands — Fusion does not expose the Pi TUI or
   * Pi-only state hooks those commands require.
   */
  registerCommands(): CommandRegistration[] {
    return WORKFLOW_COMMANDS.filter((d) => !d.piOnly).map((descriptor) => ({
      name: descriptor.name,
      description: descriptor.description,
      handler: (_args: string) => {
        // No runtime handler — Fusion reads the file artifact and dispatches
        // through its own agent loop.
      },
    }));
  }

  /**
   * Tools exposed natively by the Fusion runtime. Returns the Fusion
   * `fn_*` tool names — NOT the agnostic canonical names — because
   * `getAvailableTools()` advertises the host-native surface that
   * downstream code can actually invoke. Mapping to canonical names
   * happens in `toAgnosticName()`.
   *
   * Notably absent:
   *   - `visual_review` — Fusion has NO native visual review tool. The
   *     adapter writes the Fusion-stamped receipt fallback directly
   *     (writes `.stelow/approvals/{dirHash}/{file}.approved.md`).
   *   - `intercom` — not a Fusion runtime tool; the equivalent is
   *     `fn_send_message` / `fn_read_messages`, which are inter-agent
   *     messaging primitives, not a public tool surface.
   */
  getAvailableTools(): ToolDefinition[] {
    return [
      { name: "fn_ask_question", description: "Fusion-native structured question (chat lanes only)" },
      { name: "fn_spawn_agent", description: "Spawn a Fusion subagent (executor only)" },
      { name: "read", description: "Read file contents" },
      { name: "write", description: "Write content to file" },
      { name: "edit", description: "Edit existing files" },
      { name: "bash", description: "Execute shell commands" },
      { name: "ls", description: "List directory contents" },
      { name: "grep", description: "Search file contents" },
    ];
  }

  /**
   * Map a Fusion-native tool name to its agnostic equivalent. The
   * canonical names are defined in `stages.yaml#tools:` (Anthropic-style
   * vocabulary: `ask_user_question`, `subagent`, `visual_review`,
   * `read`, `write`, `edit`, `bash`, `grep`, `ls`).
   *
   * Fusion-native → agnostic:
   *   fn_ask_question / ask → ask_user_question
   *   fn_spawn_agent   →  subagent
   *   read / write / edit / bash / ls / grep → identity
   *
   * `visual_review` is intentionally NOT in the mapping — Fusion does
   * not expose a native visual review tool; the adapter's `visualReview()`
   * method writes the Fusion-stamped receipt fallback directly.
   *
   * Identity fallback for any unmapped name.
   */
  toAgnosticName(cliName: string): string {
    switch (cliName) {
      case "fn_ask_question":
      case "ask":
        return "ask_user_question";
      case "fn_spawn_agent":
        return "subagent";
      default:
        return cliName;
    }
  }

  /**
   * Fusion has no native visual-review tool. Approve through the documented
   * receipt fallback, but stamp the receipt as Fusion-owned rather than
   * delegating to GenericAdapter (which would first write generic metadata).
   */
  async visualReview(
    filePath: string,
    ctx: { cwd: string; dirHash?: string },
  ): Promise<{ decision: string; feedback?: string }> {
    const timestamp = new Date().toISOString();
    const version = process.env.FUSION_VERSION?.trim()
      || process.env.STELOW_HOST_VERSION?.trim()
      || "unknown";
    const receiptDir = join(ctx.cwd, ".stelow", "approvals", ctx.dirHash ?? "default");
    const receiptPath = join(receiptDir, `${basename(filePath)}.approved.md`);
    mkdirSync(receiptDir, { recursive: true });
    writeFileSync(
      receiptPath,
      [
        "approved: true",
        `approved_at: ${timestamp}`,
        "approved_via: fusion-fallback",
        `source_file: ${filePath}`,
        "host:",
        "  name: fusion",
        `  version: ${version}`,
        `  registered_at: ${timestamp}`,
        "",
      ].join("\n"),
      "utf8",
    );
    return { decision: "approved" };
  }

  /**
   * Run a task non-interactively against the Fusion engine.
   *
   * Fusion exposes headless execution through its `fn` daemon; we shell out
   * to `fn task run` with the prompt as the argument. This is the Fusion
   * equivalent of `pi --print` for PiAdapter.
   *
   * Uses Fusion's default model lane (no model override). Times out after
   * 120s with a 10MB stdout buffer (same envelope as PiAdapter for parity).
   */
  execHeadless(task: string, cwd?: string): string {
    return execSync(`fn task run ${JSON.stringify(task)}`, {
      cwd: cwd || process.cwd(),
      encoding: "utf-8",
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
  }
}

export function createFusionAdapter(): FusionAdapter {
  return new FusionAdapter();
}
