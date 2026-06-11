import { existsSync, readFileSync, writeFileSync, statSync, readdirSync, mkdirSync } from "node:fs";
import { join, basename, dirname, extname, resolve as resolvePath } from "node:path";
import { homedir } from "node:os";
import type { Workflow, TrackingData, ParsedInput, CLI } from "./types";
import { TASK_ICONS } from "./modules/task";
import type { PhaseTodo, PhaseTodosData } from "./modules/task";
import { WORKFLOW_DIR, TRACKING_FILE, GLOBAL_TRACKING_FILE, SCHEMA_URL, PHASE_NAMES, getCLICapabilities } from "./types";
import { PHASE_TO_STAGE } from "./stages-guard";

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
  "opencode": {
    dirs: ["~/.config/opencode", "~/.opencode"],
    cmds: ["opencode"],
    confidence: "high",
  },
  "claude-code": {
    dirs: ["~/.claude", ".claude-plugin"],
    cmds: ["claude"],
    confidence: "high",
  },
  "codex": {
    dirs: ["~/.codex", ".codex-plugin"],
    cmds: ["codex"],
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
    if (["pi", "opencode", "claude-code", "codex", "generic"].includes(cli)) {
      return cli;
    }
    console.warn(`[cali-product-workflow] Unknown PRODUCT_WORKFLOW_CLI: ${cli}, defaulting to generic`);
    return "generic";
  }

  // Fallback: check platform-specific directories (highest confidence)
  const home = homedir();
  
  if (existsSync(join(home, ".pi"))) {
    return "pi";
  }
  if (existsSync(join(home, ".config", "opencode")) || existsSync(join(home, ".opencode"))) {
    return "opencode";
  }
  if (existsSync(join(home, ".claude")) || existsSync(".claude-plugin")) {
    return "claude-code";
  }
  if (existsSync(join(home, ".codex")) || existsSync(".codex-plugin")) {
    return "codex";
  }

  // Tertiary: check command availability (lower confidence)
  const { execSync } = require("child_process");
  
  try {
    execSync("pi --version 2>/dev/null", { stdio: "ignore" });
    return "pi";
  } catch { /* not available */ }
  
  try {
    execSync("opencode --version 2>/dev/null", { stdio: "ignore" });
    return "opencode";
  } catch { /* not available */ }
  
  try {
    execSync("claude --version 2>/dev/null", { stdio: "ignore" });
    return "claude-code";
  } catch { /* not available */ }
  
  try {
    execSync("codex --version 2>/dev/null", { stdio: "ignore" });
    return "codex";
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
export function resolveProjectDir(cwd: string): string {
  // Exact cwd match first
  if (existsSync(join(cwd, WORKFLOW_DIR)) || existsSync(join(cwd, TRACKING_FILE))) {
    return cwd;
  }
  // One level up (handles git repos where user is inside src/ but tracking is at root)
  const parent = dirname(cwd);
  if (parent !== "/" && (existsSync(join(parent, WORKFLOW_DIR)) || existsSync(join(parent, TRACKING_FILE)))) {
    return parent;
  }
  // Nothing found — create fresh tracking in cwd
  return cwd;
}

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
  const path = getTrackingPath(cwd);
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf-8"));
    return migrateTrackingData(raw);
  } catch {
    return null;
  }
}

export function readGlobalTracking(): TrackingData | null {
  const path = getGlobalTrackingPath();
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf-8"));
    return migrateTrackingData(raw);
  } catch {
    return null;
  }
}

export function writeTracking(cwd: string, data: TrackingData): void {
  data.updated = new Date().toISOString();
  writeFileSync(getTrackingPath(cwd), JSON.stringify(data, null, 2));
}

