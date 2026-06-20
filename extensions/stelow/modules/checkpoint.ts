/**
 * Execution Checkpoint - Scope execution state persistence
 *
 * Persists scope execution state as JSON for crash recovery.
 * The LLM writes; the extension reads (via verify-runner on turn_end).
 *
 * Reuses JsonFileStore from file-store.ts — no raw fs I/O.
 *
 * Usage:
 *   const store = getCheckpointStore(cwd, "scope-1");
 *   const cp = store.read();
 *   if (cp && cp.status === "waiting_verify") { ... }
 *   store.write({ ...updated checkpoint... });
 */

import { JsonFileStore } from "./file-store";
import { join } from "node:path";
import { WORKFLOW_DIR } from "../types";
import { existsSync, readdirSync } from "node:fs";

// ── Types ──────────────────────────────────────────────────────────────

export const EXECUTION_DIR = join(WORKFLOW_DIR, "execution");

export type CheckpointStatus =
  | "in_progress"    // LLM is working on the scope
  | "waiting_verify" // LLM finished, waiting for extension to run verify
  | "completed"      // Verify passed
  | "escalated";     // Max iterations reached without passing verify

export type CheckpointStep = "delegate" | "verify" | "done";

export interface VerifyResult {
  command: string;
  passed: boolean;
  output: string;
}

export interface ExecutionCheckpoint {
  /** Schema version for forward compatibility */
  schemaVersion: 1;
  /** Scope identifier (e.g. "scope-1") */
  scopeId: string;
  /** Current iteration (0-based) */
  iteration: number;
  /** Maximum iterations before escalate */
  maxIterations: number;
  /** Current execution status */
  status: CheckpointStatus;
  /** Shell commands to run for verification */
  verifyCommands: string[];
  /** Results of the last verify run */
  verifyResults: VerifyResult[];
  /** Accumulated feedback from failed iterations */
  feedbackLog: string[];
  /** Last completed step */
  lastStep: CheckpointStep;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
}

// ── Store Factory ──────────────────────────────────────────────────────

/**
 * Get a JsonFileStore for a scope's checkpoint.
 *
 * @param execDir  - The execution directory (.stelow/execution)
 * @param scopeId  - The scope identifier
 * @returns JsonFileStore typed to ExecutionCheckpoint
 */
export function getCheckpointStore(
  execDir: string,
  scopeId: string
): JsonFileStore<ExecutionCheckpoint> {
  return new JsonFileStore<ExecutionCheckpoint>(
    join(execDir, scopeId, "checkpoint.json")
  );
}

// ── Directory Helpers ────────────────────────────────────────────────

/**
 * Resolve the execution directory for a project.
 *
 * @param projectDir  - Project root directory
 * @returns Path to .stelow/execution
 */
export function getExecutionDir(projectDir: string): string {
  return join(projectDir, EXECUTION_DIR);
}

/**
 * List all scope IDs that have checkpoint directories.
 *
 * @param execDir  - The execution directory
 * @returns Array of scope directory names
 */
export function listScopeDirs(execDir: string): string[] {
  if (!existsSync(execDir)) return [];
  return readdirSync(execDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

/**
 * Create a fresh checkpoint for a scope iteration.
 */
export function createFreshCheckpoint(
  scopeId: string,
  verifyCommands: string[],
  maxIterations: number
): ExecutionCheckpoint {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    scopeId,
    iteration: 0,
    maxIterations,
    status: "in_progress",
    verifyCommands,
    verifyResults: [],
    feedbackLog: [],
    lastStep: "delegate",
    createdAt: now,
    updatedAt: now,
  };
}
