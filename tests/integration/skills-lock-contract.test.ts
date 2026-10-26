/**
 * skills-lock.json is the distribution manifest: it declares which skills
 * `npx skills add calionauta/stelow` installs. It is a hand-kept file with no
 * generator, so nothing caught it drifting when skills were added or renamed.
 *
 * Four skills had been missing from it — three workflow skills added with the
 * architecture stage and one product skill with the scope-mapping method. The
 * lockfile still validated as JSON and still listed plausible names, so the
 * omission was invisible until someone diffed it against the disk by hand.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SKILLS_ROOT = join(process.cwd(), "skills");
const LOCKFILE = join(process.cwd(), "skills-lock.json");

const SCOPE_PREFIX: Record<string, string> = {
  workflow: "stelow-workflow-",
  product: "stelow-product-",
};

function skillDirsOnDisk(): string[] {
  return readdirSync(SKILLS_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith("stelow-"))
    .map((e) => e.name);
}

describe("skills-lock.json matches the skills on disk", () => {
  const lock = JSON.parse(readFileSync(LOCKFILE, "utf8")) as {
    scopes: Record<string, { skills: string[] }>;
  };
  const onDisk = skillDirsOnDisk();

  it("declares every stelow skill directory, with none invented", () => {
    const declared = Object.values(lock.scopes).flatMap((s) => s.skills);
    expect(
      [...new Set(declared)].sort(),
      "skills-lock.json and skills/ disagree — a drift here means `npx skills add` ships the wrong set",
    ).toEqual([...onDisk].sort());
  });

  it("has no skill listed twice across scopes", () => {
    const declared = Object.values(lock.scopes).flatMap((s) => s.skills);
    expect(declared.length).toBe(new Set(declared).size);
  });

  it("keeps every skill in the scope matching its prefix", () => {
    for (const [scope, entry] of Object.entries(lock.scopes)) {
      const prefix = SCOPE_PREFIX[scope];
      expect(prefix, `unknown scope "${scope}" — add its prefix to SCOPE_PREFIX`).toBeDefined();
      const misfiled = entry.skills.filter((s) => !s.startsWith(prefix));
      expect(misfiled, `scope "${scope}" holds skills that do not start with "${prefix}"`).toEqual([]);
    }
  });
});
