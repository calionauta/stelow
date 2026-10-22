/**
 * The generated catalogs are the artifacts a host consumes.
 *
 * `skills/stelow-workflow-orchestrator/stage-catalog.json` and
 * `recipe-catalog.json` are generated from `stages.yaml` and `recipes/*.yaml`.
 * A test that reads the COMMITTED catalog validates stale data silently: the
 * catalog is a copy, and the copy is what the test looks at. The transitions
 * mirror had this test from the start; the two catalogs did not, so
 * `npm test` passed on a catalog that no longer matched its source and only
 * CI (which runs `verify:generated`) caught it.
 *
 * These tests run the real generators with `--check` against the real tree.
 * No mocks.
 */
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const GENERATORS = [
  { script: "generate-stage-catalog.py", artifact: "skills/stelow-workflow-orchestrator/stage-catalog.json" },
  { script: "generate-recipe-catalog.py", artifact: "skills/stelow-workflow-orchestrator/recipe-catalog.json" },
];

describe("catalog generators", () => {
  it.each(GENERATORS)("$script output is byte-identical to the committed $artifact", ({ script, artifact }) => {
    const run = spawnSync("python3", [join(REPO_ROOT, "scripts", script), "--check"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
    expect(run.status, run.stderr || run.stdout).toBe(0);
  });

  it("the recipe catalog is never empty", () => {
    // The generator refuses to publish an empty catalog, and the check mode
    // refuses to accept one. A host that reads an empty catalog finds no
    // recipe for any stage and runs none, with every gate green.
    const run = spawnSync("python3", [join(REPO_ROOT, "scripts", "generate-recipe-catalog.py"), "--check"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("ok");
  });
});
