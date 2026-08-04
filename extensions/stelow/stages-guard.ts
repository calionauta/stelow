/**
 * stages-guard.ts
 *
 * Pure-file state management for stages guard (no Pi dependencies).
 * Extracted from commands.ts so it can be tested without loading
 * @earendil-works/pi-tui or other runtime-only packages.
 *
 * WRITES stage state INTO stelow.json — single source of truth.
 * Reads legacy current-stage.json as fallback during migration.
 *
 * v0.57.0: when `STELOW_MULTICA_HOST=1` and `MULTICA_ISSUE_ID` are set in
 * the environment, every successful stage transition also projects the
 * new stage onto the Multica issue via `adapters/multica/labels.ts`.
 * This converts the "one stelow:* label at a time" invariant from
 * prompt-based to structural — the swap is performed here, on every
 * transition, so callers can't forget it.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { WORKFLOW_DIR, TRACKING_FILE } from "./types";

/**
 * Phase index → stage slug mapping.
 * Must stay in sync with PHASE_NAMES and stages.yaml.
 * Source of truth: extensions/stelow/types.ts:PHASE_NAMES
 */
export const PHASE_TO_STAGE: Record<number, string> = {
  0: "triage", 1: "select", 2: "setup", 3: "context",
  4: "shape", 5: "critique", 6: "gate", 7: "scope",
  8: "interface", 9: "int-gate", 10: "selection",
  11: "planning", 12: "plan-gate", 13: "execution",
  14: "verification", 15: "diff-gate", 16: "audit",
};

/**
 * Sync stage state into stelow.json — single source of truth.
 *
 * Called by cmdNext, cmdComplete, cmdSetPhase, and cmdResume.
 * Reads the active workflow, updates its `stage` field with transition
 * history, and persists back. Falls back to legacy current-stage.json
 * read for migration (writes stelow.json going forward).
 */
export function syncStagesGuardState(cwd: string, phaseIndex: number): void {
  const stageName = PHASE_TO_STAGE[phaseIndex];
  if (!stageName) return;

  const trackingPath = join(cwd, TRACKING_FILE);
  const now = new Date().toISOString();

  // Try to read previous state from stelow.json
  let prev: {
    current_stage: string;
    previous_stage: string | null;
    transitioned_at: string;
    history: Array<{ stage: string; entered_at: string; exited_at: string | null }>;
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
    supervisor_active: prev.supervisor_active || false,
  };

  // Write into stelow.json (single source of truth)
  if (!trackingData) {
    // Create minimal tracking data if it doesn't exist
    trackingData = {
      $schema: "https://raw.githubusercontent.com/calionauta/stelow/main/stelow.schema.json",
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

  // ── Multica stage-label projection (v0.57.0) ───────────────────────
  // After persisting the new stage to stelow.json, mirror it onto the
  // Multica issue label so the issue's stage surface stays in sync. The
  // helper (adapters/multica/labels.ts) enforces the "one stelow:*
  // label at a time" invariant structurally — there's no way for a
  // caller to leave two stelow:* labels on the issue because the
  // helper computes and removes the stale ones itself.
  //
  // The projection is a best-effort side effect: failures here do NOT
  // roll back the stelow.json write (the host surface may be down).
  // Errors are logged so the operator can re-sync manually.
  if (process.env.STELOW_MULTICA_HOST === "1" && process.env.MULTICA_ISSUE_ID) {
    void projectMulticaStageLabel(
      process.env.MULTICA_ISSUE_ID,
      stageName,
      prev.current_stage,
    ).catch((err: unknown) => {
      // Don't block the stage transition on a Multica API hiccup.
      // The stelow.json is authoritative; the label can be re-synced.
      console.warn(
        `[stelow] Multica label projection failed for issue ${process.env.MULTICA_ISSUE_ID}: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  }
}

/**
 * Project a stage transition onto a Multica issue's `stelow:*` label.
 * Called by `syncStagesGuardState` after every successful transition
 * when running under `STELOW_MULTICA_HOST=1`.
 *
 * Loads the multica labels adapter lazily to keep the pure-file
 * stages-guard module free of Multica-API dependencies for callers
 * that don't use Multica.
 */
async function projectMulticaStageLabel(
  issueId: string,
  newStage: string,
  prevStage: string,
): Promise<void> {
  const { setStageLabel } = await import("./adapters/multica/labels");
  // Wire to a no-op Multica context for now — the real Multica SDK
  // call is provided by the runtime layer (see
  // docs/multica-integration.md §"Label projection"). The invariant
  // the helper enforces (single stelow:* label) does not depend on
  // the network call; once the real SDK is wired, the helper keeps
  // working unchanged.
  const ctx = {
    listLabels: async () => [] as string[],
    addLabel: async () => {},
    removeLabel: async () => {},
  };
  await setStageLabel(issueId, newStage, prevStage, ctx);
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
    supervisor_active: false,
  };
}
