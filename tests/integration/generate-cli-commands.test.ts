/**
 * generate-cli-commands.test.ts
 *
 * Edge-case tests for `scripts/generate-cli-commands.ts` (the Fusion
 * command artifact generator). The happy-path coverage lives in
 * `tests/integration/generate-cli-commands-fusion.test.ts`; this file
 * covers:
 *
 *   - Idempotent re-runs produce byte-for-byte identical output.
 *   - Missing parent directories are created automatically.
 *   - Existing output directories are overwritten cleanly.
 *   - Pi-only commands are filtered out of the Fusion output.
 *   - Each generated file has valid frontmatter (name + description +
 *     host: fusion).
 *   - Running the CLI subprocess (`npm run generate-cli-commands`)
 *     exits 0 with the documented file count.
 *   - The `pi` host produces zero output (Pi uses native slash; the
 *     generator is a no-op for it).
 */
import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import { generateFusionCommands, generateCliCommands, parseGeneratorArgs } from "../../scripts/generate-cli-commands";
import { buildFusionWorkflowIR } from "../../extensions/stelow/adapters/commands/fusion-artifacts";
import { WORKFLOW_COMMANDS } from "../../extensions/stelow/adapters/commands/dispatcher";
import { getCommandSystem } from "../../extensions/stelow/adapters/commands/dispatcher";

