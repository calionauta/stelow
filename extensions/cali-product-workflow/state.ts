import { existsSync, readFileSync, writeFileSync, statSync, readdirSync } from "node:fs";
import { join, basename, dirname, extname } from "node:path";
import type { Workflow, TrackingData, ParsedInput } from "./types";
import { WORKFLOW_DIR, TRACKING_FILE, GLOBAL_TRACKING_FILE, SCHEMA_URL, PHASE_NAMES } from "./types";

// ── Shared State ─────────────────────────────────────────────────────

export const parsedInputStore: Map<string, ParsedInput> = new Map();

let untitledCounter = 0;

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

// ── Read / Write ─────────────────────────────────────────────────────

export function readTracking(cwd: string): TrackingData | null {
  const path = getTrackingPath(cwd);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

export function readGlobalTracking(): TrackingData | null {
  const path = getGlobalTrackingPath();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
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

/** Placeholder display name when user hasn't provided context yet */
export function generatePlaceholderName(): string {
  untitledCounter++;
  return `untitled-${untitledCounter}`;
}

/** Stable directory hash (never changes, survives rename) */
export function generateDirHash(): string {
  const ts = Date.now().toString(36).slice(-4);
  const rand = Math.random().toString(36).substring(2, 8);
  return `pw-${ts}-${rand}`;
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

  // 3. index.json
  const ds = getDateStamp(new Date(wf.created));
  const idxPath = join(cwd, "product-workflow", ds, oldName, "index.json");
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
 * Scan product-workflow/<date>/<dirHash>/index.json on disk and return
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
