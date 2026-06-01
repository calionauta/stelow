/**
 * sync-skills.ts — Pure functions for the skill auto-sync flow.
 *
 * Extracted from index.ts so they can be unit-tested without spinning up
 * the Pi extension runtime (and without mocking homedir / git).
 *
 * The sync flow (see `syncSkillsFromClone` in index.ts):
 *   1. Read git HEAD hash from the cloned project.
 *   2. If unchanged since last sync (marker file), no-op.
 *   3. Else: mirror active project skills → ~/.agents/skills/,
 *      and remove any local skill that is NOT active AND NOT retired.
 *
 * The "retired" allow-list is the user-facing knob: a skill listed in
 * skills/cali-product-workflow/retired-skills.yaml is preserved across
 * syncs even though it is no longer in the project, so its stale copy
 * on the user's machine can be cleaned up by future releases (or by
 * the same release, if combined with a delete).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

/**
 * Read retired-skills.yaml and return the set of skill names listed as
 * retired. Returns an empty set if the file is missing or malformed —
 * the sync must never break because of a broken YAML file.
 *
 * Only `name` is required on each entry; all other fields (retired_at,
 * reason, superseded_by, note) are documentation for humans and are
 * ignored by the sync logic.
 */
export function getRetiredSkillNames(cloneSkillsDir: string): Set<string> {
  const retiredFile = join(
    cloneSkillsDir,
    "cali-product-workflow",
    "retired-skills.yaml"
  );
  if (!existsSync(retiredFile)) return new Set();
  try {
    const doc = parseYaml(readFileSync(retiredFile, "utf8")) as
      | { retired?: Array<{ name?: unknown }> }
      | undefined;
    const names = new Set<string>();
    for (const entry of doc?.retired ?? []) {
      if (typeof entry?.name === "string" && entry.name.length > 0) {
        names.add(entry.name);
      }
    }
    return names;
  } catch {
    // Malformed YAML must NOT break the sync. The marker-hash fast
    // path will retry on the next session start.
    return new Set();
  }
}
