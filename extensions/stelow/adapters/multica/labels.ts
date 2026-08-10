/**
 * Multica stage-label helper.
 *
 * The Multica host projects Stelow state onto a Multica issue via two
 * surfaces: issue metadata (`stelow:*` keys) and issue labels
 * (`stelow:<stage>`). This file owns the label surface.
 *
 * ## Why a helper, not a free function call
 *
 * The "one `stelow:*` label at a time" invariant is **structural**, not
 * prompt-based. Before v0.57.0 the swap-on-transition rule was a
 * documentation paragraph; humans (and LLMs) sometimes forgot to remove
 * the previous label when adding the new one, and the issue ended up
 * with two `stelow:*` labels. CAL-38 traced this to two failure modes:
 *
 *   1. LLM-generated transitions that set the new label but forgot the
 *      `removeLabel(prev)` call.
 *   2. Race conditions where two transitions ran in parallel and both
 *      left their labels behind.
 *
 * The fix: make the caller pass the previous stage. The helper then
 * computes the **set of stages that must be removed** deterministically
 * and only adds the new one if the swap succeeded. A test in
 * `tests/unit/multica-labels.test.ts` asserts that no two `stelow:*`
 * labels can co-exist after a transition.
 *
 * ## Pure helpers — no Multica SDK import
 *
 * This module is pure-data: it derives `STAGE_LABELS` from
 * `PHASE_NAMES` (the canonical 17-stage state machine) and provides the
 * `setStageLabel` orchestration. The actual Multica API call (`issue
 * label add/remove`) is injected via the `MulticaCtx` parameter so this
 * file stays testable without a live Multica daemon.
 *
 * Adding a new stage in `PHASE_NAMES` automatically gets a label — no
 * two-place coordination.
 */

import { PHASE_NAMES } from "../../types";

/**
 * Derive the canonical `stelow:<stage>` label set from `PHASE_NAMES`.
 *
 * PHASE_NAMES lives at `extensions/stelow/types.ts` and is the source
 * of truth. Any new stage added there automatically gets a label here.
 */
function slugify(stage: string): string {
  // Stages like "Plan.Gate" must become "stelow:plangate" (no dots,
  // all lowercase) so the Multica label set is stable and grep-friendly.
  return stage.toLowerCase().replace(/\./g, "");
}

export const STAGE_LABELS: readonly string[] = Object.freeze(
  PHASE_NAMES.map((stage) => `stelow:${slugify(stage)}`),
);

/** Build the label for a given stage name (case-insensitive on input). */
export function labelForStage(stageName: string): string {
  // Look up canonical case from PHASE_NAMES to avoid case-mismatch bugs.
  const canonical = PHASE_NAMES.find(
    (s) => s.toLowerCase() === stageName.toLowerCase(),
  );
  if (!canonical) {
    throw new Error(
      `labelForStage: unknown stage "${stageName}". ` +
      `Known stages: ${PHASE_NAMES.join(", ")}`,
    );
  }
  return `stelow:${slugify(canonical)}`;
}

/**
 * Multica-side context. Inject the actual Multica API call here so this
 * file can be unit-tested without a live Multica daemon.
 *
 * The interface is the minimum surface we need: list the issue's
 * current labels, add a label, remove a label. Real Multica clients
 * wrap these in a transactional call so the swap is atomic.
 */
export interface MulticaCtx {
  /** Return the labels currently attached to the issue. */
  listLabels(issueId: string): Promise<string[]> | string[];
  /** Add a label to the issue. Idempotent (no error if already present). */
  addLabel(issueId: string, label: string): Promise<void> | void;
  /** Remove a label from the issue. Idempotent (no error if absent). */
  removeLabel(issueId: string, label: string): Promise<void> | void;
}

/**
 * Swap the `stelow:<stage>` label on a Multica issue.
 *
 * The caller MUST pass both the new and the previous stage. Passing
 * `null` for `prevStage` is allowed for the first transition
 * (e.g. triage → setup) where no `stelow:*` label exists yet.
 *
 * Behavior:
 *   1. Compute the new label from `newStage`.
 *   2. List current labels; compute the set of `stelow:*` labels that
 *      are NOT the new one. Those are the ones to remove.
 *   3. Add the new label.
 *   4. Remove every stale `stelow:*` label.
 *
 * After this call the issue has at most one `stelow:*` label.
 *
 * If `newStage` and `prevStage` resolve to the same label, the call is
 * a no-op (idempotent re-transition).
 */
export async function setStageLabel(
  issueId: string,
  newStage: string,
  prevStage: string | null,
  ctx: MulticaCtx,
): Promise<void> {
  const newLabel = labelForStage(newStage);
  const prevLabel = prevStage ? labelForStage(prevStage) : null;

  if (prevLabel === newLabel) {
    // Same label — nothing to swap. Still re-add to ensure consistency
    // in case the issue's labels drifted.
    await ctx.addLabel(issueId, newLabel);
    return;
  }

  const current = await ctx.listLabels(issueId);
  const stelowLabels = current.filter((l) => l.startsWith("stelow:"));
  const stale = stelowLabels.filter((l) => l !== newLabel);

  // Add the new label first so a concurrent observer never sees the
  // issue with zero `stelow:*` labels. Then remove the stale ones.
  await ctx.addLabel(issueId, newLabel);
  for (const old of stale) {
    await ctx.removeLabel(issueId, old);
  }
}

/**
 * Assert the structural invariant: an issue has at most one `stelow:*`
 * label. Throws if the invariant is violated.
 *
 * Used by tests and by the audit stage to catch drift.
 */
export function assertSingleStageLabel(labels: string[]): void {
  const stelowLabels = labels.filter((l) => l.startsWith("stelow:"));
  if (stelowLabels.length > 1) {
    throw new Error(
      `Multica stage-label invariant violated: ` +
      `${stelowLabels.length} stelow:* labels present (${stelowLabels.join(", ")}). ` +
      `An issue must have at most one stelow:* label at any time.`,
    );
  }
}