/**
 * Regression pins for the review-gate fallback.
 *
 * The old reference said a host without a native review UI must silently
 * approve, while the stage prose said a selected gate blocks. Those two rules
 * cannot both hold: a gate that approves itself is a phantom approval. The
 * fallback is now a structured ask with the artifact under decision, and only
 * Auto may self-approve with a receipt.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ORCHESTRATOR = join(
  process.cwd(),
  "skills",
  "stelow-workflow-orchestrator",
);

function read(relativePath: string): string {
  return readFileSync(join(ORCHESTRATOR, relativePath), "utf8");
}

describe("review gate fallback", () => {
  const visualReview = read("references/cli-tools/visual_review.md");

  it("never lets a selected gate silently approve itself", () => {
    expect(visualReview).not.toMatch(/must silently approve/i);
    expect(visualReview).toMatch(/structured ask/i);
    expect(visualReview).toMatch(/only `Auto`/i);
  });

  it("keeps the receipt as the portable contract", () => {
    expect(visualReview).toMatch(/\.stelow\/approvals\//);
    expect(visualReview).toMatch(/phantom wait/i);
  });

  it("names the host surface and the CLI as a fallback for diff review", () => {
    const diffGate = read("stages/diff-gate.md");
    expect(diffGate).toMatch(/host/i);
    expect(diffGate).toMatch(/structured ask/i);
    expect(diffGate).toMatch(/visual_review review/);
    expect(diffGate).not.toMatch(/silently approve/i);
    expect(diffGate).not.toMatch(/visual review review/i);
  });

  it("gives the tech plan the same structured-ask fallback", () => {
    const planGate = read("stages/plan-gate.md");
    expect(planGate).toMatch(/structured ask/i);
    expect(planGate).toMatch(/never silently approve/i);
  });
});
