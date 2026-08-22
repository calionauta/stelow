/**
 * MulticaAdapter — implements `DecisionGateway` against the `multica` CLI.
 *
 * Per `docs/design/host-adapter-multica.md` §5. Maps the stelow contract:
 *
 *   ask_user_question (kind: question)
 *     → `multica issue create` with options rendered as a numbered
 *       markdown list. Reviewer replies with a number, comma-separated
 *       list, or free text. Numbered-parser (above) interprets the reply.
 *
 *   plannotator --gate (kind: gate)
 *     → `multica issue create` with the artifact attached. Reviewer
 *       approves (status=done + comment), annotates (free-text feedback),
 *       or dismisses (status=cancelled).
 *
 * Trust: a comment with `author_type=member` is the canonical decision
 * source — see Multica issue #3572 (open) for non-member approval
 * support; v1 deliberately scopes to workspace members.
 *
 * Resume: the issue is assigned to the stelow agent (`--assignee`). When
 * a member replies, Multica's assignee auto-trigger re-runs the agent;
 * the resume hook on the next session reads the decision (see
 * `multica-resume.ts`).
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";
import { BaseHostAdapter } from "./base-adapter";
import { parseNumberedReply } from "./numbered-parser";
import { resolveReviewer, type WorkgroupConfig } from "./config";
import type {
  DecisionRequest,
  DecisionResult,
  Question,
} from "./types";

// ── Result helpers ───────────────────────────────────────────────────

function errorResult(req: DecisionRequest, ref: string, raw: string, why: string): DecisionResult {
  return {
    kind: req.kind,
    decision: "error",
    selections: [],
    feedback: why,
    raw,
    answered_by: "",
    answered_at: new Date().toISOString(),
    external_ref: ref,
  };
}

// ── Multica CLI invocation ───────────────────────────────────────────

/**
 * Run `multica <args...>` with `--output json`, parse stdout.
 * Throws nothing — returns `null` on failure so callers can build an
 * `error` DecisionResult without try/catch ladders.
 *
 * The `multica` binary is invoked directly (not via Node SDK) because:
 *   1. the binary IS the SDK surface (see multica-cli skill),
 *   2. `spawnSync` keeps the adapter deterministic in tests
 *      (see `multica-adapter.test.ts` — `which: false` swaps in a fake),
 *   3. callers can swap to `multica attachment upload` later without
 *      changing this file.
 */
