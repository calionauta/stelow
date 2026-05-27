// @ts-nocheck
import { rmSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
//  - Optional peer dependency for Pi environment
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { WORKFLOW_DIR, PHASE_NAMES } from "./types";
import {
  readTracking, writeTracking, readGlobalTracking, writeGlobalTracking,
  getActiveWorkflow, renameWorkflow, toSafeName, reconcileTracking, scanWorkflowDirs,
  archiveWorkflowOnDisk, resolveProjectDir,
  writePhaseTodos, getPhaseTodos, getPhaseTodosFromCache, setPhaseTodos, type PhaseTodo,
  readInbox, addToInbox, removeFromInbox, clearInbox,
  TASK_ICONS,
} from "./state";
import { updateFooter, notifyPhase, showOverlay, getUIAdapter } from "./ui";
import cmdStart from "./start";

// ── Import Command Dispatcher for Multi-CLI Support ─────────────────
import { WORKFLOW_COMMANDS, type CommandDescriptor } from "./adapters/commands/dispatcher";

type CmdCtx = ExtensionCommandContext;

// Pi passes the raw text after the command name as the first argument (a string).
interface CmdHandler {
  (pi: ExtensionAPI, args: string, ctx: CmdCtx): void | Promise<void>;
}

// ── Helper: parse command args ───────────────────────────────────────
// Pi passes the raw text after the command name as a string.
// This helper parses key=value pairs (quoted values supported) and also
// exposes positional tokens via "_" (array).
function parseArgs(raw: string): Record<string, string> & { _: string[] } {
  const result = { _: [] as string[] } as Record<string, string> & { _: string[] };

  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return result;

  // tokenize respecting double quotes
  const tokens: string[] = [];
  let buf = "";
  let inQ = false;
  for (const ch of trimmed) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === " " && !inQ) {
      if (buf) { tokens.push(buf); buf = ""; }
      continue;
    }
    buf += ch;
  }
  if (buf) tokens.push(buf);

  for (const tok of tokens) {
    const eq = tok.indexOf("=");
    if (eq > 0) {
      result[tok.slice(0, eq)] = tok.slice(eq + 1);
    } else {
      result._.push(tok);
    }
  }
  return result;
}

// ── Helper: notify + log ────────────────────────────────────────────
function reply(ctx: CmdCtx, text: string): void {
  ctx.ui?.notify(text, "info");
}

function replyWarn(ctx: CmdCtx, text: string): void {
  ctx.ui?.notify(text, "warning");
}

function noActive(ctx: CmdCtx): void {
  replyWarn(ctx, "No active Workflow. Start with /pw-start");
}

// ── Helper: remove workflow from both local and global tracking ─────
function removeWorkflowFromTracking(cwd: string, workflowName: string): void {
  // Mark archived on disk so reconcileTracking doesn't re-import it
  archiveWorkflowOnDisk(cwd, workflowName);

  const t = readTracking(cwd);
  if (t) {
    t.workflows = t.workflows.filter(w => w.name !== workflowName);
    t.updated = new Date().toISOString();
    writeTracking(cwd, t);
  }
  const gt = readGlobalTracking();
  if (gt) {
    gt.workflows = gt.workflows.filter(w => w.name !== workflowName);
    gt.updated = new Date().toISOString();
    writeGlobalTracking(gt);
  }
}

// ── STOP ─────────────────────────────────────────────────────────────

function cmdStop(_pi: ExtensionAPI, args: string, ctx: CmdCtx) {
  const wd = resolveProjectDir(ctx.cwd);
  const parsed = parseArgs(args);

  // Gather all workflows from: current dir reconcile + global tracking (same cwd)
  const fromDisk = reconcileTracking(wd);
  const fromGlobal = readGlobalTracking()?.workflows
    .filter(w => !fromDisk.some(dw => dw.name === w.name)) ?? [];
  const allWfs = [...fromDisk, ...fromGlobal];
  const stoppable = allWfs.filter(w =>
    w.status === "in-progress" || w.status === "paused"
  );

  if (stoppable.length === 0) {
    replyWarn(ctx, "No active or paused workflows to stop.");
    return;
  }

  // ── /pw-stop all ───────────────────────────────────────────────
  if (parsed._.includes("all") || parsed.all !== undefined) {
    for (const w of stoppable) {
      removeWorkflowFromTracking(wd, w.name);
    }
    ctx.ui?.notify(`❌ Stopped ${stoppable.length} workflow(s).`, "info");
    ctx.ui?.setStatus("workflow", undefined);
    return;
  }

  // ── /pw-stop <name1> <name2> ───────────────────────────────────
  if (parsed._.length > 0) {
    let count = 0;
    for (const wfName of parsed._) {
      const found = stoppable.find(w => w.name === wfName);
      if (found) {
        removeWorkflowFromTracking(wd, wfName);
        count++;
      }
    }
    if (count === 0) {
      replyWarn(ctx, `No workflow found matching: ${parsed._.join(", ")}`);
    } else {
      ctx.ui?.notify(`❌ Stopped ${count} workflow(s).`, "info");
      if (stoppable.some(w => w.name === getActiveWorkflow(wd)?.name)) {
        ctx.ui?.setStatus("workflow", undefined);
      }
    }
    return;
  }

  // ── /pw-stop (no args) — picker se >1, direto se for 1 ──────
  if (stoppable.length === 1) {
    const wfName = stoppable[0].name;
    removeWorkflowFromTracking(wd, wfName);
    ctx.ui?.notify(`❌ Workflow '${wfName}' stopped.`, "info");
    ctx.ui?.setStatus("workflow", undefined);
    return;
  }

  // Multiple workflows: show interactive picker
  showStopPicker(ctx, wd, stoppable);
}

