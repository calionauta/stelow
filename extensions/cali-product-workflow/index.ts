// @ts-ignore - Optional peer dependency for Pi environment
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, cpSync, rmSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { WORKFLOW_DIR, TRACKING_FILE, SCHEMA_URL, STAGE } from "./types";
import { getRetiredSkillNames } from "./sync-skills";

// Stage guard imports
import { createStagesGuardFromPaths } from "./adapters/stages-guard";
import type { TrackingData } from "./types";
import {
  parsedInputStore,
  readTracking,
  writeTracking,
  readGlobalTracking,
  getActiveWorkflow,
  resolveProjectDir,
  parseInputForWorkflow,
} from "./state";
import { updateFooter, notifyPhase, setBypassed, isBypassed } from "./ui";
import { registerCommands } from "./commands";
import {
  createAdapter,
  createEventDispatcher,
} from "./adapters";

// ── Re-export CLI Adapter for external use ─────────────────────────

export {
  createAdapter,
  createGenericCLIAdapter,
  EventDispatcher,
  createEventDispatcher,
} from "./adapters";

export type {
  CLIAdapter,
  CommandRegistration,
  ToolCallHandler,
  SessionStartHandler,
  TurnEndHandler,
  InputHandler,
  ToolDefinition,
  NotificationType,
  SelectOption,
  StatusInfo,
  EventType,
  SessionStartEvent,
  ToolCallEvent,
  TurnEndEvent,
  InputEvent,
  AgentEndEvent,
} from "./adapters";

const registered = new Set<string>();

// ── Stages guard — re-reads current-stage.json on every tool call ──
// Bug fix: the guard previously cached state at session start and never
// re-read, so /pw-next and /pw-setphase had no effect within a session.
// Now it always re-reads the state file. The stages.yaml is imported once.

let guardCheckTool: ((tool: string) => import("./adapters/stages-guard").StagesGuardResult) | null = null;

function getStageGuard(projectDir: string) {
  try {
    const stagesPath = join(projectDir, "skills", "cali-product-workflow", "stages.yaml");
    const statePath = join(projectDir, ".cali-product-workflow", "state", "current-stage.json");
    // Always re-create to pick up phase changes from /pw-next /pw-setphase
    guardCheckTool = createStagesGuardFromPaths(stagesPath, statePath);
  } catch {
    guardCheckTool = null;
  }
  return guardCheckTool;
}

