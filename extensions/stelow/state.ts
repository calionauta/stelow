import { existsSync, readFileSync, writeFileSync, statSync, readdirSync, mkdirSync } from "node:fs";
import { join, basename, dirname, extname, resolve as resolvePath } from "node:path";
import { homedir } from "node:os";
import type { Workflow, TrackingData, Scope, ParsedInput, CLI } from "./types";
import {
  isRuntimeValidationEnabled,
  validateScopeAdditions,
  ScopeRecordValidationError,
} from "./schema-record";
import { TASK_ICONS } from "./modules/task";
import { WORKFLOW_DIR, TRACKING_FILE, GLOBAL_TRACKING_FILE, SCHEMA_URL, PHASE_NAMES, getCLICapabilities, STAGE } from "./types";
import { PHASE_TO_STAGE } from "./stages-guard";

// ── Internal helpers (file-private) ────────────────────────────────────

/**
 * Read a JSON file with strict typing. Returns null when the file is
 * absent or malformed; never throws to the caller. DRY for the six
 * near-identical `JSON.parse(readFileSync(...))` sites this module used
 * to have.
 */
function readJson<T = unknown>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

/**
 * Persist a value as pretty-printed JSON. Used by every site that
 * previously hand-rolled `writeFileSync(p, JSON.stringify(d, null, 2))`.
 */
