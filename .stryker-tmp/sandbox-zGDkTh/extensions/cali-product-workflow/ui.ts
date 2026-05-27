/**
 * UI Module - Multi-CLI UI abstraction
 * 
 * Provides UI operations (notifications, select lists, status line) for all CLIs.
 * Uses the adapter pattern to delegate to CLI-specific implementations.
 */
// @ts-nocheck


//  - Optional peer dependency for Pi environment
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { Workflow } from "./types";
import { PHASE_NAMES } from "./types";
import { 
  getActiveWorkflow, 
  resolveProjectDir,
  renameWorkflow, 
  suggestNameFromDraft,
  readTracking,
  writeTracking,
  readGlobalTracking,
  writeGlobalTracking,
} from "./state";
import { detectCLI } from "./state";
import { 
  createUIAdapter, 
  type UIAdapter,
  AnsiColors,
} from "./adapters/ui-factory";

// ── Singleton UI Adapter ───────────────────────────────────────────────

// Track if agent bypassed the workflow to implement early
let _bypassed = false;

export function setBypassed(v: boolean): void {
  _bypassed = v;
}

export function isBypassed(): boolean {
  return _bypassed;
}

let _uiAdapter: UIAdapter | null = null;

/**
 * Get or create the UI adapter for the current CLI.
 */
export function getUIAdapter(): UIAdapter {
  if (!_uiAdapter) {
    const cli = detectCLI();
    _uiAdapter = createUIAdapter(cli);
  }
  return _uiAdapter;
}

/**
 * Initialize the UI adapter with Pi context if available.
 * Must be called before using UI functions on Pi.
 */
export function initUIAdapter(ctx: ExtensionContext): void {
  const adapter = getUIAdapter();
  
  // Set Pi context if we're on Pi
  if (ctx.ui) {
    // Import and set Pi context
    const { setPiContext } = require("./adapters/pi/ui");
    setPiContext(ctx);
  }
}

// =============================================================================
// STATUS LINE
// =============================================================================

/**
 * Build compact status string for footer.
 * Format: "[pw] workflow-name  │  ◆ Phase N/M"
 */
function buildCompactStatus(workflow: Workflow, capabilityLevel: string): string {
  const phaseName = PHASE_NAMES[workflow.currentPhase] || "?";
  const phaseNum = `${workflow.currentPhase + 1}/${PHASE_NAMES.length}`;
  
  const isActive = workflow.phases[workflow.currentPhase]?.status === "in-progress";
  
  // Use colors based on capability level
  let prefix, name, icon;
  
  // Truncate workflow name at 60 chars to prevent footer overflow
  const MAX_NAME_LEN = 60;
  const displayName = workflow.name.length > MAX_NAME_LEN 
    ? workflow.name.substring(0, MAX_NAME_LEN - 3) + "..." 
    : workflow.name;

  if (capabilityLevel === "ansi" || capabilityLevel === "native") {
    prefix = AnsiColors.dim + "[pw]" + AnsiColors.reset;
    name = AnsiColors.green + displayName + AnsiColors.reset;
    icon = isActive 
      ? AnsiColors.cyan + "◆" + AnsiColors.reset 
      : AnsiColors.green + "●" + AnsiColors.reset;
  } else {
    prefix = "[pw]";
    name = displayName;
    icon = isActive ? "◆" : "●";
  }
  
  const bypassText = _bypassed ? `  ⚠️ bypassed (${phaseName} ${phaseNum} — /pw-next resume)` : "";
  return `${prefix} ${name}  │  ${icon} ${phaseName} ${phaseNum}${bypassText}`;
}

// =============================================================================
// WORKFLOW SIGNALS (Cross-CLI protocol)
// =============================================================================

/**
 * Signal format: <!-- workflow:stage=<name> phase=<N>/<total> name=<slug> status=<s> -->
 * 
 * - HTML comments are invisible in chat but parseable by CLIs
 * - Pi: can parse and display in footer (optional)
 * - Other CLIs: ignore (invisible) or parse for their own UI
 * 
 * Status values: in-progress | paused | completed | archived
 */
export function buildWorkflowSignal(wf: Workflow): string {
  const stage = PHASE_NAMES[wf.currentPhase] || "unknown";
  const phase = `${wf.currentPhase + 1}/${PHASE_NAMES.length}`;
  const name = wf.name.replace(/\s+/g, "-").toLowerCase();
  const status = wf.status || "in-progress";
  
  return `<!-- workflow:stage=${stage} phase=${phase} name=${name} status=${status} -->`;
}

/**
 * Visible text version of the signal for CLIs that can't parse HTML.
 * Format: [pw:stage phase N/M status]
 */
export function buildWorkflowSignalText(wf: Workflow): string {
  const stage = PHASE_NAMES[wf.currentPhase] || "?";
  const phase = `${wf.currentPhase + 1}/${PHASE_NAMES.length}`;
  const status = wf.status || "in-progress";
  
  return `[pw:${stage} ${phase} ${status}]`;
}