async function showStopPicker(
  ctx: CmdCtx, cwd: string, workflows: { name: string; currentPhase: number }[]
): Promise<void> {
  const adapter = getUIAdapter();
  
  const options = [
    {
      value: "__all__",
      label: "🛑 Stop All",
      description: `Stop all ${workflows.length} workflow(s)`
    },
    ...workflows.map(w => ({
      value: w.name,
      label: `☐ ${w.name}`,
      description: `${PHASE_NAMES[w.currentPhase]} — /pw-stop ${w.name}`
    })),
    {
      value: "__cancel__",
      label: "Cancel",
      description: ""
    }
  ];
  
  const selection = await adapter.select(options, "Select workflow to stop:");
  
  if (selection === "__all__") {
    const diskWfs = reconcileTracking(cwd);
    const globalWfs = (readGlobalTracking()?.workflows ?? [])
      .filter(w => !diskWfs.some(dw => dw.name === w.name));
    const allWfs = [...diskWfs, ...globalWfs].filter(w =>
      w.status === "in-progress" || w.status === "paused"
    );
    for (const w of allWfs) {
      removeWorkflowFromTracking(cwd, w.name);
    }
    adapter.notify(`❌ Stopped ${allWfs.length} workflow(s).`, "info");
    adapter.clearStatus();
  } else if (selection && selection !== "__cancel__") {
    removeWorkflowFromTracking(cwd, selection);
    adapter.notify(`❌ Workflow '${selection}' stopped.`, "info");
    if (!getActiveWorkflow(cwd)) {
      adapter.clearStatus();
    }
  }
}

// ── PAUSE / RESUME ───────────────────────────────────────────────────

function cmdPause(_pi: ExtensionAPI, _args: string, ctx: CmdCtx) {
  const wd = resolveProjectDir(ctx.cwd);
  const wf = getActiveWorkflow(wd);
  if (!wf) { noActive(ctx); return; }

  const t = readTracking(wd);
  if (t) {
    const idx = t.workflows.findIndex(w => w.name === wf.name);
    if (idx !== -1) {
      t.workflows[idx].status = "paused";
      t.workflows[idx].updated = new Date().toISOString();
      writeTracking(wd, t);
    }
  }
  const gt = readGlobalTracking();
  if (gt) {
    const idx = gt.workflows.findIndex(w => w.name === wf.name);
    if (idx !== -1) gt.workflows[idx].status = "paused";
    writeGlobalTracking(gt);
  }

  ctx.ui?.setStatus("workflow", ctx.ui?.theme?.fg("warning", `⏸ ${wf.name}`));
  reply(ctx, `⏸ Workflow '${wf.name}' paused.`);
}

function cmdResume(pi: ExtensionAPI, args: string, ctx: CmdCtx) {
  const wd = resolveProjectDir(ctx.cwd);
  const parsed = parseArgs(args);
  const name = parsed.name || parsed._[0];
  const t = readTracking(wd);
  const gt = readGlobalTracking();

  const paused = name
    ? t?.workflows.find(w => w.name === name && w.status === "paused")
    : t?.workflows.find(w => w.status === "paused");

  if (!paused) {
    // Fallback: check for in-progress workflows (e.g. after a crash)
    const inProgress = name
      ? t?.workflows.find(w => w.name === name && w.status === "in-progress")
      : t?.workflows.find(w => w.status === "in-progress");

    if (inProgress) {
      updateFooter(ctx, wd);
      reply(ctx, `▶️ '${inProgress.name}' resuming from ${PHASE_NAMES[inProgress.currentPhase]}...`);
      pi.sendUserMessage(
        `/skill:cali-product-workflow\n\n[RESUME: workflow '${inProgress.name}', current phase: ${inProgress.currentPhase} (${PHASE_NAMES[inProgress.currentPhase]}). Auto-Discovery will find this in-progress workflow. User already confirmed via /pw-resume — proceed without asking, jump to the current phase and continue from there.]`,
        { deliverAs: "followUp" }
      );
      return;
    }

    replyWarn(ctx, name
      ? `Workflow '${name}' not found. /pw-ls`
      : "No paused or active Workflow."
    );
    return;
  }

  if (t) {
    const idx = t.workflows.findIndex(w => w.name === paused.name);
    if (idx !== -1) t.workflows[idx].status = "in-progress";
    writeTracking(wd, t);
  }
  if (gt) {
    const idx = gt.workflows.findIndex(w => w.name === paused.name);
    if (idx !== -1) gt.workflows[idx].status = "in-progress";
    writeGlobalTracking(gt);
  }

  updateFooter(ctx, wd);
  reply(ctx, `▶️ '${paused.name}' resumed. Stage: ${PHASE_NAMES[paused.currentPhase]}`);
}

