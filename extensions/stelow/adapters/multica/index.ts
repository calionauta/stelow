/**
 * Multica adapter (v0.57.0).
 *
 * Exports the host-side surface that a Multica daemon needs to wire
 * Stelow into a Multica issue. The adapter is purely additive — the
 * host-agnostic `stages-guard.ts#syncStagesGuardState()` is the source
 * of truth for stage transitions; this module provides the Multica
 * label projection that runs alongside it.
 *
 * Currently the adapter owns only the stage-label surface (see
 * `./labels.ts`). Future surfaces (comment projection, attachment
 * linking, metadata cross-checks) will live alongside it.
 */
export {
  STAGE_LABELS,
  labelForStage,
  setStageLabel,
  assertSingleStageLabel,
  type MulticaCtx,
} from "./labels";