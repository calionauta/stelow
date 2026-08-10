/**
 * Host Adapter — DecisionGateway types.
 *
 * Host-agnostic surface for the stelow product workflow to ask a human
 * reviewer a structured question or request approval of an artifact.
 * Each host (Multica, Slack, Linear, Notion, ...) implements this
 * gateway against its native API; the rest of stelow stays host-agnostic.
 *
 * See `docs/design/host-adapter-multica.md` for the architecture and
 * decision rationale (Seção 4).
 */

// ── Question schema ──────────────────────────────────────────────────

/**
 * A single option within a `Question`. Mirrors `ask_user_question` schema
 * in `skills/stelow-adapter-cli/references/cli-tools/ask.md`.
 */
export interface Option {
  /** 1–5 palavras, <=60 chars (per ask.md). */
  label: string;
  /** Trade-off explanation shown next to the label. */
  description: string;
  /** Optional markdown/ASCII rendered side-by-side (preview). */
  preview?: string;
}

/**
 * A single question within a `DecisionRequest` of kind `question`.
 * Mirrors `ask_user_question` schema.
 */
export interface Question {
  /** Tag/chip shown next to the question, <=20 chars. */
  header: string;
  /** Full question text, ends with "?". */
  question: string;
  /** 2–6 options (ask.md constraint). */
  options: Option[];
  /** When true, user may select multiple options. */
  multiSelect?: boolean;
}

// ── Decision request ────────────────────────────────────────────────

/**
 * Host-agnostic request the stelow orchestrator sends to a `DecisionGateway`.
 *
 * `kind: "question"` — render `questions[]` for the reviewer to answer.
 * `kind: "gate"`     — present `artifact_path` for approve/annotate/dismiss.
 *
 * The gateway is responsible for:
 *  - resolving `route_to.role` → identity on the host
 *  - parking the request until the reviewer answers
 *  - returning a `DecisionResult` (or `decision: "expired"` on SLA timeout)
 *
 * `parking` here means the gateway blocks (sync) OR parks (async, returns
 * a pending marker that the host will resolve later via a webhook/callback).
 */
export interface DecisionRequest {
  kind: "question" | "gate";
  /** Workflow name (for routing + audit trail). */
  workflow: string;
  /** Stage slug: `shape | interface | planning | ...`. */
  stage: string;
  /** Routing hint: a role like `pm`, `ux`, `tech-lead`. */
  route_to: { role: string };
  // ── question payload (kind === "question") ──
  questions?: Question[];
  // ── gate payload (kind === "gate") ──
  /** Markdown file path under project root. */
  artifact_path?: string;
  /** Optional SLA in minutes; on expiry, adapter must escalate (not deny). */
  sla_minutes?: number;
  /** Idempotency key — adapter MUST dedupe on this. */
  idempotency_key?: string;
}

// ── Decision result ─────────────────────────────────────────────────

/**
 * What the adapter returns to the stelow orchestrator.
 *
 * For `question`: `selections[]` carries the chosen option labels (or
 * `["__free_text__"]` + `raw` for free-form answers).
 *
 * For `gate`:
 *   - `approved`    → reviewer approved the artifact.
 *   - `annotated`   → reviewer left feedback; orchestrator treats as a
 *                     manual-review-needed receipt (see `feedback`).
 *   - `dismissed`   → reviewer rejected the artifact outright.
 *
 * For both:
 *   - `expired`     → SLA elapsed without an answer; adapter escalated
 *                     to the fallback owner (per design doc 5.5).
 *   - `error`       → adapter couldn't reach the host or parse the reply.
 */
export type DecisionKind = "question" | "gate";
export type DecisionOutcome =
  | "approved"
  | "annotated"
  | "dismissed"
  | "answered"
  | "expired"
  | "error";

export interface DecisionResult {
  kind: DecisionKind;
  decision: DecisionOutcome;
  /** Chosen option labels (question only). Empty if `decision === "error"`. */
  selections?: string[];
  /** Free-form feedback (question: free text; gate: annotation body). */
  feedback?: string;
  /** Raw reviewer message (any kind), preserved for audit. */
  raw?: string;
  /** Identity of the reviewer on the host (member id, slack user id, ...). */
  answered_by: string;
  /** ISO timestamp of when the reviewer answered. */
  answered_at: string;
  /** Reference to the host-side entity (issue id, slack thread, ...). */
  external_ref: string;
}

// ── Decision gateway interface ──────────────────────────────────────

/**
 * Host-agnostic gateway the stelow orchestrator calls into.
 *
 * Each host adapter (Multica, Slack, Linear, ...) implements this.
 * Implementations may be sync (block until the reviewer answers) or
 * async (return a pending marker; the host re-invokes the orchestrator
 * via webhook/push/mention when the reviewer responds).
 */
export interface DecisionGateway {
  /**
   * Park a decision request with the host and resolve when the
   * reviewer answers (or the SLA escalates).
   */
  requestDecision(req: DecisionRequest): Promise<DecisionResult>;

  /**
   * Look up an existing pending decision by its idempotency key.
   * Used by the resume hook to poll for a parked decision.
   *
   * Returns `null` if no pending decision matches.
   */
  resolvePending?(idempotencyKey: string): Promise<DecisionResult | null>;
}

// ── Persistent pending-decision marker (in stelow.json#workflows[].pending_decision) ──

/**
 * Shape stored in `Workflow.pending_decision` between parking and resume.
 * Persisted by the adapter; read by the resume hook on the next run.
 *
 * NOT stored in `stelow.json` directly — the field is on `Workflow`
 * so it round-trips with the rest of the workflow state.
 */
export interface PendingDecision {
  kind: DecisionKind;
  /** Adapter identifier (`multica`, `slack`, `linear`, ...). */
  host: string;
  /** Idempotency key (dedupe + resume). */
  idempotency_key: string;
  /** Host-side reference (issue id, slack ts, ...). */
  external_ref: string;
  /** When the request was parked. */
  asked_at: string;
  /** SLA in minutes (drives escalation). */
  sla_minutes?: number;
  /** Last resume attempt (for backoff). */
  last_resumed_at?: string;
}