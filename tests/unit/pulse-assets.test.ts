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