// ── STATUS ───────────────────────────────────────────────────────────

function cmdStatus(_pi: ExtensionAPI, _args: string, ctx: CmdCtx) {
  const wd = resolveProjectDir(ctx.cwd);
  const wf = getActiveWorkflow(wd);
  if (!wf) {
    const g = readGlobalTracking()?.workflows.find(w => w.status === "in-progress");
    if (g) {
      reply(ctx, [
        `▶️ ${g.name}`,
        `   ${PHASE_NAMES[g.currentPhase]}`,
        `   Project: ${g.cwd}`,
        `   cd ${g.cwd}`
      ].join("\n"));
      return;
    }
    replyWarn(ctx, "No active Workflow.\n\n/pw-start\n/pw-start @brief.md\n/pw-start \"desc\"");
    return;
  }

  reply(ctx, [
    `◆ Workflow: ${wf.name}`,
    `Stage: ${wf.currentPhase + 1}/${PHASE_NAMES.length} — ${PHASE_NAMES[wf.currentPhase]}`,
    wf.draftContent
      ? `\n📝 ${wf.draftContent.slice(0, 300)}${wf.draftContent.length > 300 ? "..." : ""}`
      : "",
    "",
    "Stages:",
    ...wf.phases.map((p, i) => {
      const icon = p.status === "completed" ? "✓" :
        p.status === "in-progress" ? "◆" : "○";
      return `${i === wf.currentPhase ? "→ " : "  "}${icon} ${i + 1}. ${p.name}`;
    }),
    "",
    "/pw-next  /pw-stop  /pw-menu"
  ].join("\n"));
}

// ── LIST ─────────────────────────────────────────────────────────────

function cmdList(_pi: ExtensionAPI, args: string, ctx: CmdCtx) {
  const wd = resolveProjectDir(ctx.cwd);
  const parsed = parseArgs(args);
  const lines: string[] = [];

  // ── /pw-ls path=... ────────────────────────────────────────────
  if (parsed.path) {
    const targetDir = parsed.path;
    const diskWfs = scanWorkflowDirs(targetDir);
    if (diskWfs.length === 0) {
      replyWarn(ctx, `No workflows in: ${targetDir}`);
      return;
    }
    lines.push(`📁 ${targetDir}:`);
    for (const dw of diskWfs) {
      const icon = dw.status === "in-progress" ? "◆" :
        dw.status === "paused" ? "⏸" :
        dw.status === "completed" ? "✓" : "○";
      const folder = `${dw.dateStamp}/${dw.dirHash}`;
      lines.push(`  ${icon} ${dw.name}`);
      lines.push(`     📁 ${folder}`);
    }
    reply(ctx, lines.join("\n"));
    return;
  }

  // ── /pw-ls all ─────────────────────────────────────────────────
  if (parsed._.includes("all") || parsed.all !== undefined) {
    // Scan all directories that have .cali-product-workflow/ subfolders
    const globalTracking = readGlobalTracking();
    const allProjects = new Map<string, string[]>();  // dir → [name, ...]

    // Collect from global tracking
    if (globalTracking) {
      for (const w of globalTracking.workflows) {
        const dir = w.cwd || "?";
        if (!allProjects.has(dir)) allProjects.set(dir, []);
        allProjects.get(dir)!.push(w.name);
      }
    }

    // Also scan .cali-product-workflow/ in known common dirs
    const homeDev = homedir() + "/Development";
    const candidates = [
      wd,
      homeDev,
      ...Array.from(allProjects.keys()).filter(d => d !== "?" && d !== wd && d !== homeDev),
    ];
    const seen = new Set<string>();
    const seenInProjects = new Set<string>();
    for (const dir of [...new Set(candidates)]) {
      const diskWfs = scanWorkflowDirs(dir);
      if (diskWfs.length === 0) continue;
      lines.push(`📁 ${dir}:`);
      for (const dw of diskWfs) {
        if (seen.has(dw.name)) continue;
        seen.add(dw.name);
        const key = `${dw.name}:${dir}`;
        if (seenInProjects.has(key)) continue;
        seenInProjects.add(key);
        const icon = dw.status === "in-progress" ? "◆" :
          dw.status === "paused" ? "⏸" :
          dw.status === "completed" ? "✓" : "○";
        const folder = `${dw.dateStamp}/${dw.dirHash}`;
        lines.push(`  ${icon} ${dw.name}`);
        lines.push(`     📁 ${folder}`);
      }
      lines.push("");
    }

    if (lines.length === 0) {
      replyWarn(ctx, "No Workflows found anywhere.");
    } else {
      reply(ctx, lines.join("\n").trimEnd());
    }
    return;
  }

  // ── /pw-ls archived — show archived workflows from disk ───────
  if (parsed._.includes("archived") || parsed.archived !== undefined) {
    const diskWfs = scanWorkflowDirs(wd).filter(dw => dw.status === "archived");
    if (diskWfs.length === 0) {
      replyWarn(ctx, "No archived workflows.");
      return;
    }
    lines.push(`📁 ${wd} (archived):`);
    for (const dw of diskWfs) {
      lines.push(`  ○ ${dw.name}`);
    }
    reply(ctx, lines.join("\n"));
    return;
  }

  // ── /pw-ls (default) — current dir with disk reconciliation ────
  const reconciled = reconcileTracking(wd);

  if (reconciled.length > 0) {
    lines.push(`📁 ${wd}:`);
    for (const w of reconciled) {
      const icon = w.status === "in-progress" ? "◆" :
        w.status === "paused" ? "⏸" :
        w.status === "completed" ? "✓" : "○";
      const note = w.status === "archived" ? " (archived)" : "";
      // Get folder path from disk scan for this workflow
      const diskWfs = scanWorkflowDirs(wd);
      const diskWf = diskWfs.find(d => d.name === w.name);
      const folder = diskWf ? `${diskWf.dateStamp}/${diskWf.dirHash}` : "?";
      lines.push(`  ${icon} ${w.name}${note}`);
      lines.push(`     📁 ${folder}`);
    }
    lines.push("");
  }

  // Append other-projects section from global tracking (not in current dir)
  const gt = readGlobalTracking();
  if (gt) {
    const currentNames = new Set(reconciled.map(w => w.name));
    const other = gt.workflows.filter(gw => !currentNames.has(gw.name));
    if (other.length > 0) {
      lines.push("🌐 Other Projects:");
      for (const w of other) {
        const icon = w.status === "in-progress" ? "◆" :
          w.status === "paused" ? "⏸" :
          w.status === "completed" ? "✓" : "○";
        // Get folder from disk if available
        const diskWfs = w.cwd ? scanWorkflowDirs(w.cwd) : [];
        const diskWf = diskWfs.find(d => d.name === w.name);
        const folder = diskWf ? `${diskWf.dateStamp}/${diskWf.dirHash}` : "?";
        lines.push(`  ${icon} ${w.name} — ${PHASE_NAMES[w.currentPhase]} (${w.status})`);
        lines.push(`     📁 ${folder}`);
      }
    }
  }

  if (lines.length === 0) {
    replyWarn(ctx, "No Workflows found. /pw-start");
  } else {
    reply(ctx, lines.join("\n"));
  }
}

