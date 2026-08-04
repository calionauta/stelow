import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function markdownFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(path));
    else if (entry.name.endsWith(".md")) files.push(path);
  }
  return files;
}

describe("skill host-agnostic vocabulary", () => {
  it("keeps every SKILL.md free of Pi-only review paths and tool names", () => {
    const skillRoots = readdirSync(join(process.cwd(), "skills"), { withFileTypes: true })
      .filter(entry => entry.isDirectory() && entry.name.startsWith("stelow-product-"))
      .map(entry => join(process.cwd(), "skills", entry.name));
    const files = skillRoots.flatMap(markdownFiles);
    expect(files.length).toBeGreaterThanOrEqual(20);
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      if (file.endsWith("/references/cli-tools/plannotator.md")) continue;
      expect(content, file).not.toMatch(/\.plannotator\/approvals/);
      expect(content, file).not.toMatch(/\bplannotator\s+(annotate|review)/i);
    }
  });
});
