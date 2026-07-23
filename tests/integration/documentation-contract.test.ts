import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { PHASE_NAMES } from "../../extensions/stelow/types";
import { WORKFLOW_COMMANDS } from "../../extensions/stelow/adapters/commands/dispatcher";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(__filename), "..", "..");

const readDoc = (rel: string): string =>
  readFileSync(join(repoRoot, rel), "utf8");

const DOCS = {
  readme: readDoc("README.md"),
  architecture: readDoc("architecture.md"),
  agents: readDoc("AGENTS.md"),
} as const;

describe("documentation contract — v0.55.1 release surface", () => {
  it("exposes a stable PHASE_NAMES list of 17 phases ending at Audit", () => {
    expect(PHASE_NAMES).toHaveLength(17);
    expect(PHASE_NAMES[0]).toBe("Triage");
    expect(PHASE_NAMES.at(-1)).toBe("Audit");
  });

  it("exposes 19 WORKFLOW_COMMANDS and 16 non-piOnly descriptors for Fusion", () => {
    expect(WORKFLOW_COMMANDS).toHaveLength(19);
    const fusionCount = WORKFLOW_COMMANDS.filter((c) => !c.piOnly).length;
    expect(fusionCount).toBe(16);
    expect(WORKFLOW_COMMANDS.filter((c) => c.piOnly)).toHaveLength(3);
  });

  it("publishes correct command inventory: 19 Pi / 16 Fusion / 0 native generic", () => {
    const commandNames = WORKFLOW_COMMANDS.map((c) => c.name).join(", ");
    expect(DOCS.readme).toContain("19 descriptors");
    expect(DOCS.readme).toContain("16 non-`piOnly`");
    expect(DOCS.architecture).toMatch(/19 descriptors/);
    expect(DOCS.architecture).toMatch(/16 descriptors/);
    expect(DOCS.agents).toContain("19");
    expect(DOCS.agents).toContain("16");
    expect(commandNames.length).toBeGreaterThan(0);
  });

  it("documents 25 skills and 17 phases in all three guides", () => {
    expect(DOCS.readme).toMatch(/\b25 skills\b/);
    expect(DOCS.readme).toMatch(/\b17 (stages|phases)\b/);
    expect(DOCS.architecture).toMatch(/25\s+(portable\s+)?skills/);
    expect(DOCS.architecture).toMatch(/17[- ]?phase|17 stages|17-phase/);
    expect(DOCS.agents).toContain("25");
    expect(DOCS.agents).toContain("17");
  });

  it("lists the full 17-phase state machine in architecture.md", () => {
    const samplePhases = [
      "Triage",
      "ItemSelect",
      "Setup",
      "Context",
      "Shape",
      "Critique",
      "Gate",
      "Scope",
      "Interface",
      "Int.Gate",
      "Selection",
      "Planning",
      "Plan.Gate",
      "Execution",
      "Verification",
      "Diff.Gate",
      "Audit",
    ];
    for (const phase of samplePhases) {
      expect(DOCS.architecture).toContain(phase);
    }
  });

  it("documents host adapter ownership for Pi, Fusion, and generic", () => {
    for (const text of [DOCS.readme, DOCS.architecture, DOCS.agents]) {
      expect(text, "expected `adapters/pi/` ownership path").toMatch(/adapters\/pi\//);
      expect(text, "expected adapters/fusion.ts ownership path").toMatch(/adapters\/fusion\.ts/);
      expect(text, "expected adapters/generic.ts ownership path").toMatch(/adapters\/generic\.ts/);
    }
  });

  it("does not present Muxy or Herdr as a current in-tree integration", () => {
    for (const [name, text] of Object.entries(DOCS)) {
      // Active badges/install steps are gone; the only remaining mention is the
      // "removed in v0.55" migration note. Block active-parity language.
      expect(text, `${name} should not claim Muxy parser parity`).not.toMatch(
        /Muxy.*(?:parity|extension installed|plugin surface)/i,
      );
      expect(text, `${name} should not describe Herdr as a current install path`).not.toMatch(
        /herdr plugin install/i,
      );
    }
    // README must not present the Muxy/Herdr badges as current integrations.
    expect(DOCS.readme).not.toMatch(/Muxy]\(https:\/\/muxy\.app/);
    expect(DOCS.readme).not.toMatch(/Herdr]\(https:\/\/herdr\.dev/);
  });

  it("does not claim per-workflow index.json is canonical or generated", () => {
    for (const [name, text] of Object.entries(DOCS)) {
      expect(
        text,
        `${name} must not present per-workflow index.json as canonical state`,
      ).not.toMatch(/per-workflow[^.]*`?index\.json`?\s*is[^.]*canonical/i);
    }
    // README explicitly negates the claim.
    expect(DOCS.readme).toMatch(/no generated per-workflow `?index\.json`?/i);
  });

  it("does not present .plannotator/approvals/ as the portable canonical receipt", () => {
    for (const text of [DOCS.readme, DOCS.architecture, DOCS.agents]) {
      // The portable canonical path is .stelow/approvals/. Any sentence that
      // names .plannotator/approvals/ as "the canonical" or "the portable" path
      // is a regression. The path is allowed only as a Pi-only compatibility shim.
      expect(
        text,
        ".plannotator/approvals must not be presented as the canonical/portable path",
      ).not.toMatch(/\.plannotator\/approvals\/[^\n]*?\bis\b[^\n]*?\b(?:canonical|portable)\b[^\n]*?path/i);
    }
    expect(DOCS.readme).toMatch(/\.stelow\/approvals\/\{dirHash\}\/.*\.approved\.md/);
  });

  it("does not document nonexistent modules/cache.ts or CacheManager", () => {
    expect(DOCS.architecture).not.toMatch(/modules\/cache\.ts/);
    expect(DOCS.architecture).not.toMatch(/CacheManager/);
    expect(DOCS.architecture).not.toMatch(/cmdTodo/);
  });

  it("does not present the 15-command table or 15 pi-native count", () => {
    expect(DOCS.readme).not.toMatch(/All 15 commands/);
    expect(DOCS.readme).not.toMatch(/`\/sw-\*` slash commands \(15\)/);
  });

  it("AGENTS.md requires post-version-sync Fusion prepare/build and forbids npm publish", () => {
    expect(DOCS.agents).toMatch(/npm run prepare:fusion-plugin/);
    expect(DOCS.agents).toMatch(/npm run build:fusion-plugin/);
    expect(DOCS.agents).toMatch(/no\s+`?npm publish`?/i);
    expect(DOCS.agents).toMatch(/six-point version agreement/);
  });

  it("AGENTS.md points stage/command counts to their canonical sources", () => {
    expect(DOCS.agents).toContain("PHASE_NAMES");
    expect(DOCS.agents).toContain("WORKFLOW_COMMANDS");
    expect(DOCS.agents).toContain("stages.yaml");
  });

  it("architecture.md and README do not promote a pre-v0.53 CacheManager or stage table", () => {
    expect(DOCS.architecture).not.toMatch(/15-stage|15 phase/);
    expect(DOCS.architecture).not.toMatch(/Gate never skips/i);
  });
});

describe("markdown link integrity in core documentation", () => {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const allowedSchemes = ["http://", "https://", "mailto:"];

  for (const [docName, docText] of Object.entries(DOCS)) {
    it(`validates every relative link in ${docName}`, () => {
      const matches = Array.from(docText.matchAll(linkRegex));
      for (const match of matches) {
        const target = match[2].trim();
        // Skip external/anchor links; validate only repo-relative paths.
        if (
          target.startsWith("#") ||
          allowedSchemes.some((scheme) => target.startsWith(scheme))
        ) {
          continue;
        }
        const cleanPath = target.split("#")[0].split("?")[0];
        expect(cleanPath.length, `empty target in ${docName}`).toBeGreaterThan(0);
        const abs = resolve(repoRoot, cleanPath);
        const rel = relative(repoRoot, abs);
        expect(rel, `link must stay inside the repo: ${target} in ${docName}`).not.toMatch(/^\.\./);
        const ok = existsSync(abs);
        const isDir = ok && statSync(abs).isDirectory();
        // Allow either an existing file or directory; README often links docs/design/ etc.
        const fileOk =
          ok &&
          (isDir ||
            abs.endsWith(".md") ||
            abs.endsWith(".markdown") ||
            abs.endsWith(".json") ||
            abs.endsWith(".ts") ||
            abs.endsWith(".tsx") ||
            abs.endsWith(".mjs") ||
            abs.endsWith(".cjs") ||
            abs.endsWith(".js") ||
            abs.endsWith(".sh") ||
            abs.endsWith(".bash") ||
            abs.endsWith(".yaml") ||
            abs.endsWith(".yml") ||
            abs.endsWith(".toml") ||
            abs.endsWith(".svg") ||
            abs.endsWith(".png") ||
            abs.endsWith(".jpg"));
        expect(
          fileOk || isDir,
          `broken link in ${docName}: ${target} → ${rel} (file=${fileOk}, dir=${isDir})`,
        ).toBe(true);
      }
    });

    it(`does not mistake external/anchor links for local paths in ${docName}`, () => {
      const matches = Array.from(docText.matchAll(linkRegex));
      const externals = matches.filter((m) =>
        allowedSchemes.some((scheme) => m[2].trim().startsWith(scheme)),
      );
      expect(externals.length, `expected at least one external link in ${docName}`).toBeGreaterThan(0);
      for (const ext of externals) {
        const target = ext[2].trim();
        expect(existsSync(resolve(repoRoot, target.split("#")[0]))).toBe(false);
      }
    });
  }
});

describe("documentation contract edge cases and boundaries", () => {
  it("rejects empty/blank phase names in PHASE_NAMES", () => {
    expect(PHASE_NAMES.some((p) => typeof p !== "string" || p.length === 0)).toBe(false);
    for (const gate of ["Gate", "Int.Gate", "Plan.Gate", "Diff.Gate"]) {
      expect(PHASE_NAMES, `PHASE_NAMES must include conditional review gate: ${gate}`).toContain(gate);
    }
  });

  it("rejects malformed WORKFLOW_COMMANDS descriptors (bad name shape, dual piOnly values)", () => {
    for (const cmd of WORKFLOW_COMMANDS) {
      expect(typeof cmd.name).toBe("string");
      expect(cmd.name).toMatch(/^sw-[a-z0-9-]+$/);
      if (cmd.piOnly !== undefined) expect(cmd.piOnly).toBe(true);
    }
  });

  it("Fusion command set is exactly 16 unique descriptors", () => {
    const fusionNames = WORKFLOW_COMMANDS.filter((c) => !c.piOnly).map((c) => c.name);
    expect(fusionNames).toHaveLength(16);
    expect(new Set(fusionNames).size).toBe(fusionNames.length);
  });

  it("rejects the historical Muxy/Herdr active-install patterns in the README", () => {
    const forbidden = [
      /Muxy]\(https:\/\/muxy\.app/,
      /Herdr]\(https:\/\/herdr\.dev/,
      /herdr plugin install/i,
    ];
    for (const pattern of forbidden) {
      expect(DOCS.readme, `forbidden README pattern: ${pattern}`).not.toMatch(pattern);
    }
  });

  it("link regex captures Markdown link syntax and ignores plain URLs", () => {
    const sample = "see [docs](docs/INSTALLATION.md) and [repo](https://example.com)";
    const captured = Array.from(sample.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)).map((m) => m[2]);
    expect(captured).toEqual(["docs/INSTALLATION.md", "https://example.com"]);
    const plain = "INSTALLATION.md is at https://example.com";
    expect(Array.from(plain.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g))).toHaveLength(0);
  });
});