// ── Stages guard sync helper ───────────────────────────────────────
// Maps PHASE_NAMES index to stages.yaml stage name and updates
// current-stage.json so the stages guard picks up phase changes.
const PHASE_TO_STAGE: Record<number, string> = {
  0: "triage", 1: "select", 2: "setup", 3: "context",
  4: "shape", 5: "critique", 6: "gate", 7: "scope",
  8: "interface", 9: "int-gate", 10: "selection",
  11: "planning", 12: "execution", 13: "audit",
};

function syncStagesGuardState(cwd: string, phaseIndex: number): void {
  const stageName = PHASE_TO_STAGE[phaseIndex];
  if (!stageName) return;
  const stateDir = join(cwd, WORKFLOW_DIR, "state");
  if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });
  const statePath = join(stateDir, "current-stage.json");
  const now = new Date().toISOString();
  const prev = existsSync(statePath)
    ? JSON.parse(readFileSync(statePath, "utf-8"))
    : { current_stage: "triage", previous_stage: null, transitioned_at: now, history: [], gates_passed: [], supervisor_active: false };
  const newState = {
    current_stage: stageName,
    previous_stage: prev.current_stage,
    transitioned_at: now,
    history: [...(prev.history || []), { stage: prev.current_stage, entered_at: prev.transitioned_at, exited_at: now }],
    gates_passed: prev.gates_passed || [],
    supervisor_active: prev.supervisor_active || false,
  };
  writeFileSync(statePath, JSON.stringify(newState, null, 2));
}

// ── SETPHASE ─────────────────────────────────────────────────────────

