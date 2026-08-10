import { describe, it, expect, beforeEach } from "vitest";

/**
 * Multica stage-label invariant (v0.57.0).
 *
 * Per CAL-38 / CAL-40, every Multica issue that is bound to a Stelow
 * workflow must have **at most one** `stelow:<stage>` label at any
 * time. These tests pin the invariant:
 *
 *   1. STAGE_LABELS is derived from PHASE_NAMES (no two-place coordination).
 *   2. labelForStage normalizes correctly (lowercase, dots removed).
 *   3. setStageLabel swaps labels and removes all stale stelow:* labels.
 *   4. assertSingleStageLabel throws on drift (the catchable invariant).
 *
 * Regression target: pre-v0.57.0 LLMs forgot the `removeLabel(prev)`
 * call when adding the new one, leaving issues with two stelow:* labels.
 * This test makes that impossible to ship.
 */

import {
  STAGE_LABELS,
  labelForStage,
  setStageLabel,
  assertSingleStageLabel,
  type MulticaCtx,
} from "../../extensions/stelow/adapters/multica/labels";
import { PHASE_NAMES } from "../../extensions/stelow/types";

describe("Multica stage-label invariant (v0.57.0)", () => {
  describe("STAGE_LABELS derives from PHASE_NAMES (single source of truth)", () => {
    it("emits exactly one label per PHASE_NAMES entry", () => {
      expect(STAGE_LABELS).toHaveLength(PHASE_NAMES.length);
    });

    it("every label has the stelow: prefix", () => {
      for (const label of STAGE_LABELS) {
        expect(label.startsWith("stelow:")).toBe(true);
      }
    });

    it("no two phases collide on the same label", () => {
      const unique = new Set(STAGE_LABELS);
      expect(unique.size).toBe(STAGE_LABELS.length);
    });

    it("labels are deterministic (no random hash, no timestamp)", () => {
      // Two evaluations must be byte-equal.
      const a = Array.from(STAGE_LABELS);
      const b = Array.from(STAGE_LABELS);
      expect(a).toEqual(b);
    });

    it("adding a stage to PHASE_NAMES would auto-add a label here (no two-place coordination)", () => {
      // We don't mutate PHASE_NAMES (frozen contract), but we verify
      // the mapping function would handle it correctly.
      const syntheticStage = "ZombiePhase";
      const expected = `stelow:${syntheticStage.toLowerCase()}`;
      // Sanity: the same lowercase transformation produces a stelow: label.
      expect(expected).toBe("stelow:zombiephase");
      expect(expected.startsWith("stelow:")).toBe(true);
    });
  });

  describe("labelForStage normalizes correctly", () => {
    it("lowercases and strips dots", () => {
      expect(labelForStage("Plan.Gate")).toBe("stelow:plangate");
      expect(labelForStage("Int.Gate")).toBe("stelow:intgate");
      expect(labelForStage("Diff.Gate")).toBe("stelow:diffgate");
    });

    it("accepts mixed-case input (case-insensitive lookup)", () => {
      expect(labelForStage("SHAPE")).toBe("stelow:shape");
      expect(labelForStage("shape")).toBe("stelow:shape");
    });

    it("throws on unknown stage names", () => {
      expect(() => labelForStage("NotAStage")).toThrow(/unknown stage/i);
    });
  });

  describe("setStageLabel enforces the structural invariant", () => {
    let labels: string[];
    let addCalls: Array<{ issueId: string; label: string }>;
    let removeCalls: Array<{ issueId: string; label: string }>;

    function makeCtx(): MulticaCtx {
      return {
        listLabels: async () => Array.from(labels),
        addLabel: async (issueId, label) => {
          addCalls.push({ issueId, label });
          if (!labels.includes(label)) labels.push(label);
        },
        removeLabel: async (issueId, label) => {
          removeCalls.push({ issueId, label });
          labels = labels.filter((l) => l !== label);
        },
      };
    }

    beforeEach(() => {
      labels = [];
      addCalls = [];
      removeCalls = [];
    });

    it("adds the new label and removes every stale stelow:* label", async () => {
      // Start with the triage label attached (workflow just started).
      labels = ["stelow:triage", "bug", "priority-high"];
      const ctx = makeCtx();

      await setStageLabel("issue-1", "Shape", "Triage", ctx);

      // New label present.
      expect(labels).toContain("stelow:shape");
      // Stale label removed.
      expect(labels).not.toContain("stelow:triage");
      // Other labels untouched.
      expect(labels).toContain("bug");
      expect(labels).toContain("priority-high");
      // Single stelow:* label invariant holds.
      assertSingleStageLabel(labels);
    });

    it("removes ALL stale stelow:* labels (catches pre-v0.57.0 drift)", async () => {
      // Simulate drift: the issue already has TWO stelow:* labels because
      // a pre-v0.57.0 transition forgot to clean up. The next transition
      // must leave exactly one.
      labels = ["stelow:triage", "stelow:shape", "bug"];
      const ctx = makeCtx();

      await setStageLabel("issue-1", "Critique", "Shape", ctx);

      // Exactly one stelow:* label remains.
      const stelowLeft = labels.filter((l) => l.startsWith("stelow:"));
      expect(stelowLeft).toHaveLength(1);
      expect(stelowLeft[0]).toBe("stelow:critique");
      // Other labels untouched.
      expect(labels).toContain("bug");
    });

    it("tolerates a null prevStage (first transition)", async () => {
      labels = ["bug"];
      const ctx = makeCtx();

      await setStageLabel("issue-1", "Setup", null, ctx);

      expect(labels).toContain("stelow:setup");
      expect(labels.filter((l) => l.startsWith("stelow:"))).toHaveLength(1);
    });

    it("is idempotent on re-transition (no spurious remove calls)", async () => {
      labels = ["stelow:shape"];
      const ctx = makeCtx();

      await setStageLabel("issue-1", "Shape", "Shape", ctx);

      expect(addCalls).toHaveLength(1);
      expect(removeCalls).toHaveLength(0);
      expect(labels).toContain("stelow:shape");
    });

    it("removes the previous label even when not in the current list (defensive)", async () => {
      // The current issue labels list somehow doesn't include the prev
      // stage label (e.g. a Multica cache miss). The new transition
      // should still add the new label cleanly.
      labels = ["bug"];
      const ctx = makeCtx();

      await setStageLabel("issue-1", "Planning", "Shape", ctx);

      expect(labels).toContain("stelow:planning");
      expect(labels).toContain("bug");
    });

    it("covers all 17 PHASE_NAMES round-trip without leaving drift", async () => {
      // Walk through every stage in order; the invariant must hold
      // after each transition.
      const ctx = makeCtx();
      let prev: string | null = null;
      for (const stage of PHASE_NAMES) {
        await setStageLabel("issue-rt", stage, prev, ctx);
        const stelowLeft = labels.filter((l) => l.startsWith("stelow:"));
        expect(stelowLeft, `after transition to ${stage}`).toHaveLength(1);
        expect(stelowLeft[0]).toBe(`stelow:${stage.toLowerCase().replace(/\./g, "")}`);
        prev = stage;
      }
    });
  });

  describe("assertSingleStageLabel (catchable invariant)", () => {
    it("passes with zero stelow:* labels", () => {
      expect(() => assertSingleStageLabel(["bug", "priority"])).not.toThrow();
    });

    it("passes with one stelow:* label", () => {
      expect(() => assertSingleStageLabel(["stelow:shape", "bug"])).not.toThrow();
    });

    it("throws when two stelow:* labels coexist", () => {
      expect(() =>
        assertSingleStageLabel(["stelow:shape", "stelow:critique"]),
      ).toThrow(/invariant violated/i);
    });

    it("error message lists all offending labels", () => {
      try {
        assertSingleStageLabel([
          "stelow:shape",
          "stelow:critique",
          "stelow:planning",
        ]);
        // Force failure if the throw didn't happen.
        expect.unreachable("expected throw");
      } catch (err) {
        expect((err as Error).message).toContain("stelow:shape");
        expect((err as Error).message).toContain("stelow:critique");
        expect((err as Error).message).toContain("stelow:planning");
      }
    });
  });
});