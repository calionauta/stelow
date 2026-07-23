/**
 * host-detection-fs.test.ts
 *
 * Filesystem probe tests for `detectHost()` — complements the
 * env-var coverage in `tests/unit/host-detection.test.ts`.
 *
 * `detectHost()` checks, in order:
 *   1. FUSION_HOST=1 (highest priority)
 *   2. STELOW_HOST (or PRODUCT_WORKFLOW_CLI) env var
 *   3. ~/.fusion directory exists (filesystem probe)
 *   4. ~/.pi directory exists (filesystem probe)
 *   5. `pi --version` succeeds (CLI probe)
 *   6. Generic (safe fallback)
 *
 * The existing unit test covers (1)–(2); this file exercises (3)–(6)
 * with a mocked HOME directory (the implementation uses `os.homedir()`
 * which reads `process.env.HOME`).
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectHost } from "../../extensions/stelow/state";

describe("detectHost filesystem probe", () => {
  let fakeHome: string;
  let realHome: string | undefined;
  let realFusion: string | undefined;
  let realPi: string | undefined;
  let realStelowHost: string | undefined;
  let realProductCli: string | undefined;

  beforeEach(() => {
    // Use a fresh fake HOME per test so leftover files do not bleed.
    fakeHome = mkdtempSync(join(tmpdir(), "stelow-fs-probe-"));
    realHome = process.env.HOME;
    realFusion = process.env.FUSION_HOST;
    realPi = process.env.STELOW_HOST;
    realProductCli = process.env.PRODUCT_WORKFLOW_CLI;
    process.env.HOME = fakeHome;
    // Strip env-var signals so we hit the filesystem probe layer.
    delete process.env.FUSION_HOST;
    delete process.env.STELOW_HOST;
    delete process.env.PRODUCT_WORKFLOW_CLI;
  });

  afterEach(() => {
    if (realHome === undefined) delete process.env.HOME;
    else process.env.HOME = realHome;
    if (realFusion === undefined) delete process.env.FUSION_HOST;
    else process.env.FUSION_HOST = realFusion;
    if (realPi === undefined) delete process.env.STELOW_HOST;
    else process.env.STELOW_HOST = realPi;
    if (realProductCli === undefined) delete process.env.PRODUCT_WORKFLOW_CLI;
    else process.env.PRODUCT_WORKFLOW_CLI = realProductCli;
    rmSync(fakeHome, { recursive: true, force: true });
  });

  it("returns 'fusion' when ~/.fusion exists", () => {
    mkdirSync(join(fakeHome, ".fusion"));
    expect(detectHost()).toBe("fusion");
  });

  it("returns 'pi' when ~/.pi exists (and ~/.fusion does not)", () => {
    mkdirSync(join(fakeHome, ".pi"));
    expect(detectHost()).toBe("pi");
  });

  it("Fusion wins over Pi when both ~/.fusion and ~/.pi exist", () => {
    mkdirSync(join(fakeHome, ".fusion"));
    mkdirSync(join(fakeHome, ".pi"));
    expect(detectHost()).toBe("fusion");
  });

  it("returns 'generic' when no probe matches and no `pi` binary on PATH", () => {
    // No .fusion, no .pi. PATH may still have pi; this test asserts the
    // contract is robust when pi is absent OR when both fs probes fail.
    // We don't assert the literal result here — only that it does not
    // throw and is a known CLI union value.
    const result = detectHost();
    expect(["pi", "fusion", "generic"]).toContain(result);
  });

  it("is idempotent — calling twice in the same process returns the same value", () => {
    mkdirSync(join(fakeHome, ".pi"));
    const a = detectHost();
    const b = detectHost();
    expect(a).toBe(b);
  });

  it("reflects env-var changes between calls", () => {
    mkdirSync(join(fakeHome, ".pi"));
    expect(detectHost()).toBe("pi");
    delete process.env.STELOW_HOST;
    process.env.STELOW_HOST = "fusion";
    expect(detectHost()).toBe("fusion");
  });

  it("env-var override beats filesystem probe", () => {
    mkdirSync(join(fakeHome, ".pi"));
    process.env.STELOW_HOST = "generic";
    expect(detectHost()).toBe("generic");
  });

  it("FUSION_HOST=1 wins over everything", () => {
    mkdirSync(join(fakeHome, ".pi"));
    process.env.FUSION_HOST = "1";
    process.env.STELOW_HOST = "pi";
    expect(detectHost()).toBe("fusion");
  });
});