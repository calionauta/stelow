import { randomUUID } from "node:crypto";
import type { Workflow } from "../../types";

export const MULTICA_STAGE_STATUS = {
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
} as const;

export type MulticaStage = keyof typeof MULTICA_STAGE_STATUS;
export type MulticaIssueStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "blocked"
  | "cancelled";

export interface MulticaMetadata {
  workflow_id: string;
  current_stage: MulticaStage;
  appetite?: string;
  review_mode?: string;
  stelow_version: string;
  last_transition_at: string;
  strategic_exploration?: boolean;
  blocked_reason?: string;
  gate_approved_at?: string;
  int_gate_approved_at?: string;
  plan_gate_approved_at?: string;
  diff_gate_approved_at?: string;
}

export interface MulticaWorkflowProjection {
  metadata: MulticaMetadata;
  status: MulticaIssueStatus;
  stageLabel: string;
}

/** One mutually-exclusive label keeps boards filterable without label accumulation. */
export function multicaStageLabel(stage: MulticaStage): string {
  return `stelow:${stage}`;
}

export function isMulticaStage(value: string): value is MulticaStage {
  return Object.prototype.hasOwnProperty.call(MULTICA_STAGE_STATUS, value);
}

export function projectWorkflowToMultica(
  workflow: Workflow,
  stelowVersion: string,
  existingWorkflowId?: string,
): MulticaWorkflowProjection {
  const stage = workflow.stage?.current_stage;
  if (!stage || !isMulticaStage(stage)) {
    throw new Error(`Cannot project unknown Stelow stage: ${String(stage)}`);
  }

  return {
    status: MULTICA_STAGE_STATUS[stage],
    stageLabel: multicaStageLabel(stage),
    metadata: {
      workflow_id: existingWorkflowId ?? randomUUID(),
      current_stage: stage,
      ...(workflow.config?.appetite ? { appetite: workflow.config.appetite } : {}),
      ...(workflow.config?.review_mode ? { review_mode: workflow.config.review_mode } : {}),
      stelow_version: stelowVersion,
      last_transition_at: workflow.stage.transitioned_at,
    },
  };
}
