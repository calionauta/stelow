/**
 * The hand-off block a skill carries must name a stage that exists.
 *
 * `scripts/scope3_blocks.py` writes a `## Hand-off (workflow mode)` block
 * into every skill, naming the stage the skill hands off to. The stage came
 * from a hand-kept map in that script, and the map shipped two wrong
 * answers:
 *
 *   - `plan-critique` pointed at `plan-gate`, so a critique handed off to
 *     the wrong gate and the `gate` stage was skipped;
 *   - `ads` pointed at `promotions`, which is not a stage at all, so the
 *     skill told a workflow to hand off to a stage that does not exist.
 *
 * A block that names a stage the graph does not have is a dead instruction.
 * This test reads the committed blocks and checks every stage they name
 * against the catalog — and checks that a skill which OWNS a stage names
 * that stage, which is the fact the hand-off has to agree with.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CATALOG = JSON.parse(
  readFileSync(join(ROOT, "skills/stelow-workflow-orchestrator/stage-catalog.json"), "utf8"),
);

const stageIds: string[] = (CATALOG.stages ?? []).map((stage: { id: string }) => stage.id);
const ownerBySkill = new Map<string, string>();
for (const stage of CATALOG.stages ?? []) {
  const skill = (stage as { skill?: string }).skill;
  if (skill) ownerBySkill.set(skill, (stage as { id: string }).id);
}

function skillFiles(): string[] {
  const dir = join(ROOT, "skills");
  return readdirSync(dir)
    .filter((name) => name.startsWith("stelow-"))
    .map((name) => join(dir, name, "SKILL.md"))
    .filter((path) => {
      try {
        readFileSync(path, "utf8");
        return true;
      } catch {
        return false;
      }
    });
}

describe("the hand-off blocks name real stages", () => {
  it("every stage a hand-off block names exists in the graph", () => {
    const wrong: string[] = [];
    for (const path of skillFiles()) {
      const text = readFileSync(path, "utf8");
      // The block writes `stage          : <name>` — the name is the value.
      for (const match of text.matchAll(/^stage\s*:\s*(\S+)\s*$/gm)) {
        const stage = match[1];
        if (!stageIds.includes(stage)) wrong.push(`${path}: stage ${stage}`);
      }
    }
    expect(
      wrong,
      `a hand-off block names a stage the graph does not have:\n${wrong.join("\n")}`,
    ).toEqual([]);
  });

  it("a skill that owns a stage hands off to that stage", () => {
    const wrong: string[] = [];
    for (const path of skillFiles()) {
      const name = path.split("/").slice(-2)[0];
      const owned = ownerBySkill.get(name);
      if (!owned) continue;
      const text = readFileSync(path, "utf8");
      const named = [...text.matchAll(/^stage\s*:\s*(\S+)\s*$/gm)].map((match) => match[1]);
      if (named.length === 0) continue;
      if (!named.includes(owned)) {
        wrong.push(`${name}: owns ${owned} but the block names ${named.join(", ") || "nothing"}`);
      }
    }
    expect(
      wrong,
      `a skill's hand-off does not name the stage it owns:\n${wrong.join("\n")}`,
    ).toEqual([]);
  });
});
