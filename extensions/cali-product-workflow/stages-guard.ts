/**
 * stages-guard.ts
 *
 * Pure-file state management for stages guard (no Pi dependencies).
 * Extracted from commands.ts so it can be tested without loading
 * @earendil-works/pi-tui or other runtime-only packages.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { WORKFLOW_DIR } from "./types";

/**
 * Phase index → stage slug mapping.
 * Must stay in sync with PHASE_NAMES and stages.yaml.
 * Source of truth: extensions/cali-product-workflow/types.ts:PHASE_NAMES
 */
export const PHASE_TO_STAGE: Record<number, string> = {
  0: "triage", 1: "select", 2: "setup", 3: "context",
  4: "shape", 5: "critique", 6: "gate", 7: "scope",
  8: "interface", 9: "int-gate", 10: "selection",
  11: "planning", 12: "execution", 13: "verification",
  14: "audit",
};

/**
 * Sync current-stage.json on disk — tracks stage transitions with full history.
 *
 * Called by cmdNext, cmdComplete, cmdSetPhase, and cmdResume.
 * Creates $WORKFLOW_DIR/state/current-stage.json with:
 *   - current_stage: the stage we're entering
 *   - previous_stage: the stage we're leaving (or null for first)
 *   - transitioned_at: ISO timestamp of transition
 *   - history: array of {stage, entered_at, exited_at}
 *   - gates_passed: preserved across transitions
 *   - supervisor_active: preserved across transitions
 */
export function syncStagesGuardState(cwd: string, phaseIndex: number): void {
  const stageName = PHASE_TO_STAGE[phaseIndex];
  if (!stageName) return;
  const stateDir = join(cwd, WORKFLOW_DIR, "state");
  if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });
  const statePath = join(stateDir, "current-stage.json");
  const now = new Date().toISOString();
  const prev = existsSync(statePath)
    ? JSON.parse(readFileSync(statePath, "utf-8"))
    : { current_stage: "triage", previous_stage: null, transitioned_at: now, history: [], gates_passed: [], supervisor_active: false };
  const newState = {
    current_stage: stageName,
    previous_stage: prev.current_stage,
    transitioned_at: now,
    history: [...(prev.history || []), { stage: prev.current_stage, entered_at: prev.transitioned_at, exited_at: now }],
    gates_passed: prev.gates_passed || [],
    supervisor_active: prev.supervisor_active || false,
  };
  writeFileSync(statePath, JSON.stringify(newState, null, 2));
}
