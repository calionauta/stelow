import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import { FusionAdapter } from "../../extensions/stelow/adapters/fusion";
import { getCommandSystem } from "../../extensions/stelow/adapters/commands/dispatcher";

const NATIVE_FUSION_TOOLS = [
  "fn_ask_question",
  "fn_spawn_agent",
  "read",
  "write",
  "edit",
  "bash",
  "ls",
  "grep",
];

describe("F2 regression: Fusion vocabulary and visual-review host metadata", () => {
  let cwd: string;
  let originalFusionVersion: string | undefined;
  let originalHostVersion: string | undefined;

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), "stelow-f2-fusion-receipt-"));
    originalFusionVersion = process.env.FUSION_VERSION;
    originalHostVersion = process.env.STELOW_HOST_VERSION;
    delete process.env.FUSION_VERSION;
    delete process.env.STELOW_HOST_VERSION;
  });

  afterEach(() => {
    if (originalFusionVersion === undefined) delete process.env.FUSION_VERSION;
    else process.env.FUSION_VERSION = originalFusionVersion;
    if (originalHostVersion === undefined) delete process.env.STELOW_HOST_VERSION;
    else process.env.STELOW_HOST_VERSION = originalHostVersion;
    rmSync(cwd, { recursive: true, force: true });
  });

  it("advertises exactly the documented native vocabulary and canonical mappings", () => {
    const adapter = new FusionAdapter();
    expect(adapter.getAvailableTools().map(({ name }) => name)).toEqual(NATIVE_FUSION_TOOLS);
    expect(adapter.toAgnosticName("fn_ask_question")).toBe("ask_user_question");
    expect(adapter.toAgnosticName("fn_spawn_agent")).toBe("subagent");
    expect(adapter.toAgnosticName("ask")).toBe("ask_user_question");
    expect(adapter.toAgnosticName("read")).toBe("read");
    expect(adapter.toAgnosticName("unknown_tool")).toBe("unknown_tool");
    expect(NATIVE_FUSION_TOOLS).not.toEqual(
      expect.arrayContaining(["ask_user_question", "subagent", "visual_review", "ask"]),
    );
  });

  it.each([
    { fusion: "2.4.0", host: "1.9.0", expected: "2.4.0" },
    { fusion: "", host: "1.9.0", expected: "1.9.0" },
    { fusion: undefined, host: undefined, expected: "unknown" },
  ])("writes one Fusion receipt with version $expected", async ({ fusion, host, expected }) => {
    if (fusion === undefined) delete process.env.FUSION_VERSION;
    else process.env.FUSION_VERSION = fusion;
    if (host === undefined) delete process.env.STELOW_HOST_VERSION;
    else process.env.STELOW_HOST_VERSION = host;

    const result = await new FusionAdapter().visualReview("plans/spec.md", {
      cwd,
      dirHash: "wf/duplicate-safe",
    });
    expect(result).toEqual({ decision: "approved" });

    const receiptDir = join(cwd, ".stelow", "approvals", "wf", "duplicate-safe");
    expect(readdirSync(receiptDir)).toEqual(["spec.md.approved.md"]);
    const content = readFileSync(join(receiptDir, "spec.md.approved.md"), "utf8");
    const receipt = parse(content) as {
      approved: boolean;
      approved_at: string;
      approved_via: string;
      source_file: string;
      host: { name: string; version: string; registered_at: string };
    };
    expect(receipt).toEqual({
      approved: true,
      approved_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      approved_via: "fusion-fallback",
      source_file: "plans/spec.md",
      host: {
        name: "fusion",
        version: expected,
        registered_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      },
    });
    expect(receipt.host.registered_at).toBe(receipt.approved_at);
    expect(content).not.toContain("generic-fallback");
  });

  it("uses the GenericAdapter basename/default-dir contract for an empty filename", async () => {
    await new FusionAdapter().visualReview("", { cwd });
    const receiptDir = join(cwd, ".stelow", "approvals", "default");
    expect(readdirSync(receiptDir)).toEqual([".approved.md"]);
  });

  it("renders actionable Fusion-native mappings in generated command bodies", () => {
    const command = getCommandSystem("fusion")
      .generateCommandFiles()
      .find(({ path }) => path.endsWith("sw-start.md"));
    expect(command?.content).toContain("`ask_user_question` → `fn_ask_question`");
    expect(command?.content).toContain("`subagent` →\n   `fn_spawn_agent`");
    expect(command?.content).not.toContain("Execute /sw-start through the host adapter");
  });
});
