/**
 * Provenance log — append-only JSONL history of workflow events.
 *
 * Backed by `.stelow/inbox/history.jsonl` (one JSON object per line).
 * Used for audit, debugging, and the `--stale-workflows` Muxy panel view.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** Path relative to the project root (`.stelow/inbox/history.jsonl`). */
export const PROVENANCE_FILE = join(".stelow", "inbox", "history.jsonl");

export function getProvenancePath(cwd: string): string {
  return join(cwd, PROVENANCE_FILE);
}

/**
 * Append a single provenance entry. Each entry is one JSON line; the
 * `ts` (ISO-8601 UTC timestamp) field is auto-injected by this function.
 */
export function appendProvenance(cwd: string, entry: Record<string, unknown>): void {
  const path = getProvenancePath(cwd);
  mkdirSync(dirname(path), { recursive: true });
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n";
  writeFileSync(path, line, { flag: "a" });
}

/**
 * Read all provenance entries. Returns parsed JSON objects in order
 * (oldest first). Skips malformed lines silently. Returns `[]` when the
 * file is missing or unreadable.
 */
export function readProvenance(cwd: string): Record<string, unknown>[] {
  const path = getProvenancePath(cwd);
  if (!existsSync(path)) return [];
  const results: Record<string, unknown>[] = [];
  try {
    const lines = readFileSync(path, "utf-8")
      .split("\n")
      .filter((l) => l.trim().length > 0);
    for (const line of lines) {
      try {
        results.push(JSON.parse(line));
      } catch {
        // skip corrupt line
      }
    }
  } catch {
    // skip unreadable file
  }
  return results;
}
