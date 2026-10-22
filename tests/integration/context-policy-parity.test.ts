/**
 * The published matrix and the enforced gate must answer the same question.
 *
 * The context stage's matrix is what the LLM reads to decide whether to
 * run the stage; the helper's gate is what refuses the move. They used to
 * disagree in BOTH directions: the matrix skipped only for
 * experimental+Auto, while the helper skipped for a single direction too.
 * A worker that followed the policy was refused by the gate with no
 * redirect, and a worker that followed the gate ran a stage the policy
 * said to skip.
 *
 * The matrix is rendered from the policy in stages.yaml, so it cannot
 * drift from the source. What CAN still go wrong is the table itself: a
 * row that does not cover a combination, or two rows that read
 * differently to a person than they do to the helper. So this test reads
 * the matrix the way the LLM reads it — first matching row wins — and
 * compares its answer with the helper's, for every combination.
 */
import { describe, it, expect, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HELPER = join(REPO_ROOT, "scripts", "stelow");
const TRANSITIONS = join(REPO_ROOT, "skills", "stelow-workflow-orchestrator", "references", "transitions.md");
const CONTEXT_STAGE = join(REPO_ROOT, "skills", "stelow-workflow-orchestrator", "stages", "context.md");

const dirs: string[] = [];

afterAll(() => {
  for (const dir of dirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {}
  }
});

type Row = { condition: string; modes: string[]; level: "skip" | "reduced" | "full" };

/** The matrix, read the way the LLM reads it: rows, first match wins. */
function matrixRows(): Row[] {
  const text = readFileSync(CONTEXT_STAGE, "utf8");
  const begin = text.indexOf("<!-- stelow:policy:begin -->");
  const end = text.indexOf("<!-- stelow:policy:end -->");
  expect(begin, "the context stage carries a generated policy region").toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(begin);
  const rows: Row[] = [];
  for (const line of text.slice(begin, end).split("\n")) {
    const cells = line.split("|").map((cell) => cell.trim());
    if (cells.length < 5) continue;
    const [, condition, modeCell, context10] = cells;
    if (!condition || condition === "Condition" || /^-+$/.test(condition)) continue;
    const level = context10.startsWith("**Skip**")
      ? "skip"
      : context10.startsWith("**Reduced ask**")
        ? "reduced"
        : context10.startsWith("**Full ask**")
          ? "full"
          : null;
    expect(level, `the matrix cell does not name a known level: ${context10}`).not.toBeNull();
    const modes = modeCell === "any" ? ["*"] : [...modeCell.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    rows.push({ condition, modes, level: level as Row["level"] });
  }
  expect(rows.length, "the matrix has rows").toBeGreaterThan(0);
  return rows;
}

/** Does the row's condition hold for these knobs? */
function conditionHolds(condition: string, knobs: Record<string, string>): boolean {
  return condition.split(" or ").some((clause) => {
    const match = clause.match(/`([a-z_]+)` is `([^`]+)`/);
    if (!match) return false;
    return knobs[match[1]] === match[2];
  });
}

/** The level the matrix gives for one run. */
function levelFromMatrix(rows: Row[], knobs: Record<string, string>): Row["level"] | null {
  for (const row of rows) {
    const modeOk = row.modes.includes("*") || row.modes.includes(knobs.review_mode);
    if (modeOk && conditionHolds(row.condition, knobs)) return row.level;
  }
  return null;
}

/** The helper's own answer: does the context stage run from setup? */
function contextRunsInHelper(quality: string, count: string, mode: string): boolean {
  const dir = mkdtempSync(join(tmpdir(), "stelow-matrix-"));
  dirs.push(dir);
  execSync("git init -q", { cwd: dir });
  const stateDir = join(dir, ".stelow", "2026-01-01", "sw-x");
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(
    join(stateDir, "state.md"),
    [
      "---",
      "name: t",
      "intent: feature",
      "current_stage: setup",
      "status: active",
      "config:",
      `  quality: ${quality}`,
      `  exploration_count: ${count}`,
      `  review_mode: ${mode}`,
      "  product_type: software",
      "stages:",
      "  setup: in-progress",
      "artifacts: []",
      "history: []",
      "---",
      "# t",
      "",
    ].join("\n"),
  );
  const r = spawnSync("bash", [HELPER, "next", "--json"], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, PATH: process.env.PATH ?? "", STELOW_STATEDIR: stateDir, STELOW_TRANSITIONS: TRANSITIONS },
  });
  expect(r.status, r.stderr).toBe(0);
  const allowed = (JSON.parse(r.stdout) as { allowed: string[] }).allowed;
  return allowed.includes("context");
}

const QUALITIES = ["production", "experimental"];
const COUNTS = ["1", "2", "3", "5"];
const MODES = [
  "Auto",
  "Product Spec Gate",
  "Product Spec + Interface Gates",
  "Product Spec + Interface + Scopes",
  "Product Spec + Interface + Tech Review",
  "Product Spec + Interface + Tech Review + Code Diff",
];

describe("the published matrix and the enforced gate agree", () => {
  const rows = matrixRows();

  it("the rendered policy region matches the source", () => {
    const run = spawnSync(
      "python3",
      [join(REPO_ROOT, "scripts", "generate-stage-policies.py"), "--check"],
      { cwd: REPO_ROOT, encoding: "utf8" },
    );
    expect(run.status, run.stderr + run.stdout).toBe(0);
  });

  it.each(
    QUALITIES.flatMap((quality) =>
      COUNTS.flatMap((count) => MODES.map((mode) => [quality, count, mode] as const)),
    ),
  )("quality=%s count=%s mode=%s: the matrix and the gate decide the same", (quality, count, mode) => {
    const knobs = { quality, exploration_count: count, review_mode: mode };
    const level = levelFromMatrix(rows, knobs);
    expect(level, `the matrix covers no row for ${JSON.stringify(knobs)}`).not.toBeNull();
    const runsInHelper = contextRunsInHelper(quality, count, mode);
    if (level === "skip") {
      expect(runsInHelper, "the matrix skips the stage, so the gate must refuse it").toBe(false);
    } else {
      expect(runsInHelper, "the matrix runs the stage, so the gate must allow it").toBe(true);
    }
  });
});
