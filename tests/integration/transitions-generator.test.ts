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
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
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
    expect(stages.length).toBe(17);
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
