import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cliTools = join(root, "skills", "stelow-workflow-orchestrator", "references", "cli-tools");

describe("portable reconnaissance contract", () => {
  it("ships an executable, receipt-producing preflight", () => {
    const script = join(cliTools, "recon.sh");
    const body = readFileSync(script, "utf8");
    expect(statSync(script).mode & 0o111).not.toBe(0);
    expect(body).toContain("RECON_REFUSED");
    expect(body).toContain("context/recon-receipt.json");
    expect(body).toContain("stelow-recon-v1");
    expect(body).not.toMatch(/install(\.sh)?\s*\|/i);
  });

  it("records a host probe from a Git workspace", () => {
    const workspace = mkdtempSync(join(tmpdir(), "stelow-recon-"));
    execFileSync("git", ["init", "-q"], { cwd: workspace });
    execFileSync(scriptPath(), ["tech-preview"], { cwd: workspace });
    const receipt = JSON.parse(readFileSync(join(workspace, "context", "recon-receipt.json"), "utf8"));
    expect(receipt).toMatchObject({ contract: "stelow-recon-v1", kind: "tech-preview", workspace: { root: workspace, git: true } });
    expect(receipt.tools).toHaveProperty("cymbal");
  });

  it("makes preflight, workspace discipline, and the fallback visible to skills", () => {
    const map = readFileSync(join(cliTools, "code-map.md"), "utf8");
    const preview = readFileSync(join(root, "skills", "stelow-workflow-shape-up", "references", "tech-preview.md"), "utf8");
    const scopes = readFileSync(join(root, "skills", "stelow-workflow-tech-planning", "references", "scope-generation.md"), "utf8");
    for (const text of [map, preview, scopes]) expect(text).toContain("recon.sh");
    expect(map).toContain("Git workspace");
    expect(scopes).toContain("Do not skip recon silently");
  });
});

function scriptPath() {
  return join(cliTools, "recon.sh");
}
