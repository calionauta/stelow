import { existsSync, readFileSync, writeFileSync, statSync, readdirSync } from "node:fs";
import { join, basename, dirname, extname } from "node:path";
import { homedir } from "node:os";
import type { Workflow, TrackingData, ParsedInput, CLI } from "./types";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { WORKFLOW_DIR, TRACKING_FILE, GLOBAL_TRACKING_FILE, SCHEMA_URL, PHASE_NAMES, getCLICapabilities } from "./types";

// ── CLI Detection ────────────────────────────────────────────────────

/**
 * Detection signals for each CLI.
 * Priority: 1. Env var, 2. Config directories, 3. Command availability, 4. Generic
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
export function getCLIDetectionInfo(): { cli: CLI; confidence: "high" | "medium" | "low"; reason: string } {
  const envCli = process.env.PRODUCT_WORKFLOW_CLI;
  if (envCli && envCli.trim()) {
    const cli = envCli.trim().toLowerCase() as CLI;
    if (["pi", "opencode", "claude-code", "codex", "generic"].includes(cli)) {
      return { cli, confidence: "medium", reason: "PRODUCT_WORKFLOW_CLI set" };
    }
    return { cli: "generic", confidence: "low", reason: `Unknown PRODUCT_WORKFLOW_CLI: ${cli}` };
  }
  
  const home = homedir();
  
  if (existsSync(join(home, ".pi"))) {
    return { cli: "pi", confidence: "high", reason: "~/.pi directory exists" };
  }
  if (existsSync(join(home, ".config", "opencode"))) {
    return { cli: "opencode", confidence: "high", reason: "~/.config/opencode directory exists" };
  }
  if (existsSync(join(home, ".claude"))) {
    return { cli: "claude-code", confidence: "high", reason: "~/.claude directory exists" };
  }
  if (existsSync(join(home, ".codex"))) {
    return { cli: "codex", confidence: "high", reason: "~/.codex directory exists" };
  }
  
  return { cli: "generic", confidence: "low", reason: "No CLI detected, using generic fallback" };
}

/**
 * Get CLI capabilities for the current or specified CLI.
 */
export function getCLICapabilites(cli?: CLI): ReturnType<typeof getCLICapabilities> {
  const detected = cli || detectCLI();
  return getCLICapabilities(detected);
}

/**
 * Get CLI-specific tool configuration.
 * Maps abstract tool names to CLI-specific implementations.
 */
export function getCLITools(cli: string = detectCLI()): Record<string, string> {
  const baseTools: Record<string, string> = {
    read: "read",
    write: "write",
    bash: "bash",
    edit: "edit",
  };

  const cliTools: Record<string, Record<string, string>> = {
    pi: {
      subagent: "subagent",
      ask: "ask_user_question",
      plannotator: "plannotator annotate --gate",
      goals: "goal/sisyphus",
      intercom: "intercom",
      supervise: "supervise",
    },
    "opencode": {
      subagent: "subagent",
      ask: "Prompt",
      plannotator: "@plannotator/opencode",
      goals: "N/A",
      intercom: "N/A",
      supervise: "N/A",
    },
    "claude-code": {
      subagent: "subagent",
      ask: "Prompt",
      plannotator: "plannotator annotate --gate",
      goals: "N/A",
      intercom: "N/A",
      supervise: "N/A",
    },
    codex: {
      subagent: "subagent",
      ask: "Prompt",
      plannotator: "!plannotator review",
      goals: "N/A",
      intercom: "N/A",
      supervise: "N/A",
    },
  };

  // Merge base tools with CLI-specific overrides
  return {
    ...baseTools,
    ...(cliTools[cli] || {}),
  };
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
  writeFileSync(getTrackingPath(cwd), JSON.stringify(data, null, 2));
}

