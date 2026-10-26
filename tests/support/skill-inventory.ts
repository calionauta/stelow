/**
 * Single source of truth for counting skills in tests.
 *
 * The skill counts (32, then 34, then 38...) were hardcoded in three separate
 * test files, so every time a skill was added the same number had to be
 * updated in six places from memory. Forgetting one produced a failure that
 * looked like a broken contract rather than a stale constant.
 *
 * These helpers derive the numbers from disk. A test that asserts `counts.total`
 * is really asserting "the README agrees with the filesystem", which is the
 * contract that matters. The literal numbers only belong where the point of the
 * test IS a fixed expected count.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const WORKFLOW_PREFIX = "stelow-workflow-";
export const PRODUCT_PREFIX = "stelow-product-";

/** Directory names under `skillsRoot` with the given prefix that contain a SKILL.md. */
export function skillDirsWithPrefix(skillsRoot: string, prefix: string): string[] {
  return readdirSync(skillsRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith(prefix))
    .map((e) => e.name)
    .filter((name) => existsSync(join(skillsRoot, name, "SKILL.md")))
    .sort();
}

export interface SkillCounts {
  workflow: string[];
  product: string[];
  total: number;
}

/** Every skill the README is expected to list, derived from the filesystem. */
export function skillCounts(skillsRoot: string): SkillCounts {
  const workflow = skillDirsWithPrefix(skillsRoot, WORKFLOW_PREFIX);
  const product = skillDirsWithPrefix(skillsRoot, PRODUCT_PREFIX);
  return { workflow, product, total: workflow.length + product.length };
}

/** Relative paths (`stelow-.../SKILL.md`) for every skill, derived from disk. */
export function skillSourcePaths(skillsRoot: string): string[] {
  const { workflow, product } = skillCounts(skillsRoot);
  return [...workflow, ...product].map((d) => `${d}/SKILL.md`);
}
