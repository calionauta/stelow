// types/stages.ts
// Shared interfaces for the canonical stages.yaml contract.

export const EXECUTION_MODES = ["direct", "hybrid", "orchestrated"] as const;
export type ExecutionMode = (typeof EXECUTION_MODES)[number];

export const WRITE_POLICIES = ["none", "artifact", "state", "workspace"] as const;
export type WritePolicy = (typeof WRITE_POLICIES)[number];

export const PARTITIONS = ["none", "dependencies", "target-files", "transitive-impact", "custom"] as const;
export type Partition = (typeof PARTITIONS)[number];

export const CAPABILITIES = [
  "fanout",
  "pipeline",
  "structured-output",
  "durable-run",
  "resume",
  "cancel",
  "status",
  "hidden-workers",
  "human-input",
  "per-call-model",
  "per-call-permission",
  "isolated-workspace",
  "file-claims",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

export interface StageTransitionMap {
  [verb: string]: string[] | undefined;
}

export interface StageQuestion {
  id: string;
  kind: "human-ask" | "agent-receipt" | "skip";
  gate: string;
  modes: string[];
  appetite?: string[];
  evidence?: string;
  receipt: string;
}

export interface StageExecution {
  mode: ExecutionMode;
  recipe: string | null;
  required_capabilities: Capability[];
  preferred_capabilities: Capability[];
  write_policy: WritePolicy;
  partition: Partition;
  permission_profile: "inherit" | "per-call" | "host-preset";
}

export interface StageRoute {
  intents?: Record<string, string[]>;
  review_modes?: Record<string, { skipped: string[] }>;
  entry_stages?: Record<string, string>;
}

export interface Stage {
  name: string;
  order: number;
  phase: string;
  model_hint?: string;
  description: string;
  label: string;
  produces: string;
  artifacts: string[];
  skill: string;
  playbook: string | null;
  execution: StageExecution;
  routes?: StageRoute;
  blocked_tools: string[];
  allowed_tools: string[];
  preferred_tools: string[];
  primary_actions: string[];
  questions?: StageQuestion[];
  transitions: StageTransitionMap;
  requires_approval?: boolean;
  approval_tool?: string | null;
  supervisor?: boolean;
}

export interface Phase {
  id: string;
  label: string;
}

export interface StagesConfig {
  version: number;
  phases: Phase[];
  tools: string[];
  routes?: {
    intents?: Record<string, string[]>;
    review_modes?: Record<string, { skipped: string[] }>;
    entry_stages?: Record<string, string>;
  };
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
  supervisor_active: boolean;
}
