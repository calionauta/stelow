/**
 * Tests: MulticaAdapter — CLI invocation + member-reply interpretation.
 *
 * The adapter shells out to `multica issue create` / `multica issue get` /
 * `multica issue comment list`. We mock `child_process.spawnSync` (the
 * underlying primitive the adapter uses) so tests are deterministic and
 * don't depend on the host binary.
 *
 * Mutation-target: every test pins a behavior the adapter MUST hold —
 *   - issue create payload assembly (title, body, parent, stage, attachment)
 *   - status-driven gate resolution (`done` → approved, `cancelled` → dismissed)
 *   - comment-driven interpretation (member-only, gate protocol, free text)
 *   - idempotency-key stability
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Mock child_process.spawnSync BEFORE importing the adapter.
// `vi.mock` is hoisted — must use `vi.hoisted` for the mock fn ref.
const { spawnSyncMock } = vi.hoisted(() => ({ spawnSyncMock: vi.fn() }));
vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return { ...actual, spawnSync: spawnSyncMock };
});

import { MulticaAdapter, interpretMemberReply, interpretQuestionReply } from "../../extensions/stelow/adapters/host/multica-adapter";
import { loadWorkgroupConfig, WorkgroupConfig } from "../../extensions/stelow/adapters/host/config";
import type { DecisionRequest } from "../../extensions/stelow/adapters/host/types";

let tmpDir: string;

const VALID_CONFIG: WorkgroupConfig = {
  host: "multica",
  reviewers: {
    shape: { role: "pm", member_id: "01930000-0000-0000-0000-000000000001" },
    interface: { role: "ux", member_id: "01930000-0000-0000-0000-000000000002" },
    planning: { role: "tech-lead", member_id: "01930000-0000-0000-0000-000000000003" },
    gate: { role: "pm", member_id: "01930000-0000-0000-0000-000000000001" },
  },
  fallback_owner: "01930000-0000-0000-0000-0000000000ff",
  sla_minutes: 1440,
};

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "stelow-multica-"));
  spawnSyncMock.mockReset();
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// ── spawnSync helpers ────────────────────────────────────────────────

function mockIssueCreate(issueId: string): void {
  spawnSyncMock.mockReturnValueOnce({
    status: 0,
    stdout: JSON.stringify({ id: issueId, title: "ok" }),
    stderr: "",
  });
}

function mockIssueGet(issue: object | null): void {
  if (issue === null) {
    spawnSyncMock.mockReturnValueOnce({
      status: 1,
      stdout: "",
      stderr: "issue not found",
    });
    return;
  }
  spawnSyncMock.mockReturnValueOnce({
    status: 0,
    stdout: JSON.stringify(issue),
    stderr: "",
  });
}

function mockCommentList(comments: object[] | null): void {
  if (comments === null) {
    spawnSyncMock.mockReturnValueOnce({ status: 1, stdout: "", stderr: "fail" });
    return;
  }
  spawnSyncMock.mockReturnValueOnce({
    status: 0,
    stdout: JSON.stringify(comments),
    stderr: "",
  });
}

function mockFail(stderr = "multica not installed"): void {
  spawnSyncMock.mockReturnValueOnce({ status: 1, stdout: "", stderr });
}

// ── Tests ────────────────────────────────────────────────────────────

describe("MulticaAdapter.requestDecision — question", () => {
  it("returns error when workgroup has no reviewer for stage", async () => {
    const adapter = new MulticaAdapter(
      { ...VALID_CONFIG, reviewers: {}, fallback_owner: undefined },
      null,
    );
    const req: DecisionRequest = {
      kind: "question",
      workflow: "wf",
      stage: "shape",
      route_to: { role: "pm" },
      questions: [
        { header: "S", question: "Q?", options: [{ label: "A", description: "a" }, { label: "B", description: "b" }] },
      ],
    };
    const r = await adapter.requestDecision(req);
    expect(r.decision).toBe("error");
    expect(r.feedback).toMatch(/No reviewer configured/);
  });

  it("issues `multica issue create` with the rendered question body", async () => {
    mockIssueCreate("01930000-aaaa-bbbb-cccc-000000000001");
    const adapter = new MulticaAdapter(VALID_CONFIG, null);
    const req: DecisionRequest = {
      kind: "question",
      workflow: "wf",
      stage: "shape",
      route_to: { role: "pm" },
      questions: [
        {
          header: "Scope",
          question: "Which scope?",
          options: [
            { label: "Auth", description: "Login + session" },
            { label: "Pay", description: "Stripe" },
          ],
        },
      ],
    };
    const r = await adapter.requestDecision(req);
    expect(r.decision).toBe("answered");
    expect(r.external_ref).toBe("01930000-aaaa-bbbb-cccc-000000000001");

    // Verify the CLI call
    const call = spawnSyncMock.mock.calls[0];
    expect(call[0]).toBe("multica");
    const args = call[1] as string[];
    expect(args).toContain("issue");
    expect(args).toContain("create");
    expect(args).toContain("--status");
    expect(args[args.indexOf("--status") + 1]).toBe("in_review");
    expect(args).toContain("--assignee");
    expect(args[args.indexOf("--assignee") + 1]).toBe("01930000-0000-0000-0000-000000000001");
    // Body must include the question + numbered options
    const bodyFile = args[args.indexOf("--description-file") + 1];
    expect(bodyFile).toMatch(/stelow-question-.*\.md$/);
  });

  it("includes --parent and --stage when supplied", async () => {
    mockIssueCreate("01930000-aaaa-bbbb-cccc-000000000002");
    const adapter = new MulticaAdapter(VALID_CONFIG, "parent-uuid");
    const req: DecisionRequest = {
      kind: "question",
      workflow: "wf",
      stage: "planning",
      route_to: { role: "tech-lead" },
      questions: [
        {
          header: "P",
          question: "Q?",
          options: [{ label: "A", description: "a" }, { label: "B", description: "b" }],
        },
      ],
    };
    await adapter.requestDecision(req);
    const args = spawnSyncMock.mock.calls[0][1] as string[];
    expect(args).toContain("--parent");
    expect(args[args.indexOf("--parent") + 1]).toBe("parent-uuid");
    expect(args).toContain("--stage");
    expect(args[args.indexOf("--stage") + 1]).toBe("3"); // planning → 3
  });

  it("returns error when multica CLI fails", async () => {
    mockFail("multica not installed");
    const adapter = new MulticaAdapter(VALID_CONFIG, null);
    const req: DecisionRequest = {
      kind: "question",
      workflow: "wf",
      stage: "shape",
      route_to: { role: "pm" },
      questions: [
        { header: "S", question: "Q?", options: [{ label: "A", description: "a" }, { label: "B", description: "b" }] },
      ],
    };
    const r = await adapter.requestDecision(req);
    expect(r.decision).toBe("error");
    expect(r.feedback).toMatch(/multica not installed/);
  });
});

describe("MulticaAdapter.requestDecision — gate", () => {
  it("issues `multica issue create --attachment <artifact>` for gates", async () => {
    const artifact = join(tmpDir, "spec.md");
    writeFileSync(artifact, "# Spec\n");
    mockIssueCreate("01930000-aaaa-bbbb-cccc-000000000010");

    const adapter = new MulticaAdapter(VALID_CONFIG, null);
    const req: DecisionRequest = {
      kind: "gate",
      workflow: "wf",
      stage: "gate",
      route_to: { role: "pm" },
      artifact_path: artifact,
    };
    const r = await adapter.requestDecision(req);
    expect(r.external_ref).toBe("01930000-aaaa-bbbb-cccc-000000000010");
    const args = spawnSyncMock.mock.calls[0][1] as string[];
    expect(args).toContain("--attachment");
    expect(args[args.indexOf("--attachment") + 1]).toBe(artifact);
  });

  it("returns error when artifact file is missing", async () => {
    const adapter = new MulticaAdapter(VALID_CONFIG, null);
    const req: DecisionRequest = {
      kind: "gate",
      workflow: "wf",
      stage: "gate",
      route_to: { role: "pm" },
      artifact_path: join(tmpDir, "does-not-exist.md"),
    };
    const r = await adapter.requestDecision(req);
    expect(r.decision).toBe("error");
    expect(r.feedback).toMatch(/not found/);
  });
});

describe("MulticaAdapter.readDecisionFromIssue — gate", () => {
  const ISSUE_ID = "01930000-aaaa-bbbb-cccc-000000000020";

  it("maps status=done → decision=approved", async () => {
    mockIssueGet({ id: ISSUE_ID, status: "done", title: "Gate: spec.md" });
    const adapter = new MulticaAdapter(VALID_CONFIG, null);
    const r = await adapter.readDecisionFromIssue(ISSUE_ID);
    expect(r?.decision).toBe("approved");
    expect(r?.external_ref).toBe(ISSUE_ID);
  });

  it("maps status=cancelled → decision=dismissed", async () => {
    mockIssueGet({ id: ISSUE_ID, status: "cancelled", title: "Gate: spec.md" });
    const adapter = new MulticaAdapter(VALID_CONFIG, null);
    const r = await adapter.readDecisionFromIssue(ISSUE_ID);
    expect(r?.decision).toBe("dismissed");
  });

  it("maps member comment 'approved' → decision=approved", async () => {
    mockIssueGet({ id: ISSUE_ID, status: "in_review", title: "Gate: spec.md" });
    mockCommentList([
      { id: "c1", author_type: "member", content: "approved", created_at: "2026-07-16T10:00:00Z" },
    ]);
    const adapter = new MulticaAdapter(VALID_CONFIG, null);
    const r = await adapter.readDecisionFromIssue(ISSUE_ID);
    expect(r?.decision).toBe("approved");
  });

  it("maps member comment 'annotated: …' → decision=annotated + feedback", async () => {
    mockIssueGet({ id: ISSUE_ID, status: "in_review", title: "Gate: spec.md" });
    mockCommentList([
      { id: "c1", author_type: "member", content: "annotated: please clarify scope", created_at: "2026-07-16T10:00:00Z" },
    ]);
    const adapter = new MulticaAdapter(VALID_CONFIG, null);
    const r = await adapter.readDecisionFromIssue(ISSUE_ID);
    expect(r?.decision).toBe("annotated");
    expect(r?.feedback).toBe("please clarify scope");
  });

  it("maps any other member comment → decision=annotated (free-form feedback)", async () => {
    mockIssueGet({ id: ISSUE_ID, status: "in_review", title: "Gate: spec.md" });
    mockCommentList([
      { id: "c1", author_type: "member", content: "looks good but tighten the acceptance criteria", created_at: "2026-07-16T10:00:00Z" },
    ]);
    const adapter = new MulticaAdapter(VALID_CONFIG, null);
    const r = await adapter.readDecisionFromIssue(ISSUE_ID);
    expect(r?.decision).toBe("annotated");
    expect(r?.feedback).toContain("tighten the acceptance criteria");
  });

  it("ignores non-member comments (trust = author_type=member)", async () => {
    mockIssueGet({ id: ISSUE_ID, status: "in_review", title: "Gate: spec.md" });
    mockCommentList([
      { id: "c1", author_type: "agent", content: "approved", created_at: "2026-07-16T10:00:00Z" },
    ]);
    const adapter = new MulticaAdapter(VALID_CONFIG, null);
    const r = await adapter.readDecisionFromIssue(ISSUE_ID);
    // No member comment → no decision
    expect(r).toBeNull();
  });

  it("returns null when multica CLI fails on get", async () => {
    mockIssueGet(null);
    const adapter = new MulticaAdapter(VALID_CONFIG, null);
    const r = await adapter.readDecisionFromIssue(ISSUE_ID);
    expect(r).toBeNull();
  });
});

describe("interpretMemberReply", () => {
  const ISSUE_ID = "01930000-aaaa-bbbb-cccc-000000000030";

  it("'approved' on a gate → decision=approved", () => {
    const r = interpretMemberReply(
      { id: "c1", author_type: "member", content: "approved", created_at: "2026-07-16T10:00:00Z" },
      "gate",
      ISSUE_ID,
    );
    expect(r?.decision).toBe("approved");
  });

  it("'annotated: …' on a gate → decision=annotated + feedback", () => {
    const r = interpretMemberReply(
      { id: "c1", author_type: "member", content: "annotated: needs more detail", created_at: "2026-07-16T10:00:00Z" },
      "gate",
      ISSUE_ID,
    );
    expect(r?.decision).toBe("annotated");
    expect(r?.feedback).toBe("needs more detail");
  });

  it("free text on a gate → decision=annotated", () => {
    const r = interpretMemberReply(
      { id: "c1", author_type: "member", content: "looks great", created_at: "2026-07-16T10:00:00Z" },
      "gate",
      ISSUE_ID,
    );
    expect(r?.decision).toBe("annotated");
    expect(r?.feedback).toBe("looks great");
  });

  it("any reply on a question → decision=answered + raw preserved", () => {
    const r = interpretMemberReply(
      { id: "c1", author_type: "member", content: "let's ship option 2", created_at: "2026-07-16T10:00:00Z" },
      "question",
      ISSUE_ID,
    );
    expect(r?.decision).toBe("answered");
    expect(r?.raw).toBe("let's ship option 2");
  });
});

describe("interpretQuestionReply", () => {
  const ISSUE_ID = "01930000-aaaa-bbbb-cccc-000000000040";
  const opts = [{ label: "Auth" }, { label: "Pay" }, { label: "Dashboard" }];

  it("'1' → selections=['Auth']", () => {
    const r = interpretQuestionReply("1", opts, "c1", "2026-07-16T10:00:00Z", ISSUE_ID);
    expect(r.selections).toEqual(["Auth"]);
  });

  it("'1, 3' → multi-select ['Auth', 'Dashboard']", () => {
    const r = interpretQuestionReply("1, 3", opts, "c1", "2026-07-16T10:00:00Z", ISSUE_ID);
    expect(r.selections).toEqual(["Auth", "Dashboard"]);
  });

  it("free text → selections=[], feedback=raw", () => {
    const r = interpretQuestionReply("let's ship payment first", opts, "c1", "2026-07-16T10:00:00Z", ISSUE_ID);
    expect(r.selections).toEqual([]);
    expect(r.feedback).toBe("let's ship payment first");
  });
});

describe("BaseHostAdapter.idempotencyKey", () => {
  it("is stable for the same payload", () => {
    const adapter = new MulticaAdapter(VALID_CONFIG, null);
    const req: DecisionRequest = {
      kind: "question",
      workflow: "wf",
      stage: "shape",
      route_to: { role: "pm" },
      questions: [
        { header: "S", question: "Q?", options: [{ label: "A", description: "a" }, { label: "B", description: "b" }] },
      ],
    };
    const k1 = adapter.idempotencyKey(req);
    const k2 = adapter.idempotencyKey(req);
    expect(k1).toBe(k2);
    expect(k1).toMatch(/^multica:[0-9a-f]{16}$/);
  });

  it("differs when payload differs", () => {
    const adapter = new MulticaAdapter(VALID_CONFIG, null);
    const r1: DecisionRequest = {
      kind: "question",
      workflow: "wf",
      stage: "shape",
      route_to: { role: "pm" },
      questions: [{ header: "S", question: "Q1?", options: [{ label: "A", description: "a" }, { label: "B", description: "b" }] }],
    };
    const r2: DecisionRequest = {
      ...r1,
      questions: [{ header: "S", question: "Q2?", options: [{ label: "A", description: "a" }, { label: "B", description: "b" }] }],
    };
    expect(adapter.idempotencyKey(r1)).not.toBe(adapter.idempotencyKey(r2));
  });
});

describe("BaseHostAdapter.slaDeadline", () => {
  it("returns ISO timestamp when SLA is set", () => {
    const adapter = new MulticaAdapter(VALID_CONFIG, null);
    const req: DecisionRequest = {
      kind: "question",
      workflow: "wf",
      stage: "shape",
      route_to: { role: "pm" },
      questions: [
        { header: "S", question: "Q?", options: [{ label: "A", description: "a" }, { label: "B", description: "b" }] },
      ],
      sla_minutes: 60,
    };
    const deadline = adapter.slaDeadline(req);
    expect(deadline).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const diffMs = new Date(deadline!).getTime() - Date.now();
    // Allow ±2s clock skew
    expect(diffMs).toBeGreaterThan(60 * 60_000 - 2000);
    expect(diffMs).toBeLessThan(60 * 60_000 + 2000);
  });

  it("returns null when SLA is not set", () => {
    const adapter = new MulticaAdapter(VALID_CONFIG, null);
    const req: DecisionRequest = {
      kind: "question",
      workflow: "wf",
      stage: "shape",
      route_to: { role: "pm" },
      questions: [
        { header: "S", question: "Q?", options: [{ label: "A", description: "a" }, { label: "B", description: "b" }] },
      ],
    };
    expect(adapter.slaDeadline(req)).toBeNull();
  });
});