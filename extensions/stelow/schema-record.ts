/**
 * Runtime validation for `wf.scopes[i].record` (and adjacent scope fields
 * touched by v0.43.0: `tasks[]`).
 *
 * **Convention (v2):** when `STELOW_VALIDATE=1` is set in the environment,
 * `extensions/stelow/state.ts#writeTracking` invokes `validateScopeRecord()`
 * (and `validateScopeTasks()`) before persisting the tracking file. Bad
 * records throw a `ScopeRecordValidationError` with a precise path.
 *
 * **Why a hand-rolled validator instead of AJV/typebox:**
 *   - No new dependency (peer-deps are user-resolved at install time;
 *     stelow's own code shouldn't rely on typebox being present).
 *   - The ScopeRecord shape is small (5 fields). Hand-written validators
 *     are <30 lines and trivial to audit. AJV's value: a stable schema
 *     format and `errors: true` formatting. We get both with our own.
 *   - Future work: if validation grows beyond ~10 shapes, migrate to
 *     a TypeBox-based schema + `@sinclair/typebox/value#Check` and ship
 *     typebox as a regular dependency. Single import path.
 *
 * **Pre-commit / CI:** This module is also exposed for `cali-ops-github-releases`
 * pre-commit hooks to validate `stelow.json` before tagging a release.
 */

import type { ScopeRecord, ScopeTask } from "./types";

/**
 * Thrown by validators when a record or task fails the v2 schema.
 * The `path` field is dot-separated for shell friendliness (no JSONPath).
 */
export class ScopeRecordValidationError extends Error {
  readonly path: string;
  readonly value: unknown;
  constructor(path: string, message: string, value: unknown) {
    // Path is always prefixed with `record.` for record-field errors and
    // `tasks[N].` for task-array errors. Callers pass the SUFFIX; we
    // prepend `record.` here for record errors. Task errors pass full path.
    super(`${path}: ${message}`);
    this.name = "ScopeRecordValidationError";
    this.path = path;
    this.value = value;
  }
}

// ── record field types ──────────────────────────────────────────────

/**
 * Per-field predicate. Returns the validated value (often same input,
 * but allows normalization) or throws.
 */
type FieldValidator<T> = (value: unknown, path: string) => T;

const isString: FieldValidator<string> = (v, path) => {
  if (typeof v !== "string") {
    throw new ScopeRecordValidationError(path, `expected string, got ${typeof v}`, v);
  }
  return v;
};

const isBool: FieldValidator<boolean> = (v, path) => {
  if (typeof v !== "boolean") {
    throw new ScopeRecordValidationError(path, `expected boolean, got ${typeof v}`, v);
  }
  return v;
};

const isNonNegInt: FieldValidator<number> = (v, path) => {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
    throw new ScopeRecordValidationError(path, `expected non-negative integer, got ${String(v)}`, v);
  }
  return v;
};

const isOptionalString: FieldValidator<string | undefined> = (v, path) => {
  if (v === undefined || v === null) return undefined;
  return isString(v, path);
};

// ── record validator ────────────────────────────────────────────────

/**
 * Validate a single ScopeRecord. Throws ScopeRecordValidationError on
 * the first violation. Returns the (unchanged) input on success.
 *
 * `STELOW_VALIDATE=1` callers run this in `writeTracking()`; pre-commit
 * hooks run it on already-persisted tracking files.
 */
export function validateScopeRecord(input: unknown): ScopeRecord {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new ScopeRecordValidationError("", "expected object", input);
  }
  const obj = input as Record<string, unknown>;
  return {
    completed_at: isString(obj.completed_at, "record.completed_at"),
    files_count: isNonNegInt(obj.files_count, "record.files_count"),
    commands_count: isNonNegInt(obj.commands_count, "record.commands_count"),
    verified: isBool(obj.verified, "record.verified"),
    suggested_commit: isOptionalString(obj.suggested_commit, "record.suggested_commit"),
  };
}

// ── task validator ──────────────────────────────────────────────────

const TASK_SOURCES = new Set(["planned", "discovered"]);
const TASK_STATUSES = new Set(["pending", "done", "skipped"]);

/**
 * Validate a single ScopeTask. `note` is required for `source: 'discovered'`
 * (anti-rationalization: every discovered task must explain its trigger).
 * Otherwise all fields are validated per shape.
 */
export function validateScopeTask(input: unknown, index = 0): ScopeTask {
  const pathPrefix = index === 0 ? "tasks[0]" : `tasks[${index}]`;
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new ScopeRecordValidationError(pathPrefix, "expected object", input);
  }
  const obj = input as Record<string, unknown>;
  const source = isString(obj.source, `${pathPrefix}.source`);
  if (!TASK_SOURCES.has(source)) {
    throw new ScopeRecordValidationError(
      `${pathPrefix}.source`,
      `must be one of ${[...TASK_SOURCES].join("|")}, got ${JSON.stringify(source)}`,
      source,
    );
  }
  const status = isString(obj.status, `${pathPrefix}.status`);
  if (!TASK_STATUSES.has(status)) {
    throw new ScopeRecordValidationError(
      `${pathPrefix}.status`,
      `must be one of ${[...TASK_STATUSES].join("|")}, got ${JSON.stringify(status)}`,
      status,
    );
  }
  const noteRaw = obj.note;
  const note = isOptionalString(noteRaw, `${pathPrefix}.note`);
  if (source === "discovered" && !note) {
    throw new ScopeRecordValidationError(
      `${pathPrefix}.note`,
      "required when source='discovered' (explain the trigger)",
      noteRaw,
    );
  }
  const discoveredInIter = obj.discovered_in_iter;
  return {
    id: isString(obj.id, `${pathPrefix}.id`),
    name: isString(obj.name, `${pathPrefix}.name`),
    source: source as "planned" | "discovered",
    status: status as "pending" | "done" | "skipped",
    discovered_in_iter:
      discoveredInIter === undefined
        ? undefined
        : isNonNegInt(discoveredInIter, `${pathPrefix}.discovered_in_iter`),
    components: Array.isArray(obj.components)
      ? obj.components.map((c, i) => isString(c, `${pathPrefix}.components[${i}]`))
      : undefined,
    risk: obj.risk === undefined ? undefined : isNonNegInt(obj.risk, `${pathPrefix}.risk`),
    note,
  };
}

/**
 * Validate an entire `wf.scopes[i].tasks[]` array. Empty arrays are
 * valid; tasks are individually validated via `validateScopeTask()`.
 */
export function validateScopeTasks(input: unknown): ScopeTask[] {
  if (!Array.isArray(input)) {
    throw new ScopeRecordValidationError("tasks", "expected array", input);
  }
  return input.map((t, i) => validateScopeTask(t, i));
}

/**
 * Top-level entry: validate `scope.record` AND `scope.tasks` if present.
 * Used by `writeTracking()` when `STELOW_VALIDATE=1`.
 */
export function validateScopeAdditions(input: {
  record?: unknown;
  tasks?: unknown;
}): { record?: ScopeRecord; tasks?: ScopeTask[] } {
  const out: { record?: ScopeRecord; tasks?: ScopeTask[] } = {};
  if (input.record !== undefined) out.record = validateScopeRecord(input.record);
  if (input.tasks !== undefined) out.tasks = validateScopeTasks(input.tasks);
  return out;
}

/**
 * Check whether runtime validation is enabled. Centralized so the env
 * name is documented in one place. Tests stub this via the `validators`
 * module's optional env injection (see `state.ts`).
 */
export function isRuntimeValidationEnabled(): boolean {
  try {
    return process.env.STELOW_VALIDATE === "1";
  } catch {
    return false;
  }
}