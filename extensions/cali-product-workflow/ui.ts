/**
 * UI Module - Multi-CLI UI abstraction
 * 
 * Provides UI operations (notifications, select lists, status line) for all CLIs.
 * Uses the adapter pattern to delegate to CLI-specific implementations.
 */

// @ts-ignore - Optional peer dependency for Pi environment
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
  detectUIFallbackLevel,
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
  // Return adapter or create fallback if none created
  if (!_uiAdapter) {
    _uiAdapter = createUIAdapter("generic");
  }
  return _uiAdapter;
}
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
  const phaseName = PHASE_NAMES[workflow.currentPhase] || "unknown";
  const phaseNum = `${workflow.currentPhase + 1}/${PHASE_NAMES.length}`;
  
  const isActive = workflow.phases[workflow.currentPhase]?.status === "in-progress";
  
  // Use colors based on capability level (default to plain text if unknown)
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
    // Default to plain text for unknown/other capability levels
    prefix = "[pw]";
    name = displayName;
    icon = isActive ? "◆" : "●";
  }
  
  const bypassText = _bypassed ? `  ⚠️ bypassed (${phaseName} ${phaseNum} — /pw-next resume)` : "";
  return `${prefix} ${name}  │  ${icon} ${phaseName} ${phaseNum}${bypassText}`;
}
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

