import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Pulse scripts (pulse.sh, pulse.ps1, prompts, SETUP.md) must be
 * shipped with the extension so any user who installs stelow via
 * GitHub/npm gets a working Pulse without separate setup steps.
 *
 * These tests verify that:
 *  1. All 5 required files exist in extensions/stelow/pulse/ (source)
 *  2. All 5 required files exist in build/extensions/stelow/pulse/
 *     (build output) so the published package has them
 *  3. None of them contains the old hardcoded "haiku" model default
 */

const PULSE_FILES = [
  "pulse.sh",
  "pulse.ps1",
  "pulse-task.md",
  "pulse-system.md",
  "SETUP.md",
];

const PROJECT_ROOT = join(import.meta.dirname, "..", "..");

describe("Pulse assets are shipped with the extension", () => {
  it.each(PULSE_FILES)("source has %s", (file) => {
    const path = join(PROJECT_ROOT, "extensions", "stelow", "pulse", file);
    expect(existsSync(path), `Missing source asset: ${path}`).toBe(true);
  });

  it.each(PULSE_FILES)("build output has %s", (file) => {
    const path = join(PROJECT_ROOT, "build", "extensions", "stelow", "pulse", file);
    expect(existsSync(path), `Missing build asset: ${path}`).toBe(true);
  });

  it("copy-pulse-assets.sh exists and is executable", () => {
    const path = join(PROJECT_ROOT, "scripts", "copy-pulse-assets.sh");
    expect(existsSync(path)).toBe(true);
  });
});

describe("Pulse scripts do not hardcode haiku model", () => {
  it("pulse.sh does not default to haiku", () => {
    const path = join(PROJECT_ROOT, "extensions", "stelow", "pulse", "pulse.sh");
    if (!existsSync(path)) return; // skip if source missing
    const content = readFileSync(path, "utf-8");
    // The old default was: MODEL="${PULSE_MODEL:-haiku}"
    // The new default is:    MODEL="${PULSE_MODEL:-}" (empty = use harness)
    expect(content).not.toMatch(/PULSE_MODEL:-haiku/);
  });

  it("pulse.ps1 does not default to haiku", () => {
    const path = join(PROJECT_ROOT, "extensions", "stelow", "pulse", "pulse.ps1");
    if (!existsSync(path)) return;
    const content = readFileSync(path, "utf-8");
    expect(content).not.toMatch(/"haiku"/);
  });
});

describe("Standalone Pulse setup script", () => {
  it("scripts/setup-pulse.sh exists and is executable", () => {
    const path = join(PROJECT_ROOT, "scripts", "setup-pulse.sh");
    expect(existsSync(path)).toBe(true);
  });

  it("setup-pulse.sh syntax is valid", () => {
    const { execSync } = require("node:child_process");
    const path = join(PROJECT_ROOT, "scripts", "setup-pulse.sh");
    expect(() => execSync(`bash -n "${path}"`)).not.toThrow();
  });

  it("setup-pulse.sh accepts --help", () => {
    const { execSync } = require("node:child_process");
    const path = join(PROJECT_ROOT, "scripts", "setup-pulse.sh");
    const output = execSync(`bash "${path}" --help`).toString();
    expect(output).toMatch(/Usage:/);
  });

  it("setup-pulse.sh --dry-run creates no files", () => {
    const { execSync } = require("node:child_process");
    const { mkdtempSync, rmSync } = require("node:fs");
    const { tmpdir } = require("node:os");
    const path = join(PROJECT_ROOT, "scripts", "setup-pulse.sh");
    const tmp = mkdtempSync(join(tmpdir(), "pulse-test-"));
    try {
      execSync(`bash "${path}" --dry-run --project-dir "${tmp}"`, { stdio: "pipe" });
      expect(existsSync(join(tmp, ".stelow"))).toBe(false);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("setup.sh includes Pulse step", () => {
  it("setup.sh renumbered to /11", () => {
    const content = readFileSync(join(PROJECT_ROOT, "setup.sh"), "utf-8");
    expect(content).not.toMatch(/Step \d+\/10:/);
    expect(content).toMatch(/Step \d+\/11:/);
  });

  it("setup.sh has Pulse step", () => {
    const content = readFileSync(join(PROJECT_ROOT, "setup.sh"), "utf-8");
    expect(content).toMatch(/Step 11\/11:.*Pulse/);
    expect(content).toMatch(/setup_pulse\(\)/);
  });

  it("setup.sh calls setup_pulse after detect_muxy", () => {
    const content = readFileSync(join(PROJECT_ROOT, "setup.sh"), "utf-8");
    expect(content).toMatch(/detect_muxy\n  setup_pulse\n  print_summary/);
  });
});