function cmdSetPhase(_pi: ExtensionAPI, args: string, ctx: CmdCtx) {
  const wd = resolveProjectDir(ctx.cwd);
  const parsed = parseArgs(args);
  const raw = parsed.phase;
  const phaseName = parsed.phasename;

  let phase: number | null = null;
  if (raw !== undefined) phase = parseInt(String(raw), 10);
  else if (phaseName) phase = PHASE_NAMES.findIndex(p => p.toLowerCase() === String(phaseName).toLowerCase());

  if (phase === null || isNaN(phase) || phase < 0 || phase >= PHASE_NAMES.length) {
    replyWarn(ctx, [
      "Usage: /pw-setphase phase=N",
      "   or: /pw-setphase phasename=Name",
      "",
      ...PHASE_NAMES.map((n, i) => `  ${i}: ${n}`),
    ].join("\n"));
    return;
  }

  const wf = getActiveWorkflow(wd);
  if (!wf) { noActive(ctx); return; }
  const oldPhase = wf.currentPhase;

  const t = readTracking(wd);
  if (t) {
    const idx = t.workflows.findIndex(w => w.name === wf.name);
    if (idx !== -1) {
      t.workflows[idx].currentPhase = phase;
      t.workflows[idx].phases.forEach((p, i) => {
        p.status = i < phase ? "completed" : i === phase ? "in-progress" : "pending";
      });
      t.workflows[idx].updated = new Date().toISOString();
      writeTracking(wd, t);
    }
  }
  const gt = readGlobalTracking();
  if (gt) {
    const idx = gt.workflows.findIndex(w => w.name === wf.name);
    if (idx !== -1) gt.workflows[idx].currentPhase = phase;
    writeGlobalTracking(gt);
  }

  // Sync wf in-memory so notifyPhase compares correctly
  wf.currentPhase = phase;
  updateFooter(ctx, wd);
  syncStagesGuardState(wd, phase);
  if (oldPhase !== phase) notifyPhase(ctx, wf, oldPhase);
  reply(ctx, `▶️ Phase: ${PHASE_NAMES[phase]} (${phase + 1}/${PHASE_NAMES.length})`);
}

// ── NEXT ─────────────────────────────────────────────────────────────

function cmdNext(_pi: ExtensionAPI, _args: string, ctx: CmdCtx) {
  const wd = resolveProjectDir(ctx.cwd);
  const wf = getActiveWorkflow(wd);
  if (!wf) { noActive(ctx); return; }

  const next = wf.currentPhase + 1;
  if (next >= PHASE_NAMES.length) {
    reply(ctx, "All phases complete. /pw-complete");
    return;
  }

  const oldPhase = wf.currentPhase;
  const t = readTracking(wd);
  if (t) {
    const idx = t.workflows.findIndex(w => w.name === wf.name);
    if (idx !== -1) {
      t.workflows[idx].currentPhase = next;
      t.workflows[idx].phases.forEach((p, i) => {
        p.status = i < next ? "completed" : i === next ? "in-progress" : "pending";
      });
      t.workflows[idx].updated = new Date().toISOString();
      writeTracking(wd, t);
    }
  }
  const gt = readGlobalTracking();
  if (gt) {
    const idx = gt.workflows.findIndex(w => w.name === wf.name);
    if (idx !== -1) gt.workflows[idx].currentPhase = next;
    writeGlobalTracking(gt);
  }

  // Sync wf in-memory so notifyPhase compares correctly
  wf.currentPhase = next;
  updateFooter(ctx, wd);
  syncStagesGuardState(wd, next);
  notifyPhase(ctx, wf, oldPhase);
  reply(ctx, `✅ ${PHASE_NAMES[next]} (${next + 1}/${PHASE_NAMES.length})`);
}

// ── COMPLETE ─────────────────────────────────────────────────────────

function cmdComplete(_pi: ExtensionAPI, _args: string, ctx: CmdCtx) {
  const wd = resolveProjectDir(ctx.cwd);
  const wf = getActiveWorkflow(wd);
  if (!wf) { replyWarn(ctx, "No active workflow."); return; }

  ctx.ui?.setStatus("workflow", undefined);

  const t = readTracking(wd);
  if (t) {
    const idx = t.workflows.findIndex(w => w.name === wf.name);
    if (idx !== -1) {
      t.workflows[idx].status = "completed";
      t.workflows[idx].updated = new Date().toISOString();
      writeTracking(wd, t);
    }
  }
  const gt = readGlobalTracking();
  if (gt) {
    const idx = gt.workflows.findIndex(w => w.name === wf.name);
    if (idx !== -1) gt.workflows[idx].status = "completed";
    writeGlobalTracking(gt);
  }

  ctx.ui?.notify(`🎉 ${wf.name} completed!`, "info");
}

// ── GOTO ─────────────────────────────────────────────────────────────

function cmdGoto(_pi: ExtensionAPI, args: string, _ctx: CmdCtx) {
  const wd = resolveProjectDir(_ctx.cwd);
  const parsed = parseArgs(args);
  const name = parsed.name || parsed._[0];
  const gt = readGlobalTracking();
  if (!gt) { replyWarn(_ctx, "No global workflows."); return; }

  const wf = name
    ? gt.workflows.find(w => w.name === name)
    : gt.workflows.find(w => w.status === "in-progress");

  if (!wf) {
    replyWarn(_ctx, `'${name || "active"}' not found. /pw-ls`);
    return;
  }

  reply(_ctx, [
    `📍 ${wf.name}`,
    `Project: ${wf.cwd}`,
    `Stage: ${PHASE_NAMES[wf.currentPhase]}`,
    `\ncd ${wf.cwd}\n/pw-resume name=${wf.name}`
  ].join("\n"));
}

