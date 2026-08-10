/**
 * Base Host Adapter — shared helpers for all `DecisionGateway` implementations.
 *
 * Subclasses (Multica, Slack, Linear, ...) override `requestDecision()`
 * and (optionally) `resolvePending()`. This base class provides:
 *
 *   - stable, monotonic `idempotencyKey()` (deterministic per request shape)
 *   - SLA deadline computation
 *   - escalation hint construction
 *   - shell-out safety wrapper (logs, no throw on transient errors —
 *     callers translate to `DecisionResult{decision: "error"}`)
 *
 * Per design doc §8 #1: "Adapter writes `.plannotator/...` while extension
 * may write `.stelow/` → isolated receipt paths, never write `stelow.json`".
 * This base class deliberately avoids touching `stelow.json`. Persistence
 * is the orchestrator's job (see `PendingDecision` in `types.ts`).
 */

import { randomUUID, createHash } from "node:crypto";
import type { DecisionGateway, DecisionRequest } from "./types";

// ── Adapter identity ─────────────────────────────────────────────────

/**
 * Identifier this adapter registers under. Subclasses override.
 * Used to tag `Workflow.pending_decision.host` so the resume hook can
 * dispatch the right gateway on re-entry.
 */
export abstract class BaseHostAdapter implements DecisionGateway {
  abstract readonly host: string;

  /** Override in subclass — `multica`, `slack`, `linear`, `notion`, ... */
  abstract requestDecision(req: DecisionRequest): Promise<import("./types").DecisionResult>;

  /** Optional: resolve a parked decision by idempotency key. */
  resolvePending?(_idempotencyKey: string): Promise<import("./types").DecisionResult | null>;

  // ── Idempotency ───────────────────────────────────────────────────

  /**
   * Build a deterministic idempotency key for a request.
   *
   * Two calls with the same `(workflow, stage, kind, artifact_path|questions)`
   * produce the same key — the adapter dedupes on this so the same
   * decision isn't parked twice (e.g. on retry or duplicate session).
   *
   * Format: `<host>:<16-hex-of-sha256>` (≤ 64 chars, file-safe).
   */
  idempotencyKey(req: DecisionRequest): string {
    const payload = JSON.stringify({
      host: this.host,
      workflow: req.workflow,
      stage: req.stage,
      kind: req.kind,
      artifact_path: req.artifact_path ?? null,
      questions: req.questions ?? null,
    });
    const hash = createHash("sha256").update(payload).digest("hex").slice(0, 16);
    return `${this.host}:${hash}`;
  }

  /**
   * Generate a one-shot correlation id (UUID v4). Used when the request
   * has no artifact_path or question list (e.g. an ad-hoc clarification).
   * Adapters may embed it in the host-side entity to make manual recovery
   * possible even when the deterministic hash collides with nothing.
   */
  correlationId(): string {
    return randomUUID();
  }

  // ── SLA / escalation ──────────────────────────────────────────────

  /**
   * Compute the ISO deadline for a request given an SLA in minutes.
   * Returns `null` when no SLA is configured (no escalation).
   */
  slaDeadline(req: DecisionRequest): string | null {
    const minutes = req.sla_minutes;
    if (!minutes || minutes <= 0) return null;
    return new Date(Date.now() + minutes * 60_000).toISOString();
  }

  /**
   * Build a deterministic escalation hint string the adapter can drop
   * into the host-side entity (e.g. an issue comment). Reviewers use
   * it to understand what will happen when the SLA elapses.
   */
  escalationHint(req: DecisionRequest): string {
    const minutes = req.sla_minutes ?? 0;
    return `If no answer in ${minutes} minutes, this decision will escalate to the workgroup fallback owner.`;
  }
}