export default function (pi: ExtensionAPI) {

  // ── Create adapter for this CLI ──────────────────────────────────
  // The adapter handles CLI-specific event routing
  // For Pi, we use the PiAdapter which wires directly to pi.on()
  const adapter = createAdapter("pi");
  
  // Pi-specific: set the ExtensionAPI on the adapter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (adapter as any).setAPI?.(pi);
  
  // ── Event Dispatcher for cross-CLI event routing ──────────────────
  // The dispatcher provides a unified interface for event subscription
  // and dispatches events to registered handlers
  const dispatcher = createEventDispatcher(adapter);
  
  // If the adapter supports it, set the event dispatcher
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (adapter as any).setEventDispatcher?.(dispatcher);

  // ── Parse input for @refs ✓ ──────────────────────────────────────
  // Note: Input handling is now done in the adapter
  // Keep this for backward compatibility and direct pi.on() usage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pi.on("input", async (event: any, ctx: any) => {
    if (!event.text.startsWith("/pw-start") &&
        !event.text.startsWith("/pw-start")) return;

    const sessionId = ctx.sessionId || "default";
    const parsed = parseInputForWorkflow(event.text);
    if (parsed.sources.length > 0 || parsed.draftText) {
      parsedInputStore.set(sessionId, parsed);
    }
  });

  // ── Auto-sync skills from git clone → ~/.agents/skills/ ──────────
  // Optimized: tracks git HEAD hash in a marker file. Skips if nothing changed
  // (<15ms overhead). Full sync (rm -rf + cp -r for all skills) only when
  // git HEAD changed (~110ms).
  //
  // Syncs ALL installed skills on change, not just new ones — handles renamed,
  // modified, and deleted files. Also removes orphaned skills that no longer
  // exist in the project — and skills listed as retired in
  // skills/cali-product-workflow/retired-skills.yaml (lets us clean up
  // skills that were deleted/renamed in a previous release, not just the
  // current one).
  function syncSkillsFromClone() {
    try {
      const HOME = homedir();
      const GIT_DIR = join(HOME, ".pi/agent/git/github.com/renatocaliari/cali-product-workflow");
      const MARKER = join(HOME, ".agents/skills/.cali-skill-sync-hash");

      // Fast path: compare git HEAD hash
      const currentHash = execSync(
        "git rev-parse HEAD",
        { cwd: GIT_DIR, encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }
      ).trim();
      if (!currentHash) return 0;
      const lastHash = existsSync(MARKER)
        ? readFileSync(MARKER, "utf8").trim()
        : "";
      if (currentHash === lastHash) return 0;

      const cloneSkillsDir = join(GIT_DIR, "skills");
      if (!existsSync(cloneSkillsDir)) return 0;

      const agentsDir = join(HOME, ".agents/skills");
      mkdirSync(agentsDir, { recursive: true });

      const knownPrefixes = ["cali-product-", "cali-ops-", "cali-coding-", "cali-questions-"];

      // 1. Collect project skills (directories with SKILL.md)
      const projectSkills = new Set<string>();
      for (const entry of readdirSync(cloneSkillsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const skillDir = join(cloneSkillsDir, entry.name);
        if (existsSync(join(skillDir, "SKILL.md"))) {
          projectSkills.add(entry.name);
        }
      }

      if (projectSkills.size === 0) return 0;

      // 2. Sync each project skill (rm -rf + cp -r = exact mirror)
      for (const skill of projectSkills) {
        rmSync(join(agentsDir, skill), { recursive: true, force: true });
        cpSync(join(cloneSkillsDir, skill), join(agentsDir, skill), { recursive: true });
      }

      // 3. Remove orphaned/retired skills from ~/.agents/skills/.
      //    Removes skills that match a managed prefix AND that are
      //    not active (not in projectSkills). Skills listed in
      //    retired-skills.yaml are also removed — they are explicitly
      //    retired, even if they somehow appear as active (the YAML
      //    overrides the active check).
      const retiredNames = getRetiredSkillNames(cloneSkillsDir);
      if (existsSync(agentsDir)) {
        for (const entry of readdirSync(agentsDir, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          const isOurs = knownPrefixes.some(p => entry.name.startsWith(p));
          const isActive = projectSkills.has(entry.name);
          const isRetired = retiredNames.has(entry.name);
          if (isOurs && (!isActive || isRetired)) {
            rmSync(join(agentsDir, entry.name), { recursive: true, force: true });
          }
        }
      }

      // 4. Write marker hash
      writeFileSync(MARKER, currentHash);

      return projectSkills.size;
    } catch {
      return 0;
    }
  }

  // ── Session start ✓ ──────────────────────────────────────────────
  // Now uses adapter pattern for abstraction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pi.on("session_start", async (_event: any, ctx: any) => {
    const wd = resolveProjectDir(ctx.cwd);
    // Skill sync from git clone (silent, best-effort)
    const synced = syncSkillsFromClone();
    if (synced > 0 && ctx.ui) {
      ctx.ui.notify(`🔄 ${synced} skill(s) synced from git`, "info");
    }
    // Scaffold
    mkdirSync(join(wd, WORKFLOW_DIR), { recursive: true });
    const trackingPath = join(wd, TRACKING_FILE);
    if (!existsSync(trackingPath)) {
      writeFileSync(trackingPath, JSON.stringify({
        $schema: SCHEMA_URL, version: "1.0",
        created: new Date().toISOString(), updated: new Date().toISOString(),
        workflows: []
      }, null, 2));
    }

    if (!registered.has("cmds")) {
      registerCommands(pi);
      registered.add("cmds");
    }

    if (!ctx.ui) return;

    // Restore active workflow UI
    updateFooter(ctx, wd);
    const wf = getActiveWorkflow(wd);
    if (wf) {
      ctx.ui.notify(`◆ ${wf.name} (${wf.currentPhase + 1}/${wf.phases.length})`, "info");
      return;
    }

    // Check global tracking for project workflows
    const gt = readGlobalTracking();
    if (!gt) return;
    const projectWf = gt.workflows.find(
      w => w.cwd === wd && w.status !== "completed"
    );
    if (!projectWf) return;

    const tracking = readTracking(wd);
    if (tracking && !tracking.workflows.some(w => w.name === projectWf.name)) {
      tracking.workflows.push(projectWf);
      writeTracking(wd, tracking);
    }
    updateFooter(ctx, wd);
    ctx.ui.notify(`◆ ${projectWf.name} (${projectWf.currentPhase + 1}/${projectWf.phases.length})`, "info");
  });

  // ── Tool call: stages guard + detection ───────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pi.on("tool_call", async (event: any, ctx: any) => {
    const tool = event.toolName || "";
    const input = event.input as any;
    
    // Stage guard check (blocked tools per stages.yaml)
    const checker = getStageGuard(resolveProjectDir(ctx.cwd));
    if (checker) {
      const result = checker(tool);
      if (!result.allowed) {
        console.warn(`[StagesGuard] ${result.reason}`);
        // Block the tool call — Pi hooks support { block: true, reason }
        return { block: true, reason: result.reason || `Tool '${tool}' blocked in current stage` };
      }
    }
    // Detect implementation tools during early phases (before Selection)
    const isImplTool = ["write", "edit", "bash"].includes(tool);
    if (isImplTool && ctx.ui) {
      const wd = resolveProjectDir(ctx.cwd);
      const wf = getActiveWorkflow(wd);
      if (wf && wf.currentPhase < STAGE.SELECTION()) {
        setBypassed(true);
        updateFooter(ctx, wd);
      }
    }
    
    // Tracking file write detection
    if (input?.path?.includes?.(TRACKING_FILE) && ctx.ui) {
      const wd = resolveProjectDir(ctx.cwd);
      const wf = getActiveWorkflow(wd);
      if (wf) updateFooter(ctx, wd);
    }
  });

  // ── Phase change detection ✓ ─────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pi.on("turn_end", async (_event: any, ctx: any) => {
    if (!ctx.ui) return;
    const wd = resolveProjectDir(ctx.cwd);

    // Clear bypass flag if agent advanced phase via /pw-next
    if (isBypassed()) {
      const wf = getActiveWorkflow(wd);
      if (wf && wf.currentPhase >= STAGE.SELECTION()) setBypassed(false);
    }

    // Always refresh footer so tracking updates from commands are picked up
    updateFooter(ctx, wd);

    // Also check for phase changes to show notification
    const tracking = readTracking(wd);
    const wf = getActiveWorkflow(wd);
    if (!wf || !tracking) return;
    const current = tracking.workflows.find(w => w.name === wf.name);
    if (current && current.currentPhase !== wf.currentPhase) {
      const oldPhase = wf.currentPhase;
      wf.currentPhase = current.currentPhase;
      notifyPhase(ctx, wf, oldPhase);
    }
  });

  // ── UI update on agent end ✓ ─────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pi.on("agent_end", async (_event: any, ctx: any) => {
    if (!ctx.ui) return;
    const wd = resolveProjectDir(ctx.cwd);
    const wf = getActiveWorkflow(wd);
    if (wf) updateFooter(ctx, wd);
  });
  
  // ── Also register adapter-based event handlers ──────────────────
  // These provide a unified interface for all CLIs
  // The adapter's handlers are invoked via the dispatcher
  
  // Example: Register a handler for tool call events via the adapter
  adapter.onToolCall((tool: string, input: unknown) => {
    // Track tool calls that modify tracking file
    if (input && typeof input === "object" && "path" in input) {
      const inp = input as { path?: string };
      if (inp.path?.includes(TRACKING_FILE)) {
        console.log(`[cali-product-workflow] Tracking file modified by ${tool}`);
      }
    }
  });
  
  // Register a handler for turn end events via the adapter
  adapter.onTurnEnd(({ cwd }: { cwd: string }) => {
    // Phase change detection can be done here
    const wd = resolveProjectDir(cwd);
    const tracking = readTracking(wd);
    const wf = getActiveWorkflow(wd);
    if (!wf || !tracking) return;
    const current = tracking.workflows.find(w => w.name === wf.name);
    if (current && current.currentPhase !== wf.currentPhase) {
      // Phase changed - could dispatch notification
      console.log(`[cali-product-workflow] Phase change: ${wf.currentPhase} -> ${current.currentPhase}`);
    }
  });
}