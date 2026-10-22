/**
 * Recipe-graph invariants, checked against the generated catalog.
 *
 * A recipe task can be conditional (`when: exploration_supports_fanout`,
 * `ui_scope_present`, ...). The host renders the recipe so that a skipped task
 * also skips every task that depends on it (`deps.some(skipped)`), which is
 * the correct cascade: a consumer whose input was never produced cannot run.
 *
 * That makes ONE shape wrong, and it has now shipped twice:
 *
 *   an unconditional task depending on a conditional one
 *
 * The dependent says "always", but the cascade may still skip it. It happened
 * to the interface/architecture contrast recipes (the proposal task was gated
 * on fan-out, so breadth 1 skipped the whole decide chain — the stage ran zero
 * tasks) and to verification's report (gated on the optional UI review, so a
 * non-UI project silently lost its only human-readable artifact).
 *
 * This is the invariant, not a list of known cases: any task that must run has
 * to depend only on tasks that also must run. The recipe is the single source
 * of the graph; this test reads the generated catalog so a hand-edit to the
 * YAML cannot pass by being checked through a stale copy.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const catalog = JSON.parse(
  readFileSync(join(process.cwd(), "skills/stelow-workflow-orchestrator/recipe-catalog.json"), "utf8"),
);

type Task = { id: string; when?: string; depends_on?: string[] };
const recipes: { id: string; tasks: Task[] }[] = catalog.recipes;
const always = (task: Task) => (task.when ?? "always") === "always";

describe("every recipe can run something under any breadth", () => {
  it.each(recipes.map((recipe) => [recipe.id, recipe] as const))("%s has an unconditional task", (_id, recipe) => {
    // A recipe whose every task is conditional collapses to zero work under
    // the context that turns them all off — the host refuses it, and it is a
    // dead stage either way.
    expect(recipe.tasks.some(always), `${recipe.id} has at least one unconditional task`).toBe(true);
  });
});

describe("no unconditional task depends on a conditional one", () => {
  it.each(recipes.map((recipe) => [recipe.id, recipe] as const))("%s respects the cascade", (id, recipe) => {
    const conditional = new Set(recipe.tasks.filter((task) => !always(task)).map((task) => task.id));
    const violations = recipe.tasks
      .filter(always)
      .flatMap((task) =>
        (task.depends_on ?? [])
          .filter((dependency) => conditional.has(dependency))
          .map((dependency) => `${task.id} -> ${dependency}`),
      );
    expect(violations, `${id} has an always-task behind a conditional one`).toEqual([]);
  });
});

describe("the two regressions that shipped", () => {
  it("the contrast recipes generate proposals at every breadth", () => {
    // Breadth controls the COUNT of proposals, never whether they happen.
    for (const id of ["interface-contrast", "architecture-contrast"]) {
      const recipe = recipes.find((candidate) => candidate.id === id);
      const producer = recipe?.tasks.find((task) => task.id === "alternatives");
      expect(producer, `${id} has a proposals task`).toBeTruthy();
      expect(always(producer as Task), `${id} proposals run at breadth 1`).toBe(true);
    }
  });

  it("verification's report does not wait on the optional UI review", () => {
    const recipe = recipes.find((candidate) => candidate.id === "verification");
    const report = recipe?.tasks.find((task) => task.id === "verification-report");
    expect(report?.depends_on ?? []).not.toContain("ui-review");
  });
});
