/**
 * Workgroup YAML config loader.
 *
 * A workgroup maps stage slugs → reviewer identities on the chosen host.
 * Loaded from `.stelow/host-workgroup.yaml` (project root) — optional
 * file; absent file ⇒ no workgroup routing (adapter falls back to
 * `Workflow.config.host.fallback_owner`).
 *
 * Example:
 *
 *   ```yaml
 *   host: multica
 *   reviewers:
 *     shape:     { role: pm,        member_id: 0193... }
 *     interface: { role: ux,        member_id: 0193... }
 *     planning:  { role: tech-lead, member_id: 0193... }
 *     gate:      { role: pm,        member_id: 0193... }
 *   fallback_owner: 0193...
 *   sla_minutes: 1440
 *   ```
 *
 * See `docs/design/host-adapter-multica.md` §5.1 for the routing rules.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

// ── Types ────────────────────────────────────────────────────────────

/**
 * Identity of a reviewer on the host. `member_id` is host-specific:
 * for Multica, it's the member UUID returned by `multica squad member list`.
 */
export interface ReviewerRef {
  /** Logical role name (`pm`, `ux`, `tech-lead`, ...). Informational. */
  role: string;
  /** Host-side identifier (e.g. Multica member UUID). */
  member_id: string;
}

export interface WorkgroupConfig {
  /** Which adapter to use (`multica`, `slack`, `linear`, ...). */
  host: string;
  /** Map from stage slug → reviewer. Stages without an entry fall through
   *  to `fallback_owner`. */
  reviewers: Record<string, ReviewerRef>;
  /** Identity to use when no per-stage reviewer is set, or when SLA escalates. */
  fallback_owner?: string;
  /** Default SLA in minutes for every decision (overridden per-request). */
  sla_minutes?: number;
  /** Raw parsed YAML (for forward-compat / host-specific keys). */
  raw?: Record<string, unknown>;
}

// ── Validation ───────────────────────────────────────────────────────

export class WorkgroupConfigError extends Error {
  constructor(message: string, public readonly path?: string) {
    super(path ? `${message} (at ${path})` : message);
    this.name = "WorkgroupConfigError";
  }
}

/**
 * Type guard: returns true if `obj` looks like a workgroup config shape.
 * Cheap structural check (yaml parser already produced the object).
 */
function isWorkgroupShape(obj: unknown): obj is WorkgroupConfig {
  if (typeof obj !== "object" || obj === null) return false;
  const w = obj as Record<string, unknown>;
  if (typeof w.host !== "string" || !w.host) return false;
  if (typeof w.reviewers !== "object" || w.reviewers === null) return false;
  // reviewers must be a map of strings → {role, member_id}
  for (const [stage, ref] of Object.entries(w.reviewers as Record<string, unknown>)) {
    if (typeof ref !== "object" || ref === null) return false;
    const r = ref as Record<string, unknown>;
    if (typeof r.role !== "string" || !r.role) return false;
    if (typeof r.member_id !== "string" || !r.member_id) return false;
    void stage; // unused but kept for error path
  }
  return true;
}

// ── Loader ───────────────────────────────────────────────────────────

/**
 * Load the workgroup config from `<projectRoot>/.stelow/host-workgroup.yaml`.
 *
 * @param projectRoot - Project root (where `stelow.json` lives).
 * @returns The parsed config, or `null` if the file does not exist.
 * @throws {WorkgroupConfigError} when the file exists but is malformed.
 */
export function loadWorkgroupConfig(projectRoot: string): WorkgroupConfig | null {
  const path = join(projectRoot, ".stelow", "host-workgroup.yaml");
  if (!existsSync(path)) return null;

  let raw: unknown;
  try {
    raw = parseYaml(readFileSync(path, "utf-8"));
  } catch (err) {
    throw new WorkgroupConfigError(
      `Failed to parse host-workgroup.yaml: ${err instanceof Error ? err.message : String(err)}`,
      path,
    );
  }

  if (!raw || typeof raw !== "object") {
    throw new WorkgroupConfigError("host-workgroup.yaml must be a YAML mapping", path);
  }

  if (!isWorkgroupShape(raw)) {
    throw new WorkgroupConfigError(
      "host-workgroup.yaml missing required fields: host (string) and reviewers (map of {role, member_id})",
      path,
    );
  }

  return { ...raw, raw: raw as unknown as Record<string, unknown> };
}

/**
 * Resolve the reviewer identity for a given stage.
 * Returns the fallback owner when no stage-specific reviewer is configured.
 * Returns `null` if neither is configured — caller should reject the request.
 */
export function resolveReviewer(
  config: WorkgroupConfig | null,
  stage: string,
): ReviewerRef | null {
  if (!config) return null;
  const stageReviewer = config.reviewers[stage];
  if (stageReviewer) return stageReviewer;
  if (config.fallback_owner) {
    return { role: "fallback", member_id: config.fallback_owner };
  }
  return null;
}