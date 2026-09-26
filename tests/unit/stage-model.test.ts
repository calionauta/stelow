import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const catalog = JSON.parse(readFileSync(join(root, "skills/stelow-workflow-orchestrator/stage-catalog.json"), "utf8"));
const recipeCatalog = JSON.parse(readFileSync(join(root, "skills/stelow-workflow-orchestrator/recipe-catalog.json"), "utf8"));
const skillFiles = readdirSync(join(root, "skills"), { withFileTypes: true }).filter((entry) => entry.isDirectory() && entry.name.startsWith("stelow-")).map((entry) => join(root, "skills", entry.name, "SKILL.md"));

describe("canonical stage catalog", () => {
  it("contains the ordered execution contract for every stage", () => {
    expect(catalog.version).toBe(2);
    expect(catalog.stages).toHaveLength(17);
    expect(catalog.stages.map((stage: { id: string }) => stage.id)).toEqual([
      "triage", "select", "setup", "context", "shape", "critique", "gate", "scope", "interface", "int-gate", "selection", "planning", "plan-gate", "execution", "verification", "diff-gate", "audit",
    ]);
    for (const stage of catalog.stages) {
      expect(stage.execution).toMatchObject({ mode: expect.any(String), required_capabilities: expect.any(Array), write_policy: expect.any(String), partition: expect.any(String) });
      expect(stage.phase).toBeTruthy();
      expect(stage.skill).toMatch(/^stelow-/);
    }
  });

  it("keeps intent routes and review skips inside the canonical graph", () => {
    const source = readFileSync(join(root, "skills/stelow-workflow-orchestrator/stages.yaml"), "utf8");
    const stageNames = [...source.matchAll(/^  - name: (\S+)/gm)].map((match) => match[1]);
    const routeBlocks = [...source.matchAll(/^    (new-product|feature|bugfix|refactor|investigate): \[(.*?)\]/gm)];
    for (const [, intent, route] of routeBlocks) {
      const stages = route.split(",").map((stage) => stage.trim());
      for (let index = 0; index < stages.length - 1; index += 1) {
        const block = source.slice(source.indexOf(`  - name: ${stages[index]}`), source.indexOf(`  - name: ${stages[index + 1]}`));
        expect(block, `${intent}: ${stages[index]} -> ${stages[index + 1]}`).toMatch(new RegExp(`\\[${stages[index + 1]}(?:,|\\])`));
      }
    }
    expect(stageNames).toHaveLength(17);
  });

  it("publishes routes instead of host-local stage lists", () => {
    expect(catalog.routes.intents.bugfix).toContain("audit");
    expect(catalog.routes.review_modes.Auto.skipped).toContain("plan-gate");
    expect(catalog.tools).toContain("visual_review");
  });

  it("makes execution metadata explicit for every skill and every recipe", () => {
    expect(skillFiles).toHaveLength(30);
    for (const file of skillFiles) {
      const frontmatter = readFileSync(file, "utf8").split("---")[1];
      expect(frontmatter, file).toMatch(/^\s*metadata:/m);
      expect(frontmatter, file).toMatch(/^\s*execution:/m);
    }
    expect(recipeCatalog.recipes.map((recipe: { id: string }) => recipe.id)).toEqual(expect.arrayContaining(["ux-critique", "codebase-critique", "scope-batch"]));
    expect(recipeCatalog.recipes.find((recipe: { id: string }) => recipe.id === "scope-batch").required_capabilities).toContain("file-claims");
  });
});
