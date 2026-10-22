/**
 * The standalone alternatives recipes are aliases of the canonical stage
 * recipes' first tasks.
 *
 * Why the copy exists: a host runs ONE recipe per stage, chosen by
 * `stage.execution.recipe`, so the alternatives tasks had to move INTO
 * `interface-contrast` / `architecture-contrast` for the gate to see the
 * proposals. The standalone recipes stay as entry points for Explore runs and
 * direct use, where a card names a recipe by id rather than by stage.
 *
 * The bug this catches: someone edits the gate's pipeline — adds a task,
 * changes an output, tightens `when` — and the standalone copy keeps running
 * the old shape. The divergence is silent: both recipes still run, both still
 * produce plausible files, and only the output of one reaches the review. That
 * is exactly how the alternatives pipeline got orphaned once already.
 *
 * Compared through the generated recipe catalog (JSON) rather than by parsing
 * YAML here: the catalog is regenerated from the recipes in CI
 * (`verify:generated`), so it is the same data without a second YAML parser.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const catalog = JSON.parse(
  readFileSync(join(process.cwd(), "skills/stelow-workflow-orchestrator/recipe-catalog.json"), "utf8"),
);
const byId = new Map<string, { id: string; tasks: { id: string }[] }>(
  catalog.recipes.map((recipe: { id: string }) => [recipe.id, recipe]),
);

describe.each(["interface", "architecture"])("%s alternatives recipe", (name) => {
  const alias = byId.get(`${name}-alternatives`);
  const canonical = byId.get(`${name}-contrast`);

  it("exists alongside its canonical recipe", () => {
    expect(alias, `${name}-alternatives recipe missing`).toBeTruthy();
    expect(canonical, `${name}-contrast recipe missing`).toBeTruthy();
  });

  it("is the canonical recipe's diverge head, task for task", () => {
    // The alias must be a PREFIX of the canonical pipeline, not a superset:
    // the canonical recipe continues with the decide/contrast tasks, and the
    // alias stops before them by design.
    const aliasTasks = alias?.tasks ?? [];
    const head = (canonical?.tasks ?? []).slice(0, aliasTasks.length);
    expect(aliasTasks.map((task) => task.id)).toEqual(["alternatives", "alternatives-verify", "alternatives-hybrid"]);
    expect(aliasTasks).toEqual(head);
  });

  it("does not own the decision tasks", () => {
    // A standalone run explores; it does not record a decision. If a contrast
    // task ever appears here, two recipes would write the same receipt.
    const ids = (alias?.tasks ?? []).map((task) => task.id);
    expect(ids.some((id) => id.includes("contrast") || id.includes("select"))).toBe(false);
  });
});
