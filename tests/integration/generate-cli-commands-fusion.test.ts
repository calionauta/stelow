import { describe, it, expect } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parse } from "yaml";
import { WORKFLOW_COMMANDS } from "../../extensions/stelow/adapters/commands/dispatcher";
import { generateFusionCommands } from "../../scripts/generate-cli-commands";

describe("Fusion command artifact generator", () => {
  it("writes one frontmatter command file for every non-Pi-only workflow command", () => {
    // Fusion does not expose the Pi TUI/state-hooks primitives that
    // piOnly commands require, so the generator filters them out.
    const expected = WORKFLOW_COMMANDS.filter((d) => !d.piOnly);
    const root = mkdtempSync(join(tmpdir(), "stelow-fusion-commands-"));
    try {
      const files = generateFusionCommands(root);
      expect(files).toHaveLength(expected.length + 2);
      expect(files).toContain(join(root, ".fusion", "settings.json"));
      expect(files).toContain(join(root, ".fusion", "workflows", "stelow-v2.json"));
      for (const descriptor of expected) {
        const path = join(root, ".fusion", "commands", `${descriptor.name}.md`);
        expect(existsSync(path)).toBe(true);
        const content = readFileSync(path, "utf8");
        const frontmatter = content.split("---")[1];
        const metadata = parse(frontmatter);
        expect(metadata).toEqual(expect.objectContaining({ name: descriptor.name, host: "fusion" }));
        expect(content).toContain(descriptor.description);
        expect(content).toContain("skills/stelow-product-orchestrator/SKILL.md");
        expect(content).not.toContain("through the host adapter");
      }
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