export function updateFooter(ctx: ExtensionContext, cwd: string): void {
  // Make footer optional - no-op if ctx.ui not available
  if (!ctx.ui) return;
  // Ensure Pi context is set for status updates
  initUIAdapter(ctx);
  const adapter = getUIAdapter();
  const wf = getActiveWorkflow(cwd);
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
  const message = `◆ ${wf.name} — entered ${name} (${wf.currentPhase + 1}/${PHASE_NAMES.length})`;
  
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
// SELECT LISTS (Pi-specific overlay - keep existing)
// =============================================================================

/**
 * Show a select list overlay.
 * Uses Pi's custom UI for now, with fallback to generic select.
 * 
 * Note: This function is kept for Pi-specific functionality.
 * For other CLIs, use getUIAdapter().select() directly.
 */
export function showOverlay(ctx: ExtensionContext, cwd: string): void {
  const wf = getActiveWorkflow(cwd);
  if (!wf) {
    getUIAdapter().notify("No active workflow", "warning");
    return;
  }
  
  const adapter = getUIAdapter();
  const capabilityLevel = adapter.getCapabilityLevel();
  
  // Note: ctx.ui?.custom may be undefined at runtime
  // noinspection TypeScriptValidateTypes
  if (capabilityLevel === "native" && typeof ctx.ui?.custom === "function") {
    // Use Pi's native custom UI
    showPiOverlay(ctx, wf);
  } else {
    // Fallback to generic select
    showGenericOverlay(wf);
  }
}

function showPiOverlay(ctx: ExtensionContext, wf: Workflow): void {
  // Import Pi TUI components - only load when needed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
// @ts-ignore - Optional peer dependency for Pi environment
  const tui = require("@earendil-works/pi-tui");
  const { Container, Text, Spacer, SelectList, matchesKey, Key } = tui;
  
  // Define SelectItem type inline since we can't import it as a type
  interface SelectItem {
    value: string;
    label: string;
    description?: string;
  }
  
  ctx.ui.custom<string | null>(
    (_tui: any, theme: any, _kb: any, done: (result: any) => void) => {
      const items: SelectItem[] = wf.phases.map((p, i) => {
        const icon = p.status === "completed" ? "✓" :
          p.status === "in-progress" ? "◆" : "○";
        const color = p.status === "completed" ? "success" :
          p.status === "in-progress" ? "accent" : "dim";
        return {
          value: p.id,
          label: `${icon} ${p.name}`,
          description: p.status === "completed" ? "Done" :
            p.status === "in-progress" ? "Current" : "Pending"
        };
      });

      const c = new Container();
      c.addChild(new Text(theme.fg("accent", theme.bold(`◆ ${wf.name}`)), 1, 0));
      c.addChild(new Spacer(1));

      const sl = new SelectList(items, Math.min(items.length + 2, 10), {
        selectedPrefix: (t: string) => theme.fg("accent", t),
        selectedText: (t: string) => theme.fg("accent", t),
        description: (t: string) => theme.fg("muted", t),
        scrollInfo: (t: string) => theme.fg("dim", t),
        noMatch: (t: string) => theme.fg("warning", t),
      });
      sl.onSelect = (item: { value: string }) => done(item.value);
      sl.onCancel = () => done(null);
      c.addChild(sl);
      c.addChild(new Spacer(1));
      c.addChild(new Text(
        theme.fg("dim", "↑↓ navigate  n:next  s:stop  q/esc:close"), 1, 0
      ));

      return {
        render: (w: number) => c.render(w),
        invalidate: () => c.invalidate(),
        handleInput: (data: string) => {
          sl.handleInput(data);
          if (data === "n") done("next");
          else if (data === "s") done("stop");
          else if (data === "q" || matchesKey(data, Key.escape)) done(null);
        },
      };
    },
    {
      overlay: true,
      overlayOptions: { width: "50%", minWidth: 44, maxHeight: "70%", anchor: "center" },
    }
  ).then((action: any) => {
    if (action === "next") getUIAdapter().notify("Use /pw-next", "info");
    else if (action === "stop") getUIAdapter().notify("Use /pw-stop", "info");
  });
}

function showGenericOverlay(wf: Workflow): void {
  const adapter = getUIAdapter();
  
  // Build select options
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
  
  // Build select options
  const options: { label: string; value: string; description?: string }[] = [
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
  
  // Use Pi overlay if available, otherwise generic select
  const capabilityLevel = adapter.getCapabilityLevel();
  
  // Note: ctx.ui?.custom may be undefined at runtime
  // noinspection TypeScriptValidateTypes
  if (capabilityLevel === "native" && typeof ctx.ui?.custom === "function") {
    return showPiOrphanOverlay(ctx, cwd, orphans, options);
  }
  
  // Generic fallback
  const result = await adapter.select(options, `📦 ${orphans.length} workflow(s) in progress`);
  
  if (result === "__archive_all__") {
    archiveWorkflows(cwd, orphans);
    adapter.notify(`Archived ${orphans.length} workflow(s)`, "info");
    return "proceed";
  }
  
  return "cancelled";
}

function showPiOrphanOverlay(
  ctx: ExtensionContext, 
  cwd: string, 
  orphans: Workflow[],
  options: { label: string; value: string; description?: string }[]
): Promise<"proceed" | "cancelled"> {
  // Define SelectItem type inline
  interface SelectItem {
    value: string;
    label: string;
    description?: string;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-var-requires
// @ts-ignore - Optional peer dependency for Pi environment
  const { Container, Text, Spacer, SelectList } = require("@earendil-works/pi-tui");
  
  return new Promise(resolve => {
    const items: SelectItem[] = options.map(o => ({
      value: o.value,
      label: o.label,
      description: o.description,
    }));
    
    ctx.ui.custom<string | null>(
      (_tui: any, theme: any, _kb: any, done: (result: any) => void) => {
        const c = new Container();
        c.addChild(new Text(
          theme.fg("warning", theme.bold(`📦 ${orphans.length} workflow(s) in progress`)), 1, 0
        ));
        c.addChild(new Text(
          theme.fg("muted", "Archive them before starting fresh"), 1, 0
        ));
        c.addChild(new Spacer(1));

        const sl = new SelectList(items, Math.min(items.length + 2, 12), {
          selectedPrefix: (t: string) => theme.fg("accent", t),
          selectedText: (t: string) => theme.fg("accent", t),
          description: (t: string) => theme.fg("muted", t),
          scrollInfo: (t: string) => theme.fg("dim", t),
          noMatch: (t: string) => theme.fg("warning", t),
        });
        sl.onSelect = (item: { value: string }) => done(item.value);
        sl.onCancel = () => done("__cancel__");
        c.addChild(sl);
        c.addChild(new Spacer(1));
        c.addChild(new Text(
          theme.fg("dim", "↑↓ navigate  enter:archive  esc:cancel"), 1, 0
        ));

        return {
          render: (w: number) => c.render(w),
          invalidate: () => c.invalidate(),
          handleInput: (data: string) => { sl.handleInput(data); },
        };
      },
      {
        overlay: true,
        overlayOptions: { width: "50%", minWidth: 48, maxHeight: "70%", anchor: "center" },
      }
    ).then((result: any) => {
      if (result === "__archive_all__") {
        archiveWorkflows(cwd, orphans);
        ctx.ui?.notify(`Archived ${orphans.length} workflow(s)`, "info");
        resolve("proceed");
      } else {
        resolve("cancelled");
      }
    });
  });
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