// ── RENAME ───────────────────────────────────────────────────────────

function cmdRename(_pi: ExtensionAPI, args: string, ctx: CmdCtx) {
  const wd = resolveProjectDir(ctx.cwd);
  const parsed = parseArgs(args);
  // Join all positional tokens (like cmdStart) — renameWorkflow toSafeNames internally
  const newName = parsed.name || (parsed._.length > 0 ? parsed._.join(" ") : undefined);
  if (!newName || newName.trim().length < 2) {
    replyWarn(ctx, "Usage: /pw-rename novo-nome");
    return;
  }

  const wf = getActiveWorkflow(wd);
  if (!wf) { noActive(ctx); return; }

  const result = renameWorkflow(wd, wf.name, newName);
  if (!result.ok) { replyWarn(ctx, `❌ ${result.error}`); return; }

  updateFooter(ctx, wd);
  ctx.ui?.notify(`✨ Renamed to "${toSafeName(newName)}"`, "info");
}

// ── MENU ─────────────────────────────────────────────────────────────

function cmdMenu(_pi: ExtensionAPI, _args: string, ctx: CmdCtx) {
  const wd = resolveProjectDir(ctx.cwd);
  showOverlay(ctx, wd);
  // Overlay is interactive; no notify needed — user sees TUI.
}

// ── INBOX ─────────────────────────────────────────────────────────────

function cmdInbox(_pi: ExtensionAPI, args: string, ctx: CmdCtx) {
  const wd = resolveProjectDir(ctx.cwd);
  const parsed = parseArgs(args);
  const items = readInbox(wd);

  // /pw-inbox add <item>
  if (parsed.add !== undefined) {
    const item = parsed.add || parsed._.join(" ");
    if (!item) {
      replyWarn(ctx, "Usage: /pw-inbox add <item text>");
      return;
    }
    addToInbox(wd, item);
    ctx.ui?.notify(`📥 Added to inbox: ${item.slice(0, 50)}`, "info");
    return;
  }

  // /pw-inbox remove <item>
  if (parsed.remove || parsed.rm) {
    const item = parsed.remove || parsed.rm;
    removeFromInbox(wd, item);
    ctx.ui?.notify(`🗑️ Removed from inbox`, "info");
    return;
  }

  // /pw-inbox clear
  if (parsed.clear) {
    clearInbox(wd);
    ctx.ui?.notify(`🗑️ Inbox cleared`, "info");
    return;
  }

  // /pw-inbox (show)
  if (items.length === 0) {
    reply(ctx, "📥 Inbox is empty.");
  } else {
    const lines = ["📥 Inbox:", "", ...items.map((item, i) => `${i + 1}. ${item}`)];
    reply(ctx, lines.join("\n"));
  }
}

// ── TODO ──────────────────────────────────────────────────────────────

