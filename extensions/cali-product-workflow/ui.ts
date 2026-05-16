import type { ExtensionContext, ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  matchesKey, Key, truncateToWidth,
  Container, Text, Spacer, SelectList,
  type SelectItem
} from "@earendil-works/pi-tui";
import type { Workflow } from "./types";
import { PHASE_NAMES, PHASE_HINTS } from "./types";
import {
  getActiveWorkflow, readTracking, writeTracking,
  readGlobalTracking, writeGlobalTracking,
  getAllActiveWorkflows, renameWorkflow, suggestNameFromDraft
} from "./state";

// =============================================================================
// COMPACT FOOTER
// =============================================================================

/**
 * Build a single-line footer string.
 *   "auth-system  │  ◆ Shape 3/7  │  2 scopes"
 */
function buildCompactStatus(workflow: Workflow, theme: any): string {
  const phaseName = PHASE_NAMES[workflow.currentPhase] || "?";
  const phaseNum = `${workflow.currentPhase + 1}/${PHASE_NAMES.length}`;

  const isComplete = workflow.phases[workflow.currentPhase]?.status === "completed";
  const isActive = workflow.phases[workflow.currentPhase]?.status === "in-progress";
  const icon = isComplete ? theme.fg("success", "●") :
    isActive ? theme.fg("accent", "◆") : theme.fg("dim", "○");

  const name = theme.fg("success", workflow.name);
  const phase = `${icon} ${phaseName} ${phaseNum}`;
  const hint = getPhaseHint(workflow, theme);
  const hintStr = hint ? `  │  ${hint}` : "";

  return `${name}  │  ${phase}${hintStr}`;
}

function getPhaseHint(workflow: Workflow, theme: any): string | null {
  if (workflow.name.startsWith("untitled-") && workflow.draftContent && workflow.currentPhase >= 1) {
    return theme.fg("warning", "rename pending...");
  }
  const hint = PHASE_HINTS[workflow.currentPhase];
  return hint ? `0 ${hint}` : null;
}

export function updateFooter(ctx: ExtensionContext, cwd: string): void {
  if (!ctx.ui) return;
  const wf = getActiveWorkflow(cwd);
  if (!wf) {
    ctx.ui.setStatus("workflow", undefined);
    return;
  }
  ctx.ui.setStatus("workflow", buildCompactStatus(wf, ctx.ui.theme));
}

function getDirHint(wf: Workflow): string | null {
  // We can't know the dir hash from Workflow object alone
  // (it's stored in index.json). Return null for now.
  return null;
}

export function notifyPhase(ctx: ExtensionContext, wf: Workflow, oldPhase: number): void {
  if (!ctx.ui || oldPhase === wf.currentPhase) return;
  const name = PHASE_NAMES[wf.currentPhase] || "?";
  ctx.ui.notify(
    `◆ ${wf.name} — entered ${name} (${wf.currentPhase + 1}/${PHASE_NAMES.length})`,
    "info"
  );
  triggerAutoRename(ctx, wf.name);
}

async function triggerAutoRename(ctx: ExtensionContext, currentName: string): Promise<void> {
  if (!currentName.startsWith("untitled-")) return;
  const tracking = readTracking(ctx.cwd);
  if (!tracking) return;
  const wf = tracking.workflows.find(w => w.name === currentName);
  if (!wf || !wf.draftContent) return;

  const suggestion = suggestNameFromDraft(wf.draftContent);
  if (!suggestion || suggestion.startsWith("untitled-")) return;

  const result = renameWorkflow(ctx.cwd, currentName, suggestion);
  if (result.ok && ctx.ui) {
    updateFooter(ctx, ctx.cwd);
    ctx.ui.notify(`✨ Workflow renamed to "${suggestion}"`, "success");
  }
}

// =============================================================================
// INTERACTIVE OVERLAY
// =============================================================================

export function showOverlay(ctx: ExtensionContext, cwd: string): void {
  const wf = getActiveWorkflow(cwd);
  if (!wf) return void ctx.ui?.notify("No active workflow", "warning");

  ctx.ui.custom<string | null>(
    (_tui, theme, _kb, done) => {
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
      sl.onSelect = (v: string) => done(v);
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
  ).then(action => {
    if (action === "next") ctx.ui?.notify("Use /pw:next", "info");
    else if (action === "stop") ctx.ui?.notify("Use /pw:stop", "info");
  });
}

// =============================================================================
// ORPHANED WORKFLOW CLEANUP OVERLAY
// =============================================================================

export async function showOrphanOverlay(
  ctx: ExtensionContext, cwd: string, orphans: Workflow[]
): Promise<"proceed" | "cancelled"> {
  return new Promise(resolve => {
    ctx.ui.custom<string | null>(
      (_tui, theme, _kb, done) => {
        const items: SelectItem[] = [
          {
            value: "__archive_all__",
            label: theme.fg("warning", "📦 Archive all and start fresh"),
            description: `${orphans.length} workflow(s) will be archived`
          },
          ...orphans.map(o => ({
            value: o.name,
            label: `${theme.fg("muted", "○")} ${o.name}`,
            description: `${PHASE_NAMES[o.currentPhase]}`
          })),
          {
            value: "__cancel__",
            label: theme.fg("muted", "Cancel"),
            description: ""
          }
        ];

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
        sl.onSelect = (v: string) => done(v);
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
    ).then(result => {
      if (result === "__archive_all__") {
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
        ctx.ui?.notify(`Archived ${orphans.length} workflow(s)`, "info");
        resolve("proceed");
      } else {
        resolve("cancelled");
      }
    });
  });
}
