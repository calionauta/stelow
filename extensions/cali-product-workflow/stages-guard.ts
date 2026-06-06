/**
 * stages-guard.ts
 *
 * Pure-file state management for stages guard (no Pi dependencies).
 * Extracted from commands.ts so it can be tested without loading
 * @earendil-works/pi-tui or other runtime-only packages.
 *
 * WRITES stage state INTO cali-product-workflow.json — single source of truth.
 * Reads legacy current-stage.json as fallback during migration.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { WORKFLOW_DIR, TRACKING_FILE } from "./types";

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
 * Sync stage state into cali-product-workflow.json — single source of truth.
 *
 * Called by cmdNext, cmdComplete, cmdSetPhase, and cmdResume.
 * Reads the active workflow, updates its `stage` field with transition
 * history, and persists back. Falls back to legacy current-stage.json
 * read for migration (writes cali-product-workflow.json going forward).
 */
export function syncStagesGuardState(cwd: string, phaseIndex: number): void {
  const stageName = PHASE_TO_STAGE[phaseIndex];
  if (!stageName) return;

  const trackingPath = join(cwd, TRACKING_FILE);
  const now = new Date().toISOString();

  // Try to read previous state from cali-product-workflow.json
  let prev: {
    current_stage: string;
    previous_stage: string | null;
    transitioned_at: string;
    history: Array<{ stage: string; entered_at: string; exited_at: string | null }>;
    gates_passed: string[];
    supervisor_active: boolean;
  };

  let trackingData: any = null;
  if (existsSync(trackingPath)) {
    try {
      trackingData = JSON.parse(readFileSync(trackingPath, "utf-8"));
      const activeWf = (trackingData.workflows || []).find((w: any) => w.status === "in-progress");
      if (activeWf?.stage) {
        prev = activeWf.stage;
      } else if (activeWf) {
        // Workflow exists but has no stage field yet — derive from currentPhase
        const derivedStage = PHASE_TO_STAGE[activeWf.currentPhase] || "triage";
        prev = {
          current_stage: derivedStage,
          previous_stage: null,
          transitioned_at: now,
          history: [],
          gates_passed: [],
          supervisor_active: false,
        };
      } else {
        // Tracking file exists but no active workflow — prev from fallback,
        // but keep trackingData so we don't overwrite existing workflows
        prev = getFallbackState(cwd, now);
      }
    } catch {
      trackingData = null;
      prev = getFallbackState(cwd, now);
    }
  } else {
    prev = getFallbackState(cwd, now);
  }

  const newState = {
    current_stage: stageName,
    previous_stage: prev.current_stage,
    transitioned_at: now,
    history: [
      ...(prev.history || []),
      {
        stage: prev.current_stage,
        entered_at: prev.transitioned_at,
        exited_at: now,
      },
    ],
    gates_passed: prev.gates_passed || [],
    supervisor_active: prev.supervisor_active || false,
  };

  // Write into cali-product-workflow.json (single source of truth)
  if (!trackingData) {
    // Create minimal tracking data if it doesn't exist
    trackingData = {
      $schema: "https://raw.githubusercontent.com/cali/cali-product-workflow/main/cali-product-workflow.schema.json",
      version: "1.0",
      created: now,
      updated: now,
      workflows: [],
    };
  }

  const activeIdx = (trackingData.workflows || []).findIndex((w: any) => w.status === "in-progress");
  if (activeIdx !== -1) {
    trackingData.workflows[activeIdx].stage = newState;
    trackingData.workflows[activeIdx].currentPhase = phaseIndex;
    trackingData.workflows[activeIdx].updated = now;
  }
  trackingData.updated = now;

  const trackingDir = dirname(trackingPath);
  if (!existsSync(trackingDir)) mkdirSync(trackingDir, { recursive: true });
  writeFileSync(trackingPath, JSON.stringify(trackingData, null, 2));
}

/**
 * Fallback: read from legacy current-stage.json for migration compatibility.
 * Returns default triage state if legacy file doesn't exist.
 */
function getFallbackState(
  cwd: string,
  now: string
): {
  current_stage: string;
  previous_stage: string | null;
  transitioned_at: string;
  history: Array<{ stage: string; entered_at: string; exited_at: string | null }>;
  gates_passed: string[];
  supervisor_active: boolean;
} {
  const legacyPath = join(cwd, WORKFLOW_DIR, "state", "current-stage.json");
  if (existsSync(legacyPath)) {
    try {
      const legacy = JSON.parse(readFileSync(legacyPath, "utf-8"));
      return {
        current_stage: legacy.current_stage || "triage",
        previous_stage: legacy.previous_stage || null,
        transitioned_at: legacy.transitioned_at || now,
        history: legacy.history || [],
        gates_passed: legacy.gates_passed || [],
        supervisor_active: legacy.supervisor_active || false,
      };
    } catch {
      // corrupt legacy file — ignore
    }
  }
  return {
    current_stage: "triage",
    previous_stage: null,
    transitioned_at: now,
    history: [],
    gates_passed: [],
    supervisor_active: false,
  };
}
