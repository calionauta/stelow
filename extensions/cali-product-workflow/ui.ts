/**
 * UI Module - Chat-first UI abstraction
 * 
 * Provides simple text-based UI for all CLIs.
 * No Pi TUI, no overlays, just chat messages.
 */

import type { Workflow } from "./types";
import { PHASE_NAMES } from "./types";
import { 
  getActiveWorkflow, 
  readTracking,
  writeTracking,
  readGlobalTracking,
  writeGlobalTracking,
} from "./state";
import { getUIAdapter } from "./adapters/ui-factory";

// ── Bypass State ─────────────────────────────────────────────────────

let _bypassed = false;

export function setBypassed(v: boolean): void {
  _bypassed = v;
}

export function isBypassed(): boolean {
  return _bypassed;
}

// ── Notify ──────────────────────────────────────────────────────────

/**
 * Send notification via adapter (cross-CLI).
 */
export function notify(ctx: ExtensionContext, message: string, level: "info" | "success" | "warning" | "error" = "info"): void {
  const adapter = getUIAdapter();
  adapter.notify(message, level);
}

/**
 * Notify when phase changes.
 */
export function notifyPhase(ctx: ExtensionContext, wf: Workflow, oldPhase: number): void {
  if (oldPhase === wf.currentPhase) return;
  
  const adapter = getUIAdapter();
  const name = PHASE_NAMES[wf.currentPhase] || "?";
  const icon = oldPhase < wf.currentPhase ? "→" : "←";
  adapter.notify(`${icon} Entered ${name} (${wf.currentPhase + 1}/${wf.phases.length})`, "info");
}

// ── Status ──────────────────────────────────────────────────────────

/**
 * Get status string for current workflow.
 */
export function getStatusString(cwd: string): string {
  const wf = getActiveWorkflow(cwd);
  if (!wf) return "";
  
  const phaseName = PHASE_NAMES[wf.currentPhase] || "?";
  const phaseNum = `${wf.currentPhase + 1}/${wf.phases.length}`;
  const isActive = wf.phases[wf.currentPhase]?.status === "in-progress";
  const icon = isActive ? "◆" : "●";
  const bypassText = _bypassed ? " ⚠️ bypassed" : "";
  
  return `${wf.name} │ ${icon} ${phaseName} ${phaseNum}${bypassText}`;
}

/**
 * Format workflow for display (text-based).
 */
export function formatWorkflow(wf: Workflow): string[] {
  const lines: string[] = [];
  lines.push(`◆ ${wf.name}`);
  lines.push(`Status: ${wf.status}`);
  lines.push(`Phase: ${PHASE_NAMES[wf.currentPhase]} (${wf.currentPhase + 1}/${wf.phases.length})`);
  lines.push("");
  lines.push("Phases:");
  
  for (let i = 0; i < wf.phases.length; i++) {
    const p = wf.phases[i];
    const icon = p.status === "completed" ? "✓" : p.status === "in-progress" ? "◆" : "○";
    const marker = i === wf.currentPhase ? " →" : "";
    lines.push(`  ${icon} ${p.name}${marker}`);
  }
  
  return lines;
}

// ── Overlay (Text-based) ──────────────────────────────────────────

/**
 * Show workflow menu (text-based, not overlay).
 */
export function showMenu(cwd: string): string {
  const wf = getActiveWorkflow(cwd);
  if (!wf) return "No active workflow";
  
  const lines = formatWorkflow(wf);
  lines.push("");
  lines.push("Commands:");
  lines.push("  /pw-next  - advance phase");
  lines.push("  /pw-status - show status");
  
  return lines.join("\n");
}

// ── Orphan Workflows ───────────────────────────────────────────────

/**
 * Get orphan workflows for display.
 */
export function getOrphanString(orphans: Workflow[]): string {
  if (orphans.length === 0) return "";
  
  const lines: string[] = [];
  lines.push(`📦 ${orphans.length} workflow(s) in progress:`);
  lines.push("");
  
  for (const o of orphans) {
    lines.push(`  ○ ${o.name} (${PHASE_NAMES[o.currentPhase]})`);
  }
  
  lines.push("");
  lines.push("Use /pw-archive to archive them.");
  
  return lines.join("\n");
}

// ── Archive ─────────────────────────────────────────────────────────

function archiveWorkflows(cwd: string, orphans: Workflow[]): void {
  const tracking = readTracking(cwd);
  if (tracking) {
    for (const o of orphans) {
      const idx = tracking.workflows.findIndex(w => w.name === o.name);
      if (idx !== -1) tracking.workflows[idx].status = "archived";
    }
    writeTracking(cwd, tracking);
  }
  
  const gt = readGlobalTracking();
  if (gt) {
    for (const o of orphans) {
      const idx = gt.workflows.findIndex(w => w.name === o.name);
      if (idx !== -1) gt.workflows[idx].status = "archived";
    }
    writeGlobalTracking(gt);
  }
}

// Re-export for backwards compat
export { archiveWorkflows };

// Extension context type (minimal)
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";