import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { GLOBAL_TRACKING_FILE, TRACKING_FILE, WORKFLOW_DIR, type Workflow } from "./types";
import {
  getActiveWorkflow,
  isSamePath,
  isWorkflowFromProject,
  readGlobalTracking,
  readTracking,
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

  const globalActive = globalWorkflows.find(
    w => w.status === "in-progress" && isWorkflowFromProject(w, projectDir)
  );
  if (!activeWorkflow && globalActive) {
    issues.push({
      severity: "info",
      code: "global-active-not-local",
      message: `Global active workflow is not imported locally: ${globalActive.name}`,
      detail: "Restart session, run /pw-goto, or re-run project import.",
    });
  }

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
        if (gw.status !== wf.status) {
          issues.push({
            severity: "warn",
            code: "global-status-mismatch",
            message: `Global status differs from local workflow: ${wf.name}`,
            detail: `global=${gw.status}; local=${wf.status}`,
          });
        }
        if (gw.currentPhase !== wf.currentPhase) {
          issues.push({
            severity: "warn",
            code: "global-phase-mismatch",
            message: `Global phase differs from local workflow: ${wf.name}`,
            detail: `global=${gw.currentPhase}; local=${wf.currentPhase}`,
          });
        }
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
        detail: `status=${gw.status}; cwd=${gw.cwd || projectDir}`,
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
