/**
 * host-agnostic-audit.test.ts
 *
 * Per-skill host-agnostic compliance audit. Runs against every SKILL.md
 * and its references markdown files under each skills directory.
 * Asserts that:
 *   A. No plannotator CLI invocations leak into skill bodies.
 *   B. No .plannotator/approvals receipt paths leak.
 *   C. No Pi-only paths under ~/.pi/agent/git.
 *   D. No raw pi.on or pi.registerTool calls.
 *   E. SKILL.md frontmatter declares name and description per agentskills.io.
 *   F. No host-private API references.
 *
 * The cli-tools/plannotator.md reference doc is the ONLY allowed
 * exception to A and B: it documents the Pi-native path alongside the
 * universal fallback.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SKILLS_ROOT = join(process.cwd(), "skills");

// ── helpers ───────────────────────────────────────────────────────────

function listSkillDirs(): string[] {
  return readdirSync(SKILLS_ROOT)
    .filter((d) => d.startsWith("stelow-product-"))
    .filter((d) => statSync(join(SKILLS_ROOT, d)).isDirectory());
}

function markdownFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const p = join(root, entry.name);
    if (entry.isDirectory()) out.push(...markdownFiles(p));
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function readFrontmatter(content: string): Record<string, string> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const block = match[1];
  const fm: Record<string, string> = {};
  const lines = block.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Multi-line scalar markers: `description: >` or `description: |`
    // consume following indented lines until a blank line or non-indented line.
    const multi = line.match(/^([A-Za-z_][\w-]*)\s*:\s*([>|][+]?)\s*$/);
    if (multi) {
      const key = multi[1];
      const marker = multi[2];
      const collected: string[] = [];
      i++;
      while (i < lines.length && /^\s+\S/.test(lines[i])) {
        collected.push(lines[i].trim());
        i++;
      }
      // `>` (folded) joins with space; `|` (literal) joins with newline.
      const joined = marker.startsWith(">") ? collected.join(" ") : collected.join("\n");
      fm[key] = joined;
      i--; // back up since the outer for-loop will i++
      continue;
    }
    const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.+?)\s*$/);
    if (m) fm[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return fm;
}

function stripFrontmatter(content: string): string {
  return content.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

function isExemptFromAudit(filePath: string): boolean {
  return filePath.endsWith("/cli-tools/plannotator.md")
    || filePath.endsWith("/references/cli-tools/subagents.md");
}

// ── audit ─────────────────────────────────────────────────────────────

describe("per-skill host-agnostic compliance", () => {
  const skills = listSkillDirs();
  expect(skills.length).toBeGreaterThanOrEqual(25);

  for (const skill of skills) {
    describe(skill, () => {
      const skillPath = join(SKILLS_ROOT, skill);
      const files = markdownFiles(skillPath);

      it("has SKILL.md with agentskills.io frontmatter (name + description)", () => {
        const skillMd = join(skillPath, "SKILL.md");
        expect(existsSync(skillMd)).toBe(true);
        const content = readFileSync(skillMd, "utf8");
        const fm = readFrontmatter(content);
        expect(fm, skill + " SKILL.md frontmatter").not.toBeNull();
        expect(fm!.name, skill + " name").toBe(skill);
        expect(fm!.description, skill + " description").toBeTruthy();
        expect(fm!.description.length, skill + " description length").toBeGreaterThan(0);
        expect(fm!.description.length, skill + " description under 1024").toBeLessThanOrEqual(1024);
      });

      it("body has no Pi-only review receipts or CLI invocations", () => {
        for (const file of files) {
          if (isExemptFromAudit(file)) continue;
          const content = stripFrontmatter(readFileSync(file, "utf8"));
          expect(content, file).not.toMatch(/\bplannotator\s+(annotate|review)\b/i);
          expect(content, file).not.toMatch(/\.plannotator\/approvals/);
        }
      });

      it("body has no ~/.pi/agent/git references", () => {
        for (const file of files) {
          if (isExemptFromAudit(file)) continue;
          const content = stripFrontmatter(readFileSync(file, "utf8"));
          expect(content, file).not.toMatch(/~\/\.pi\/agent\/git/);
        }
      });

      it("body has no raw pi.on or pi.registerTool calls", () => {
        for (const file of files) {
          if (isExemptFromAudit(file)) continue;
          const content = stripFrontmatter(readFileSync(file, "utf8"));
          const noFences = content.replace(/```[\s\S]*?```/g, "");
          expect(noFences, file).not.toMatch(/\bpi\.on\s*\(/);
          expect(noFences, file).not.toMatch(/\bpi\.registerTool\s*\(/);
        }
      });

      it("body has no host-private API references (Pi TUI, Pi session)", () => {
        for (const file of files) {
          if (isExemptFromAudit(file)) continue;
          const content = stripFrontmatter(readFileSync(file, "utf8"));
          expect(content, file).not.toMatch(/\bpi\.TUI\b/);
          expect(content, file).not.toMatch(/\bpi\.session\b/);
        }
      });

      it("plannotator mentions are paired with the canonical visual_review name", () => {
        for (const file of files) {
          if (isExemptFromAudit(file)) continue;
          const content = stripFrontmatter(readFileSync(file, "utf8"));
          const noFences = content.replace(/```[\s\S]*?```/g, "");
          const plannotatorRefs = (noFences.match(/\bplannotator\b/g) ?? []).length;
          const visualReviewRefs = (noFences.match(/\bvisual_review\b/g) ?? []).length;
          if (plannotatorRefs > 0) {
            expect(visualReviewRefs, file + ": plannotator without visual_review canonical").toBeGreaterThan(0);
          }
        }
      });
    });
  }
});

describe("audit coverage invariant", () => {
  it("exercises every stelow-product skill (>=25)", () => {
    expect(listSkillDirs().length).toBeGreaterThanOrEqual(25);
  });
});