/**
 * `docs/cli.md`'s doctor row against the helper's actual findings.
 *
 * Why this exists: CAL-57 shipped an audit finding that was not about behavior at
 * all — the helper reference said "four classes" while `scripts/stelow` defined
 * thirteen. Nothing failed, so the drift surfaced only in an audit pass, and
 * closing it cost a build run, a verify run and a second diff gate (about 6M
 * tokens, eight minutes) to change two sentences.
 *
 * A count in prose that mirrors a count in code is a contract, and a contract with
 * no test is a claim. This suite makes the claim executable in both directions:
 * a class the code reports and the doc never names fails, and a class the doc
 * promises that the code never emits fails too.
 *
 * The parse is deliberately narrow — `add("<severity>", "<class>"` in the helper,
 * `` `class` `` followed by `(severity)` in the doc row — because a loose regex
 * here would pass on prose that merely mentions the same words.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = new URL("../..", import.meta.url).pathname;

function codeClasses(): Map<string, string> {
  const source = readFileSync(join(ROOT, "scripts/stelow"), "utf8");
  const found = new Map<string, string>();
  for (const match of source.matchAll(/add\(\s*"(error|warn|info)"\s*,\s*"([a-z0-9-]+)"/g)) {
    found.set(match[2], match[1]);
  }
  return found;
}

function docClasses(): Map<string, string> {
  const doc = readFileSync(join(ROOT, "docs/cli.md"), "utf8");
  const row = doc.split("\n").find((line) => line.startsWith("| `doctor` |"));
  if (!row) throw new Error("docs/cli.md has no `doctor` row");
  // Drop the leading cell: its `doctor` and the row's own prose are not classes.
  const body = row.split("|").slice(2).join("|");
  const found = new Map<string, string>();
  // "`a` / `b` (error)" — a chunk may name several classes that share a severity.
  for (const chunk of body.split(",")) {
    const severity = chunk.match(/\((error|warn|info)\)/);
    if (!severity) continue;
    for (const name of chunk.matchAll(/`([a-z0-9-]+)`/g)) {
      if (name[1].startsWith("-")) continue; // `--json` is a flag, not a finding
      found.set(name[1], severity[1]);
    }
  }
  return found;
}

describe("docs/cli.md names exactly the findings scripts/stelow emits", () => {
  it("documents every class the helper can report, with its severity", () => {
    const code = codeClasses();
    const doc = docClasses();
    expect(code.size).toBeGreaterThan(5);
    const undocumented = [...code].filter(([name]) => !doc.has(name));
    expect(undocumented).toEqual([]);
    const wrongSeverity = [...code]
      .filter(([name, severity]) => doc.has(name) && doc.get(name) !== severity)
      .map(([name, severity]) => `${name}: code=${severity} doc=${doc.get(name)}`);
    expect(wrongSeverity).toEqual([]);
  });

  it("promises no class the helper cannot report", () => {
    const code = codeClasses();
    const promisedWithoutCode = [...docClasses().keys()].filter((name) => !code.has(name));
    expect(promisedWithoutCode).toEqual([]);
  });
});
