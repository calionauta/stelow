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

// SW-017: scope parser + lifecycle gap document contract.
// The Muxy integration tree was removed in v0.55 and SW-002. The
// `parseSpecTechScopes` JSDoc must not direct maintainers to update a
// mirror that no longer exists, and `docs/scope-lifecycle-gaps.md` must
// describe the single canonical TypeScript parser + `wf.specTechFile`
// version-aware re-sync contract.
const SW017_SURFACES = {
  stateTs: readDoc("extensions/stelow/state.ts"),
  scopeGaps: readDoc("docs/scope-lifecycle-gaps.md"),
} as const;

describe("documentation contract — v0.55.1 release surface", () => {
  it("exposes a stable PHASE_NAMES list of 17 phases ending at Audit", () => {
    expect(PHASE_NAMES).toHaveLength(17);
    expect(PHASE_NAMES[0]).toBe("Triage");
    expect(PHASE_NAMES.at(-1)).toBe("Audit");
  });

  it("exposes 16 WORKFLOW_COMMANDS in the host-agnostic registry (post-v0.57.0)", () => {
    // v0.57.0: sw-inbox + sw-pulse removed (with Pulse/Inbox/Provenance).
    // sw-unlock is no longer in WORKFLOW_COMMANDS — it is a Pi-local
    // descriptor in extensions/stelow/adapters/pi/commands.ts.
    expect(WORKFLOW_COMMANDS).toHaveLength(16);
    const fusionCount = WORKFLOW_COMMANDS.filter((c) => !c.piOnly).length;
    expect(fusionCount).toBe(16);
    expect(WORKFLOW_COMMANDS.filter((c) => c.piOnly)).toHaveLength(0);
  });

  it("publishes correct command inventory: 17 Pi / 16 agnostic / 0 native generic", () => {
    const commandNames = WORKFLOW_COMMANDS.map((c) => c.name).join(", ");
    // Pi gets all 16 agnostic + sw-unlock (Pi-local) = 17.
    expect(DOCS.readme).toMatch(/16 .*agnostic|16 descriptors|16 commands/);
    expect(DOCS.readme).toMatch(/\*\*Pi\*\*\s+registers all (16|17)/);
    expect(DOCS.architecture).toMatch(/16 descriptors|16 agnostic|17 descriptors/);
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

  it("AGENTS.md documents the SW-034 Release-Bump/Rollback trailer contract", () => {
    // Both trailer regex patterns must appear in AGENTS.md §"Versioning".
    // The patterns are documented with simpler invariants than the shell
    // regexes themselves (which use POSIX character classes); a substring
    // match against the canonical example is sufficient to pin the
    // contract.
    expect(DOCS.agents).toMatch(/Release-Bump: v<X\.Y\.Z>/);
    expect(DOCS.agents).toMatch(/Rollback: v<X\.Y\.Z> → v<A\.B\.C> — <reason>/);
    // Mandatory-reason rule for `Rollback:`.
    expect(DOCS.agents).toMatch(/mandatory/i);
    expect(DOCS.agents).toMatch(/non-empty reason/i);
    // Pointer to the post-mortem that motivated the contract.
    expect(DOCS.agents).toMatch(/v0\.55\.2-release-drift\.md/);
    // Pointer to the canonical changeset template.
    expect(DOCS.agents).toMatch(/sw-034-version-coherence-guard\.md/);
    // Release-bump trailer invocation in step 6 of the full release workflow.
    expect(DOCS.agents).toMatch(/Release-Bump: v<version>/);
  });

  it("AGENTS.md documents the SW-036 dist-skills-drift CI guard (post-build runtime check)", () => {
    // The §"Versioning" section must pin all four substrings below. Removing
    // any one of them silently regresses the runtime drift guard because the
    // post-mortem reference, the script name, the const name, and the
    // historical-miss rationale (0.54.3) collectively pin the contract.
    expect(DOCS.agents).toContain("check-dist-skills-drift.sh");
    expect(DOCS.agents).toContain("STELOW_PLUGIN_VERSION");
    expect(DOCS.agents).toContain(
      "docs/agents-md-refs/post-mortems/v0.55.2-release-drift.md",
    );
    expect(DOCS.agents).toContain("0.54.3");

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

  it("rejects malformed WORKFLOW_COMMANDS descriptors (bad name shape)", () => {
    // v0.57.0: WORKFLOW_COMMANDS is fully host-agnostic — no piOnly flags.
    for (const cmd of WORKFLOW_COMMANDS) {
      expect(typeof cmd.name).toBe("string");
      expect(cmd.name).toMatch(/^sw-[a-z0-9-]+$/);
      expect(cmd.piOnly, `${cmd.name}: WORKFLOW_COMMANDS is host-agnostic; piOnly descriptors belong in adapters/pi/commands.ts`).toBeUndefined();
    }
  });

  it("Fusion command set is exactly 16 unique descriptors (post-v0.57.0)", () => {
    // v0.57.0: all 16 host-agnostic descriptors emit to Fusion (no piOnly filter).
    const fusionNames = WORKFLOW_COMMANDS.map((c) => c.name);
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

describe("scope parser + lifecycle gap document contract (SW-017)", () => {
  // Capture the exact `parseSpecTechScopes` JSDoc block (the comment that
  // immediately precedes the export function declaration). Using a bounded
  // capture keeps the contract focused on that single maintenance surface
  // and avoids accidental matches elsewhere in the file.
  const parseJsdocMatch = SW017_SURFACES.stateTs.match(
    /\/\*\*\n([\s\S]*?\n \*\/)\nexport function parseSpecTechScopes/,
  );
  const parseJsdoc = parseJsdocMatch ? parseJsdocMatch[1] : "";
  const stateTsLength = SW017_SURFACES.stateTs.length;

  it("captures the parseSpecTechScopes JSDoc block (test fixture sanity)", () => {
    expect(parseJsdoc, "parseSpecTechScopes JSDoc block must be parseable").not.toBe("");
    expect(parseJsdoc).toMatch(/Parse \[SCOPE-N\] blocks/);
    expect(stateTsLength).toBeGreaterThan(parseJsdoc.length);
  });

  it("does not direct maintainers to update a removed Muxy/data.js mirror", () => {
    // The retired Muxy JS mirror path. If this assertion ever fails, the
    // obsolete "update the mirror in data.js" instruction has resurfaced.
    expect(parseJsdoc).not.toMatch(/mirror in `?data\.js`?/i);
    expect(parseJsdoc).not.toMatch(/update the mirror in data\.js/i);
    expect(parseJsdoc).not.toMatch(/vice versa/i);
  });

  it("does not claim Node TS and an Electron sandbox share/duplicate parser code", () => {
    expect(parseJsdoc).not.toMatch(/Electron sandbox/i);
    expect(parseJsdoc).not.toMatch(/two runtimes/i);
    expect(parseJsdoc).not.toMatch(/cannot share code/i);
  });

  it("identifies parseSpecTechScopes as the canonical, filesystem-free parser", () => {
    // Positive wording: the JSDoc must name the parser and mark it as the
    // sole implementation that callers should treat as canonical.
    expect(parseJsdoc).toMatch(/canonical parser/i);
    expect(parseJsdoc).toMatch(/Pure function\. No filesystem access\./);
  });

  it("documents the wf.specTechFile version-aware re-sync contract", () => {
    // The JSDoc must point maintainers at the typed specTechFile field and
    // describe the re-sync semantics, not the old "idempotent / only
    // triggers when scopes are empty" wording from the gap document.
    expect(parseJsdoc).toMatch(/`?wf\.specTechFile`?/);
    expect(parseJsdoc).toMatch(/re-sync|resync|reparse|re-parse/i);
    expect(parseJsdoc).not.toMatch(/only triggers when scopes are empty/i);
  });

  it("does not mention syncScopesForTracking or updateable data.js in the gap document", () => {
    // The gap document must not point at the deleted JS mirror function.
    expect(SW017_SURFACES.scopeGaps).not.toMatch(/syncScopesForTracking/);
    expect(SW017_SURFACES.scopeGaps).not.toMatch(/`?data\.js`? mirror/);
    expect(SW017_SURFACES.scopeGaps).not.toMatch(/update the mirror/i);
  });

  it("does not present Muxy panel writes/polling as a current gap", () => {
    expect(SW017_SURFACES.scopeGaps).not.toMatch(/Muxy panel.*writes? to/i);
    expect(SW017_SURFACES.scopeGaps).not.toMatch(/Muxy panel.*polling|polling.*Muxy/i);
    expect(SW017_SURFACES.scopeGaps).not.toMatch(/Muxy panel.*write-through/i);
    expect(SW017_SURFACES.scopeGaps).not.toMatch(/muxy\.files\.write/);
  });

  it("does not present per-workflow index.json write-through as a current gap", () => {
    expect(SW017_SURFACES.scopeGaps).not.toMatch(/index\.json write-through/i);
    expect(SW017_SURFACES.scopeGaps).not.toMatch(/write to `?\.stelow\/[^`]*?index\.json`?/i);
  });

  it("does not present hard-coded JS EXECUTION_PHASE drift as a current gap", () => {
    // The original Gap 5 was about a hard-coded JS EXECUTION_PHASE = 13
    // mirror. The document must not list it as an open `## Gap N:`
    // section. Historical mentions in resolved sections are allowed.
    expect(SW017_SURFACES.scopeGaps).not.toMatch(/EXECUTION_PHASE\s*=\s*13/);
    expect(SW017_SURFACES.scopeGaps).not.toMatch(
      /^## Gap \d+:[^\n]*Phase numbering drift between TS and JS/m,
    );
  });

  it("does not present a v2-overwrite gap as currently open", () => {
    // The original Gap 1 is resolved by the wf.specTechFile version check;
    // the document must not list it as an open `## Gap N:` section or
    // describe it as "idempotent / only triggers when scopes are empty".
    expect(SW017_SURFACES.scopeGaps).not.toMatch(/only triggers when `?wf\.scopes`? is empty/i);
    expect(SW017_SURFACES.scopeGaps).not.toMatch(
      /^## Gap \d+:\s*spec-tech\.md v2 overwrites existing scopes/m,
    );
  });

  it("names the canonical parser and wf.specTechFile re-sync positively", () => {
    // Positive contract: the gap document must reference the current
    // implementation rather than only negating the removed-host claims.
    expect(SW017_SURFACES.scopeGaps).toMatch(/parseSpecTechScopes/);
    expect(SW017_SURFACES.scopeGaps).toMatch(/wf\.specTechFile/);
    expect(SW017_SURFACES.scopeGaps).toMatch(/spec-tech_\*\.md/);
  });

  it("preserves metadata/read-persistence limitations as open gaps", () => {
    // Source-supported open gaps must remain documented.
    expect(SW017_SURFACES.scopeGaps).toMatch(/dirHash/);
    expect(SW017_SURFACES.scopeGaps).toMatch(/in memory only|in-memory/);
  });

  it("classifies removed-host gaps as resolved or moot in present-tense language", () => {
    // The document must explicitly mark the removed-host claims as
    // resolved/moot rather than leaving them as live gaps, AND must
    // mention that the Muxy/Herdr trees were removed.
    expect(SW017_SURFACES.scopeGaps).toMatch(/Muxy.*(?:removed|moot)/i);
    expect(SW017_SURFACES.scopeGaps).toMatch(/v0\.55/);
    expect(SW017_SURFACES.scopeGaps).toMatch(/SW-002/);
  });
});
