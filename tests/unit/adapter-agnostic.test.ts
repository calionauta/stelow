import { describe, it, expect } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { CLI } from "../../extensions/stelow/types";
import { BaseAdapter } from "../../extensions/stelow/adapters/base";
import { GenericAdapter } from "../../extensions/stelow/adapters/generic";
import { createAdapter } from "../../extensions/stelow/adapters/cli-adapter";

class DefaultAdapter extends BaseAdapter { readonly name: CLI = "generic"; }

describe("host-agnostic adapters", () => {
  it("BaseAdapter silently approves when no native visual review exists", async () => {
    await expect(new DefaultAdapter("generic").visualReview("plan.md", { cwd: "/tmp" }))
      .resolves.toEqual({ decision: "approved", feedback: "no-op fallback" });
  });

  it("GenericAdapter writes the canonical approval receipt", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "stelow-review-"));
    try {
      await expect(new GenericAdapter().visualReview("plans/spec.md", { cwd, dirHash: "wf-123" }))
        .resolves.toEqual({ decision: "approved" });
      const receipt = join(cwd, ".stelow", "approvals", "wf-123", "spec.md.approved.md");
      expect(existsSync(receipt)).toBe(true);
      expect(readFileSync(receipt, "utf8")).toContain("approved_via: generic-fallback");
    } finally { rmSync(cwd, { recursive: true, force: true }); }
  });

  it("factory selects a Fusion adapter without loading Pi", () => {
    const adapter = createAdapter("fusion");
    expect({ name: adapter.name, plugin: adapter.capabilities.pluginFormat }).toEqual({ name: "fusion", plugin: "json" });
  });
});
