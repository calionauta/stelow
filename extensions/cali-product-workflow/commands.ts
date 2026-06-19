// @lat: [[architecture#System Layers#Extension Layer]]
import { rmSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
// @ts-ignore - Optional peer dependency for Pi environment
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { Workflow, StageState } from "./types";
import { WORKFLOW_DIR, PHASE_NAMES, STAGE } from "./types";
import {
  readTracking, writeTracking, readGlobalTracking, writeGlobalTracking,
  getActiveWorkflow, renameWorkflow, toSafeName, reconcileTracking, scanWorkflowDirs,
  archiveWorkflowOnDisk, updateWorkflowIndexJson, resolveProjectDir,
  readInbox, addToInbox, removeFromInbox, clearInbox,
  findWorkflowIndexByName, findWorkflowIndexForProject, isWorkflowFromProject, isSamePath,
  removeGlobalIndexEntry, addToGlobalIndex,
} from "./state";
import { updateFooter, notifyPhase, showOverlay, getUIAdapter } from "./ui";
import { diagnoseWorkflowProject, formatDoctorReport, repairWorkflowProject, countFixable } from "./doctor";
import cmdStart from "./start";

// ── Stages Guard (pure file-state management) ────────────────────────
import { PHASE_TO_STAGE, syncStagesGuardState } from "./stages-guard";

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
function removeWorkflowFromTracking(cwd: string, workflowName: string, wf?: Pick<Workflow, "name" | "dirHash">): void {
  // Mark archived on disk so reconcileTracking doesn't re-import it
  archiveWorkflowOnDisk(cwd, workflowName);
  // Fallback direto via dirHash (mais robusto que busca por nome)
  if (wf?.dirHash) {
    updateWorkflowIndexJson(cwd, wf as Workflow, {
      workflow_status: "archived",
    });
  }

  const t = readTracking(cwd);
  if (t) {
    t.workflows = t.workflows.filter(w => w.name !== workflowName);
    writeTracking(cwd, t);
  }

  removeGlobalIndexEntry(cwd, workflowName);
}

// ── STOP ─────────────────────────────────────────────────────────────

function cmdAbort(_pi: ExtensionAPI, args: string, ctx: CmdCtx) {
  const wd = resolveProjectDir(ctx.cwd);
  const parsed = parseArgs(args);

  // Gather all workflows from: current dir reconcile + global tracking (same cwd)
  const fromDisk = reconcileTracking(wd);
  const fromGlobal = readGlobalTracking()?.workflows
    .filter(w => !fromDisk.some(dw => dw.name === w.name) && isWorkflowFromProject(w, wd)) ?? [];
  const allWfs = [...fromDisk, ...fromGlobal];
  const stoppable = allWfs.filter(w =>
    w.status === "in-progress" || w.status === "paused"
  );

  if (stoppable.length === 0) {
    replyWarn(ctx, "No active or paused workflows to stop.");
    return;
  }

  // ── /pw-abort all ───────────────────────────────────────────────
  if (parsed._.includes("all") || parsed.all !== undefined) {
    for (const w of stoppable) {
      removeWorkflowFromTracking(wd, w.name, w);
    }
    ctx.ui?.notify(`❌ Stopped ${stoppable.length} workflow(s).`, "info");
    ctx.ui?.setStatus("workflow", undefined);
    return;
  }

  // ── /pw-abort <name1> <name2> ───────────────────────────────────
  if (parsed._.length > 0) {
    let count = 0;
    for (const wfName of parsed._) {
      const found = stoppable.find(w => w.name === wfName);
      if (found) {
        removeWorkflowFromTracking(wd, wfName, found);
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

  // ── /pw-abort (no args) — picker se >1, direto se for 1 ──────
  if (stoppable.length === 1) {
    const wfName = stoppable[0].name;
    removeWorkflowFromTracking(wd, wfName, stoppable[0]);
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
      description: `${PHASE_NAMES[w.currentPhase]} — /pw-abort ${w.name}`
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
      .filter(w => !diskWfs.some(dw => dw.name === w.name) && isWorkflowFromProject(w, cwd));
    const allWfs = [...diskWfs, ...globalWfs].filter(w =>
      w.status === "in-progress" || w.status === "paused"
    );
    for (const w of allWfs) {
      removeWorkflowFromTracking(cwd, w.name, w);
    }
    adapter.notify(`❌ Stopped ${allWfs.length} workflow(s).`, "info");
    adapter.clearStatus();
  } else if (selection && selection !== "__cancel__") {
    // Find workflow in context for dirHash fallback
    const selWf = reconcileTracking(cwd).find(w => w.name === selection)
      ?? getActiveWorkflow(cwd);
    removeWorkflowFromTracking(cwd, selection, selWf ?? undefined);
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
  // Sync index.json on disk (write-through)
  updateWorkflowIndexJson(wd, wf, {
    workflow_status: "paused",
  });

  // Sync stages guard state
  syncStagesGuardState(wd, wf.currentPhase);

  ctx.ui?.setStatus("workflow", ctx.ui?.theme?.fg("warning", `⏸ ${wf.name}`));
  reply(ctx, `⏸ Workflow '${wf.name}' paused.`);
}

function cmdResume(pi: ExtensionAPI, args: string, ctx: CmdCtx) {
  const wd = resolveProjectDir(ctx.cwd);
  const parsed = parseArgs(args);
  const name = parsed.name || parsed._[0];
  const t = readTracking(wd);

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

  // Block if resuming a different workflow while another is already active
  const active = getActiveWorkflow(wd);
  if (active && active.name !== paused.name) {
    replyWarn(ctx, `Cannot resume "${paused.name}" — workflow "${active.name}" is already active. Pause, archive, complete or abort it first.`);
    return;
  }

  if (t) {
    const idx = t.workflows.findIndex(w => w.name === paused.name);
    if (idx !== -1) t.workflows[idx].status = "in-progress";
    writeTracking(wd, t);
  }
  // Sync index.json on disk (write-through)
  updateWorkflowIndexJson(wd, paused, {
    workflow_status: "in-progress",
  });

  // Sync stages guard state
  syncStagesGuardState(wd, paused.currentPhase);

  updateFooter(ctx, wd);
  reply(ctx, `▶️ '${paused.name}' resumed. Stage: ${PHASE_NAMES[paused.currentPhase]}`);
}

// ── STATUS ───────────────────────────────────────────────────────────

function cmdStatus(_pi: ExtensionAPI, _args: string, ctx: CmdCtx) {
  const wd = resolveProjectDir(ctx.cwd);
  const wf = getActiveWorkflow(wd);
  if (!wf) {
    replyWarn(ctx, "No active Workflow.\n\n/pw-start /pw-start @brief.md /pw-start \"desc\"");
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
    // Show scope progress during Execution phase
    ...(wf.scopes && wf.scopes.length > 0 && wf.currentPhase === STAGE.EXECUTION() ? [
      "",
      `Scopes: ${wf.scopes.filter(s => s.status === 'completed').length}/${wf.scopes.length} completed`,
      ...wf.scopes.map(s => {
        const icon = s.status === 'completed' ? '✓' :
          s.status === 'in-progress' ? '◆' :
          s.status === 'escalated' || s.status === 'failed' ? '✗' : '○';
        return `  ${icon} ${s.name} [${s.type}]`;
      }),
    ] : []),
    "",
    "/pw-next  /pw-abort  /pw-menu"
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
    const seenInProjects = new Set<string>();
    for (const dir of [...new Set(candidates)]) {
      const diskWfs = scanWorkflowDirs(dir);
      if (diskWfs.length === 0) continue;
      lines.push(`📁 ${dir}:`);
      for (const dw of diskWfs) {
        const key = `${dw.name}:${dw.dirHash}:${dir}`;
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
    const currentKeys = new Set(reconciled.map(w => `${w.name}\0${w.cwd || wd}`));
    const other = gt.workflows.filter(gw => !currentKeys.has(`${gw.name}\0${gw.cwd || wd}`));
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
  // Sync index.json on disk (write-through)
  updateWorkflowIndexJson(wd, wf, {
    current_phase: PHASE_NAMES[phase].toLowerCase(),
    current_phase_index: phase,
    workflow_status: "in-progress",
  });

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

  // ── Phase-skip: some phases are auto-skipped (no user interaction needed) ──
  // After Setup (2), skip Context (3) — the skill handles context inline.
  // Add entries here as needed.
  const SKIP_NEXT: Record<number, number> = {
    [STAGE.SETUP()]: STAGE.SHAPE(),
  };

  const target = SKIP_NEXT[wf.currentPhase];
  let next: number;
  if (target !== undefined) {
    next = target;
    // Mark skipped phases as "completed"
    for (let i = wf.currentPhase + 1; i < target; i++) {
      wf.phases[i].status = "completed";
    }
  } else {
    next = wf.currentPhase + 1;
  }

  // ── Scope completion gate: block advance from Execution if scopes incomplete ──
  if (wf.currentPhase === STAGE.EXECUTION() && next === STAGE.VERIFICATION()) {
    const scopes = wf.scopes;
    if (scopes && scopes.length > 0) {
      const incomplete = scopes.filter(s => s.status !== 'completed');
      if (incomplete.length > 0) {
        const summary = incomplete.map(s => `  • ${s.name} [${s.status}]`).join('\n');
        replyWarn(ctx, [
          `⚠️ Cannot advance to Verification — ${incomplete.length}/${scopes.length} scope(s) not completed:`,
          summary,
          '',
          'Complete or escalate all scopes before advancing. Use /pw-abort to stop.',
        ].join('\n'));
        return;
      }
    }
  }

  // ── Audit re-injection loop: if pending scopes exist, loop back to Execution ──
  if (wf.currentPhase === STAGE.AUDIT() && next >= PHASE_NAMES.length) {
    const pendingScopes = wf.scopes?.filter(s => s.status === 'pending' || s.status === 'in-progress') ?? [];
    if (pendingScopes.length > 0) {
      // Loop back to Execution — scope executor will pick up pending scopes
      const tLoop = readTracking(wd);
      if (tLoop) {
        const idxLoop = tLoop.workflows.findIndex(w => w.name === wf.name);
        if (idxLoop !== -1) {
          tLoop.workflows[idxLoop].currentPhase = STAGE.EXECUTION();
          tLoop.workflows[idxLoop].phases.forEach((p, i) => {
            p.status = i < STAGE.EXECUTION() ? 'completed' : i === STAGE.EXECUTION() ? 'in-progress' : 'pending';
          });
          tLoop.workflows[idxLoop].updated = new Date().toISOString();
          writeTracking(wd, tLoop);
        }
      }
      wf.currentPhase = STAGE.EXECUTION();
      updateFooter(ctx, wd);
      syncStagesGuardState(wd, STAGE.EXECUTION());
      const summary = pendingScopes.map(s => `  • ${s.name} [${s.status}]`).join('\n');
      reply(ctx, [
        `🔄 Audit found ${pendingScopes.length} open scope(s) — looping back to Execution:`,
        summary,
        '',
        'Scope executor will handle these automatically.',
      ].join('\n'));
      return;
    }
  }

  if (next >= PHASE_NAMES.length) {
    // Auto-complete — no manual /pw-complete command needed
    ctx.ui?.setStatus("workflow", undefined);
    const tComplete = readTracking(wd);
    if (tComplete) {
      const idxComplete = tComplete.workflows.findIndex(w => w.name === wf.name);
      if (idxComplete !== -1) {
        tComplete.workflows[idxComplete].status = "completed";
        tComplete.workflows[idxComplete].phases.forEach(p => { p.status = "completed"; });
        tComplete.workflows[idxComplete].updated = new Date().toISOString();
        writeTracking(wd, tComplete);
      }
    }
    // Sync wf in-memory state
    wf.phases.forEach(p => { p.status = "completed"; });
    wf.status = "completed";
    updateWorkflowIndexJson(wd, wf, {
      workflow_status: "completed",
      current_phase_index: PHASE_NAMES.length - 1,
      current_phase: PHASE_NAMES[PHASE_NAMES.length - 1].toLowerCase(),
    });
    syncStagesGuardState(wd, PHASE_NAMES.length - 1);
    updateFooter(ctx, wd);
    ctx.ui?.notify(`🎉 ${wf.name} completed!`, "info");
    reply(ctx, "✅ Workflow completo!");
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
  // Sync index.json on disk (write-through — third state source)
  updateWorkflowIndexJson(wd, wf, {
    current_phase: PHASE_NAMES[next].toLowerCase(),
    current_phase_index: next,
    workflow_status: "in-progress",
  });

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
  // Sync index.json on disk
  updateWorkflowIndexJson(wd, wf, {
    workflow_status: "completed",
    current_phase_index: PHASE_NAMES.length - 1,
    current_phase: PHASE_NAMES[PHASE_NAMES.length - 1].toLowerCase(),
  });

  // Sync stages guard state
  syncStagesGuardState(wd, PHASE_NAMES.length - 1);

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
    ? (gt.workflows.find(w => w.name === name && isWorkflowFromProject(w, wd))
        ?? gt.workflows.find(w => w.name === name))
    : (gt.workflows.find(w => isWorkflowFromProject(w, wd))
        ?? gt.workflows[0]);

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

// ── DOCTOR ───────────────────────────────────────────────────────────

async function cmdDoctor(_pi: ExtensionAPI, _args: string, ctx: CmdCtx): Promise<void> {
  const wd = resolveProjectDir(ctx.cwd);
  const report = diagnoseWorkflowProject(wd);
  const fixable = countFixable(report);
  const output = formatDoctorReport(report);
  const parsed = parseArgs(_args);

  // ── /pw-doctor --fix: auto-apply without asking ──────────────
  if (parsed.fix !== undefined || parsed._.includes("fix")) {
    if (fixable === 0) {
      reply(ctx, output + "\n\nNo fixable issues found. Nothing to fix.");
      return;
    }
    const fixes = repairWorkflowProject(wd, report);
    // Re-run diagnostics after fixes
    const updated = diagnoseWorkflowProject(wd);
    reply(ctx, formatDoctorReport(updated)
      + `\n\n✅ Applied ${fixes.length} auto-fix(es):\n`
      + fixes.map(f => `  • ${f}`).join("\n")
    );
    return;
  }

  reply(ctx, output);

  // ── Interactive: if fixable issues exist, offer to fix ───────
  if (fixable > 0) {
    const adapter = getUIAdapter();
    const choice = await adapter.select([
      { value: "fix", label: `✅ Fix ${fixable} issue(s)` },
      { value: "skip", label: "Skip" },
    ], `🩺 ${fixable} fixable issue(s) detected. Apply auto-fixes?`);

    if (choice === "fix") {
      const fixes = repairWorkflowProject(wd, report);
      const updated = diagnoseWorkflowProject(wd);
      ctx.ui?.notify(`✅ Applied ${fixes.length} auto-fix(es)`, "success");
      reply(ctx, formatDoctorReport(updated)
        + `\n\n✅ Applied ${fixes.length} auto-fix(es):\n`
        + fixes.map(f => `  • ${f}`).join("\n")
      );
    }
  }
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
      removeWorkflowFromTracking(wd, dw.name, dw);
    }
    reply(ctx, `🗑️ Purged ${deleted} archived workflow(s) from disk.`);
    return;
  }

  // ── /pw-archive name=X — archive specific workflow ─────────────
  const name = parsed.name || parsed._[0];
  if (name) {
    const t = readTracking(wd);
    const gt = readGlobalTracking();
    const localIdx = findWorkflowIndexByName(t?.workflows ?? [], name);
    const globalIdx = findWorkflowIndexForProject(gt?.workflows ?? [], wd, name);
    const localWorkflow = localIdx !== -1 ? t!.workflows[localIdx] : null;
    const globalWorkflow = globalIdx !== -1 ? gt!.workflows[globalIdx] : null;
    const wf = localWorkflow || globalWorkflow;

    if (!wf) {
      replyWarn(ctx, `Workflow '${name}' not found in this project. /pw-ls`);
      return;
    }

    // Mark archived: nome-based search + fallback direto via dirHash
    archiveWorkflowOnDisk(wd, name);
    if (wf.dirHash) {
      // Sync via dirHash (mais robusto que busca por nome)
      updateWorkflowIndexJson(wd, wf, {
        workflow_status: "archived",
      });
    }

    if (t && localIdx !== -1) {
      t.workflows[localIdx].status = "archived";
      writeTracking(wd, t);
    }

    if (localWorkflow) {
      removeGlobalIndexEntry(wd, localWorkflow.name);
    } else if (gt && globalIdx !== -1) {
      removeGlobalIndexEntry(wd, name);
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
  removeGlobalIndexEntry(wd, wf.name);
  archiveWorkflowOnDisk(wd, wf.name);
  if (wf.dirHash) {
    // Sync via dirHash (mais robusto — cobertura extra)
    updateWorkflowIndexJson(wd, wf, {
      workflow_status: "archived",
    });
  }

  ctx.ui?.setStatus("workflow", undefined);
  reply(ctx, `📦 Workflow '${wf.name}' archived.`);
}

// ── UNLOCK ───────────────────────────────────────────────────────────

/**
 * Disable the stage guard for this session by setting the env escape hatch.
 * Reopen pi to re-enable. Useful for debugging or when the user wants to
 * keep the workflow metadata but work freely.
 */
function cmdUnlock(_pi: ExtensionAPI, _args: string, ctx: CmdCtx) {
  process.env.CALI_PW_GUARD = "off";
  reply(ctx, "🔓 Stages guard disabled for this session. Reopen pi to re-enable.");
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
    raw.status = "paused";
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
  const archivedWorkflow: Workflow = {
    name: archived.name,
    description: "",
    draftContent: archived.draftContent,
    status: archived.status as Workflow["status"],
    currentPhase: archived.currentPhase,
    phases: PHASE_NAMES.map((name, i) => ({ id: String(i), name, status: "pending" })),
    created: archived.created,
    updated: archived.updated,
    dirHash: archived.dirHash,
    stage: {
      current_stage: "shape",
      previous_stage: null,
      transitioned_at: archived.updated,
      history: [],
      gates_passed: [],
      supervisor_active: false,
    } satisfies StageState,
    cwd: wd,
  };
  addToGlobalIndex(archivedWorkflow);

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
  "pw-abort":      cmdAbort,
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
  "pw-doctor":     cmdDoctor,
  "pw-archive":    cmdArchive,
  "pw-unarchive":  cmdUnarchive,
  "pw-unlock":     cmdUnlock,
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