export function writeGlobalTracking(data: TrackingData): void {
  data.updated = new Date().toISOString();
  writeFileSync(getGlobalTrackingPath(), JSON.stringify(data, null, 2));
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

export function findGlobalWorkflowIndex(cwd: string, name: string): number {
  const gt = readGlobalTracking();
  if (!gt) return -1;
  return findWorkflowIndexForProject(gt.workflows, cwd, name);
}

function findGlobalWorkflowIndicesForLocal(cwd: string, workflow: Workflow): number[] {
  const gt = readGlobalTracking();
  if (!gt) return [];

  const targetCwd = getWorkflowProjectCwd(workflow, cwd);
  const exact: number[] = [];
  for (let i = 0; i < gt.workflows.length; i++) {
    if (gt.workflows[i].name === workflow.name && isSamePath(gt.workflows[i].cwd, targetCwd)) {
      exact.push(i);
    }
  }
  if (exact.length > 0) return exact;

  // Legacy global entries may not have cwd. Match only when safe.
  if (!workflow.cwd?.trim()) {
    return findWorkflowIndicesForProject(gt.workflows, cwd, workflow.name);
  }

  const sameNameWithCwd = gt.workflows.some(w =>
    w.name === workflow.name && w.cwd?.trim()
  );
  if (!sameNameWithCwd) {
    return findWorkflowIndicesForProject(gt.workflows, cwd, workflow.name);
  }

  return [];
}

export function findGlobalWorkflowIndexForLocal(cwd: string, workflow: Workflow): number {
  return findGlobalWorkflowIndicesForLocal(cwd, workflow)[0] ?? -1;
}

export function updateGlobalWorkflowForLocal(
  cwd: string,
  workflow: Workflow,
  mutator: (wf: Workflow) => void
): boolean {
  const gt = readGlobalTracking();
  if (!gt) return false;

  const indices = findGlobalWorkflowIndicesForLocal(cwd, workflow);
  if (indices.length === 0) return false;

  for (const idx of indices) {
    mutator(gt.workflows[idx]);
  }
  gt.updated = new Date().toISOString();
  writeGlobalTracking(gt);
  return true;
}

export function removeGlobalWorkflowForLocal(cwd: string, workflow: Workflow): boolean {
  const gt = readGlobalTracking();
  if (!gt) return false;

  const indices = findGlobalWorkflowIndicesForLocal(cwd, workflow);
  if (indices.length === 0) return false;

  for (let i = indices.length - 1; i >= 0; i--) {
    gt.workflows.splice(indices[i], 1);
  }
  gt.updated = new Date().toISOString();
  writeGlobalTracking(gt);
  return true;
}

export function removeGlobalWorkflow(cwd: string, name: string): boolean {
  const gt = readGlobalTracking();
  if (!gt) return false;

  const indices = findWorkflowIndicesForProject(gt.workflows, cwd, name);
  if (indices.length === 0) return false;

  for (let i = indices.length - 1; i >= 0; i--) {
    gt.workflows.splice(indices[i], 1);
  }
  gt.updated = new Date().toISOString();
  writeGlobalTracking(gt);
  return true;
}

// ── Query ────────────────────────────────────────────────────────────

export function getActiveWorkflow(cwd: string): Workflow | null {
  const tracking = readTracking(cwd);
  if (!tracking) return null;
  return tracking.workflows.find(w => w.status === "in-progress") || null;
}

export function getAllActiveWorkflows(cwd: string): Workflow[] {
  const tracking = readTracking(cwd);
  if (!tracking) return [];
  return tracking.workflows.filter(
    w => w.status === "in-progress" || w.status === "paused"
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
  return `pw-${ts}-${rand}`;
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

  // 2. Global tracking
  updateGlobalWorkflowForLocal(cwd, wf, gwf => {
    gwf.name = finalName;
    gwf.updated = new Date().toISOString();
  });

  // 3. index.json — use dirHash (NOT name) for filesystem path
  const ds = getDateStamp(new Date(wf.created));
  const dirToUse = wf.dirHash || oldName;  // dirHash is stable, name may change
  const idxPath = join(cwd, WORKFLOW_DIR, ds, dirToUse, "index.json");
  if (existsSync(idxPath)) {
    try {
      const idx = JSON.parse(readFileSync(idxPath, "utf-8"));
      idx.name = finalName;
      idx.updated_at = new Date().toISOString();
      writeFileSync(idxPath, JSON.stringify(idx, null, 2));
    } catch {
      /* skip */
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
 * Scan .cali-product-workflow/<date>/<dirHash>/index.json on disk and return
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
        try {
          const raw = JSON.parse(readFileSync(indexPath, "utf-8"));
          result.push({
            name: raw.name || raw.slug || wfDir,
            status: raw.workflow_status || "unknown",
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
        } catch { /* skip corrupt index */ }
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
          gates_passed: [],
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
        try {
          const raw = JSON.parse(readFileSync(indexPath, "utf-8"));
          const rawName = raw.name || raw.slug;
          if (rawName === workflowName) {
            raw.workflow_status = "archived";
            raw.updated_at = new Date().toISOString();
            writeFileSync(indexPath, JSON.stringify(raw, null, 2));
            return true;
          }
        } catch { /* skip */ }
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
 * - tracking file (cali-product-workflow.json)
 * - global tracking (~/.cali-pw-global.json)
 * - index.json (.cali-product-workflow/<date>/<hash>/index.json)
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
  try {
    idx = JSON.parse(readFileSync(idxPath, "utf-8"));
  } catch {
    if (existsSync(idxPath)) {
      // File exists but is corrupt — warn and rebuild from workflow state
      console.warn(`[cali-product-workflow] Corrupt index.json, rebuilding: ${idxPath}`);
    }
    // Init from workflow state (defensive recovery)
    idx = {
      name: wf.name,
      workflow_status: wf.status,
      current_phase: PHASE_NAMES[wf.currentPhase]?.toLowerCase() || "setup",
      current_phase_index: wf.currentPhase,
      created_at: wf.created,
    };
  }

  Object.assign(idx, updates);
  idx.updated_at = new Date().toISOString();

  mkdirSync(dirname(idxPath), { recursive: true });
  writeFileSync(idxPath, JSON.stringify(idx, null, 2));
  return true;
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



const PHASE_TODOS_FILE = "phase-todos.json";

function getPhaseTodosPath(cwd: string, wf: Workflow): string {
  if (!wf.dirHash) return "";
  const ds = getDateStamp(new Date(wf.created));
  return join(cwd, WORKFLOW_DIR, ds, wf.dirHash, PHASE_TODOS_FILE);
}

export function readPhaseTodos(cwd: string, wf: Workflow): PhaseTodosData | null {
  const path = getPhaseTodosPath(cwd, wf);
  if (!path || !existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as PhaseTodosData;
  } catch {
    return null;
  }
}

export function writePhaseTodos(cwd: string, wf: Workflow, todos: PhaseTodo[]): void {
  const path = getPhaseTodosPath(cwd, wf);
  if (!path) return;
  const data: PhaseTodosData = {
    workflowName: wf.name,
    phase: PHASE_NAMES[wf.currentPhase] || "unknown",
    phaseIndex: wf.currentPhase,
    todos,
    updatedAt: new Date().toISOString(),
  };
  try {
    writeFileSync(path, JSON.stringify(data, null, 2));
  } catch { /* skip */ }
}

export function getPhaseTodos(cwd: string, wf: Workflow): PhaseTodo[] {
  const data = readPhaseTodos(cwd, wf);
  return data?.todos || [];
}

let _phaseTodosCache: PhaseTodo[] = [];

export function setPhaseTodos(todos: PhaseTodo[]): void {
  _phaseTodosCache = todos;
}

export function getPhaseTodosFromCache(cwd: string, wf: Workflow): PhaseTodo[] {
  if (_phaseTodosCache.length > 0) return _phaseTodosCache;
  return getPhaseTodos(cwd, wf);
}

// ── Inbox ──────────────────────────────────────────────────────────────

const INBOX_DIR = ".cali-product-workflow/inbox";
const INBOX_FILE = "items.md";

export function getInboxDir(cwd: string): string {
  return join(cwd, INBOX_DIR);
}

export function getInboxPath(cwd: string): string {
  return join(cwd, INBOX_DIR, INBOX_FILE);
}

export function ensureInboxDir(cwd: string): void {
  const dir = getInboxDir(cwd);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function readInbox(cwd: string): string[] {
  const path = getInboxPath(cwd);
  if (!existsSync(path)) return [];
  try {
    const content = readFileSync(path, "utf-8");
    return content
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => !line.startsWith("#"));
  } catch {
    return [];
  }
}

export function writeInbox(cwd: string, items: string[]): void {
  ensureInboxDir(cwd);
  const path = getInboxPath(cwd);
  const header = "# Inbox\n\n";
  const content = items.length > 0 ? items.join("\n") + "\n" : "\n";
  writeFileSync(path, header + content);
}

export function addToInbox(cwd: string, item: string): void {
  const items = readInbox(cwd);
  if (!items.includes(item)) {
    items.push(item);
    writeInbox(cwd, items);
  }
}

export function removeFromInbox(cwd: string, item: string): void {
  const items = readInbox(cwd);
  const filtered = items.filter(i => i !== item);
  writeInbox(cwd, filtered);
}

export function clearInbox(cwd: string): void {
  writeInbox(cwd, []);
}



// Re-export for convenience (used by commands.ts)
export { TASK_ICONS };
export type { PhaseTodo };
