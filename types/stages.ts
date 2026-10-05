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

export const RED_FIRST_MODES = ["strict", "advisory", "off"] as const;
export type RedFirstMode = (typeof RED_FIRST_MODES)[number];

export interface WorkflowConfig {
  quality?: "production" | "experimental";
  supervisor?: "low" | "med" | "high";
  exploration_count?: string | number;
  exploration_hybrid?: string | boolean;
  review_mode?: string;
  domains_detected?: string[];
  red_first?: RedFirstMode;
}

export interface StageTransitionMap {
  [verb: string]: string[] | undefined;
}

export interface StageQuestion {
  id: string;
  kind: "human-ask" | "agent-receipt" | "skip";
  gate: string;
  modes: string[];
  /** @deprecated Use exploration_min_count. Kept for old states. */
  appetite?: string[];
  exploration_min_count?: number;
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

/** Frozen scope acceptance contract (mirrors stelow.schema.json#/definitions/scope-contract). */
export interface ScopeContract {
  acceptance_criteria: string[];
  verify_commands: string[];
  target_files?: string[];
  /** P-1 test-first: test file → acceptance criteria it guards. Every criterion must be mapped. */
  test_map: Record<string, string[]>;
  /** SHA of the frozen acceptance text — tests freeze here, never edited to pass. */
  freeze_sha: string;
  /** Observed FAIL before the fix (non-zero exit). */
  red_proof: {
    failed_command: string;
    exit_code: number;
    output_excerpt?: string;
  };
  /** Pre-change verify exit codes ({command: exitCode}); must be non-empty. */
  baseline: Record<string, number>;
}

/** Criteria listed in acceptance_criteria but mapped by no test_map entry. */
export function findUnmappedCriteria(contract: ScopeContract): string[] {
  const criteria = contract.acceptance_criteria ?? [];
  const mapped = new Set<string>();
  const testMap = contract.test_map ?? {};
  for (const list of Object.values(testMap)) {
    for (const criterion of list ?? []) mapped.add(criterion);
  }
  return criteria.filter((criterion) => !mapped.has(criterion));
}

export interface ScopeContractVerdict {
  ok: boolean;
  unmapped: string[];
  errors: string[];
}

/**
 * P-1 test-first gate (AC-sem-teste=reject): a scope contract is accepted
 * only when every acceptance criterion maps to a test and the
 * freeze/red/baseline evidence is present. Pure function — hosts shell out
 * to scripts/stelow for state, but the verdict logic lives here so tests
 * import production code instead of reimplementing it.
 */
export function validateScopeContract(contract: ScopeContract): ScopeContractVerdict {
  const errors: string[] = [];
  if (!Array.isArray(contract.acceptance_criteria) || contract.acceptance_criteria.length === 0) {
    errors.push("acceptance_criteria must be a non-empty list");
  }
  if (!Array.isArray(contract.verify_commands) || contract.verify_commands.length === 0) {
    errors.push("verify_commands must be a non-empty list");
  }
  const unmapped = findUnmappedCriteria(contract);
  if (unmapped.length > 0) {
    errors.push(`AC-sem-teste REJECT: ${unmapped.length} unmapped AC(s): ${unmapped.join("; ")}`);
  }
  if (typeof contract.freeze_sha !== "string" || contract.freeze_sha.length === 0) {
    errors.push("freeze_sha is required (frozen acceptance text)");
  }
  const redProof = contract.red_proof;
  const redProofWellFormed =
    !!redProof &&
    typeof redProof.failed_command === "string" &&
    redProof.failed_command.length > 0 &&
    typeof redProof.exit_code === "number" &&
    Number.isInteger(redProof.exit_code) &&
    redProof.exit_code !== 0;
  if (!redProofWellFormed) {
    errors.push("red_proof must record an observed FAIL (non-empty failed_command, non-zero exit_code)");
  }
  const baseline = contract.baseline;
  const baselineWellFormed =
    !!baseline && typeof baseline === "object" && Object.keys(baseline).length > 0;
  if (!baselineWellFormed) {
    errors.push("baseline must record pre-change verify exits ({command: exitCode})");
  }
  if (
    redProofWellFormed &&
    baselineWellFormed &&
    !Object.prototype.hasOwnProperty.call(baseline, (redProof as { failed_command: string }).failed_command)
  ) {
    errors.push(
      `red_proof.failed_command must cite an executed verify command with a baseline entry (unobserved FAIL is rejected): "${(redProof as { failed_command: string }).failed_command}" has no baseline entry`,
    );
  }
  if (baseline && typeof baseline === "object" && Array.isArray(contract.verify_commands)) {
    for (const cmd of contract.verify_commands) {
      if (typeof cmd !== "string" || cmd.length === 0) continue;
      if (!Object.prototype.hasOwnProperty.call(baseline, cmd)) {
        errors.push(
          `verify_command without baseline entry (never executed pre-change): "${cmd}" has no baseline entry`,
        );
      }
    }
  }
  return { ok: errors.length === 0, unmapped, errors };
}

/** Audit evidence flag codes (mirror workflow-audit criteria 6). */
export type EvidenceFlagCode = "baseline-empty" | "red-missing" | "frozen-edited";

export interface EvidenceFlag {
  code: EvidenceFlagCode;
  severity: "warning" | "block";
}

/** Close-out record evidence examined by the workflow audit. */
export interface RecordEvidence {
  verified?: boolean;
  red_proof?: {
    failed_command?: string;
    exit_code?: number;
  };
  freeze_sha?: string;
  baseline?: Record<string, number>;
  /** Hash of the current test text — differs from freeze_sha when the frozen test was edited. */
  test_sha?: string;
}

/**
 * Audit evidence flags (workflow-audit criteria 6): empty/missing
 * baseline → warning `baseline-empty`; missing red_proof or a zero
 * exit (guard never observed failing) → warning `red-missing`;
 * test text changed after freeze_sha → block `frozen-edited`.
 * Pure function — the audit skill routes these severities, the
 * verdict logic lives here so tests import production code.
 */
export function classifyRecordEvidence(record: RecordEvidence): EvidenceFlag[] {
  const flags: EvidenceFlag[] = [];
  const baseline = record.baseline;
  if (!baseline || typeof baseline !== "object" || Object.keys(baseline).length === 0) {
    flags.push({ code: "baseline-empty", severity: "warning" });
  }
  const redProof = record.red_proof;
  if (
    !redProof ||
    typeof redProof.failed_command !== "string" ||
    redProof.failed_command.length === 0 ||
    typeof redProof.exit_code !== "number" ||
    redProof.exit_code === 0
  ) {
    flags.push({ code: "red-missing", severity: "warning" });
  }
  if (
    typeof record.test_sha === "string" &&
    record.test_sha.length > 0 &&
    typeof record.freeze_sha === "string" &&
    record.freeze_sha.length > 0 &&
    record.test_sha !== record.freeze_sha
  ) {
    flags.push({ code: "frozen-edited", severity: "block" });
  }
  return flags;
}
