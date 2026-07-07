/**
 * Inbox — deferred-item staging area for cross-session continuity.
 *
 * Backed by `.stelow/inbox/items.md` (plain-text, one item per line).
 * Functions in this module are intentionally side-effectful: they read
 * and write the inbox file on disk. Concurrent writes are racy; callers
 * must coordinate (in practice, stelow serializes TUI commands).
 *
 * The provenance history log (`.stelow/inbox/history.jsonl`, JSONL format)
 * lives in `provenance.ts` and is imported here only for the path constant.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PROVENANCE_FILE } from "./provenance";

const INBOX_DIR = ".stelow/inbox";
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

/**
 * Read inbox items as a deduplicated, trimmed list (lines from items.md,
 * excluding `#` comments and blank lines).
 *
 * Returns `[]` when the file is missing or unreadable — never throws.
 */
export function readInbox(cwd: string): string[] {
  const path = getInboxPath(cwd);
  if (!existsSync(path)) return [];
  try {
    const content = readFileSync(path, "utf-8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => !line.startsWith("#"));
  } catch {
    return [];
  }
}

/**
 * Persist the full inbox contents, replacing any prior items.
 * Always writes the `# Inbox` header so a Markdown reader shows a
 * sensible default.
 */
export function writeInbox(cwd: string, items: string[]): void {
  ensureInboxDir(cwd);
  const path = getInboxPath(cwd);
  const header = "# Inbox\n\n";
  const content = items.length > 0 ? items.join("\n") + "\n" : "\n";
  writeFileSync(path, header + content);
}

/** Append a single item if not already present. */
export function addToInbox(cwd: string, item: string): void {
  const items = readInbox(cwd);
  if (!items.includes(item)) {
    items.push(item);
    writeInbox(cwd, items);
  }
}

/** Remove every occurrence of `item` from the inbox. */
export function removeFromInbox(cwd: string, item: string): void {
  const items = readInbox(cwd);
  writeInbox(cwd, items.filter((i) => i !== item));
}

/** Drop every item from the inbox (file kept with `# Inbox` header). */
export function clearInbox(cwd: string): void {
  writeInbox(cwd, []);
}

// Re-export provenance path so callers can fetch the JSONL history.
// Imported here (not in provenance.ts) because the path lives alongside
// the inbox directory and is conceptually one unit.
export { PROVENANCE_FILE };