/**
 * Parse a workflow signal string back into structured data.
 * Returns null if the string doesn't match the signal format.
 */
export function parseWorkflowSignal(signal: string): {
  stage: string;
  phase: string;
  name: string;
  status: string;
} | null {
  const htmlMatch = signal.match(/<!--\s*workflow:stage=(\S+)\s+phase=(\S+)\s+name=(\S+)\s+status=(\S+)\s*-->/);
  if (htmlMatch) {
    return { stage: htmlMatch[1], phase: htmlMatch[2], name: htmlMatch[3], status: htmlMatch[4] };
  }
  
  const textMatch = signal.match(/\[pw:(\S+)\s+(\S+)\s+(\S+)\]/);
  if (textMatch) {
    return { stage: textMatch[1], phase: textMatch[2], name: "unknown", status: textMatch[3] };
  }
  
  return null;
}

export function updateFooter(ctx: ExtensionContext, cwd: string): void {
  // Ensure Pi context is set for status updates
  initUIAdapter(ctx);
  const adapter = getUIAdapter();
  const wf = getActiveWorkflow(cwd);
  
  if (!wf) {
    adapter.clearStatus();
    return;
  }
  
  const status = buildCompactStatus(wf, adapter.getCapabilityLevel());
  adapter.setStatus({ text: status, level: "info" });
}

// =============================================================================
// NOTIFICATIONS
// =============================================================================

export function notifyPhase(ctx: ExtensionContext, wf: Workflow, oldPhase: number): void {
  if (oldPhase === wf.currentPhase) return;
  
  const adapter = getUIAdapter();
  const name = PHASE_NAMES[wf.currentPhase] || "?";
  const signal = buildWorkflowSignalText(wf);
  const message = `◆ ${wf.name} — entered ${name} (${wf.currentPhase + 1}/${PHASE_NAMES.length}) ${signal}`;
  
  adapter.notify(message, "info");
  triggerAutoRename(ctx, wf.name);
}

async function triggerAutoRename(ctx: ExtensionContext, currentName: string): Promise<void> {
  if (!currentName.startsWith("untitled-")) return;
  
  const wd = resolveProjectDir(ctx.cwd);
  const tracking = readTracking(wd);
  if (!tracking) return;
  
  const wf = tracking.workflows.find(w => w.name === currentName);
  if (!wf || !wf.draftContent) return;

  const suggestion = suggestNameFromDraft(wf.draftContent);
  if (!suggestion || suggestion.startsWith("untitled-")) return;

  const result = renameWorkflow(wd, currentName, suggestion);
  
  if (result.ok) {
    updateFooter(ctx, wd);
    getUIAdapter().notify(`✨ Workflow renamed to "${suggestion}"`, "success");
  }
}

// =============================================================================
// SELECT LISTS
// =============================================================================

/**
 * Show a workflow overview select list.
 * Fully agnostic — delegates to UIAdapter.select().
 * Pi gets its native overlay; other CLIs get formatted terminal output.
 */
export function showOverlay(ctx: ExtensionContext, cwd: string): void {
  const wf = getActiveWorkflow(cwd);
  if (!wf) {
    getUIAdapter().notify("No active workflow", "warning");
    return;
  }
  
  const adapter = getUIAdapter();
  
  const options = wf.phases.map(p => ({
    value: p.id,
    label: `${p.status === "completed" ? "✓" : p.status === "in-progress" ? "◆" : "○"} ${p.name}`,
    description: p.status === "completed" ? "Done" :
      p.status === "in-progress" ? "Current" : "Pending"
  }));
  
  adapter.select(options, `◆ ${wf.name}`).then((result: any) => {
    if (result === "next") {
      adapter.notify("Use /pw-next", "info");
    } else if (result === "stop") {
      adapter.notify("Use /pw-stop", "info");
    }
  });
}

// =============================================================================
// ORPHANED WORKFLOW CLEANUP
// =============================================================================

export async function showOrphanOverlay(
  ctx: ExtensionContext, cwd: string, orphans: Workflow[]
): Promise<"proceed" | "cancelled"> {
  const adapter = getUIAdapter();
  
  const options = [
    {
      value: "__archive_all__",
      label: `📦 Archive all and start fresh`,
      description: `${orphans.length} workflow(s) will be archived`
    },
    ...orphans.map(o => ({
      value: o.name,
      label: `○ ${o.name}`,
      description: PHASE_NAMES[o.currentPhase]
    })),
    {
      value: "__cancel__",
      label: "Cancel",
      description: ""
    }
  ];
  
  const result = await adapter.select(options, `📦 ${orphans.length} workflow(s) in progress`);
  
  if (result === "__archive_all__") {
    archiveWorkflows(cwd, orphans);
    adapter.notify(`Archived ${orphans.length} workflow(s)`, "info");
    return "proceed";
  }
  
  return "cancelled";
}

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