function cmdTodo(_pi: ExtensionAPI, args: string, ctx: CmdCtx) {
  const wd = resolveProjectDir(ctx.cwd);
  const wf = getActiveWorkflow(wd);
  if (!wf) { noActive(ctx); return; }

  const parsed = parseArgs(args);
  const todos = getPhaseTodosFromCache(wd, wf);

  // /pw-todo add <task>
  if (parsed.add !== undefined) {
    const task = parsed.add || parsed._.join(" ");
    if (!task) {
      replyWarn(ctx, "Usage: /pw-todo add <task text>");
      return;
    }
    const phasePrefix = PHASE_NAMES[wf.currentPhase].toUpperCase().slice(0, 4);
    const newId = `${phasePrefix}-${todos.length + 1}`;
    const newTodo: PhaseTodo = {
      id: newId,
      content: task,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    todos.push(newTodo);
    setPhaseTodos(todos);
    writePhaseTodos(wd, wf, todos);
    ctx.ui?.notify(`✓ Added ${newId}: ${task.slice(0, 40)}`, "info");
    return;
  }

  // /pw-todo complete <id>
  if (parsed.complete || parsed.done) {
    const id = parsed.complete || parsed.done;
    const todo = todos.find(t => t.id === id);
    if (!todo) {
      replyWarn(ctx, `Todo not found: ${id}`);
      return;
    }
    todo.status = "completed";
    todo.completedAt = new Date().toISOString();
    setPhaseTodos(todos);
    writePhaseTodos(wd, wf, todos);
    ctx.ui?.notify(`✓ Completed ${id}`, "info");
    return;
  }

  // /pw-todo (show)
  if (todos.length === 0) {
    const phaseName = PHASE_NAMES[wf.currentPhase];
    reply(ctx, `${phaseName} phase — no todos yet. Use /pw-todo add <task>`);
  } else {
    const lines = [`${PHASE_NAMES[wf.currentPhase]} todos:`, ""];
    for (const todo of todos) {
      const icon = TASK_ICONS[todo.status];
      lines.push(`${icon} [${todo.id}] ${todo.content}`);
    }
    reply(ctx, lines.join("\n"));
  }
}

// ── ARCHIVE ──────────────────────────────────────────────────────────

function cmdArchive(_pi: ExtensionAPI, args: string, ctx: CmdCtx) {
  const wd = resolveProjectDir(ctx.cwd);
  const parsed = parseArgs(args);

  // ── /pw-archive purge — delete archived workflow dirs from disk ──
  if (parsed._.includes("purge") || parsed.purge !== undefined) {
    const diskWfs = scanWorkflowDirs(wd).filter(dw => dw.status === "archived");
    if (diskWfs.length === 0) {
      replyWarn(ctx, "No archived workflows to purge.");
      return;
    }
    let deleted = 0;
    for (const dw of diskWfs) {
      const dirPath = join(wd, WORKFLOW_DIR, dw.dateStamp, dw.dirHash);
      try {
        rmSync(dirPath, { recursive: true, force: true });
        deleted++;
      } catch { /* skip if can't delete */ }
      removeWorkflowFromTracking(wd, dw.name);
    }
    reply(ctx, `🗑️ Purged ${deleted} archived workflow(s) from disk.`);
    return;
  }

  // ── /pw-archive name=X — archive specific workflow ─────────────
  const name = parsed.name || parsed._[0];
  if (name) {
    const t = readTracking(wd);
    const gt = readGlobalTracking();
    const wf = t?.workflows.find(w => w.name === name) ||
               gt?.workflows.find(w => w.name === name);
    if (!wf) {
      replyWarn(ctx, `Workflow '${name}' not found. /pw-ls`);
      return;
    }
    // Mark archived on disk
    archiveWorkflowOnDisk(wd, name);
    // Update tracking
    if (t) {
      const idx = t.workflows.findIndex(w => w.name === name);
      if (idx !== -1) {
        t.workflows[idx].status = "archived";
        t.workflows[idx].updated = new Date().toISOString();
        writeTracking(wd, t);
      }
    }
    if (gt) {
      const idx = gt.workflows.findIndex(w => w.name === name);
      if (idx !== -1) {
        gt.workflows[idx].status = "archived";
        writeGlobalTracking(gt);
      }
    }
    reply(ctx, `📦 Workflow '${name}' archived.`);
    if (name === getActiveWorkflow(wd)?.name) {
      ctx.ui?.setStatus("workflow", undefined);
    }
    return;
  }

  // ── /pw-archive — archive active workflow ─────────────────────
  const wf = getActiveWorkflow(wd);
  if (!wf) { noActive(ctx); return; }

  const t = readTracking(wd);
  if (t) {
    const idx = t.workflows.findIndex(w => w.name === wf.name);
    if (idx !== -1) {
      t.workflows[idx].status = "archived";
      t.workflows[idx].updated = new Date().toISOString();
      writeTracking(wd, t);
    }
  }
  const gt = readGlobalTracking();
  if (gt) {
    const idx = gt.workflows.findIndex(w => w.name === wf.name);
    if (idx !== -1) gt.workflows[idx].status = "archived";
    writeGlobalTracking(gt);
  }
  archiveWorkflowOnDisk(wd, wf.name);

  ctx.ui?.setStatus("workflow", undefined);
  reply(ctx, `📦 Workflow '${wf.name}' archived.`);
}

// ── UNARCHIVE ────────────────────────────────────────────────────────

function cmdUnarchive(_pi: ExtensionAPI, args: string, ctx: CmdCtx) {
  const wd = resolveProjectDir(ctx.cwd);
  const parsed = parseArgs(args);
  const name = parsed.name || parsed._[0];

  if (!name) {
    replyWarn(ctx, "Usage: /pw-unarchive name=<workflow>");
    return;
  }

  // Find archived workflow
  const diskWfs = scanWorkflowDirs(wd);
  const archived = diskWfs.find(dw => dw.name === name && dw.status === "archived");

  if (!archived) {
    replyWarn(ctx, `Archived workflow '${name}' not found. /pw-ls archived`);
    return;
  }

  // Update on disk
  const indexPath = join(wd, WORKFLOW_DIR, archived.dateStamp, archived.dirHash, "index.json");
  try {
    const raw = JSON.parse(readFileSync(indexPath, "utf-8"));
    raw.workflow_status = "paused";
    raw.updated_at = new Date().toISOString();
    writeFileSync(indexPath, JSON.stringify(raw, null, 2));
  } catch {
    replyWarn(ctx, `Failed to update disk state for '${name}'.`);
    return;
  }

  // Update tracking
  const t = readTracking(wd);
  if (t) {
    const idx = t.workflows.findIndex(w => w.name === name);
    if (idx !== -1) {
      t.workflows[idx].status = "paused";
      t.workflows[idx].updated = new Date().toISOString();
      writeTracking(wd, t);
    }
  }
  const gt = readGlobalTracking();
  if (gt) {
    const idx = gt.workflows.findIndex(w => w.name === name);
    if (idx !== -1) {
      gt.workflows[idx].status = "paused";
      writeGlobalTracking(gt);
    }
  }

  reply(ctx, `📦 Workflow '${name}' unarchived. Use /pw-resume name=${name} to continue.`);
}

// =============================================================================
// COMMAND DESCRIPTIONS (Source of Truth)
// =============================================================================

// Re-export WORKFLOW_COMMANDS for other modules that need command definitions
// Re-export for external consumers
export { WORKFLOW_COMMANDS } from "./adapters/commands/dispatcher";
export type { CommandDescriptor } from "./adapters/commands/dispatcher";

// ── Single source of truth: handler lookups ──────────────────────────
// Handlers are keyed by command name (derived from WORKFLOW_COMMANDS).
// When you add a command to dispatcher.ts, add its handler here.

const HANDLER_BY_NAME: Record<string, CmdHandler> = {
  "pw-start":      cmdStart,
  "pw-stop":       cmdStop,
  "pw-pause":      cmdPause,
  "pw-resume":     cmdResume,
  "pw-status":     cmdStatus,
  "pw-ls":         cmdList,
  "pw-setphase":   cmdSetPhase,
  "pw-next":       cmdNext,
  "pw-complete":   cmdComplete,
  "pw-goto":       cmdGoto,
  "pw-rename":     cmdRename,
  "pw-menu":       cmdMenu,
  "pw-archive":    cmdArchive,
  "pw-unarchive":  cmdUnarchive,
  "pw-todo":       cmdTodo,
  "pw-inbox":      cmdInbox,
};

function getDescription(cmdName: string): string {
  const c = WORKFLOW_COMMANDS.find(e => e.name === cmdName);
  return c ? `${c.description}. Usage: ${c.usage || c.name}` : "";
}

// =============================================================================
// REGISTRATION
// =============================================================================

/** Get command handler by name. */
export function getCommandHandler(name: string): CmdHandler | null {
  return HANDLER_BY_NAME[name] ?? null;
}

/** Get all command names with descriptions. */
export function getCommandNames(): Array<{ canonical: string; alias: string; description: string }> {
  return WORKFLOW_COMMANDS.map(c => ({
    canonical: c.name,
    alias: c.name,
    description: `${c.description}. Usage: ${c.usage || c.name}`,
  }));
}

/** Execute a command by name (used by adapters). */
export function executeCommand(
  pi: ExtensionAPI,
  commandName: string,
  args: string,
  ctx: CmdCtx
): void | Promise<void> {
  const handler = getCommandHandler(commandName);
  if (handler) handler(pi, args, ctx);
}

/**
 * Register commands with the Pi extension.
 * Derives from WORKFLOW_COMMANDS (single source of truth).
 */
export function registerCommands(pi: ExtensionAPI): void {
  for (const c of WORKFLOW_COMMANDS) {
    const handler = HANDLER_BY_NAME[c.name];
    if (!handler) {
      console.warn(`[cali-product-workflow] No handler for command: ${c.name}`);
      continue;
    }
    const wrapper = async (args: string, ctx: any) => handler(pi, args ?? "", ctx as CmdCtx);
    const desc = `${c.description}. Usage: ${c.usage || c.name}`;
    pi.registerCommand(c.name, { description: desc, handler: wrapper });
  }
}

// ── Command Registration System for Multi-CLI ───────────────────────

/**
 * Get command files for a specific CLI.
 * Used by adapters to generate CLI-specific command files.
 */
export function getCommandFilesForCLI(cli: string): Array<{ path: string; content: string }> {
  const commandFiles: Array<{ path: string; content: string }> = [];
  
  for (const cmd of WORKFLOW_COMMANDS) {
    const desc = `${cmd.description}. Usage: ${cmd.usage || cmd.name}`;
    
    switch (cli) {
      case "opencode":
      case "claude-code":
        commandFiles.push({
          path: `skills/${cmd.name}.md`,
          content: generateSkillFile(cmd.name, desc, cmd.piOnly || false),
        });
        break;
      case "codex":
        commandFiles.push({
          path: `commands/${cmd.name}.md`,
          content: generateCommandFile(cmd.name, desc, cmd.piOnly || false),
        });
        break;
    }
  }
  
  return commandFiles;
}

function generateSkillFile(name: string, description: string, piOnly: boolean): string {
  const banner = piOnly
    ? `---
name: ${name}
description: [Pi only] ${description}
---

> ⚠️ This command requires the Pi extension for full functionality.
> Use /skill:cali-product-workflow and ask to ${name}.

/skill:cali-product-workflow
`
    : `---
name: ${name}
description: ${description}
---

/skill:cali-product-workflow

${name} {args}
`;
  return banner;
}

function generateCommandFile(name: string, description: string, piOnly: boolean): string {
  const banner = piOnly
    ? `---
name: ${name}
description: [Pi only] ${description}
---

@agent
> ⚠️ This command requires the Pi extension. Use the skill instead.
/skill:cali-product-workflow
`
    : `---
name: ${name}
description: ${description}
---

@agent
${name} {args}
`;
  return banner;
}