describe("Fusion command artifact generator (edge cases)", () => {
  it("Pi host generates no command files (uses native slash)", () => {
    const root = mkdtempSync(join(tmpdir(), "stelow-pi-cmd-"));
    try {
      const files = getCommandSystem("pi").generateCommandFiles();
      expect(files).toEqual([]);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("Generic host generates no command files (no host-native surface)", () => {
    const files = getCommandSystem("generic").generateCommandFiles();
    expect(files).toEqual([]);
  });

  it("Fusion output filters out piOnly commands", () => {
    const root = mkdtempSync(join(tmpdir(), "stelow-fusion-filter-"));
    try {
      const written = generateFusionCommands(root);
      const emittedNames = written
        .filter((p) => p.endsWith(".md"))
        .map((p) => p.split("/").pop()!.replace(/\.md$/, ""));
      const expected = WORKFLOW_COMMANDS.filter((d) => !d.piOnly).map((d) => d.name);
      for (const name of expected) {
        expect(emittedNames, `missing ${name}`).toContain(name);
      }
      // piOnly commands (sw-unlock, sw-inbox, sw-pulse) MUST NOT appear.
      const piOnly = WORKFLOW_COMMANDS.filter((d) => d.piOnly).map((d) => d.name);
      for (const name of piOnly) {
        expect(emittedNames, `piOnly ${name} should be filtered`).not.toContain(name);
      }
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("creates parent directories when missing", () => {
    const root = mkdtempSync(join(tmpdir(), "stelow-fusion-mkdir-"));
    try {
      // No `.fusion/commands/` exists; generator must mkdir.
      const nested = join(root, "deeply", "nested", "path");
      const written = generateFusionCommands(nested);
      expect(written.length).toBeGreaterThan(0);
      for (const file of written) {
        expect(existsSync(file), `missing ${file}`).toBe(true);
      }
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("overwrites existing command files cleanly (idempotent re-run)", () => {
    const root = mkdtempSync(join(tmpdir(), "stelow-fusion-idem-"));
    try {
      const first = generateFusionCommands(root);
      const firstSnapshots = new Map(first.map((p) => [p, readFileSync(p, "utf8")]));
      // Wait one millisecond so mtime differs; we still expect bytes to match.
      const wait = () => execSync("sleep 0.01");
      wait();
      const second = generateFusionCommands(root);
      expect(second).toEqual(first);
      for (const [path, content] of firstSnapshots) {
        const reread = readFileSync(path, "utf8");
        expect(reread, `byte-equal re-run failed for ${path}`).toBe(content);
      }
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("every Fusion command file has valid frontmatter (name + description + host)", () => {
    const root = mkdtempSync(join(tmpdir(), "stelow-fusion-fm-"));
    try {
      const written = generateFusionCommands(root);
      for (const path of written.filter((p) => p.endsWith(".md"))) {
        const content = readFileSync(path, "utf8");
        expect(content.startsWith("---\n"), `${path} frontmatter starts`).toBe(true);
        const frontmatterBlock = content.split("---")[1];
        const fm = parse(frontmatterBlock) as Record<string, string>;
        expect(fm.name, `${path} name`).toBeTruthy();
        expect(fm.description, `${path} description`).toBeTruthy();
        expect(fm.host, `${path} host`).toBe("fusion");
      }
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("running the CLI subprocess (`npm run generate-cli-commands`) exits 0", () => {
    // The script is wired to npm scripts; running it directly is the
    // canonical "fresh clone to published artifact" path.
    const result = execSync("npm run generate-cli-commands 2>&1", { encoding: "utf8" });
    // Expect at least the success banner.
    expect(result).toMatch(/Generated \d+ Fusion artifacts/);
  });

  it("emits settings plus an executable v2 workflow IR", () => {
    const root = mkdtempSync(join(tmpdir(), "stelow-fusion-ir-"));
    try {
      const written = generateFusionCommands(root);
      const settingsPath = join(root, ".fusion", "settings.json");
      const workflowPath = join(root, ".fusion", "workflows", "stelow-v2.json");
      expect(written).toContain(settingsPath);
      expect(written).toContain(workflowPath);

      const settings = JSON.parse(readFileSync(settingsPath, "utf8")) as { stelow: Record<string, unknown> };
      expect(settings.stelow).toEqual(expect.objectContaining({ pluginId: "fusion-plugin-stelow" }));

      const workflow = JSON.parse(readFileSync(workflowPath, "utf8")) as ReturnType<typeof buildFusionWorkflowIR>;
      expect(workflow.version).toBe("v2");
      expect(workflow.nodes[0]).toEqual(expect.objectContaining({ kind: "start" }));
      expect(workflow.nodes.at(-1)).toEqual(expect.objectContaining({ kind: "end" }));
      expect(workflow.nodes.filter((node) => node.kind === "prompt")).toHaveLength(workflow.columns.length);
      expect(workflow.edges).toHaveLength(workflow.nodes.length - 1);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("command artifacts contain executable Fusion dispatch instructions", () => {
    const root = mkdtempSync(join(tmpdir(), "stelow-fusion-dispatch-"));
    try {
      const command = generateFusionCommands(root).find((path) => path.endsWith("sw-start.md"));
      expect(command).toBeTruthy();
      const content = readFileSync(command!, "utf8");
      expect(content).toContain("skills/stelow-product-orchestrator/SKILL.md");
      expect(content).toContain("fn_ask_question");
      expect(content).toContain("fn_spawn_agent");
      expect(content).toContain("fn_workflow_validate");
      expect(content).not.toContain("through the host adapter");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("supports pi, fusion, all, and rejects unknown targets", () => {
    const root = mkdtempSync(join(tmpdir(), "stelow-targets-"));
    try {
      expect(generateCliCommands("pi", root)).toEqual([]);
      expect(generateCliCommands("fusion", root).length).toBeGreaterThan(2);
      expect(generateCliCommands("all", root).length).toBeGreaterThan(2);
      expect(parseGeneratorArgs(["--target=pi", "--output", root])).toEqual({
        target: "pi",
        baseDir: root,
      });
      expect(() => parseGeneratorArgs(["--target=bogus"])).toThrow(/Unsupported target/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("each emitted Fusion file is non-empty (>= 100 bytes)", () => {
    const root = mkdtempSync(join(tmpdir(), "stelow-fusion-size-"));
    try {
      const written = generateFusionCommands(root);
      for (const path of written) {
        const stat = readFileSync(path, "utf8");
        expect(stat.length, `${path} size`).toBeGreaterThan(100);
      }
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});