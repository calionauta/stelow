/**
 * Runtime validation schemas (G2A from stelow-reliability plan)
 *
 * Single source of truth for runtime validation of stelow.json
 * contents. Uses TypeBox (already a peer dependency) — KISS vs Zod:
 *  - JSON Schema compatible (matches stelow.schema.json philosophy)
 *  - Smaller footprint (~25KB vs Zod's ~50KB)
 *  - Static type inference via `Static<typeof X>`
 *
 * Convention over configuration:
 *  - Unknown fields are stripped (`additionalProperties: false` is NOT
 *    used because migrations add fields frequently). `Value.Check`
 *    treats extra props as valid by default.
 *  - Optional fields use Type.Optional. Missing fields do not throw.
 *  - String/number/bool fields are strict types. Coercion is NOT used
 *    (avoids hiding bugs in data import paths).
 *
 * Integration:
 *  - `validateWorkflow(wf)` is exported and called from `writeTracking`
 *    BEFORE the per-scope schema-record validation. Workflow-level
 *    shape errors are surfaced early with full path context.
 *  - `STELOW_VALIDATE=0` escape hatch also disables workflow-level
 *    validation (consistent with the per-scope check).
 */

import { Type, type Static } from "typebox";
import { Value } from "typebox/value";

// ── Enum-like string unions ───────────────────────────────────────

/** Per stelow types.ts:ScopeStatus */
export const ScopeStatusSchema = Type.Union([
  Type.Literal("pending"),
  Type.Literal("in-progress"),
  Type.Literal("completed"),
  Type.Literal("escalated"),
  Type.Literal("failed"),
]);
export type ScopeStatusT = Static<typeof ScopeStatusSchema>;

/** Per stelow types.ts:ScopeTask.source */
export const TaskSourceSchema = Type.Union([
  Type.Literal("planned"),
  Type.Literal("discovered"),
]);
export type TaskSourceT = Static<typeof TaskSourceSchema>;

/** Per stelow types.ts:ScopeTask.status */
export const TaskStatusSchema = Type.Union([
  Type.Literal("pending"),
  Type.Literal("done"),
  Type.Literal("skipped"),
]);
export type TaskStatusT = Static<typeof TaskStatusSchema>;

/** Per stelow types.ts:WorkflowIntent */
export const WorkflowIntentSchema = Type.Union([
  Type.Literal("new-product"),
  Type.Literal("feature"),
  Type.Literal("bugfix"),
  Type.Literal("refactor"),
  Type.Literal("investigate"),
  Type.Literal("unknown"),
]);
export type WorkflowIntentT = Static<typeof WorkflowIntentSchema>;

// ── Leaf schemas ──────────────────────────────────────────────────

/** ScopeTask — mirrors types.ts:ScopeTask */
export const ScopeTaskSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  name: Type.String({ minLength: 1 }),
  source: TaskSourceSchema,
  status: TaskStatusSchema,
  discovered_in_iter: Type.Optional(Type.Number()),
  components: Type.Optional(Type.Array(Type.String())),
  risk: Type.Optional(Type.Number({ minimum: 1, maximum: 5 })),
  note: Type.Optional(Type.String()),
});
export type ScopeTaskT = Static<typeof ScopeTaskSchema>;

/** ScopeRecord — mirrors types.ts:ScopeRecord */
export const ScopeRecordSchema = Type.Object({
  completed_at: Type.String(),
  files_count: Type.Number({ minimum: 0 }),
  commands_count: Type.Number({ minimum: 0 }),
  verified: Type.Boolean(),
  suggested_commit: Type.Optional(Type.String()),
});
export type ScopeRecordT = Static<typeof ScopeRecordSchema>;

/** Phase — mirrors types.ts:Phase */
export const PhaseSchema = Type.Object({
  id: Type.String(),
  name: Type.String({ minLength: 1 }),
  status: Type.String(),
  started: Type.Optional(Type.String()),
  completed: Type.Optional(Type.String()),
});
export type PhaseT = Static<typeof PhaseSchema>;

// ── Workflow config (nested object) ───────────────────────────────

export const WorkflowConfigSchema = Type.Object({
  appetite: Type.Optional(Type.String()),
  review_mode: Type.Optional(Type.String()),
  domains_detected: Type.Optional(Type.Array(Type.String())),
});
export type WorkflowConfigT = Static<typeof WorkflowConfigSchema>;

// ── Scope — mirrors types.ts:Scope ────────────────────────────────

