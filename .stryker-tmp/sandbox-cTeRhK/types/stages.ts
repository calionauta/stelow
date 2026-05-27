// @ts-nocheck
// types/stages.ts
// Interfaces compartilhadas para o schema de stages.yaml

export interface StageTransitions {
  next?: string[];
  accept?: string[];
  reject?: string[];
  rework?: string[];
  [key: string]: string[] | undefined;
}

export interface Stage {
  name: string;
  order: number;
  description: string;
  blocked_tools: string[];
  allowed_tools: string[];
  preferred_tools: string[];
  primary_actions: string[];
  transitions: StageTransitions;
  requires_approval?: boolean;
  approval_tool?: string;
  supervisor?: boolean;
}

export interface StagesConfig {
  stages: Stage[];
}

export interface StageHistoryEntry {
  stage: string;
  entered_at: string;
  exited_at: string | null;
}

export interface StageState {
  current_stage: string;
  previous_stage: string | null;
  transitioned_at: string;
  history: StageHistoryEntry[];
  gates_passed: string[];
  supervisor_active: boolean;
}
