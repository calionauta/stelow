import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { GLOBAL_TRACKING_FILE, TRACKING_FILE, WORKFLOW_DIR, PHASE_NAMES, type Workflow } from "./types";
import {
  getActiveWorkflow,
  isSamePath,
  isWorkflowFromProject,
  readGlobalTracking,
  readTracking,
  writeTracking,
  resolveProjectDir,
} from "./state";

export type DoctorSeverity = "ok" | "info" | "warn" | "error";

export interface DoctorIssue {
  severity: DoctorSeverity;
  code: string;
  message: string;
  detail?: string;
}

export interface DoctorReport {
  projectDir: string;
  trackingPath: string;
  globalPath: string;
  trackingExists: boolean;
  globalExists: boolean;
  localWorkflowCount: number;
  globalWorkflowCount: number;
  activeWorkflowName: string | null;
  issues: DoctorIssue[];
  summary: Record<DoctorSeverity, number>;
}

interface WorkflowIndexSnapshot {
  path: string;
  status?: string;
  currentPhase?: number;
}

const HIDDEN_STATUSES = new Set(["archived", "aborted", "stopped", "cancelled", "canceled"]);

export function diagnoseWorkflowProject(cwd: string): DoctorReport {
  const projectDir = resolveProjectDirSafe(cwd);
  const trackingPath = join(projectDir, TRACKING_FILE);
  const globalPath = join(homedir(), GLOBAL_TRACKING_FILE);
  const issues: DoctorIssue[] = [];

  const tracking = readTracking(projectDir);
  const global = readGlobalTracking();

  const trackingExists = Boolean(tracking);
  const globalExists = Boolean(global);

  if (!trackingExists) {
    issues.push({
      severity: "error",
      code: "tracking-missing",
      message: "Local tracking file is missing.",
      detail: trackingPath,
    });
  } else {
    issues.push({
      severity: "ok",
      code: "tracking-present",
      message: "Local tracking file exists.",
      detail: trackingPath,
    });
  }

  if (!globalExists) {
    issues.push({
      severity: "warn",
      code: "global-missing",
      message: "Global tracking file is missing.",
      detail: globalPath,
    });
  } else {
    issues.push({
      severity: "ok",
      code: "global-present",
      message: "Global tracking file exists.",
      detail: globalPath,
    });
  }

  const localWorkflows = tracking?.workflows ?? [];
  const globalWorkflows = global?.workflows ?? [];
  const activeWorkflow = getActiveWorkflow(projectDir);

  if (activeWorkflow) {
    issues.push({
      severity: "ok",
      code: "active-local",
      message: `Active local workflow: ${activeWorkflow.name}`,
      detail: `phase=${activeWorkflow.currentPhase + 1}`,
    });
  } else {
    issues.push({
      severity: "info",
      code: "no-active-local",
      message: "No active local workflow.",
    });
  }

  diagnoseLocalWorkflows(projectDir, localWorkflows, globalWorkflows, issues);
  diagnoseGlobalWorkflows(projectDir, localWorkflows, globalWorkflows, issues);
  diagnoseZombieIndexes(projectDir, localWorkflows, issues);

  return {
    projectDir,
    trackingPath,
    globalPath,
    trackingExists,
    globalExists,
    localWorkflowCount: localWorkflows.length,
    globalWorkflowCount: globalWorkflows.length,
    activeWorkflowName: activeWorkflow?.name ?? null,
    issues,
    summary: summarizeIssues(issues),
  };
}

