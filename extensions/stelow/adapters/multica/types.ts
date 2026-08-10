/**
 * Multica Adapter Types & Contracts
 * 
 * Defines KV metadata schemas, stage-to-status mappings, and adapter configuration
 * for the Multica.ai platform integration.
 */

export type CanonicalStage =
  | "triage"
  | "select"
  | "setup"
  | "context"
  | "shape"
  | "critique"
  | "gate"
  | "scope"
  | "interface"
  | "int-gate"
  | "selection"
  | "planning"
  | "plan-gate"
  | "execution"
  | "verification"
  | "diff-gate"
  | "audit";

export type MulticaIssueStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "blocked"
  | "cancelled";

export type Appetite = "Lean" | "Core" | "Complete";

export interface MulticaMetadata {
  workflow_id?: string;
  current_stage?: CanonicalStage | string;
  appetite?: Appetite;
  review_mode?: string;
  stelow_version?: string;
  last_transition_at?: string;
  strategic_exploration?: boolean;
  blocked_reason?: string;
  [key: string]: unknown;
}

/**
 * Mapping matrix between Stelow 17 canonical stages and Multica native issue statuses.
 */
export const STAGE_TO_MULTICA_STATUS_MAP: Record<CanonicalStage, MulticaIssueStatus> = {
  triage: "todo",
  select: "todo",
  setup: "in_progress",
  context: "in_progress",
  shape: "in_progress",
  critique: "in_progress",
  gate: "in_review",
  scope: "in_progress",
  interface: "in_progress",
  "int-gate": "in_review",
  selection: "in_progress",
  planning: "in_progress",
  "plan-gate": "in_review",
  execution: "in_progress",
  verification: "in_progress",
  "diff-gate": "in_review",
  audit: "done",
};

/**
 * Helper to resolve Multica status from stage slug.
 */
export function getMulticaStatusForStage(stage: string): MulticaIssueStatus {
  const canonical = stage.toLowerCase() as CanonicalStage;
  if (canonical in STAGE_TO_MULTICA_STATUS_MAP) {
    return STAGE_TO_MULTICA_STATUS_MAP[canonical];
  }
  return "in_progress";
}
