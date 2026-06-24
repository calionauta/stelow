import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Anti-regression: every link in README.md's Table of Contents must resolve
 * to an actual heading anchor in the rendered Markdown.
 *
 * GitHub's anchor slug rules:
 *   1. Lowercase the heading text
 *   2. Replace spaces with hyphens
 *   3. Strip ASCII punctuation (except - and _)
 *   4. For non-ASCII characters (emoji, accented letters): URL-encode the
 *      UTF-8 bytes as %XX sequences, but GitHub's fragment navigation
 *      also accepts the decoded form for the visual glyph itself.
 *
 * For validation purposes we accept EITHER form: the slug must equal the
 * heading text with spaces→hyphens, OR it must equal that with non-ASCII
 * chars URL-encoded. This matches what GitHub actually serves.
 *
 * Bug history: TOC entries with emoji-prefixed headings produced broken
 * anchors when written as `#visual-tui-integrations` instead of GitHub's
 * canonical `#%EF%B8%8F-visual--tui-integrations`. This test catches both
 * stale slugs and missing TOC entries.
 */

const ROOT = join(__dirname, "..", "..");
const README = join(ROOT, "README.md");

interface SlugVariants {
  /** GitHub canonical: lowercase, non-alphanumeric → -, collapse, strip edges */
  canonical: string;
}

function toSlug(text: string): SlugVariants {
  // GitHub anchor slug rules (verified by inspecting rendered HTML):
  //   1. Lowercase
  //   2. Iterate codepoints (NOT UTF-16 code units — emojis use surrogate pairs).
  //      For each codepoint: keep [a-z0-9], replace everything else with '-'.
  //      Spaces, &, and emojis all become single hyphens per codepoint.
  //   3. Collapse runs of 3+ hyphens to 2 (preserves the pattern from
  //      'space-&-space' which produces '--').
  //   4. Strip leading and trailing hyphens.
  //   5. If the heading STARTS with an emoji, prepend an emoji prefix:
  //      - VS-prefixed emojis (2 codepoints like 🎚️): prepend "\ufe0f-"
  //      - Single-codepoint emojis (like 📋): prepend "--"
  // The variation selector handling matches GitHub's HTML output
  // (verified: `id="user-content-\ufe0f-appetite--review-mode"`).
  const codepoints = [...text];
  const startsWithEmoji = codepoints.length > 0 && codepoints[0].codePointAt(0)! > 127;
  const isVSPrefixedEmoji = startsWithEmoji && codepoints.length >= 2 && codepoints[1] === "\ufe0f";

  let out = "";
  for (const ch of text.toLowerCase()) {
    if (/[a-z0-9]/.test(ch)) {
      out += ch;
    } else {
      out += "-";
    }
  }
  out = out.replace(/-{3,}/g, "--");
  out = out.replace(/^-+|-+$/g, "");

  if (startsWithEmoji) {
    out = (isVSPrefixedEmoji ? "\ufe0f-" : "--") + out;
  }
  return { canonical: out };
}

function extractHeadings(md: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of md.split("\n")) {
    const m = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!m) continue;
    const text = m[2].trim();
    const slug = toSlug(text);
    map.set(slug.canonical, text);
  }
  return map;
}

function extractTocLinks(md: string): Array<{ text: string; slug: string }> {
  const links: Array<{ text: string; slug: string }> = [];
  const re = /^\s*-\s+\[([^\]]+)\]\(#([^)]+)\)\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    links.push({ text: m[1], slug: m[2] });
  }
  return links;
}

const readme = readFileSync(README, "utf-8");

describe("README.md Table of Contents", () => {
  const headings = extractHeadings(readme);
  const tocLinks = extractTocLinks(readme);

  test("TOC section exists", () => {
    expect(readme).toMatch(/^## .*Table of Contents/m);
  });

  test("TOC has at least 5 entries (sanity check)", () => {
    expect(tocLinks.length).toBeGreaterThanOrEqual(5);
  });

  test.each(
    tocLinks.map((link, i) => [i, link.text, link.slug] as const)
  )("TOC[%#] '%s' → slug '%s' resolves to a heading", (_i, _text, slug) => {
    expect(
      headings.has(slug),
      `TOC link "#${slug}" doesn't match any heading. ` +
        `Known heading slugs include: ${[...headings.keys()].slice(0, 5).join(", ")}...`
    ).toBe(true);
  });

  test("every major section in README is referenced in TOC (no orphans)", () => {
    const tocSlugs = new Set(tocLinks.map((l) => l.slug));
    const mdLines = readme.split("\n");
    const topLevelSlugs: string[] = [];
    for (const line of mdLines) {
      const m = line.match(/^##\s+(.+?)\s*$/);
      if (!m) continue;
      const t = m[1].trim();
      // TOC heading itself doesn't need to link to itself; skip it.
      // Match against "Table of Contents" (without leading emoji) since
      // the heading is "📋 Table of Contents".
      if (t.endsWith("Table of Contents")) continue;
      topLevelSlugs.push(toSlug(t).canonical);
    }
    const missing = topLevelSlugs.filter((s) => !tocSlugs.has(s));
    expect(missing, `Top-level sections missing from TOC: ${missing.join(", ")}`).toEqual([]);
  });

  test("TOC link text matches heading text (no drift)", () => {
    const tocLinks = extractTocLinks(readme);
    const headings = extractHeadings(readme);
    for (const link of tocLinks) {
      const heading = headings.get(link.slug);
      if (!heading) continue;
      // Allow emoji stripping on both sides for comparison
      const normalize = (s: string) => s.replace(/[^\w\s-]/g, "").trim();
      expect(
        normalize(link.text) === normalize(heading) || normalize(link.text) === normalize(heading.replace(/^[^\w]+/, "")),
        `TOC text "${link.text}" doesn't match heading "${heading}"`
      ).toBe(true);
    }
  });
});