function diagnoseLocalWorkflows(
  projectDir: string,
  localWorkflows: Workflow[],
  globalWorkflows: Workflow[],
  issues: DoctorIssue[]
): void {
  const seenNames = new Map<string, number>();

  for (const wf of localWorkflows) {
    seenNames.set(wf.name, (seenNames.get(wf.name) ?? 0) + 1);

    if (HIDDEN_STATUSES.has(wf.status)) {
      issues.push({
        severity: "info",
        code: "local-hidden-status",
        message: `Local workflow is hidden/terminal: ${wf.name}`,
        detail: `status=${wf.status}`,
      });
    }

    if (wf.cwd && !isWorkflowFromProject(wf, projectDir)) {
      issues.push({
        severity: "warn",
        code: "local-stale-cwd",
        message: `Local workflow points outside this project: ${wf.name}`,
        detail: `workflow cwd=${wf.cwd}; project=${projectDir}`,
      });
    }

    const index = readWorkflowIndexSnapshot(projectDir, wf);
    if (!index) {
      issues.push({
        severity: "warn",
        code: "index-missing",
        message: `Workflow index.json is missing: ${wf.name}`,
        detail: wf.dirHash || "missing dirHash",
      });
    } else {
      if (index.status && index.status !== wf.status) {
        issues.push({
          severity: "warn",
          code: "index-status-mismatch",
          message: `Workflow index status differs from local tracking: ${wf.name}`,
          detail: `index=${index.status}; local=${wf.status}`,
        });
      }
      if (index.currentPhase !== undefined && index.currentPhase !== wf.currentPhase) {
        issues.push({
          severity: "warn",
          code: "index-phase-mismatch",
          message: `Workflow index phase differs from local tracking: ${wf.name}`,
          detail: `index=${index.currentPhase}; local=${wf.currentPhase}`,
        });
      }
    }

    const targetCwd = wf.cwd || projectDir;
    const globalMatches = globalWorkflows.filter(gw =>
      globalMatchesLocalWorkflow(gw, wf, projectDir)
    );
    if (globalMatches.length === 0) {
      issues.push({
        severity: "warn",
        code: "global-missing-for-local",
        message: `No global entry for local workflow: ${wf.name}`,
        detail: `cwd=${targetCwd}`,
      });
    } else {
      for (const gw of globalMatches) {
        // Global index no longer stores mutable state; skip status/phase comparison.
      }
    }
  }

  for (const [name, count] of seenNames) {
    if (count > 1) {
      issues.push({
        severity: "warn",
        code: "local-duplicate-name",
        message: `Duplicate local workflow name: ${name}`,
        detail: `count=${count}`,
      });
    }
  }
}

function diagnoseGlobalWorkflows(
  projectDir: string,
  localWorkflows: Workflow[],
  globalWorkflows: Workflow[],
  issues: DoctorIssue[]
): void {
  const seenKeys = new Map<string, number>();
  const localNames = new Set(localWorkflows.map(w => w.name));

  for (const gw of globalWorkflows) {
    const key = `${gw.name}\0${gw.cwd || ""}`;
    seenKeys.set(key, (seenKeys.get(key) ?? 0) + 1);

    if (isWorkflowFromProject(gw, projectDir) && !localNames.has(gw.name)) {
      issues.push({
        severity: "info",
        code: "global-only-current-project",
        message: `Global workflow is not present in local tracking: ${gw.name}`,
        detail: `cwd=${gw.cwd || projectDir}`,
      });
    }

    const sameNameOtherCwd = globalWorkflows.some(other =>
      other.name === gw.name && other !== gw && (other.cwd || "") !== (gw.cwd || "")
    );
    if (sameNameOtherCwd) {
      issues.push({
        severity: "warn",
        code: "global-same-name-other-cwd",
        message: `Global workflow name exists in another project: ${gw.name}`,
        detail: `cwd=${gw.cwd || "?"}`,
      });
    }
  }

  for (const [key, count] of seenKeys) {
    if (count > 1) {
      const [name, cwd] = key.split("\0");
      issues.push({
        severity: "warn",
        code: "global-duplicate-key",
        message: `Duplicate global workflow key: ${name}`,
        detail: `cwd=${cwd || "?"}; count=${count}`,
      });
    }
  }
}

function globalMatchesLocalWorkflow(globalWorkflow: Workflow, localWorkflow: Workflow, projectDir: string): boolean {
  if (globalWorkflow.name !== localWorkflow.name) return false;
  if (!globalWorkflow.cwd && !localWorkflow.cwd) return true;
  return isSamePath(globalWorkflow.cwd || projectDir, localWorkflow.cwd || projectDir);
}

function readWorkflowIndexSnapshot(projectDir: string, wf: Workflow): WorkflowIndexSnapshot | null {
  if (!wf.dirHash || !wf.created) return null;
  const date = wf.created.slice(0, 10);
  const indexPath = join(projectDir, WORKFLOW_DIR, date, wf.dirHash, "index.json");
  if (!existsSync(indexPath)) return null;

  try {
    const index = JSON.parse(readFileSync(indexPath, "utf8"));
    return {
      path: indexPath,
      status: index.workflow_status ?? index.status,
      currentPhase: index.current_phase_index ?? index.currentPhase,
    };
  } catch {
    return { path: indexPath };
  }
}

// ── Repair ───────────────────────────────────────────────────────

const FIXABLE_CODES = new Set([
  "zombie-workflow",
  "index-status-mismatch",
  "index-phase-mismatch",
  "local-stale-cwd",
]);

/**
 * Return true if a doctor issue can be auto-fixed.
 */
