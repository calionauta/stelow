// @ts-ignore - Optional peer dependency for Pi environment
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, cpSync, rmSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { WORKFLOW_DIR, TRACKING_FILE, SCHEMA_URL, PHASE_NAMES } from "./types";
import { getRetiredSkillNames } from "./sync-skills";

// Stage guard imports
import { PHASE_TO_STAGE } from "./stages-guard";
import {
  createStagesGuardFromPaths,
  hasActiveWorkflow,
  getActiveWorkflowCwd,
  isAncestorOrSame,
} from "./adapters/stages-guard";
import type { TrackingData } from "./types";
import {
  parsedInputStore,
  readTracking,
  writeTracking,
  readGlobalTracking,
  writeGlobalTracking,
  getActiveWorkflow,
  resolveProjectDir,
  parseInputForWorkflow,
  updateWorkflowIndexJson,
} from "./state";
import { updateFooter, notifyPhase } from "./ui";
import { registerCommands, executeCommand } from "./commands";
import {
  createAdapter,
  createEventDispatcher,
} from "./adapters";

// Execution loop imports
import {
  getCheckpointStore,
  getExecutionDir,
  listScopeDirs,
} from "./modules/checkpoint";
import { runVerifyCommands } from "./modules/verify-runner";
import { appendEvent } from "./modules/event-logger";

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

// ── Track last-synced phase per workflow for secondary state sync ──
// Prevents unnecessary writes to global tracking and index.json on
// turn_end when the phase hasn't changed.
const _lastSyncedPhase: Map<string, number> = new Map();

// ── Stages guard — re-reads tracking file on every tool call ──
// Bug fix: the guard previously cached state at session start and never
// re-read, so /sw-next and /sw-setphase had no effect within a session.
// Now it always re-reads the tracking file. The stages.yaml is imported once.

let guardCheckTool: ((tool: string) => import("./adapters/stages-guard").StagesGuardResult) | null = null;

/**
 * Resolve the active stage guard for a given project dir and current cwd.
 *
 * Guard is created only when ALL of the following hold:
 * - Env escape hatch `CALI_PW_GUARD !== "off"`
 * - Tracking file `stelow.json` exists
 * - Tracking file has at least one in-progress workflow
 * - Active workflow's `cwd` is ancestor (or equal) to `cwd`
 *
 * Otherwise returns null and all tools are free. This keeps the stelow
 * project itself unblocked when there is no active workflow targeting it, and
 * prevents cross-project locks.
 */
