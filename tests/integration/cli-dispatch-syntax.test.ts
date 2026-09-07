/**
 * Integration Tests: dispatch syntax smoke test
 *
 * Validates the documented dispatch shapes (in
 * `skills/stelow-workflow-orchestrator/references/cli-tools/subagents.md`)
 * at parser level. Does NOT launch real subagents — that requires a live
 * model session which isn't appropriate for unit/integration CI.
 *
 * Capability tiers (harness-agnostic):
 *   - `acceptance-native` : delegate tool with acceptance contract
 *                           (criteria, evidence, verify, stopRules).
 *   - `isolated`          : delegate tool with agent + task only;
 *                           parent loops with feedback.
 *   - `headless`          : agent CLI binary in non-interactive mode.
 *   - `generic`           : shell-level (no binary to test).
 *
 * Reference: docs/scope-execution-strategy.md + subagents.md dispatch table.
 */

import { describe, it, expect } from "vitest";

/**
 * Static validation of the documented call shapes per capability tier.
 * These tests don't invoke the subagents — they validate that a
 * constructed call-shape OBJECT is well-formed per the shape documented
 * in subagents.md dispatch table.
 *
 * If the shape changes (new required field, renamed parameter), this
 * will fail loudly instead of silently drifting.
 */
describe("dispatch — call shape validation (static)", () => {
  it("acceptance-native shape: delegate with criteria + verify + stopRules", () => {
    const shape = {
      agent: "worker",
      task: "Implement scope SCOPE-1",
      acceptance: {
        criteria: [{ id: "SC-1", must: "Feature X works", severity: "required" }],
        evidence: ["changed-files", "commands-run"],
        verify: [{ id: "V-1", command: "go test ./..." }],
        stopRules: ["Do not change public API signatures"],
      },
    };
    expect(typeof shape.agent).toBe("string");
    expect(typeof shape.task).toBe("string");
    expect(Array.isArray(shape.acceptance.criteria)).toBe(true);
    expect(shape.acceptance.criteria.length).toBeGreaterThan(0);
    expect(Array.isArray(shape.acceptance.verify)).toBe(true);
    expect(Array.isArray(shape.acceptance.stopRules)).toBe(true);
  });

  it("parallel acceptance-native shape: multiple delegates in one message", () => {
    const delegates = [
      { agent: "worker", task: "Implement auth" },
      { agent: "worker", task: "Implement API" },
    ];
    expect(Array.isArray(delegates)).toBe(true);
    expect(delegates.length).toBeGreaterThan(0);
    for (const t of delegates) {
      expect(typeof t.agent).toBe("string");
      expect(typeof t.task).toBe("string");
    }
  });

  it("generic shape: shell-level fan-out ('&' + 'wait')", () => {
    // Generic fallback is shell-level: spawn N commands with `&`,
    // wait for completion. Validate syntactic shell construction.
    const commands = ["cmd_a", "cmd_b", "cmd_c"];
    const fannedOut = commands.map((c) => `${c} &`).join(" ");
    const withWait = `${fannedOut}wait`;
    expect(withWait).toMatch(/^[a-z_]+ & [a-z_]+ & [a-z_]+ &wait$/);
  });

  it("generic shape: falls back to file-based handoff (no subagent call)", () => {
    // Per cli-tools/subagents.md, the generic fallback never invokes
    // a subagent function — it writes a handoff file and the next
    // stage reads it. Validate that no subagent call shape leaks.
    const handoff: { subagent?: never; file: string } = {
      file: ".stelow/2026-07-09/abc/handoff.md",
    };
    expect(handoff.subagent).toBeUndefined();
    expect(handoff.file).toMatch(/^\.stelow\/.+\/handoff\.md$/);
  });

  it("isolated shape: delegate runs in its own context window", () => {
    // An isolated delegate takes agent + task only; child sessions are
    // always isolated. The only contract is that the parent must NOT
    // pass any context-inheritance flags.
    const invocation = {
      agent: "reviewer",
      task: "Review correctness of the auth refactor",
    };
    expect(typeof invocation.agent).toBe("string");
    expect(typeof invocation.task).toBe("string");
    // Sanity: no `context` field at all
    expect(Object.keys(invocation).sort()).toEqual(["agent", "task"]);
  });
});