export const ScopeSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  name: Type.String({ minLength: 1, maxLength: 200 }),
  type: Type.String({ minLength: 1 }),
  status: ScopeStatusSchema,
  blockedBy: Type.Optional(Type.Array(Type.String())),
  iteration: Type.Optional(Type.Number({ minimum: 0 })),
  maxIterations: Type.Optional(Type.Number({ minimum: 0 })),
  source: Type.Optional(Type.String()),
  targetFiles: Type.Optional(Type.Array(Type.String())),
  actualFiles: Type.Optional(Type.Array(Type.String())),
  startSha: Type.Optional(Type.String()),
  lockTtlSeconds: Type.Optional(Type.Number({ minimum: 60, maximum: 86400 })),
  tasks: Type.Optional(Type.Array(ScopeTaskSchema)),
  discovered_tasks_count: Type.Optional(Type.Number({ minimum: 0 })),
  record: Type.Optional(ScopeRecordSchema),
});
export type ScopeT = Static<typeof ScopeSchema>;

// ── Workflow — mirrors types.ts:Workflow ──────────────────────────

export const WorkflowSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  description: Type.Optional(Type.String()),
  draftContent: Type.Optional(Type.String()),
  source: Type.Optional(Type.String()),
  status: Type.String(),
  currentPhase: Type.Number({ minimum: 0 }),
  phases: Type.Array(PhaseSchema),
  // Stage state intentionally left as untyped passthrough — its
  // shape is governed by stages-guard.ts which already validates
  // it. Re-validating here would duplicate logic. Optional because
  // legacy/imported workflows may not have it populated yet.
  stage: Type.Optional(Type.Unknown()),
  created: Type.String({ minLength: 1 }),
  updated: Type.String({ minLength: 1 }),
  completedAt: Type.Optional(Type.String()),
  cwd: Type.Optional(Type.String()),
  worktreePath: Type.Optional(Type.String()),
  dirHash: Type.Optional(Type.String()),
  detectedCLI: Type.Optional(Type.String()),
  config: Type.Optional(WorkflowConfigSchema),
  intent: Type.Optional(WorkflowIntentSchema),
  scopes: Type.Optional(Type.Array(ScopeSchema)),
  specTechFile: Type.Optional(Type.String()),
});
export type WorkflowT = Static<typeof WorkflowSchema>;

// ── TrackingData — top-level container ───────────────────────────

export const TrackingDataSchema = Type.Object({
  $schema: Type.String(),
  version: Type.String({ minLength: 1 }),
  created: Type.String({ minLength: 1 }),
  updated: Type.String({ minLength: 1 }),
  workflows: Type.Array(WorkflowSchema),
});
export type TrackingDataT = Static<typeof TrackingDataSchema>;

// ── Validator ────────────────────────────────────────────────────

export class WorkflowValidationError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly errors: ReturnType<typeof Value.Errors>,
  ) {
    super(message);
    this.name = "WorkflowValidationError";
  }
}

/**
 * Runtime validation of a single Workflow object.
 *
 * Returns the (possibly coerced) data on success. Throws
 * WorkflowValidationError on failure with:
 *  - the data path that failed
 *  - the underlying TypeBox errors (with `.path`, `.message`)
 *
 * Empty input returns null (caller decides whether to skip).
 */
export function validateWorkflow(data: unknown): unknown | null {
  if (data == null) return null;
  const errors = Value.Errors(WorkflowSchema, data);
  if (errors.length === 0) return data;

  const first = errors[0];
  const path = first.instancePath || "<root>";
  throw new WorkflowValidationError(
    `Workflow validation failed at ${path}: ${first.message}`,
    path,
    errors,
  );
}

/**
 * Runtime validation of the full TrackingData container.
 * Use sparingly — most callers should validate per-workflow.
 */
export function validateTrackingData(data: unknown): unknown | null {
  if (data == null) return null;
  const errors = Value.Errors(TrackingDataSchema, data);
  if (errors.length === 0) return data;

  const first = errors[0];
  const path = first.instancePath || "<root>";
  throw new WorkflowValidationError(
    `TrackingData validation failed at ${path}: ${first.message}`,
    path,
    errors,
  );
}

// ── Feature flag ─────────────────────────────────────────────────

/**
 * Mirrors the `STELOW_VALIDATE=0` escape hatch from schema-record.ts.
 * Consistent with the per-scope toggle so operators only need to
 * remember one env var.
 */
export function isWorkflowValidationEnabled(): boolean {
  const v = process.env.STELOW_VALIDATE;
  if (v === undefined || v === "") return true; // default ON
  return v !== "0" && v.toLowerCase() !== "false";
}