export function isFixable(issue: DoctorIssue): boolean {
  return FIXABLE_CODES.has(issue.code);
}

/**
 * Count how many issues in a report are fixable.
 */
export function countFixable(report: DoctorReport): number {
  return report.issues.filter(isFixable).length;
}

/**
 * Apply auto-fixes for all fixable issues in the report.
 * Returns a summary string of what was fixed.
 *
 * Fixes applied:
 * - zombie-workflow: set workflow_status="archived" in index.json
 * - index-status-mismatch: sync index.json workflow_status to local tracking
 * - index-phase-mismatch: sync index.json current_phase_index to local tracking
 */
export function repairWorkflowProject(cwd: string, report: DoctorReport): string[] {
  const fixes: string[] = [];
  const projectDir = report.projectDir;

  const tracking = readTracking(projectDir);

  for (const issue of report.issues) {
    if (!isFixable(issue)) continue;

    if (issue.code === "zombie-workflow") {
      // Extract path from detail: "last updated=... | path=.cali-product-workflow/<date>/<hash>/index.json"
      const pathMatch = issue.detail?.match(/path=(\.cali-product-workflow\/[^\s]+)/);
      if (!pathMatch) continue;
      const indexPath = join(projectDir, pathMatch[1]);
      try {
        const raw = JSON.parse(readFileSync(indexPath, "utf8"));
        raw.workflow_status = "archived";
        raw.updated_at = new Date().toISOString();
        writeFileSync(indexPath, JSON.stringify(raw, null, 2));
        fixes.push(`Archived zombie: ${issue.message}`);
      } catch { /* skip if can't read */ }
      continue;
    }

    if (issue.code === "local-stale-cwd") {
      // Extract workflow name from message: "Local workflow points outside this project: <name>"
      const nameMatch = issue.message.match(/:\s*(.+)$/);
      if (!nameMatch) continue;
      const wfName = nameMatch[1].trim();
      const wf = tracking?.workflows?.find(w => w.name === wfName);
      if (!wf) continue;
      // Archive in local tracking
      wf.status = "archived";
      // Sync index.json on disk if it exists
      if (wf.dirHash && wf.created) {
        const date = wf.created.slice(0, 10);
        const indexPath = join(projectDir, WORKFLOW_DIR, date, wf.dirHash, "index.json");
        if (existsSync(indexPath)) {
          try {
            const raw = JSON.parse(readFileSync(indexPath, "utf8"));
            raw.workflow_status = "archived";
            raw.updated_at = new Date().toISOString();
            writeFileSync(indexPath, JSON.stringify(raw, null, 2));
          } catch { /* skip corrupt */ }
        }
      }
      fixes.push(`Archived stale-cwd workflow: ${wfName}`);
    }
  }

  // Sync index.json to local tracking for every workflow with a dirHash
  if (tracking?.workflows) {
    for (const wf of tracking.workflows) {
      if (!wf.dirHash || !wf.created) continue;
      const date = wf.created.slice(0, 10);
      const indexPath = join(projectDir, WORKFLOW_DIR, date, wf.dirHash, "index.json");
      if (!existsSync(indexPath)) continue;

      let changed = false;
      try {
        const raw = JSON.parse(readFileSync(indexPath, "utf8"));

        // index-status-mismatch: sync index.json to local tracking status
        if (raw.workflow_status !== wf.status) {
          const oldStatus = raw.workflow_status;
          raw.workflow_status = wf.status;
          changed = true;
          fixes.push(`Synced status for "${wf.name}": ${oldStatus} → ${wf.status}`);
        }

        // index-phase-mismatch: sync index.json to local tracking phase
        if ((raw.current_phase_index ?? 0) !== wf.currentPhase) {
          const oldPhase = raw.current_phase_index ?? 0;
          raw.current_phase_index = wf.currentPhase;
          raw.current_phase = wf.phases?.[wf.currentPhase]?.name?.toLowerCase()
            ?? PHASE_NAMES[wf.currentPhase]?.toLowerCase()
            ?? "setup";
          changed = true;
          fixes.push(`Synced phase for "${wf.name}": ${oldPhase} → ${wf.currentPhase}`);
        }

        if (changed) {
          raw.updated_at = new Date().toISOString();
          writeFileSync(indexPath, JSON.stringify(raw, null, 2));
        }
      } catch { /* skip corrupt */ }
    }
  }

  // Persist tracking changes (local-stale-cwd may have archived workflows)
  if (tracking) {
    writeTracking(projectDir, tracking);
  }

  return fixes;
}

