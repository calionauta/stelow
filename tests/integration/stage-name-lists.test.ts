/**
 * The prose lists of valid values are copies of facts the catalog owns.
 *
 * `assets/state-template.md` and the state contract both carry a list of the
 * 18 stage names. The template said "all 18 stage names" and listed 17 —
 * `architecture` was missing — and the contract listed the same 17. A
 * workflow that used the list to type a stage name had no `architecture` to
 * type, and nothing caught it: the list was prose, and prose has no gate.
 *
 * The catalog is the owner. These tests bind the prose to it, so a stage
 * added to `stages.yaml` and published in the catalog makes both lists
 * fail until they name it.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CATALOG = JSON.parse(
  readFileSync(join(ROOT, "skills/stelow-workflow-orchestrator/stage-catalog.json"), "utf8"),
);

const PROSE = [
  { path: "assets/state-template.md", label: "the state template" },
  { path: "skills/stelow-workflow-orchestrator/references/state-contract.md", label: "the state contract" },
];

const stageNames: string[] = (CATALOG.stages ?? []).map((stage: { id: string }) => stage.id);
const reviewModes: string[] = Object.keys(CATALOG.routes?.review_modes ?? {});

describe("the prose lists match the catalog", () => {
  it("the catalog publishes 18 stages", () => {
    expect(stageNames.length).toBe(18);
    expect(new Set(stageNames).size).toBe(18);
  });

  it.each(PROSE)("$label names every stage the catalog publishes", ({ path }) => {
    const text = readFileSync(join(ROOT, path), "utf8");
    const missing = stageNames.filter((name) => !text.includes(`\`${name}\``));
    expect(
      missing,
      `${path} does not name these stages; the list is a copy of the catalog and must match it:\n${missing.join("\n")}`,
    ).toEqual([]);
  });

  it.each(PROSE)("$label names every review mode the catalog publishes", ({ path }) => {
    const text = readFileSync(join(ROOT, path), "utf8");
    const missing = reviewModes.filter((mode) => !text.includes(mode));
    expect(
      missing,
      `${path} does not name these review modes:\n${missing.join("\n")}`,
    ).toEqual([]);
  });
});
