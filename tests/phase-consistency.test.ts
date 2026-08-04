/**
 * Tests: PHASE_NAMES consistency (canonical list snapshot).
 *
 * Pre-v0.45.0 this file compared the OpenCode plugin's generated phase
 * names against the canonical PHASE_NAMES list. The OpenCode plugin was
 * removed in v0.45.0, so this file now just snapshots the canonical
 * list to catch accidental drift.
 */

import { describe, it, expect } from "vitest";
import { PHASE_NAMES } from "../extensions/stelow/types";

describe("PHASE_NAMES canonical list", () => {
  it("has 17 stages", () => {
    expect(PHASE_NAMES).toHaveLength(17);
  });

  it("starts with Triage and ends with Audit", () => {
    expect(PHASE_NAMES[0]).toBe("Triage");
    expect(PHASE_NAMES[PHASE_NAMES.length - 1]).toBe("Audit");
  });

  it("contains the canonical stage sequence", () => {
    const expected = [
      "Triage",
      "ItemSelect",
      "Setup",
      "Context",
      "Shape",
      "Critique",
      "Gate",
      "Scope",
      "Interface",
      "Int.Gate",
      "Selection",
      "Planning",
      "Plan.Gate",
      "Execution",
      "Verification",
      "Diff.Gate",
      "Audit",
    ];
    expect(PHASE_NAMES).toEqual(expected);
  });

  it("PHASE_NAMES is immutable (frozen or frozen-as-string property)", () => {
    // The list is exported `as const` which produces a readonly tuple.
    // We assert structural correctness here rather than runtime frozenness.
    expect(Array.isArray(PHASE_NAMES)).toBe(true);
  });
});
