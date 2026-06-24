/**
 * Event Logger - Append-only JSONL audit trail
 *
 * Writes one JSON object per line (JSONL format) for scope execution events.
 * Append-only — never overwrites, crash-safe (atomic append on POSIX).
 *
 * Use for: audit trail, real-time monitoring (tail -f), crash forensics.
 *
 * NOT for: mutable state (use checkpoint.json + JsonFileStore for that).
 *
 * Usage:
 *   import { appendEvent } from "../modules/event-logger";
 *   appendEvent("/path/.stelow/execution/scope-1/events.jsonl", {
 *     ts: new Date().toISOString(),
 *     type: "verify",
 *     scopeId: "scope-1",
 *     iteration: 2,
 *     passed: true,
 *   });
 */

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type EventType =
  | "delegate"    // LLM delegated to subagent
  | "verify"      // Verify commands ran
  | "completed"   // Scope passed verify
  | "escalated";  // Scope maxed iterations

export interface ExecutionEvent {
  /** ISO timestamp */
  ts: string;
  /** Event type */
  type: EventType;
  /** Scope identifier */
  scopeId: string;
  /** Iteration number (which loop pass) */
  iteration: number;
  /** Whether verify passed (only for verify events) */
  passed?: boolean;
  /** Human-readable summary (e.g. which commands failed) */
  summary?: string;
}

/**
 * Append one event to a JSONL file.
 * Creates the file + parent directories if they don't exist.
 *
 * @param filePath  - Full path to events.jsonl
 * @param event     - Event object to append
 */
export function appendEvent(filePath: string, event: ExecutionEvent): void {
  // Ensure parent directory exists (defensive — LLM should create it via checkpoint)
  mkdirSync(dirname(filePath), { recursive: true });
  appendFileSync(filePath, JSON.stringify(event) + "\n", "utf-8");
}
