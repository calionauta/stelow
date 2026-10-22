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
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const CATALOG = JSON.parse(
  readFileSync(join(ROOT, "skills/stelow-workflow-orchestrator/stage-catalog.json"), "utf8"),
);

const stageIds: string[] = (CATALOG.stages ?? []).map((stage: { id: string }) => stage.id);
const ownerBySkill = new Map<string, string>();
for (const stage of CATALOG.stages ?? []) {
  const skill = (stage as { skill?: string }).skill;
  if (skill) ownerBySkill.set(skill, stage.id);
}

/** The stage's real gate — `requires_approval` from the catalog. */
const gateByStage = new Map<string, string>();
for (const stage of CATALOG.stages ?? []) {
  const approval = (stage as { requires_approval?: boolean }).requires_approval;
  const tool = (stage as { approval_tool?: string }).approval_tool;
  gateByStage.set(stage.id, approval ? `approval-required (${tool ?? "approval"})` : "none");
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

/** The generated region of a skill — between the scope3 markers. */
function generatedRegion(path: string): string | null {
  const text = readFileSync(path, "utf8");
  const begin = text.indexOf("<!-- stelow:scope3:begin -->");
  const end = text.indexOf("<!-- stelow:scope3:end -->");
  if (begin < 0 || end < 0) return null;
  return text.slice(begin, end);
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

/**
 * The blocks are GENERATED from stages.yaml, and `--check` fails when a
 * committed block disagrees with the source.
 *
 * The script used to be a one-shot writer with no check: it skipped any
 * skill that already carried a block, so a stage renamed in stages.yaml
 * left every shipped skill naming the old one — forever, with a green CI.
 */
describe("the hand-off blocks are generated, not hand-kept", () => {
  it("every committed block matches what the generator would write", () => {
    const run = spawnSync("python3", ["scripts/scope3_blocks.py", "--check"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(run.status, run.stderr + run.stdout).toBe(0);
  });

  it("the block says the stage's REAL gate, not 'none'", () => {
    // The hand-rolled YAML parser in the old script never read
    // `requires_approval`, so EVERY skill claimed it needed no approval —
    // including the ones that own plan-gate and diff-gate.
    const wrong: string[] = [];
    for (const path of skillFiles()) {
      const region = generatedRegion(path);
      if (!region) continue;
      const stage = region.match(/^stage\s*:\s*(\S+)\s*$/m)?.[1];
      const gate = region.match(/^gate\s*:\s*(.+)$/m)?.[1]?.trim();
      if (!stage || !gate) continue;
      const expected = gateByStage.get(stage);
      if (expected && gate !== expected) {
        wrong.push(`${path}: stage ${stage} says gate "${gate}", stages.yaml says "${expected}"`);
      }
    }
    expect(wrong, `a hand-off block lies about its gate:\n${wrong.join("\n")}`).toEqual([]);
  });

  it("no block hardcodes a graph edge as the next candidate", () => {
    // A static copy of the edge is a graph that goes stale: `diff-gate` does
    // not run in Auto, and the helper refuses it there. The block asks the
    // helper instead, so the answer is always the current one.
    const wrong: string[] = [];
    for (const path of skillFiles()) {
      const region = generatedRegion(path);
      if (!region) continue;
      const next = region.match(/^next-candidate\s*:\s*(.+)$/m)?.[1]?.trim();
      if (next && !next.startsWith("<")) {
        wrong.push(`${path}: next-candidate is a static copy (${next})`);
      }
    }
    expect(
      wrong,
      `a hand-off block copies the graph instead of asking the helper:\n${wrong.join("\n")}`,
    ).toEqual([]);
  });

  it("a workflow skill is matched on its name, not on a substring of its prefix", () => {
    // The old script stripped only `stelow-product-`, so every
    // `stelow-workflow-*` skill fell to the substring fallback: the
    // diff-gate skill (`codebase-critique`) matched `critique` and handed
    // off to the wrong stage.
    const region = generatedRegion(join(ROOT, "skills/stelow-workflow-codebase-critique/SKILL.md"));
    expect(region).not.toBeNull();
    expect(region).toMatch(/^stage\s*:\s*diff-gate\s*$/m);
  });

  it("the control plane carries no stage hand-off", () => {
    // The router CONSUMES a hand-off block; giving it the workflow-mode
    // template would invite it to emit one.
    for (const name of ["stelow-workflow-orchestrator", "stelow-workflow-entry", "stelow-workflow-router"]) {
      const path = join(ROOT, "skills", name, "SKILL.md");
      const region = generatedRegion(path);
      expect(region, `${name} must not carry a generated stage block`).toBeNull();
    }
  });
});