// ── Zombie Detection ────────────────────────────────────────────

const ZOMBIE_STALE_MS = 24 * 60 * 60 * 1000; // 24h sem update = zumbi

/**
 * Scan all index.json files under .cali-product-workflow/<date>/<hash>/
 * and flag workflows with workflow_status "in-progress" that haven't been
 * updated in >24h. These are workflows that were never finalized (e.g.
 * the session timed out before /pw-complete was typed).
 *
 * Skips index entries that match an active local workflow (those are
 * legitimately in-progress).
 */
function diagnoseZombieIndexes(
  projectDir: string,
  localWorkflows: Workflow[],
  issues: DoctorIssue[]
): void {
  const workflowDir = join(projectDir, WORKFLOW_DIR);
  if (!existsSync(workflowDir)) return;

  const now = Date.now();

  // Build set of active local dirHashes (legitimately in-progress)
  const activeLocalHashes = new Set<string>();
  for (const wf of localWorkflows) {
    if (wf.dirHash && wf.status === "in-progress") {
      activeLocalHashes.add(wf.dirHash);
    }
  }

  try {
    const dates = readdirSync(workflowDir);
    for (const date of dates) {
      const dateDir = join(workflowDir, date);
      if (!statSync(dateDir).isDirectory()) continue;

      const hashes = readdirSync(dateDir);
      for (const hash of hashes) {
        const idxPath = join(dateDir, hash, "index.json");
        if (!existsSync(idxPath)) continue;

        // Skip if this hash belongs to a currently active workflow
        if (activeLocalHashes.has(hash)) continue;

        try {
          const idx = JSON.parse(readFileSync(idxPath, "utf8"));
          if (idx.workflow_status === "in-progress") {
            const updated = new Date(idx.updated_at || idx.created_at).getTime();
            if (isNaN(updated) || now - updated > ZOMBIE_STALE_MS) {
              issues.push({
                severity: "error",
                code: "zombie-workflow",
                message: `Stale workflow stuck as "in-progress": ${idx.name || hash}`,
                detail: `last updated=${idx.updated_at || "unknown"} | path=.cali-product-workflow/${date}/${hash}/index.json` +
                  `\n  Fix: edit index.json and set workflow_status to "completed" or "archived"`,
              });
            }
          }
        } catch {
          // Corrupt index.json, skip silently
        }
      }
    }
  } catch {
    // Directory unreadable, skip
  }
}

function summarizeIssues(issues: DoctorIssue[]): Record<DoctorSeverity, number> {
  return {
    ok: issues.filter(i => i.severity === "ok").length,
    info: issues.filter(i => i.severity === "info").length,
    warn: issues.filter(i => i.severity === "warn").length,
    error: issues.filter(i => i.severity === "error").length,
  };
}

function resolveProjectDirSafe(cwd: string): string {
  try {
    return resolveProjectDir(cwd);
  } catch {
    return cwd;
  }
}

export function formatDoctorReport(report: DoctorReport): string {
  const lines: string[] = [];
  lines.push("🩺 Product Workflow Doctor");
  lines.push("");
  lines.push(`Project: ${report.projectDir}`);
  lines.push(`Tracking: ${report.trackingExists ? "present" : "missing"} (${report.trackingPath})`);
  lines.push(`Global:  ${report.globalExists ? "present" : "missing"} (${report.globalPath})`);
  lines.push(`Local workflows:   ${report.localWorkflowCount}`);
  lines.push(`Global workflows:  ${report.globalWorkflowCount}`);
  lines.push(`Active workflow:   ${report.activeWorkflowName ?? "none"}`);
  lines.push(
    `Summary: ${report.summary.ok} ok, ${report.summary.info} info, ` +
    `${report.summary.warn} warn, ${report.summary.error} error`
  );
  lines.push("");

  const visible = report.issues
    .filter(i => i.severity !== "ok")
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  if (visible.length === 0) {
    lines.push("No issues found.");
    return lines.join("\n");
  }

  for (const issue of visible) {
    lines.push(`${severityIcon(issue.severity)} ${issue.code}: ${issue.message}`);
    if (issue.detail) lines.push(`  ${issue.detail}`);
  }

  return lines.join("\n");
}

function severityRank(severity: DoctorSeverity): number {
  return { error: 4, warn: 3, info: 2, ok: 1 }[severity];
}

function severityIcon(severity: DoctorSeverity): string {
  switch (severity) {
    case "error": return "❌";
    case "warn": return "⚠️";
    case "info": return "ℹ️";
    case "ok": return "✅";
  }
}
