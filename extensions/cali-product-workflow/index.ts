import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { WORKFLOW_DIR, TRACKING_FILE, SCHEMA_URL } from "./types";
import type { TrackingData } from "./types";
import {
  parsedInputStore, readTracking, writeTracking,
  readGlobalTracking, getActiveWorkflow,
  parseInputForWorkflow
} from "./state";
import { updateFooter, notifyPhase } from "./ui";
import { registerCommands } from "./commands";

const registered = new Set<string>();

export default function (pi: ExtensionAPI) {

  // ── Parse input for @refs ✓ ──────────────────────────────────────
  pi.on("input", async (event, ctx) => {
    if (!event.text.startsWith("/product-workflow-start") &&
        !event.text.startsWith("/pw:start")) return;

    const sessionId = ctx.sessionId || "default";
    const parsed = parseInputForWorkflow(event.text);
    if (parsed.sources.length > 0 || parsed.draftText) {
      parsedInputStore.set(sessionId, parsed);
    }
  });

  // ── Session start ✓ ──────────────────────────────────────────────
  pi.on("session_start", async (_event, ctx) => {
    // Scaffold
    mkdirSync(join(ctx.cwd, WORKFLOW_DIR), { recursive: true });
    const trackingPath = join(ctx.cwd, TRACKING_FILE);
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
    updateFooter(ctx, ctx.cwd);
    const wf = getActiveWorkflow(ctx.cwd);
    if (wf) {
      ctx.ui.notify(`◆ ${wf.name} (${wf.currentPhase + 1}/${wf.phases.length})`, "info");
      return;
    }

    // Check global tracking for project workflows
    const gt = readGlobalTracking();
    if (!gt) return;
    const projectWf = gt.workflows.find(
      w => w.cwd === ctx.cwd && w.status !== "completed"
    );
    if (!projectWf) return;

    const tracking = readTracking(ctx.cwd);
    if (tracking && !tracking.workflows.some(w => w.name === projectWf.name)) {
      tracking.workflows.push(projectWf);
      writeTracking(ctx.cwd, tracking);
    }
    updateFooter(ctx, ctx.cwd);
    ctx.ui.notify(`◆ ${projectWf.name} (${projectWf.currentPhase + 1}/${projectWf.phases.length})`, "info");
  });

  // ── Tracking file writes ✓ ───────────────────────────────────────
  pi.on("tool_call", async (event, ctx) => {
    if (event.input?.path?.includes?.(TRACKING_FILE) && ctx.ui) {
      const wf = getActiveWorkflow(ctx.cwd);
      if (wf) updateFooter(ctx, ctx.cwd);
    }
  });

  // ── Phase change detection ✓ ─────────────────────────────────────
  pi.on("turn_end", async (_event, ctx) => {
    const wf = getActiveWorkflow(ctx.cwd);
    if (!wf || !ctx.ui) return;

    const tracking = readTracking(ctx.cwd);
    if (!tracking) return;

    const current = tracking.workflows.find(w => w.name === wf.name);
    if (current && current.currentPhase !== wf.currentPhase) {
      const oldPhase = wf.currentPhase;
      wf.currentPhase = current.currentPhase;
      updateFooter(ctx, ctx.cwd);
      notifyPhase(ctx, wf, oldPhase);
    }
  });

  // ── UI update on agent end ✓ ─────────────────────────────────────
  pi.on("agent_end", async (_event, ctx) => {
    if (!ctx.ui) return;
    const wf = getActiveWorkflow(ctx.cwd);
    if (wf) updateFooter(ctx, ctx.cwd);
  });
}
