/**
 * A composed option must be drawable, and must say what it composes.
 *
 * The interface gate is a VISUAL review: `visual_review` reads the wireframes
 * in the proposals file. A hybrid recommendation written only as prose
 * therefore cannot be reviewed at that gate at all — there is nothing in it to
 * look at. And the reader who arrives from the hybrid option lands on that prose
 * while the two mockups the hybrid merges sit elsewhere in the file, which reads
 * as "the document has no mockup" rather than "the hybrid has none".
 *
 * The gate is the reason this is a contract and not a formatting preference, so
 * these assertions are pinned: a skill edit that quietly drops the wireframe
 * requirement reintroduces an unreviewable option.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKILL_DIR = join(ROOT, "skills", "stelow-workflow-interface-alternatives");
const read = (...parts: string[]) => readFileSync(join(SKILL_DIR, ...parts), "utf8");

const skill = read("SKILL.md");
const hybrid = read("references", "hybrid-recommendation.md");

describe("interface alternatives — the hybrid option", () => {
  it("requires its own composed wireframe in a fenced block", () => {
    expect(hybrid).toMatch(/fenced block|```/);
    expect(hybrid).toMatch(/wireframe/i);
    // "not a copy of either" is the load-bearing half: without it a hybrid is
    // one of its inputs wearing a new heading.
    expect(hybrid).toMatch(/not a copy of (either|one)/i);
  });

  it("names the proposals it composes by heading, so a reader can reach them", () => {
    expect(hybrid).toMatch(/names? the proposals it composes|composes, named/i);
    expect(hybrid).toMatch(/heading/i);
  });

  it("states the gate as the reason, so the rule survives a later edit", () => {
    expect(hybrid).toMatch(/gate/i);
    expect(skill).toMatch(/composed wireframe/i);
    // The SKILL.md is what the agent reads first; a requirement that lives only
    // in a reference the agent may not open is not a requirement.
    expect(skill).toMatch(/wireframe/i);
  });

  it("keeps the coherence rules the hybrid already had", () => {
    for (const rule of ["feature soup", "what should NOT be combined", "trade-offs are intentionally preserved"]) {
      expect(hybrid, `the pre-existing rule "${rule}" must survive`).toContain(rule);
    }
  });
});