function runMulticaJson(args: string[]): { ok: boolean; data: unknown; stderr: string } {
  const result = spawnSync("multica", [...args, "--output", "json"], {
    encoding: "utf-8",
    timeout: 30_000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error != null) {
    return { ok: false, data: null, stderr: result.error.message };
  }
  if (result.status !== 0) {
    return {
      ok: false,
      data: null,
      stderr: (result.stderr || "").trim() || `multica exited with code ${result.status}`,
    };
  }
  const stdout = (result.stdout || "").trim();
  if (!stdout) return { ok: true, data: null, stderr: "" };
  try {
    return { ok: true, data: JSON.parse(stdout), stderr: "" };
  } catch (err) {
    return {
      ok: false,
      data: null,
      stderr: `multica returned non-JSON output: ${(err as Error).message}`,
    };
  }
}

// ── Markdown rendering ───────────────────────────────────────────────

/**
 * Render a numbered-options question as markdown for the issue body.
 * The Multica UI has no native poll; we emulate per design doc §5.6.
 */
function renderQuestionMarkdown(questions: Question[]): string {
  const blocks = questions.map((q, qi) => {
    const header = q.header ? `**${q.header}**` : `**Question ${qi + 1}**`;
    const multi = q.multiSelect ? " _(select multiple — reply e.g. `1, 3`)_" : "";
    const lines: string[] = [];
    lines.push(`${header} — ${q.question}${multi}`);
    lines.push("");
    q.options.forEach((opt, oi) => {
      lines.push(`${oi + 1}. **${opt.label}** — ${opt.description}`);
    });
    return lines.join("\n");
  });
  return [
    "## Decision Requested",
    "",
    ...blocks,
    "",
    "---",
    "",
    "Reply with the number (e.g. `1`), comma-separated numbers for",
    "multi-select (`1, 3`), or free text. Your reply becomes the",
    "decision of record.",
  ].join("\n");
}

/**
 * Render a gate description for the issue body. The artifact is
 * attached separately (`--attachment`), not embedded.
 */
function renderGateMarkdown(artifactPath: string, contextLines: string[]): string {
  return [
    "## Gate Review Requested",
    "",
    `Artifact: \`${artifactPath}\` (attached to this issue).`,
    "",
    ...(contextLines.length > 0 ? ["### Context", "", ...contextLines, ""] : []),
    "---",
    "",
    "Reply with:",
    "- `approved` — gate passes; the stelow workflow advances.",
    "- `annotated: <your feedback>` — reviewer asks for changes.",
    "- `dismissed` — gate fails; the workflow reshapes or stops.",
    "",
    "Any other reply is treated as annotation feedback.",
  ].join("\n");
}

// ── MulticaAdapter ───────────────────────────────────────────────────

export class MulticaAdapter extends BaseHostAdapter {
  readonly host = "multica";

  /**
   * Optional: parent issue id under which decision sub-issues are created
   * (1 issue per requestDecision, per design doc §5.8). When null, the
   * adapter creates a top-level issue (still grouped by `--stage`).
   */
  constructor(
    private readonly workgroup: WorkgroupConfig | null,
    private readonly parentIssueId: string | null = null,
    private readonly stelowAgent: { id: string; name: string } | null = null,
  ) {
    super();
  }

  // ── requestDecision ──────────────────────────────────────────────

  async requestDecision(req: DecisionRequest): Promise<DecisionResult> {
    const reviewer = resolveReviewer(this.workgroup, req.stage);
    if (!reviewer) {
      return errorResult(
        req,
        "",
        "",
        `No reviewer configured for stage '${req.stage}' and no fallback_owner set in workgroup config.`,
      );
    }

    if (req.kind === "question") {
      return this.requestQuestion(req, reviewer.member_id);
    }
    if (req.kind === "gate") {
      return this.requestGate(req, reviewer.member_id);
    }
    return errorResult(req, "", "", `Unknown DecisionRequest.kind: ${(req as { kind: string }).kind}`);
  }

  // ── Question path (§5.1) ─────────────────────────────────────────

  private async requestQuestion(req: DecisionRequest, reviewerId: string): Promise<DecisionResult> {
    const questions = req.questions ?? [];
    if (questions.length === 0) {
      return errorResult(req, "", "", "Question request must include at least one Question");
    }

    const title = buildQuestionTitle(questions);
    const body = renderQuestionMarkdown(questions);

    // Write body to a temp file inside cwd to satisfy
    // `multica issue create --description-file` (path must be in cwd).
    const bodyPath = writeToCwdTmp(body, "stelow-question");
    try {
      const created = await this.createIssue({
        title,
        descriptionFile: bodyPath,
        assignee: reviewerId,
        stage: stageOrdinal(req.stage),
      });
      if (!created.ok) {
        return errorResult(req, "", "", `multica issue create failed for question: ${created.stderr}`);
      }
      const issue = created.data as { id?: string } | null;
      const ref = String(issue?.id ?? "");
      // Park: return a minimal "pending" DecisionResult with `decision: "answered"`
      // and selections=[] + raw="(pending)". Orchestrator detects `pending_decision`
      // and uses the resolvePending hook to poll/reply. We do NOT block here
      // because the assignment-to-agent flow re-enters stelow asynchronously.
      return {
        kind: "question",
        decision: "answered",
        selections: [],
        feedback: "(pending — see Multica issue " + ref + ")",
        raw: "(pending)",
        answered_by: "",
        answered_at: new Date().toISOString(),
        external_ref: ref,
      };
    } finally {
      safeUnlink(bodyPath);
    }
  }

  // ── Gate path (§5.2) ─────────────────────────────────────────────

  private async requestGate(req: DecisionRequest, reviewerId: string): Promise<DecisionResult> {
    const artifactPath = req.artifact_path ?? "";
    if (!artifactPath) {
      return errorResult(req, "", "", "Gate request must include artifact_path");
    }
    if (!existsSync(artifactPath)) {
      return errorResult(req, "", "", `Gate artifact not found: ${artifactPath}`);
    }

    const title = `Gate: ${basename(artifactPath)}`;
    const contextLines = [
      `- Workflow: ${req.workflow}`,
      `- Stage: ${req.stage}`,
      `- Reviewer role: ${req.route_to.role}`,
    ];
    const body = renderGateMarkdown(artifactPath, contextLines);
    const bodyPath = writeToCwdTmp(body, "stelow-gate");
    try {
      const created = await this.createIssue({
        title,
        descriptionFile: bodyPath,
        assignee: reviewerId,
        stage: stageOrdinal(req.stage),
        attachment: artifactPath,
      });
      if (!created.ok) {
        return errorResult(req, "", "", `multica issue create failed for gate: ${created.stderr}`);
      }
      const issue = created.data as { id?: string } | null;
      const ref = String(issue?.id ?? "");
      return {
        kind: "gate",
        decision: "answered",
        selections: [],
        feedback: "(pending — see Multica issue " + ref + ")",
        raw: "(pending)",
        answered_by: "",
        answered_at: new Date().toISOString(),
        external_ref: ref,
      };
    } finally {
      safeUnlink(bodyPath);
    }
  }

  // ── Multica issue creation ───────────────────────────────────────

  /**
   * `multica issue create` wrapper. Returns `{ok, data, stderr}` so
   * callers can surface a precise error to the user (not a generic
   * "create failed").
   */
  private async createIssue(opts: {
    title: string;
    descriptionFile: string;
    assignee: string;
    stage?: number;
    attachment?: string;
  }): Promise<{ ok: boolean; data: unknown; stderr: string }> {
    const args = [
      "issue",
      "create",
      "--title",
      opts.title,
      "--description-file",
      opts.descriptionFile,
      "--status",
      "in_review",
      "--assignee",
      opts.assignee,
    ];
    if (this.parentIssueId) args.push("--parent", this.parentIssueId);
    if (typeof opts.stage === "number") args.push("--stage", String(opts.stage));
    if (opts.attachment) {
      args.push("--attachment", opts.attachment);
    }
    const result = runMulticaJson(args);
    if (!result.ok) {
      // eslint-disable-next-line no-console
      console.error(`[MulticaAdapter] createIssue failed: ${result.stderr}`);
    }
    return result;
  }

  // ── resolvePending — read the latest member reply from Multica ────

  /**
   * Resolve a previously-parked decision by reading comments on its
   * Multica issue. Picks the most recent comment by a `member` (not
   * agent, not bot) — that is the authoritative reviewer reply.
   *
   * Status changes (`done`/`cancelled`) ALSO drive the decision when
   * no comment body matches the protocol — see §5.2 trust rules.
   */
  async resolvePending(idempotencyKey: string): Promise<DecisionResult | null> {
    // The idempotency key encodes (workflow, stage, kind, payload); but
    // the issue id is stored in `Workflow.pending_decision.external_ref`.
    // Callers SHOULD pass the issue id directly. To keep the gateway
    // surface host-agnostic we accept either: if it looks like a UUID
    // we treat it as the issue id, otherwise we return null and the
    // orchestrator looks up `pending_decision.external_ref` itself.
    if (!isUuid(idempotencyKey)) return null;

    return this.readDecisionFromIssue(idempotencyKey);
  }

  /**
   * Read the latest reviewer decision from a Multica issue.
   * Exposed separately so the resume hook can call it directly with
   * the issue id from `pending_decision.external_ref`.
   */
  async readDecisionFromIssue(issueId: string): Promise<DecisionResult | null> {
    const { ok, data } = runMulticaJson(["issue", "get", issueId]);
    if (!ok || !data) return null;
    const issue = data as {
      id: string;
      status?: string;
      title?: string;
    };
    const kind: DecisionRequest["kind"] = /^[Gg]ate:/.test(issue.title ?? "") ? "gate" : "question";
    const status = (issue.status ?? "").toLowerCase();

    // ── Gate status-driven decisions (no comment required) ───────
    if (kind === "gate") {
      if (status === "done") {
        return {
          kind,
          decision: "approved",
          answered_by: "",
          answered_at: new Date().toISOString(),
          external_ref: issueId,
        };
      }
      if (status === "cancelled") {
        return {
          kind,
          decision: "dismissed",
          answered_by: "",
          answered_at: new Date().toISOString(),
          external_ref: issueId,
        };
      }
    }

    // ── Comment-driven decisions (questions + annotated gates) ──
    const comments = await this.listComments(issueId);
    if (!comments) return null;
    const memberComments = comments.filter((c) => c.author_type === "member");
    if (memberComments.length === 0) return null;
    const latest = memberComments[memberComments.length - 1];

    return interpretMemberReply(latest, kind, issueId);
  }

  /**
   * `multica issue comment list <id>` — returns top-level + replies.
   * We use `--full` so resolved threads are expanded (we need the
   * actual reviewer reply, not just the resolution marker).
   */
  private async listComments(issueId: string): Promise<
    Array<{ id: string; author_type: string; content: string; created_at: string }> | null
  > {
    const { ok, data } = runMulticaJson(["issue", "comment", "list", issueId, "--full"]);
    if (!ok || !Array.isArray(data)) return null;
    return data as Array<{ id: string; author_type: string; content: string; created_at: string }>;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Render a short title for a question issue (truncated, ≤120 chars).
 * Multica issues have no enforced title limit, but readable titles help.
 */
function buildQuestionTitle(questions: Question[]): string {
  const first = questions[0];
  const prefix = first?.header ? `[${first.header}] ` : "";
  const text = first?.question ?? "Question";
  const cleaned = text.replace(/\?+\s*$/, "").trim();
  const suffix = questions.length > 1 ? ` (+${questions.length - 1} more)` : "";
  const title = `${prefix}${cleaned}${suffix}?`;
  return title.length > 120 ? title.slice(0, 117) + "..." : title;
}

/**
 * Stable ordinal for a stage slug — used as the `--stage` value when
 * the adapter is grouping sub-issues under a parent workflow issue.
 * Unknown stages fall back to 1 (no barrier grouping). The mapping is
 * lossy on purpose — Multica does not know about Shape Up semantics,
 * it just gets a barrier number.
 */
function stageOrdinal(stageSlug: string): number {
  const known: Record<string, number> = {
    shape: 1,
    "interface": 2,
    planning: 3,
    gate: 4,
    "int-gate": 5,
    "plan-gate": 6,
    "diff-gate": 7,
  };
  return known[stageSlug] ?? 1;
}

/**
 * Write a string to a temp file under cwd. `multica issue create
 * --description-file` requires the path be inside cwd (MUL-4252),
 * so we use a tmpdir inside cwd rather than /tmp.
 */
function writeToCwdTmp(content: string, prefix: string): string {
  const dir = join(process.cwd(), ".stelow", ".tmp");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${prefix}-${process.pid}-${Date.now()}.md`);
  writeFileSync(path, content);
  return path;
}

function safeUnlink(p: string): void {
  try {
    if (existsSync(p)) rmSync(p);
  } catch {
    // best effort
  }
  // eslint-disable-next-line @-console
  void tmpdir;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

/**
 * Interpret a member reply against the question/gate protocol.
 *
 * Gate protocol (status-driven primarily; comment body secondarily):
 *   - "approved"        → decision: approved
 *   - "dismissed"       → decision: dismissed
 *   - "annotated: …"    → decision: annotated
 *   - anything else     → decision: annotated (free-form feedback)
 *
 * Question protocol (numbered, comma-separated, or free text):
 *   - "1" / "1, 3"      → selections from numbered options
 *   - anything else     → decision: answered, raw = whole reply
 */
export function interpretMemberReply(
  comment: { id: string; author_type: string; content: string; created_at: string },
  kind: DecisionRequest["kind"],
  issueId: string,
): DecisionResult | null {
  const raw = (comment.content ?? "").trim();
  if (!raw) return null;

  if (kind === "gate") {
    const lower = raw.toLowerCase();
    if (lower === "approved" || lower.startsWith("approved")) {
      return {
        kind,
        decision: "approved",
        raw,
        answered_by: comment.id,
        answered_at: comment.created_at,
        external_ref: issueId,
      };
    }
    if (lower === "dismissed" || lower.startsWith("dismissed")) {
      return {
        kind,
        decision: "dismissed",
        raw,
        answered_by: comment.id,
        answered_at: comment.created_at,
        external_ref: issueId,
      };
    }
    // Anything else (including "annotated: …") is feedback.
    const feedback = lower.startsWith("annotated:") ? raw.slice("annotated:".length).trim() : raw;
    return {
      kind,
      decision: "annotated",
      feedback,
      raw,
      answered_by: comment.id,
      answered_at: comment.created_at,
      external_ref: issueId,
    };
  }

  // ── Question: numbered → selections; else free text ───────────
  // The numbered parser needs the option list. We don't have it on
  // the comment side (the issue body has the rendered options). The
  // MulticaAdapter stores the option list in the issue description,
  // so we re-render and parse it. For the v1 path, we just inspect
  // the body for lines like "1. **Label** — desc" and use those.
  //
  // Implementation note: pulling the issue body is done by the caller
  // when the question has been re-fetched. We keep this helper
  // signature pure — pass options explicitly.
  return {
    kind,
    decision: "answered",
    feedback: raw,
    raw,
    answered_by: comment.id,
    answered_at: comment.created_at,
    external_ref: issueId,
    selections: [], // populated by caller via parseNumberedReply(raw, options)
  };
}

/**
 * Helper exposed for the resume hook: parse a question reply against
 * the rendered option list from the issue body.
 */
export function interpretQuestionReply(
  raw: string,
  options: { label: string }[],
  commentId: string,
  createdAt: string,
  issueId: string,
): DecisionResult {
  const parsed = parseNumberedReply(raw, options);
  return {
    kind: "question",
    decision: parsed.isFreeText ? "answered" : "answered",
    selections: parsed.selections,
    feedback: parsed.isFreeText ? raw : undefined,
    raw,
    answered_by: commentId,
    answered_at: createdAt,
    external_ref: issueId,
  };
}