/**
 * UI Module - Multi-CLI UI abstraction
 * 
 * Provides UI operations (notifications, select lists, status line) for all CLIs.
 * Uses the adapter pattern to delegate to CLI-specific implementations.
 */

export interface ExtensionContext { cwd: string; ui?: any; [key: string]: any }
import type { Workflow } from "./types";
import { PHASE_NAMES } from "./types";
import { 
  getActiveWorkflow, 
  resolveProjectDir,
  renameWorkflow, 
  suggestNameFromDraft,
  readTracking,
  writeTracking,
  removeGlobalIndexEntry,
} from "./state";
import { detectHost } from "./state";
import { 
  createUIAdapter, 
  type UIAdapter,
  AnsiColors,
} from "./adapters/ui-factory";

// ── Singleton UI Adapter ───────────────────────────────────────────────

let _uiAdapter: UIAdapter | null = null;

/**
 * Get or create the UI adapter for the current CLI.
 */
export function getUIAdapter(): UIAdapter {
  if (!_uiAdapter) {
    const cli = detectHost();
    _uiAdapter = createUIAdapter(cli);
  }
  return _uiAdapter;
}

/**
 * Initialize the UI adapter with Pi context if available.
 * Must be called before using UI functions on Pi.
 *
 * Note: returns a Promise so that the lazy ESM `import()` of the Pi UI
 * adapter can resolve. Existing call sites that don't `await` the result
 * still work because the returned promise is fire-and-forget; the Pi
 * adapter only matters when running under Pi, where the caller already
 * is itself async.
 */
export async function initUIAdapter(ctx: ExtensionContext): Promise<void> {
  const adapter = getUIAdapter();

  // Set Pi context if we're on Pi
  if (ctx.ui) {
    // Dynamic ESM import of the Pi UI bridge. Cast through `unknown` to
    // avoid pulling the full Pi ExtensionContext type into this module's
    // surface (the canonical type has fields the local ExtensionContext
    // doesn't model; the bridge module is the boundary).
    const piUiModule = (await import("./adapters/pi/ui.js")) as unknown as {
      setPiContext: (ctx: ExtensionContext) => void;
    };
    piUiModule.setPiContext(ctx);
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
  
  return `${prefix} ${name}  │  ${icon} ${phaseName} ${phaseNum}`;
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
    getUIAdapter().notify(`✨ Workflow renamed to "${suggestion}"`, "info");
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
  
  for (const o of orphans) {
    removeGlobalIndexEntry(cwd, o.name);
  }
}