function writeJson(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

// ── 1. CLI detection ──────────────────────────────────────────────────

/**
 * Detection signals for each CLI.

// ── CLI Detection ────────────────────────────────────────────────────

/**
 * Detection signals for each CLI.
 * Priority: 1. Env var, 2. Config directories, 3. Command availability, 4. Generic
 *
 * @lat: [[data-model#Workflow Directory Structure]]
 */
const CLI_DETECTION_SIGNALS: Record<CLI, { dirs: string[]; cmds: string[]; confidence: "high" | "medium" | "low" }> = {
  "pi": {
    dirs: ["~/.pi"],
    cmds: ["pi"],
    confidence: "high",
  },
  "generic": {
    dirs: [],
    cmds: [],
    confidence: "low",
  },
};

/**
 * Detect the current AI coding agent harness.
 * Uses PRODUCT_WORKFLOW_CLI env var (primary) or platform-specific files (fallback).
 * Returns "generic" if detection fails.
 */
export function detectCLI(): CLI {
  // Primary: explicit environment variable
  const envCli = process.env.PRODUCT_WORKFLOW_CLI;
  if (envCli && envCli.trim()) {
    const cli = envCli.trim().toLowerCase() as CLI;
    if (["pi", "generic"].includes(cli)) {
      return cli;
    }
    console.warn(`[stelow] Unknown PRODUCT_WORKFLOW_CLI: ${cli}, defaulting to generic`);
    return "generic";
  }

  // Fallback: check platform-specific directories (highest confidence)
  const home = homedir();

  if (existsSync(join(home, ".pi"))) {
    return "pi";
  }

  // Tertiary: check command availability (lower confidence)
  const { execSync } = require("child_process");

  try {
    execSync("pi --version 2>/dev/null", { stdio: "ignore" });
    return "pi";
  } catch { /* not available */ }

  // Default to generic (safe fallback)
  return "generic";
}

/**
 * Get detection info for diagnostics.
 */
/**
 * Get CLI capabilities for the current or specified CLI.
 */
export function getCLICapabilites(cli?: CLI): ReturnType<typeof getCLICapabilities> {
  const detected = cli || detectCLI();
  return getCLICapabilities(detected);
}


// ── Shared State ─────────────────────────────────────────────────────

export const parsedInputStore: Map<string, ParsedInput> = new Map();

// ── Input Parsing ────────────────────────────────────────────────────

const FILE_REF_REGEX = /@[\w\-\/\.]+(?::\d+(?::\d+)?)?/g;

export function parseInputForWorkflow(input: string): ParsedInput {
  const sources: string[] = [];
  const matches = input.match(FILE_REF_REGEX);
  if (matches) {
    for (const match of matches) {
      let filePath = match.slice(1).split(":")[0];
      if (!filePath.startsWith("./") && !filePath.startsWith("/")) {
        filePath = "./" + filePath;
      }
      sources.push(filePath);
    }
  }

  const text = input
    .replace(FILE_REF_REGEX, " ")
    .replace(/\/[a-z-]+(\s|$)/gi, " ")
    .replace(/[a-z]+=[^\s]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { sources, draftText: text };
}

// ── File Paths ───────────────────────────────────────────────────────

function getTrackingPath(cwd: string): string {
  return join(cwd, TRACKING_FILE);
}

function getGlobalTrackingPath(): string {
  return join(process.env.HOME || dirname(process.cwd()), GLOBAL_TRACKING_FILE);
}

// ── Project root detection ───────────────────────────────────────────

/**
 * Resolve the project root for workflow tracking.
 * Checks `cwd` first, then walks up at most 1 level (for git repos where
 * the user's shell is in a subdirectory but the project root has tracking).
 * Returns `cwd` if no tracking found anywhere — creates fresh tracking there.
 *
 * IMPORTANT: Do NOT walk up more than 1 level. An unbounded walk can
 * incorrectly resolve to a parent directory (e.g. ~/Development/) that
 * happens to have tracking files from a completely different project.
 */
// ── Re-export for backward compatibility ──
//
// `resolveProjectDir` is the historical name. The canonical implementation
// lives in `workflow-root.ts` (single source of truth across the extension,
// muxy panel, and herdr Rust plugin). This file re-exports it under both
// names so callers don't need to change.
//
// Bug fix (v0.36.2): the old in-line implementation climbed up to ANY
// parent that had .stelow/ — this caused the user-reported issue where
// /sw-start in /Users/cali/Development/PROJECT-X (no .stelow) was
// blocked by an active workflow in /Users/cali/Development. The new
// implementation only climbs up to the git toplevel of the cwd.
export { findProjectWorkflowRoot, resolveProjectDir } from "./workflow-root";

// ── Read / Write ─────────────────────────────────────────────────────

/** Normalize legacy "slug" → "name" for old tracking data */
function migrateWorkflow(wf: any): any {
  if (wf.slug && !wf.name) {
    wf.name = wf.slug;
  }
  if (wf.name && !wf.slug) {
    wf.slug = wf.name; // keep backward compat
  }
  return wf;
}

function migrateTrackingData(data: any): TrackingData {
  if (data?.workflows) {
    data.workflows = data.workflows.map(migrateWorkflow);
  }
  return data as TrackingData;
}

export function readTracking(cwd: string): TrackingData | null {
  const raw = readJson<TrackingData>(getTrackingPath(cwd));
  const data = raw ? migrateTrackingData(raw) : null;
  // Auto-sync scopes on read — covers the case where the LLM wrote to
  // stelow.json directly via fs.writeFileSync(), bypassing the writeTracking() hook.
  // The next read after direct-write will populate scopes automatically.
  if (data) syncScopesIfNeeded(cwd, data);
  return data;
}

export function readGlobalTracking(): TrackingData | null {
  const raw = readJson<TrackingData>(getGlobalTrackingPath());
  return raw ? migrateTrackingData(raw) : null;
}

export function writeTracking(cwd: string, data: TrackingData): void {
  data.updated = new Date().toISOString();

  // ── Read-through config from index.json (LLM direct-writes) ──
  // The LLM writes appetite/review_mode/domains_detected directly into
  // .stelow/{date}/{hash}/index.json via bash. Mirror those values back
  // into the Workflow object in stelow.json so the tracking file remains
  // the single source of truth. Only copies fields that are missing in
  // wf.config — never overwrites existing TS-side values.
  for (const wf of data.workflows) {
    if (!wf.dirHash) continue;
    if (wf.config && (wf.config.appetite || wf.config.review_mode ||
        (wf.config.domains_detected && wf.config.domains_detected.length > 0))) {
      continue; // wf already has config — don't overwrite TS-side state
    }
    const createdDate = new Date(wf.created);
    const ds = isNaN(createdDate.getTime()) ? getDateStamp() : getDateStamp(createdDate);
    const idxPath = join(cwd, WORKFLOW_DIR, ds, wf.dirHash, "index.json");
    const idx = readJson<Record<string, unknown>>(idxPath);
    if (!idx) continue;
    const idxConfig = idx.config as { appetite?: string; review_mode?: string; domains_detected?: string[] } | undefined;
    if (!idxConfig) continue;
    wf.config = wf.config || {};
    if (!wf.config.appetite && idxConfig.appetite) wf.config.appetite = idxConfig.appetite;
    if (!wf.config.review_mode && idxConfig.review_mode) wf.config.review_mode = idxConfig.review_mode;
    if ((!wf.config.domains_detected || wf.config.domains_detected.length === 0) &&
        Array.isArray(idxConfig.domains_detected) && idxConfig.domains_detected.length > 0) {
      wf.config.domains_detected = [...idxConfig.domains_detected];
    }
  }

  // ── Auto-sync scopes from spec-tech.md (convention over configuration) ──
  syncScopesIfNeeded(cwd, data);

  // Runtime validation (on by default). Validate every scope's `record`
  // and `tasks` before persisting. Set STELOW_VALIDATE=0 to disable
  // (e.g. during migration or bulk import). The per-scope iteration/
  // type-check cost is negligible (<1ms per scope) but can matter on
  // hot paths like /sw-next (single-scope status flip).
  if (isRuntimeValidationEnabled()) {
    for (const wf of data.workflows) {
      if (!Array.isArray(wf.scopes)) continue;
      for (const scope of wf.scopes) {
        try {
          validateScopeAdditions({
            record: scope.record,
            tasks: scope.tasks,
            discovered_tasks_count: scope.discovered_tasks_count,
          });
        } catch (err) {
          // Re-throw with workflow + scope context so the operator
          // sees exactly which scope broke the contract.
          if (err instanceof ScopeRecordValidationError) {
            throw new Error(
              `writeTracking rejected: ${wf.name} / ${scope.id} — ${err.message}`,
            );
          }
          throw err;
        }
      }
    }
  }
  writeJson(getTrackingPath(cwd), data);

  // Write-through to index.json for every workflow.
  // This replaces ~9 explicit updateWorkflowIndexJson calls from commands.ts.
  // The 3 archive-path calls remain explicit (they fire after workflow is removed from tracking).
  for (const wf of data.workflows) {
    if (wf.dirHash) {
      updateWorkflowIndexJson(cwd, wf, {});
    }
  }
}

export function writeGlobalTracking(data: TrackingData): void {
  // Prune to index-only fields to prevent state desync.
  // Global is a catalog; canonical state lives in local tracking.
  data.workflows = data.workflows.map(w => ({
    name: w.name,
    cwd: w.cwd,
    dirHash: w.dirHash,
    created: w.created,
    updated: new Date().toISOString(),
  })) as Workflow[];
  data.updated = new Date().toISOString();
  writeJson(getGlobalTrackingPath(), data);
}

/**
 * Remove an entry from the global index by project (cwd) and name.
 * Returns true if an entry was removed.
 */
export function removeGlobalIndexEntry(cwd: string, name: string): boolean {
  const gt = readGlobalTracking();
  if (!gt) return false;
  const idx = findWorkflowIndexForProject(gt.workflows, cwd, name);
  if (idx === -1) return false;
  gt.workflows.splice(idx, 1);
  gt.updated = new Date().toISOString();
  writeGlobalTracking(gt);
  return true;
}

/**
 * Add an entry to the global index (if not already present).
 * Prevents duplicate entries by key (name + cwd).
 */
export function addToGlobalIndex(wf: Workflow): void {
  let gt = readGlobalTracking();
  if (!gt) {
    gt = { $schema: SCHEMA_URL, version: "1.0", created: new Date().toISOString(), updated: new Date().toISOString(), workflows: [] };
  }
  const existing = findWorkflowIndexForProject(gt.workflows, wf.cwd || process.cwd(), wf.name);
  if (existing !== -1) {
    gt.workflows[existing].updated = new Date().toISOString();
    writeGlobalTracking(gt);
    return;
  }
  gt.workflows.push(wf);
  writeGlobalTracking(gt);
}

/**
 * Update (or add) a workflow entry in the global index.
 * Only the indexed fields (name, cwd, dirHash, created, updated) are persisted.
 */
export function updateGlobalIndexName(oldName: string, newName: string, cwd: string): boolean {
  const gt = readGlobalTracking();
  if (!gt) return false;
  const idx = findWorkflowIndexForProject(gt.workflows, cwd, oldName);
  if (idx === -1) return false;
  gt.workflows[idx].name = newName;
  gt.updated = new Date().toISOString();
  writeGlobalTracking(gt);
  return true;
}

// ── Workflow identity / project scoping ─────────────────────────────

export function normalizePathForCompare(path: string): string {
  return resolvePath(path).replace(/\/+$/, "") || "/";
}

export function isSamePath(a: string | undefined, b: string | undefined): boolean {
  if (!a?.trim() || !b?.trim()) return false;
  return normalizePathForCompare(a) === normalizePathForCompare(b);
}

export function isWorkflowFromProject(workflow: Workflow, cwd: string): boolean {
  const workflowCwd = workflow.cwd?.trim();
  return !workflowCwd || isSamePath(workflowCwd, cwd);
}

export function getWorkflowProjectCwd(workflow: Workflow, fallbackCwd: string): string {
  return workflow.cwd?.trim() || fallbackCwd;
}

export function findWorkflowIndexByName(workflows: Workflow[], name: string): number {
  return workflows.findIndex(w => w.name === name);
}

export function findWorkflowIndicesForProject(
  workflows: Workflow[],
  cwd: string,
  name: string
): number[] {
  const exact: number[] = [];
  const legacy: number[] = [];
  for (let i = 0; i < workflows.length; i++) {
    const workflow = workflows[i];
    if (workflow.name !== name) continue;
    if (isSamePath(workflow.cwd, cwd)) exact.push(i);
    else if (!workflow.cwd?.trim()) legacy.push(i);
  }
  return exact.length > 0 ? exact : legacy;
}

export function findWorkflowIndexForProject(
  workflows: Workflow[],
  cwd: string,
  name: string
): number {
  return findWorkflowIndicesForProject(workflows, cwd, name)[0] ?? -1;
}

// ── Query ────────────────────────────────────────────────────────────

export function getActiveWorkflow(cwd: string): Workflow | null {
  const tracking = readTracking(cwd);
  if (!tracking) return null;
  // Filter by project cwd so stale entries from other worktrees don't
  // block /sw-start. Workflows without a cwd field (legacy) still match.
  return tracking.workflows.find(
    w => w.status === "in-progress" && isWorkflowFromProject(w, cwd)
  ) || null;
}

export function getAllActiveWorkflows(cwd: string): Workflow[] {
  const tracking = readTracking(cwd);
  if (!tracking) return [];
  return tracking.workflows.filter(
    w => (w.status === "in-progress" || w.status === "paused")
      && isWorkflowFromProject(w, cwd)
  );
}

// ── Name utilities ───────────────────────────────────────────────────

/** Create a URL-safe, human-readable name from text */
export function toSafeName(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

/** Short workflow ID from dirHash (unique identifier) */
export function hashToWorkflowId(dirHash: string): string {
  // Extract the random part of the hash (after timestamp)
  // pw-a3b2c4-d5e6f8 → d5e6f8
  const parts = dirHash.split("-");
  return parts.length >= 3 ? `wf-${parts[2]}` : `wf-${parts[1] || dirHash}`;
}

/** Random directory hash (unique, no identity) */
export function generateDirHash(): string {
  const ts = Date.now().toString(36).slice(-4);
  const rand = Math.random().toString(36).substring(2, 8);
  return `sw-${ts}-${rand}`;
}

/** Legacy: placeholder name generator (kept for compatibility) */
/** Readable date-stamped directory, e.g. "2026-05-16" */
export function getDateStamp(date?: Date): string {
  return (date || new Date()).toISOString().slice(0, 10);
}

/** Suggest a friendlier name from draft content */
export function suggestNameFromDraft(draft: string): string | null {
  const clean = draft
    .replace(/```[\s\S]*?```/g, "")
    .replace(/=== FILE:.*?===/g, "")
    .replace(/### Initial Draft\n\n/, "")
    .trim();

  // First sentence under 80 chars
  const firstLine = clean.split("\n")[0]?.trim();
  if (firstLine && firstLine.length > 3 && firstLine.length < 80) {
    return toSafeName(firstLine);
  }

  // First 4 significant words
  const words = clean.split(/\s+/).filter(w => w.length > 2).slice(0, 4);
  if (words.length >= 2) return toSafeName(words.join(" "));

  return null;
}

// ── Rename ───────────────────────────────────────────────────────────

/** Rename a workflow's display name. Directory stays unchanged. */
export function renameWorkflow(
  cwd: string,
  oldName: string,
  newName: string
): { ok: true } | { ok: false; error: string } {
  const finalName = toSafeName(newName);
  if (!finalName || finalName.length < 2) {
    return { ok: false, error: "Name must be at least 2 characters" };
  }

  // 1. Local tracking
  const tracking = readTracking(cwd);
  if (!tracking) return { ok: false, error: "No tracking file" };

  const wf = tracking.workflows.find(w => w.name === oldName);
  if (!wf) return { ok: false, error: `Workflow '${oldName}' not found` };

  wf.name = finalName;
  wf.updated = new Date().toISOString();
  writeTracking(cwd, tracking);

  // 2. Global index
  updateGlobalIndexName(oldName, finalName, cwd);

  // 3. index.json — use dirHash (NOT name) for filesystem path
  const ds = getDateStamp(new Date(wf.created));
  const dirToUse = wf.dirHash || oldName;  // dirHash is stable, name may change
  const idxPath = join(cwd, WORKFLOW_DIR, ds, dirToUse, "index.json");
  if (existsSync(idxPath)) {
    const idx = readJson<Record<string, unknown>>(idxPath);
    if (idx) {
      idx.name = finalName;
      idx.updated_at = new Date().toISOString();
      writeJson(idxPath, idx);
    }
  }

  return { ok: true };
}

// ── Scan workflow directories from disk ─────────────────────────────

interface DiskWorkflow {
  name: string;
  status: string;
  currentPhase: number;
  created: string;
  updated: string;
  draftContent?: string;
  dirHash: string;
  dateStamp: string;
  artifacts: Record<string, unknown>;
}

/**
 * Scan .stelow/<date>/<dirHash>/index.json on disk and return
 * all workflow entries found, regardless of what the tracking file says.
 */
export function scanWorkflowDirs(cwd: string): DiskWorkflow[] {
  const result: DiskWorkflow[] = [];
  const base = join(cwd, WORKFLOW_DIR);
  if (!existsSync(base)) return result;

  try {
    const dateDirs = readdirSafe(base);
    for (const dateDir of dateDirs) {
      if (!dateDir.match(/^\d{4}-\d{2}-\d{2}$/)) continue;
      const datePath = join(base, dateDir);
      const wfDirs = readdirSafe(datePath);
      for (const wfDir of wfDirs) {
        const indexPath = join(datePath, wfDir, "index.json");
        if (!existsSync(indexPath)) continue;
        const raw = readJson<Record<string, any>>(indexPath);
        if (!raw) continue;
        result.push({
            name: raw.name || raw.slug || wfDir,
            status: raw.status || raw.workflow_status || "unknown",
            // Backward compatibility: old workflows had current_phase_index: 0 for Setup
            // (the bug that was just fixed). If phase name says "setup" but index is 0,
            // normalize to 2 (correct index for Setup in PHASE_NAMES).
            currentPhase:
              raw.current_phase_index === 0 && raw.current_phase === "setup"
                ? 2
                : (raw.current_phase_index ?? 0),
            created: raw.created_at || "",
            updated: raw.updated_at || "",
            draftContent: raw.draft,
            dirHash: wfDir,
            dateStamp: dateDir,
            artifacts: raw.artifacts || {},
          });
      }
    }
  } catch { /* skip unreadable */ }

  return result;
}
// @lat: [[data-model#Data Flow Patterns#Workflow Scan (Auto-Discovery)]]

/**
 * Reconcile workflows found on disk with the local tracking file.
 * Only auto-imports active disk workflows (in-progress, paused).
 * Returns the reconciled list (tracking + newly-imported orphans).
 */
export function reconcileTracking(cwd: string): Workflow[] {
  const tracking = readTracking(cwd);
  const known = tracking ? [...tracking.workflows] : [];
  const diskWfs = scanWorkflowDirs(cwd);

  let changed = false;
  for (const dw of diskWfs) {
    // Only auto-import active workflows (stopped/archived on disk stay out)
    if (dw.status !== "in-progress" && dw.status !== "paused") continue;
    const exists = known.some(w => w.name === dw.name);
    if (!exists) {
      // Convert DiskWorkflow → Workflow and add to tracking
      const wf: Workflow = {
        name: dw.name,
        description: "",
        draftContent: dw.draftContent,
        status: dw.status,
        currentPhase: dw.currentPhase,
        phases: PHASE_NAMES.map((name, i) => ({
          id: `${i}-${name.toLowerCase()}`,
          name,
          status: i < dw.currentPhase ? "completed" : i === dw.currentPhase ? "in-progress" : "pending",
        })),
        created: dw.created || new Date().toISOString(),
        updated: dw.updated || new Date().toISOString(),
        cwd,
        dirHash: dw.dirHash,  // CRITICAL: needed for rename/archive operations
        stage: {
          current_stage: PHASE_TO_STAGE[dw.currentPhase] || "setup",
          previous_stage: null,
          transitioned_at: new Date().toISOString(),
          history: [],
          supervisor_active: false,
        },
      };
      known.push(wf);
      changed = true;
    }
  }

  if (changed) {
    const t = tracking || {
      $schema: SCHEMA_URL,
      version: "1.0",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      workflows: [],
    };
    t.workflows = known;
    t.updated = new Date().toISOString();
    writeTracking(cwd, t);
  }

  return known;
}

/**
 * Mark a workflow as archived in its index.json on disk.
 * Returns true if found and updated, false if not found.
 */
export function archiveWorkflowOnDisk(cwd: string, workflowName: string): boolean {
  const base = join(cwd, WORKFLOW_DIR);
  if (!existsSync(base)) return false;

  try {
    const dateDirs = readdirSafe(base);
    for (const dateDir of dateDirs) {
      if (!dateDir.match(/^\d{4}-\d{2}-\d{2}$/)) continue;
      const datePath = join(base, dateDir);
      const wfDirs = readdirSafe(datePath);
      for (const wfDir of wfDirs) {
        const indexPath = join(datePath, wfDir, "index.json");
        if (!existsSync(indexPath)) continue;
        const raw = readJson<Record<string, any>>(indexPath);
        if (!raw) continue;
        const rawName = raw.name || raw.slug;
        if (rawName === workflowName) {
          raw.workflow_status = "archived";
          raw.status = "archived";
          raw.updated_at = new Date().toISOString();
          writeJson(indexPath, raw);
          return true;
        }
      }
    }
  } catch { /* skip */ }
  return false;
}

/**
 * Centralized write-through to index.json on disk.
 * Merges partial `updates` into the on-disk index.json, reading current state first.
 * Path is derived from wf.dirHash (stable directory name) and wf.created (date stamp).
 * Returns true if written, false if wf.dirHash is missing.
 *
 * Call this on EVERY phase/status mutation so the three state sources stay aligned:
 * - tracking file (stelow.json)
 * - global tracking (~/.stelow-global.json)
 * - index.json (.stelow/<date>/<hash>/index.json)
 */
export function updateWorkflowIndexJson(
  cwd: string,
  wf: Workflow,
  updates: Record<string, unknown>
): boolean {
  if (!wf.dirHash) return false;
  // Defensive date: avoid RangeError from invalid wf.created
  const createdDate = new Date(wf.created);
  const ds = isNaN(createdDate.getTime()) ? getDateStamp() : getDateStamp(createdDate);
  const idxPath = join(cwd, WORKFLOW_DIR, ds, wf.dirHash, "index.json");

  let idx: Record<string, unknown> = {};
  const existing = readJson<Record<string, unknown>>(idxPath);
  if (existing) {
    idx = existing;
  } else if (existsSync(idxPath)) {
    // File exists but is corrupt — warn and rebuild from workflow state
    console.warn(`[stelow] Corrupt index.json, rebuilding: ${idxPath}`);
    idx = {
      name: wf.name,
      workflow_status: wf.status,
      current_phase: PHASE_NAMES[wf.currentPhase]?.toLowerCase() || "setup",
      current_phase_index: wf.currentPhase,
      created_at: wf.created,
    };
  } else {
    // First-write: seed from workflow state
    idx = {
      name: wf.name,
      workflow_status: wf.status,
      current_phase: PHASE_NAMES[wf.currentPhase]?.toLowerCase() || "setup",
      current_phase_index: wf.currentPhase,
      created_at: wf.created,
    };
  }

  Object.assign(idx, updates);
  // Write-through Workflow.config → index.json (so TUI/integrations see the same source of truth)
  if (wf.config) {
    idx.config = idx.config || {};
    const cur = idx.config as Record<string, unknown>;
    if (wf.config.appetite !== undefined) cur.appetite = wf.config.appetite;
    if (wf.config.review_mode !== undefined) cur.review_mode = wf.config.review_mode;
    if (Array.isArray(wf.config.domains_detected)) cur.domains_detected = [...wf.config.domains_detected];
  }
  // Write-through Workflow.scopes → index.json (herdr TUI reads scopes from index.json)
  if (Array.isArray(wf.scopes)) {
    idx.scopes = JSON.parse(JSON.stringify(wf.scopes));
  }
  // Sync immutable timestamp from Workflow object to index.json
  if (wf.completedAt && !idx.completed_at) {
    idx.completed_at = wf.completedAt;
  }
  // Normalize status field: LLMs prefer 'status' (tracking file convention),
  // legacy readers/auto-discovery use 'workflow_status'. Keep both in sync.
  if (idx.status !== undefined) {
    idx.workflow_status = idx.status;
  } else if (idx.workflow_status !== undefined) {
    idx.status = idx.workflow_status;
  }
  idx.updated_at = new Date().toISOString();

  mkdirSync(dirname(idxPath), { recursive: true });
  writeJson(idxPath, idx);
  return true;
}

/**
 * Shared auto-sync loop: for every in-progress workflow in Execution phase+
 * that has no scopes yet, try to populate them from spec-tech.md.
 *
 * Called from both `readTracking()` (covers LLM direct-writes) and
 * `writeTracking()` (covers the normal phase-transition path).
 * Idempotent — only triggers once per workflow lifecycle (scopes empty).
 * Silent on failure (no spec-tech.md, unreadable, malformed).
 */
function syncScopesIfNeeded(cwd: string, data: TrackingData): void {
  for (const wf of data.workflows) {
    if (wf.status !== "in-progress") continue;
    if (wf.currentPhase < STAGE.EXECUTION()) continue;
    if (!wf.dirHash || !wf.created) continue;

    // Check latest spec-tech file version before deciding to sync.
    // If scopes already exist AND spec-tech version matches, skip.
    // If spec-tech was updated (v2+), re-sync.
    const createdDate = new Date(wf.created);
    const ds = isNaN(createdDate.getTime()) ? getDateStamp() : getDateStamp(createdDate);
    const plansDir = join(cwd, WORKFLOW_DIR, ds, wf.dirHash, "plans");
    if (!existsSync(plansDir)) continue;
    let files: string[];
    try {
      files = readdirSync(plansDir)
        .filter((f) => f.startsWith("spec-tech_") && f.endsWith(".md"))
        .sort();
    } catch { continue; }
    if (files.length === 0) continue;
    const latest = files[files.length - 1];

    // Skip if scopes already exist AND are from the same spec-tech version
    if (Array.isArray(wf.scopes) && wf.scopes.length > 0) {
      if ((wf as any).specTechFile === latest) continue;
      // spec-tech.md was updated — re-sync below
    }

    try {
      const content = readFileSync(join(plansDir, latest), "utf-8");
      const synced = parseSpecTechScopes(content);
      if (synced.length > 0) {
        wf.scopes = synced;
        wf.specTechFile = latest; // track version
      }
    } catch (err) {
      console.warn(`[stelow] auto-sync scopes failed for ${wf.name}:`, err);
    }
  }
}

/**
 * Auto-discover scopes for a workflow by parsing its spec-tech.md file.
 *
 * Convention over configuration — follows the established directory layout:
 *   .stelow/{dateStamp}/{dirHash}/plans/spec-tech_*.md
 *
 * Returns the parsed Scope[] or null if the spec-tech.md doesn't exist or
 * cannot be read/parsed. Pure function; no side effects beyond filesystem
 * reads (find + read spec-tech.md).
 */
export function syncScopesFromPlanningFiles(
  cwd: string,
  wf: Workflow
): Scope[] | null {
  if (!wf.dirHash || !wf.created) return null;

  const createdDate = new Date(wf.created);
  const ds = isNaN(createdDate.getTime()) ? getDateStamp() : getDateStamp(createdDate);
  const plansDir = join(cwd, WORKFLOW_DIR, ds, wf.dirHash, "plans");

  if (!existsSync(plansDir)) return null;

  // Find spec-tech_*.md files; sort alphabetically (version order) so we
  // always parse the latest revision.
  let files: string[];
  try {
    files = readdirSync(plansDir)
      .filter((f) => f.startsWith("spec-tech_") && f.endsWith(".md"))
      .sort();
  } catch {
    return null;
  }

  if (files.length === 0) return null;

  const latest = files[files.length - 1];
  let content: string;
  try {
    content = readFileSync(join(plansDir, latest), "utf-8");
  } catch {
    return null;
  }

  return parseSpecTechScopes(content);
}

/**
 * Parse [SCOPE-N] blocks from spec-tech.md content into Scope[].
 *
 * Convention (matches the scope-executor SKILL Step 1 format):
 * ```
 * [SCOPE-1]
 * [TYPE] feature
 * [MAX_ITERATIONS] 5
 * Objective: Implement user login
 * Dependencies: None
 * DoD: User can log in with email/password
 * [TARGET_FILES]
 * - src/auth/**
 * ```
 *
 * Pure function. No filesystem access.
 *
 * @mirror integrations/muxy/stelow/src/panel/data.js :: parseScopesFromSpecTech
 * If you change this function, update the mirror in data.js and vice versa.
 * The two runtimes (Node TS vs Electron sandbox JS) cannot share code.
 */
export function parseSpecTechScopes(content: string): Scope[] {
  const scopes: Scope[] = [];
  const blocks = content.split(/(?=\[SCOPE-\d+\])/);

  for (const block of blocks) {
    const scopeMatch = block.match(/^\[SCOPE-(\d+)\]/m);
    if (!scopeMatch) continue;

    const id = `scope-${scopeMatch[1]}`;
    const typeMatch = block.match(/^\[TYPE\]\s*(\S+)/m);
    const type = typeMatch ? typeMatch[1].trim() : "feature";
    const nameMatch = block.match(/^Objective:\s*(.+)/m);
    const name = nameMatch ? nameMatch[1].trim() : id;
    const depsMatch = block.match(/^Dependencies:\s*(.+)/m);
    const maxIterMatch = block.match(/^\[MAX_ITERATIONS\]\s*(\d+)/m);

    // Parse [TARGET_FILES] block: lines starting with "- " until next [ or blank
    const targetFiles: string[] = [];
    const tfMatch = block.match(
      /^\[TARGET_FILES\]\s*\n([\s\S]*?)(?=\n\[|\n$)/m
    );
    if (tfMatch) {
      for (const line of tfMatch[1].trim().split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("- ")) targetFiles.push(trimmed.slice(2));
      }
    }

    const scope: Scope = {
      id,
      name,
      type,
      status: "pending",
      source: "spec-tech",
    };

    // Parse Dependencies string: extract SCOPE-N references
    if (depsMatch) {
      const deps = depsMatch[1].trim();
      if (deps && deps.toLowerCase() !== "none") {
        const depIds = [...deps.matchAll(/SCOPE-(\d+)/g)].map(
          (m) => `scope-${m[1]}`
        );
        if (depIds.length > 0) scope.blockedBy = depIds;
      }
    }

    if (targetFiles.length > 0) scope.targetFiles = targetFiles;
    if (maxIterMatch) scope.maxIterations = parseInt(maxIterMatch[1], 10);

    scopes.push(scope);
  }

  return scopes;
}

/**
 * Return scopes whose dependencies are all satisfied and status is `pending`.
 * These are "ready" to execute. Independent scopes (empty blockedBy) are always ready.
 * KISS: no DAG library, no topological sort. Caller loops readyScopes() until empty.
 *
 * Usage:
 * ```
 * let ready = readyScopes(scopes);
 * while (ready.length > 0) {
 *   for (const s of ready) { }
 *   // after each finishes, mark s.status = "completed"
 *   ready = readyScopes(scopes);
 * }
 * ```
 */
// `readyScopes`, `matchesDeclaredGlob`, `classifyOverlap` and the
// `OverlapReport` / `LockRecord` types moved to `scope.ts` (scope
// execution concerns). Re-exported below for callers that import
// them from `state.ts` (backward compatibility for adapters).
export {
  readyScopes,
  matchesDeclaredGlob,
  classifyOverlap,
  type OverlapReport,
} from "./scope";

/**
 * Parse checklist.md and return task counts per scope.
 * Format:
 * ```markdown
 * ### SCOPE-1: Auth Foundation
 * - [x] Task done
 * - [ ] Task pending
 * ```
 * Returns { "SCOPE-1: Auth Foundation": { total: 2, done: 1 } }
 */
export function parseChecklist(path: string): Record<string, { total: number; done: number }> {
  let content: string;
  try { content = readFileSync(path, "utf-8"); }
  catch { return {}; }

  const result: Record<string, { total: number; done: number }> = {};
  let current = "";

  for (const line of content.split("\n")) {
    const header = line.match(/^###\s+(.+)$/);
    if (header) { current = header[1].trim(); continue; }
    if (line.match(/^- \[[ x]\]/)) {
      if (!current) continue;
      result[current] ??= { total: 0, done: 0 };
      result[current].total++;
      if (line[3] === "x") result[current].done++;
    }
  }
  return result;
}

/** Safe directory listing that returns [] on error. */
function readdirSafe(dir: string): string[] {
  try { return readdirSync(dir); }
  catch { return []; }
}

// ── Helpers ──────────────────────────────────────────────────────────

export function readSourceFile(sourcePath: string): string | null {
  if (!sourcePath.startsWith("./") && !sourcePath.startsWith("/")) {
    sourcePath = "./" + sourcePath;
  }
  if (!existsSync(sourcePath)) return null;
  try {
    const st = statSync(sourcePath);
    return st.isDirectory()
      ? `Directory: ${sourcePath}`
      : readFileSync(sourcePath, "utf-8").slice(0, 50000);
  } catch {
    return null;
  }
}

export function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 100) + "\n\n[... truncated ...]";
}

// ── Inbox ──────────────────────────────────────────────────────────────
// Moved to inbox.ts (filesystem helper for the .stelow/inbox/items.md
// staging area). Re-exported below for callers that import from
// `state.ts`. See `inbox.ts` for the canonical implementation.

// ── Provenance Log ───────────────────────────────────────────────────
// Moved to provenance.ts (JSONL append-only history log).
// Re-exported below. See `provenance.ts` for the canonical implementation.

// Re-export for convenience (used by commands.ts and external consumers).
export { TASK_ICONS };
export {
  getInboxDir,
  getInboxPath,
  ensureInboxDir,
  readInbox,
  writeInbox,
  addToInbox,
  removeFromInbox,
  clearInbox,
} from "./inbox";
export {
  getProvenancePath,
  appendProvenance,
  readProvenance,
  PROVENANCE_FILE,
} from "./provenance";
