/**
 * Integration Tests: transitions.md generator gate.
 *
 * transitions.md is GENERATED from stages.yaml (single source of truth) by
 * scripts/generate-transitions.py. These tests fail on any drift between
 * source, template, and committed output — the exact class that once
 * shipped a phantom `reject: execution` line and stale order-table
 * descriptions. No mocks: real python3 subprocess against the real tree.
 *
 * To run:  npm run test:integration -- transitions-generator
 */
import { describe, it, expect } from "vitest";
import { spawnSync, execSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const GENERATOR = join(REPO_ROOT, "scripts", "generate-transitions.py");
const STAGES_YAML = join(REPO_ROOT, "skills", "stelow-workflow-orchestrator", "stages.yaml");
const TEMPLATE = join(REPO_ROOT, "skills", "stelow-workflow-orchestrator", "references", "transitions.template.md");
const OUTPUT = join(REPO_ROOT, "skills", "stelow-workflow-orchestrator", "references", "transitions.md");

// Stage names live one indent level under `stages:` as `- name: <slug>`.
// This regex is intentionally narrow: if the yaml layout ever changes, this
// test fails loudly instead of silently asserting nothing.
function yamlStageNames(): string[] {
  const text = readFileSync(STAGES_YAML, "utf8");
  const names = [...text.matchAll(/^  - name: ([a-z][a-z0-9-]*)$/gm)].map((m) => m[1]);
  expect(names.length, "stages.yaml yields a non-empty stage list").toBeGreaterThan(0);
  return names;
}

function mdSectionHeaders(path: string): string[] {
  const text = readFileSync(path, "utf8");
  return [...text.matchAll(/^### (\S+)\s*$/gm)].map((m) => m[1]);
}

describe("transitions generator gate", () => {
  it("committed transitions.md is byte-identical to generated output", () => {
    const r = spawnSync("python3", [GENERATOR, "--check"], { cwd: REPO_ROOT, encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
  });

  it("every stages.yaml stage has a ### section in transitions.md and the template", () => {
    const stages = yamlStageNames();
    expect(stages.length).toBe(18);
    const outputSections = mdSectionHeaders(OUTPUT);
    const templateSections = mdSectionHeaders(TEMPLATE);
    for (const stage of stages) {
      expect(outputSections, `transitions.md covers stage ${stage}`).toContain(stage);
      expect(templateSections, `template covers stage ${stage}`).toContain(stage);
    }
  });

  it("generator reports its own path on unknown template stages (not silent)", () => {
    const out = execSync(`python3 ${GENERATOR} --check 2>&1 || true`, { cwd: REPO_ROOT, encoding: "utf8" });
    expect(out).not.toMatch(/unknown stage/);
  });
});

/**
 * The layers the runtime PARSES must move when the source moves.
 *
 * The helper reads the intent route and the rework edges out of
 * `transitions.md`. Both used to be hand-written in the template, so
 * `stages.yaml` declared them and the enforced file did not have to agree:
 * changing `routes.intents.investigate` changed the published catalog, left
 * the mirror byte-identical, and no test failed. A silent divergence between
 * the source of truth and what actually runs is the failure this pins.
 *
 * The proof runs the real generator against a real copy of the tree: the
 * committed mirror, a mutated `stages.yaml`, and the rendered output.
 */
describe("the enforced mirror follows the source", () => {
  function renderWith(mutate: (yaml: string) => string): string {
    const dir = mkdtempSync(join(tmpdir(), "stelow-transitions-"));
    try {
      const script = join(REPO_ROOT, "scripts", "generate-transitions.py");
      // The generator resolves the repo from its own location, so the copy has
      // to carry the whole tree it reads: stages.yaml and the template.
      const tree = join(dir, "repo");
      mkdirSync(join(tree, "skills", "stelow-workflow-orchestrator", "references"), { recursive: true });
      mkdirSync(join(tree, "scripts"), { recursive: true });
      writeFileSync(
        join(tree, "skills", "stelow-workflow-orchestrator", "stages.yaml"),
        mutate(readFileSync(STAGES_YAML, "utf8")),
      );
      writeFileSync(
        join(tree, "skills", "stelow-workflow-orchestrator", "references", "transitions.template.md"),
        readFileSync(TEMPLATE, "utf8"),
      );
      copyFileSync(script, join(tree, "scripts", "generate-transitions.py"));
      const run = spawnSync("python3", [join(tree, "scripts", "generate-transitions.py")], {
        cwd: tree,
        encoding: "utf8",
      });
      expect(run.status, run.stderr).toBe(0);
      return readFileSync(
        join(tree, "skills", "stelow-workflow-orchestrator", "references", "transitions.md"),
        "utf8",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it("changing an intent route changes the enforced route line", () => {
    const mutated = renderWith((yaml) =>
      yaml.replace(
        "    investigate: [triage, select, setup, context, audit]",
        "    investigate: [triage, select, setup, context, shape, audit]",
      ),
    );
    expect(mutated).not.toBe(readFileSync(OUTPUT, "utf8"));
    expect(mutated).toContain("**investigate:** triage → select → setup → context → shape → audit");
  });

  it("changing a rework edge changes the enforced rework line", () => {
    const mutated = renderWith((yaml) =>
      yaml.replace("      rework: [shape]", "      rework: [context]"),
    );
    expect(mutated).not.toBe(readFileSync(OUTPUT, "utf8"));
    expect(mutated).toContain("rework:    context");
  });

  /**
   * The review-mode layer had THREE owners: the list in stages.yaml, a
   * hand-typed gate table in the template, and a `case` statement in the
   * helper. Two of them are prose the runtime never reads. Now the list is
   * the only owner and the table is rendered from it — so a mode that skips
   * a new stage moves the enforced table with it, or the table is a lie.
   */
  it("changing a review mode's skip set changes the enforced block AND the gate table", () => {
    const mutated = renderWith((yaml) =>
      yaml.replace(
        "    Auto:\n      skipped: [plan-gate, diff-gate]",
        "    Auto:\n      skipped: [plan-gate, diff-gate, critique]",
      ),
    );
    expect(mutated).not.toBe(readFileSync(OUTPUT, "utf8"));
    // The machine-readable block the helper parses.
    expect(mutated).toContain("skipped:    plan-gate, diff-gate, critique");
    // The human table, rendered from the same data.
    expect(mutated).toContain("| critique | Auto | skip | skipped; the predecessor moves straight to the successor |");
  });

  it("the no-human-wait kind is rendered separately from the skip kind", () => {
    // One list for both was a vocabulary that lied: `selection` does not
    // run in Auto, it runs WITHOUT a human — the helper must not bypass it.
    const text = readFileSync(OUTPUT, "utf8");
    const autoBlock = text.slice(text.indexOf("review_mode: Auto"));
    expect(autoBlock).toContain("skipped:    plan-gate, diff-gate");
    expect(autoBlock).toContain("no_human_wait: selection");
    expect(autoBlock).not.toMatch(/^skipped:.*selection/m);
  });

  it("the template no longer hand-types the gate table (it is rendered)", () => {
    const template = readFileSync(TEMPLATE, "utf8");
    expect(template).toContain("{{REVIEW_MODE_TABLE}}");
    expect(template).toContain("{{REVIEW_MODES}}");
    // A hand-typed row would be a second owner of the same fact.
    expect(template).not.toMatch(/^\| plan-gate \| Auto \| skip \|/m);
  });
});

/**
 * The drift gate must FAIL on a drifted tree.
 *
 * The suite proved the gate passes on a clean tree — which a neutered gate
 * also does. Nothing checked the refusal, so the one check that stands
 * between a hand edit and a published mirror could be turned off and the
 * suite stayed green. (The mutation gate caught exactly this: the
 * `generator-drift-allowed` mutant SURVIVED until this test existed.)
 */
describe("the drift gate refuses a drifted tree", () => {
  function checkWith(mutate: (yaml: string) => string): { status: number; output: string } {
    const dir = mkdtempSync(join(tmpdir(), "stelow-transitions-check-"));
    try {
      const tree = join(dir, "repo");
      mkdirSync(join(tree, "skills", "stelow-workflow-orchestrator", "references"), { recursive: true });
      mkdirSync(join(tree, "scripts"), { recursive: true });
      writeFileSync(
        join(tree, "skills", "stelow-workflow-orchestrator", "stages.yaml"),
        mutate(readFileSync(STAGES_YAML, "utf8")),
      );
      writeFileSync(
        join(tree, "skills", "stelow-workflow-orchestrator", "references", "transitions.template.md"),
        readFileSync(TEMPLATE, "utf8"),
      );
      copyFileSync(join(REPO_ROOT, "scripts", "generate-transitions.py"), join(tree, "scripts", "generate-transitions.py"));
      const run = spawnSync("python3", [join(tree, "scripts", "generate-transitions.py"), "--check"], {
        cwd: tree,
        encoding: "utf8",
      });
      return { status: run.status ?? -1, output: `${run.stdout}${run.stderr}` };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it("refuses a tree whose committed mirror no longer matches its source", () => {
    const drifted = checkWith((yaml) =>
      yaml.replace(
        "    investigate: [triage, select, setup, context, audit]",
        "    investigate: [triage, select, setup, context, shape, audit]",
      ),
    );
    expect(drifted.status, drifted.output).not.toBe(0);
    expect(drifted.output).toContain("stale");
  });

  it("refuses a tree with no committed mirror at all", () => {
    const missing = checkWith((yaml) => yaml);
    expect(missing.status, missing.output).not.toBe(0);
  });
});
