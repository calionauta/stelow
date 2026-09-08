/**
 * Skill link integrity: every relative markdown link inside skills/ must
 * resolve on disk — in the repo layout, the flat hub layout
 * (~/.agents/skills/<skill>/...), and the bb-plugin vendored tree.
 *
 * Skips: http(s) URLs, pure #anchors, glob patterns (*), template
 * placeholders ({...}), and bare directory links.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, normalize } from "node:path";

const SKILLS_ROOT = join(process.cwd(), "skills");

function markdownFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const p = join(root, entry.name);
    if (entry.isDirectory()) out.push(...markdownFiles(p));
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function extractLinks(content: string): string[] {
  const found: string[] = [];
  // Strip fenced code blocks: commands and snippets, not navigable links.
  const prose = content.replace(/```[\s\S]*?```/g, "");
  // Pass 1: markdown links — first, so pass 2 cannot swallow them.
  const withoutLinks = prose.replace(/\]\(([^)]+)\)/g, (_whole, target: string) => {
    found.push(target);
    return " ";
  });
  // Pass 2: backticked paths.
  const re = /`([^`]*?(?:refs|references|skills|stages)\/[^`]*?)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(withoutLinks)) !== null) {
    found.push(m[1]);
  }
  return found;
}

function isCheckable(raw: string): boolean {
  const target = raw.split("#")[0].trim();
  if (!target) return false;
  if (/^https?:\/\//i.test(target)) return false;
  if (/[*{}]/.test(target)) return false;
  if (!target.endsWith(".md")) return false;
  return true;
}

describe("skill internal links resolve", () => {
  const files = markdownFiles(SKILLS_ROOT);
  expect(files.length).toBeGreaterThan(0);

  it("every relative .md link resolves from its own file", () => {
    const broken: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const raw of extractLinks(content)) {
        if (!isCheckable(raw)) continue;
        const target = raw.split("#")[0].trim();
        // Repo-absolute (skills/...) links break standalone installs;
        // they are tracked separately below, not as resolvable here.
        if (target.startsWith("skills/")) continue;
        const resolved = normalize(join(dirname(file), target));
        try {
          if (!statSync(resolved).isFile()) broken.push(`${file} -> ${raw}`);
        } catch {
          broken.push(`${file} -> ${raw}`);
        }
      }
    }
    expect(broken, `broken links:\n${broken.join("\n")}`).toEqual([]);
  });

  it("no repo-absolute skills/... links (break hub-flat installs)", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      const prose = content.replace(/```[\s\S]*?```/g, "");
      for (const m of prose.matchAll(/[`(](skills\/[^\s)`]+)/g)) {
        if (m[1].endsWith(".md")) offenders.push(`${file} -> ${m[1]}`);
      }
    }
    expect(offenders, `repo-absolute links:\n${offenders.join("\n")}`).toEqual([]);
  });
});