export function writeGlobalTracking(data: TrackingData): void {
  writeFileSync(getGlobalTrackingPath(), JSON.stringify(data, null, 2));
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
export function generatePlaceholderName(): string {
  return `wf-${Date.now().toString(36).slice(-6)}`;
}

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
  const globalTracking = readGlobalTracking();
  if (globalTracking) {
    const gwf = globalTracking.workflows.find(w => w.name === oldName);
    if (gwf) {
      gwf.name = finalName;
      gwf.updated = new Date().toISOString();
    }
    writeGlobalTracking(globalTracking);
  }

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
            currentPhase: raw.current_phase_index ?? 0,
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

/**
 * Detect if the current working directory is inside a git worktree.
 * Returns true if .git is a file (pointing to worktree metadata)
 * or if `git rev-parse --git-dir` returns a path under .git/worktrees/.
 */
export function isInsideWorktree(cwd: string): boolean {
  try {
    const { execSync } = require("child_process");
    const gitDir = execSync("git rev-parse --git-dir", { cwd, encoding: "utf-8" }).trim();
    return gitDir.includes(".git/worktrees/");
  } catch {
    return false;
  }
}

/**
 * Get the default branch name (main/master) from remote origin, or fallback to "main".
 */
export function getDefaultBranch(cwd: string): string {
  try {
    const { execSync } = require("child_process");
    const remote = execSync("git remote show origin 2>/dev/null || true", { cwd, encoding: "utf-8" });
    const match = remote.match(/HEAD branch:\s*(\S+)/);
    return match ? match[1] : "main";
  } catch {
    return "main";
  }
}

/**
 * Generate a worktree directory name from a workflow name and date.
 */
export function worktreeDirName(name: string, date?: string): string {
  return `pw-${name}-${date}`;
}

/**
 * Generate a branch name for a workflow worktree.
 */
export function worktreeBranchName(name: string, date?: string): string {
  return `pw/${name}/${date}`;
}

// ── Index.json Write ──────────────────────────────────────────────────

/**
 * Update index.json with current workflow phase state.
 * Called after phase transitions to keep the on-disk metadata in sync.
 */
export function writeIndexJson(cwd: string, wf: Workflow): void {
  if (!wf.dirHash) return;
  const ds = getDateStamp(new Date(wf.created));
  const idxPath = join(cwd, WORKFLOW_DIR, ds, wf.dirHash, "index.json");
  if (!existsSync(idxPath)) return;
  try {
    const raw = JSON.parse(readFileSync(idxPath, "utf-8"));
    raw.current_phase = PHASE_NAMES[wf.currentPhase]?.toLowerCase() || "unknown";
    raw.current_phase_index = wf.currentPhase;
    raw.updated_at = new Date().toISOString();
    raw.workflow_status = wf.status;
    writeFileSync(idxPath, JSON.stringify(raw, null, 2));
  } catch { /* skip */ }
}

// ── Phase Todos ───────────────────────────────────────────────────────

export interface PhaseTodo {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed";
  createdAt?: string;
  completedAt?: string;
}

export interface PhaseTodosData {
  workflowName: string;
  phase: string;
  phaseIndex: number;
  todos: PhaseTodo[];
  updatedAt: string;
}

const PHASE_TODOS_FILE = "phase-todos.json";

/**
 * Get path to phase-todos.json for a workflow.
 */
function getPhaseTodosPath(cwd: string, wf: Workflow): string {
  if (!wf.dirHash) return "";
  const ds = getDateStamp(new Date(wf.created));
  return join(cwd, WORKFLOW_DIR, ds, wf.dirHash, PHASE_TODOS_FILE);
}

/**
 * Read phase-todos.json for a workflow.
 * Returns null if not found or invalid.
 */
export function readPhaseTodos(cwd: string, wf: Workflow): PhaseTodosData | null {
  const path = getPhaseTodosPath(cwd, wf);
  if (!path || !existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as PhaseTodosData;
  } catch {
    return null;
  }
}

/**
 * Write phase-todos.json for a workflow.
 */
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

/**
 * Get the current phase todo list from phase-todos.json.
 * Returns empty array if no todos file found.
 */
export function getPhaseTodos(cwd: string, wf: Workflow): PhaseTodo[] {
  const data = readPhaseTodos(cwd, wf);
  return data?.todos || [];
}
