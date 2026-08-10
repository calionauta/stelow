/**
 * Tests: workgroup YAML config loader.
 *
 * The adapter routes stage → reviewer identity from a per-project YAML.
 * Loading must:
 *  - return null when the file is absent (no adapter wired),
 *  - validate the structural shape (host + reviewers map),
 *  - surface clear errors on malformed input (never silently use wrong reviewer).
 *
 * Mutation-target: the structural checks. Removing `isWorkgroupShape()`
 * would let a malformed file slip through and route decisions to the
 * wrong identity.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadWorkgroupConfig,
  resolveReviewer,
  WorkgroupConfigError,
} from "../../extensions/stelow/adapters/host/config";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "stelow-host-config-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// Helper: write the workgroup config, ensuring .stelow/ exists first.
// writeFileSync({recursive: true}) is unreliable across Node versions;
// mkdirSync + writeFileSync is the canonical sequence.
function writeConfig(yaml: string): void {
  mkdirSync(join(tmpDir, ".stelow"), { recursive: true });
  writeFileSync(join(tmpDir, ".stelow", "host-workgroup.yaml"), yaml);
}

const VALID_YAML = `
host: multica
reviewers:
  shape:
    role: pm
    member_id: 01930000-0000-0000-0000-000000000001
  interface:
    role: ux
    member_id: 01930000-0000-0000-0000-000000000002
  planning:
    role: tech-lead
    member_id: 01930000-0000-0000-0000-000000000003
fallback_owner: 01930000-0000-0000-0000-0000000000ff
sla_minutes: 1440
`;

const MINIMAL_YAML = `
host: multica
reviewers:
  shape:
    role: pm
    member_id: 01930000-0000-0000-0000-000000000001
`;

describe("loadWorkgroupConfig", () => {
  it("returns null when the file does not exist", () => {
    const r = loadWorkgroupConfig(tmpDir);
    expect(r).toBeNull();
  });

  it("loads a valid config with all fields populated", () => {
    writeConfig(VALID_YAML);
    const r = loadWorkgroupConfig(tmpDir);
    expect(r).not.toBeNull();
    expect(r?.host).toBe("multica");
    expect(r?.sla_minutes).toBe(1440);
    expect(r?.fallback_owner).toBe("01930000-0000-0000-0000-0000000000ff");
    expect(Object.keys(r?.reviewers ?? {})).toEqual(
      expect.arrayContaining(["shape", "interface", "planning"]),
    );
  });

  it("loads a minimal config (no fallback_owner, no sla_minutes)", () => {
    writeConfig(MINIMAL_YAML);
    const r = loadWorkgroupConfig(tmpDir);
    expect(r?.host).toBe("multica");
    expect(r?.fallback_owner).toBeUndefined();
    expect(r?.sla_minutes).toBeUndefined();
  });

  // ── Structural validation ─────────────────────────────────────

  it("throws WorkgroupConfigError when file is not a YAML mapping", () => {
    writeConfig("[]\n");
    expect(() => loadWorkgroupConfig(tmpDir)).toThrow(WorkgroupConfigError);
  });

  it("throws when host is missing", () => {
    writeConfig("reviewers:\n  shape:\n    role: pm\n    member_id: abc\n");
    expect(() => loadWorkgroupConfig(tmpDir)).toThrow(/host/);
  });

  it("throws when host is empty", () => {
    writeConfig('host: ""\nreviewers:\n  shape:\n    role: pm\n    member_id: abc\n');
    expect(() => loadWorkgroupConfig(tmpDir)).toThrow(/host/);
  });

  it("throws when reviewers map is missing", () => {
    writeConfig("host: multica\n");
    expect(() => loadWorkgroupConfig(tmpDir)).toThrow(/reviewers/);
  });

  it("throws when a reviewer is missing role", () => {
    writeConfig("host: multica\nreviewers:\n  shape:\n    member_id: abc\n");
    expect(() => loadWorkgroupConfig(tmpDir)).toThrow(/role/);
  });

  it("throws when a reviewer is missing member_id", () => {
    writeConfig("host: multica\nreviewers:\n  shape:\n    role: pm\n");
    expect(() => loadWorkgroupConfig(tmpDir)).toThrow(/member_id/);
  });

  it("throws on invalid YAML syntax", () => {
    writeConfig("host: multica\nreviewers:\n  :\n   [invalid\n");
    expect(() => loadWorkgroupConfig(tmpDir)).toThrow(WorkgroupConfigError);
  });
});

describe("resolveReviewer", () => {
  it("returns the stage-specific reviewer when present", () => {
    writeConfig(VALID_YAML);
    const cfg = loadWorkgroupConfig(tmpDir);
    const r = resolveReviewer(cfg, "interface");
    expect(r?.role).toBe("ux");
    expect(r?.member_id).toBe("01930000-0000-0000-0000-000000000002");
  });

  it("falls back to fallback_owner when stage has no entry", () => {
    writeConfig(VALID_YAML);
    const cfg = loadWorkgroupConfig(tmpDir);
    const r = resolveReviewer(cfg, "diff-gate"); // not configured
    expect(r?.role).toBe("fallback");
    expect(r?.member_id).toBe("01930000-0000-0000-0000-0000000000ff");
  });

  it("returns null when stage has no entry and no fallback_owner", () => {
    writeConfig(MINIMAL_YAML);
    const cfg = loadWorkgroupConfig(tmpDir);
    expect(resolveReviewer(cfg, "interface")).toBeNull();
  });

  it("returns null when config itself is null", () => {
    expect(resolveReviewer(null, "shape")).toBeNull();
  });
});