function getStageGuard(projectDir: string, cwd: string) {
  try {
    // Env escape hatch — debug / emergency unlock
    if (process.env.CALI_PW_GUARD === "off") {
      guardCheckTool = null;
      return guardCheckTool;
    }

    const stagesPath = join(projectDir, "skills", "stelow", "stages.yaml");
    const trackingPath = join(projectDir, TRACKING_FILE);

    // No tracking file → no workflow possible → no guard
    if (!existsSync(trackingPath)) {
      guardCheckTool = null;
      return guardCheckTool;
    }

    // No in-progress workflow → guard is dormant
    if (!hasActiveWorkflow(trackingPath)) {
      guardCheckTool = null;
      return guardCheckTool;
    }

    // Active workflow must target the current cwd (or ancestor of it).
    // Cross-project lock is hostile: don't enforce in dir Y because of a
    // workflow running in dir X.
    const activeCwd = getActiveWorkflowCwd(trackingPath);
    if (activeCwd && !isAncestorOrSame(activeCwd, cwd)) {
      guardCheckTool = null;
      return guardCheckTool;
    }

    // Always re-create to pick up phase changes from /sw-next /sw-setphase
    guardCheckTool = createStagesGuardFromPaths(stagesPath, trackingPath);
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
    if (!event.text.startsWith("/sw-start") &&
        !event.text.startsWith("/sw-start")) return;

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
  // retired-skills.yaml at project root (lets us clean up
  // skills that were deleted/renamed in a previous release, not just the
  // current one).
  function syncSkillsFromClone() {
    try {
      const HOME = homedir();
      const GIT_DIR = join(HOME, ".pi/agent/git/github.com/renatocaliari/stelow");
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

      // 3. Remove only skills explicitly retired in retired-skills.yaml.
      //    The project's `skills/` directory IS the source of truth for
      //    which skills belong here. We never delete skills managed by
      //    other tools (agent-sync, etc). Only skills listed in
      //    retired-skills.yaml are removed — they were intentionally
      //    deleted/renamed from the project and stale copies should go.
      const retiredNames = getRetiredSkillNames(GIT_DIR);
      if (retiredNames.size > 0 && existsSync(agentsDir)) {
        for (const entry of readdirSync(agentsDir, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          if (retiredNames.has(entry.name)) {
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

    updateFooter(ctx, wd);
  });

  // ── Tool call: stages guard + detection ───────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pi.on("tool_call", async (event: any, ctx: any) => {
    const tool = event.toolName || "";
    const input = event.input as any;
    
    // Stage guard check (blocked tools per stages.yaml)
    const checker = getStageGuard(resolveProjectDir(ctx.cwd), ctx.cwd);
    if (checker) {
      const result = checker(tool);
      if (!result.allowed) {
        const hint = `🔒 Tool '${tool}' blocked in '${result.reason || "current"}'. Use /sw-pause (keep), /sw-next (advance), /sw-archive (soft delete), /sw-abort (delete), or /sw-unlock (session only) to lift the lock.`;
        console.warn(`[StagesGuard] ${result.reason}`);
        // Surface a TUI warning so the user sees the lock + how to lift it
        ctx.ui?.notify(hint, "warning");
        // Block the tool call — Pi hooks support { block: true, reason }.
        // The reason includes the hint so the LLM can guide the user.
        return { block: true, reason: hint };
      }
    }
    // Tracking file write detection — refresh footer when LLM
    // self-advances by writing directly to stelow.json
    if (input?.path?.includes?.(TRACKING_FILE) && ctx.ui) {
      const wd = resolveProjectDir(ctx.cwd);
      const wf = getActiveWorkflow(wd);
      if (wf) updateFooter(ctx, wd);
    }
  });

  // ── Phase change detection + Gate auto-advance ✓ ───────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pi.on("turn_end", async (_event: any, ctx: any) => {
    if (!ctx.ui) return;
    const wd = resolveProjectDir(ctx.cwd);

    // Always refresh footer so tracking updates from commands are picked up
    updateFooter(ctx, wd);

    // Auto-advance from Gate/Int.Gate when Plannotator marks gates_passed
    const activeWf = getActiveWorkflow(wd);
    if (activeWf?.stage) {
      const stageName = PHASE_TO_STAGE[activeWf.currentPhase];
      const isGateStage = stageName === "gate" || stageName === "int-gate";
      if (isGateStage && activeWf.stage.gates_passed.includes(stageName)) {
        executeCommand(pi, "sw-next", "", ctx);
      }
    }

    // Check for phase changes to show notification
    const tracking = readTracking(wd);
    const wf = getActiveWorkflow(wd);
    if (!wf || !tracking) return;
    const current = tracking.workflows.find(w => w.name === wf.name);
    if (current && current.currentPhase !== wf.currentPhase) {
      const oldPhase = wf.currentPhase;
      wf.currentPhase = current.currentPhase;
      notifyPhase(ctx, wf, oldPhase);
    }

    // ── Secondary state sync ─────────────────────────────────────
    // When LLM self-advances by writing directly to stelow.json,
    // the index.json (.stelow/<date>/<hash>/index.json)
    // becomes stale. This sync brings it up-to-date on every turn_end.
    const syncWf = getActiveWorkflow(wd);
    if (syncWf?.dirHash) {
      const syncId = `${wd}:${syncWf.name}`;
      const lastPhase = _lastSyncedPhase.get(syncId);
      if (lastPhase !== syncWf.currentPhase) {
        // Sync index.json
        updateWorkflowIndexJson(wd, syncWf, {
          current_phase: PHASE_NAMES[syncWf.currentPhase]?.toLowerCase() || "setup",
          current_phase_index: syncWf.currentPhase,
          workflow_status: syncWf.currentPhase >= (PHASE_NAMES.length - 1)
            && Array.isArray(syncWf.phases)
            && syncWf.phases.every(p => p.status === "completed")
            ? "completed" : "in-progress",
        });
        _lastSyncedPhase.set(syncId, syncWf.currentPhase);
      }
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
        console.log(`[stelow] Tracking file modified by ${tool}`);
      }
    }
  });
  
  // Register a handler for turn end events via the adapter
  adapter.onTurnEnd(async ({ cwd }: { cwd: string }) => {
    // Phase change detection can be done here
    const wd = resolveProjectDir(cwd);
    const tracking = readTracking(wd);
    const wf = getActiveWorkflow(wd);
    if (!wf || !tracking) return;
    const current = tracking.workflows.find(w => w.name === wf.name);
    if (current && current.currentPhase !== wf.currentPhase) {
      // Phase changed - could dispatch notification
      console.log(`[stelow] Phase change: ${wf.currentPhase} -> ${current.currentPhase}`);
    }

    // ── Execution loop: check for scopes waiting verify ────────────
    // Only runs during Execution phase (phase 12)
    const executionPhase = PHASE_NAMES.indexOf("Execution");
    // Use the workflow's currentPhase — wf is already loaded above
    if (wf.currentPhase !== executionPhase) return;

    try {
      const execDir = getExecutionDir(wd);
      if (!existsSync(execDir)) return;

      for (const scopeId of listScopeDirs(execDir)) {
        const store = getCheckpointStore(execDir, scopeId);
        const cp = store.read();
        if (!cp || cp.status !== "waiting_verify") continue;

        console.log(`[stelow] Execution verify: ${scopeId} (iter ${cp.iteration + 1}/${cp.maxIterations})`);

        // Guard: verifyCommands must be a non-empty array
        if (!Array.isArray(cp.verifyCommands) || cp.verifyCommands.length === 0) {
          console.warn(`[stelow] Scope ${scopeId} has no verifyCommands — marking completed`);
          cp.status = "completed";
          cp.updatedAt = new Date().toISOString();
          store.write(cp);
          appendEvent(join(execDir, scopeId, "events.jsonl"), {
            ts: new Date().toISOString(),
            type: "completed",
            scopeId,
            iteration: cp.iteration,
            passed: true,
            summary: "No verify commands — auto-completed",
          });
          adapter.showNotification(`✅ Scope ${scopeId}: completed (no verify commands)`, "success");
          continue;
        }

        // Run verify commands (async with timeout)
        cp.verifyResults = await runVerifyCommands(cp.verifyCommands);
        cp.lastStep = "verify";

        const allPassed = cp.verifyResults.every(r => r.passed);
        const eventsPath = join(execDir, scopeId, "events.jsonl");

        if (allPassed) {
          // ── Completed ──────────────────────────────────────────
          cp.status = "completed";
          cp.updatedAt = new Date().toISOString();
          store.write(cp);

          appendEvent(eventsPath, {
            ts: new Date().toISOString(),
            type: "completed",
            scopeId,
            iteration: cp.iteration,
            passed: true,
            summary: "All verify commands passed",
          });

          console.log(`[stelow] ✅ Scope ${scopeId} completed`);
          adapter.showNotification(`✅ Scope ${scopeId}: verify passed. All commands OK.`, "success");

        } else if (cp.iteration >= cp.maxIterations - 1) {
          // ── Escalated (max iterations reached) ────────────────
          cp.status = "escalated";
          cp.updatedAt = new Date().toISOString();
          store.write(cp);

          appendEvent(eventsPath, {
            ts: new Date().toISOString(),
            type: "escalated",
            scopeId,
            iteration: cp.iteration,
            passed: false,
            summary: `Max iterations (${cp.maxIterations}) reached without passing verify`,
          });

          const failList = cp.verifyResults.filter(r => !r.passed).map(r => r.command).join(", ");
          console.log(`[stelow] ⚠️ Scope ${scopeId} escalated after ${cp.iteration + 1} iterations`);
          adapter.showNotification(`⚠️ Scope ${scopeId}: escalated after ${cp.iteration + 1} iterations. Failing: ${failList}`, "warning");

        } else {
          // ── Failed — advance iteration, re-delegate ────────────
          cp.iteration++;
          cp.status = "in_progress";
          cp.lastStep = "delegate";

          const failures = cp.verifyResults.filter(r => !r.passed);
          const failSummary = failures.map(f => `${f.command}: ${f.output.slice(0, 120)}`).join("; ");
          cp.feedbackLog.push(`Iteration ${cp.iteration}: verify failed — ${failSummary}`);
          cp.updatedAt = new Date().toISOString();
          store.write(cp);

          appendEvent(eventsPath, {
            ts: new Date().toISOString(),
            type: "verify",
            scopeId,
            iteration: cp.iteration,
            passed: false,
            summary: failSummary,
          });

          console.log(`[stelow] 🔄 Scope ${scopeId} iter ${cp.iteration}: verify failed, re-delegating`);
          adapter.showNotification(`🔄 Scope ${scopeId} iteration ${cp.iteration}: verify failed. Re-delegate with feedback.`, "info");
        }
      }
    } catch (err) {
      // Isolated: never let execution loop errors break the turn_end handler
      console.error("[stelow] Execution loop error:", err instanceof Error ? err.message : err);
    }
  });
}