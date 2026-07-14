/**
 * Pi-integration: Sandbox install verification (task #17)
 *
 * Verifies the stelow package installs and loads correctly in a real
 * pi sandbox. This catches the "package builds fine but doesn't
 * actually work when installed" class of bugs (e.g. missing files
 * in `package.json#files[]`, broken extension entry point, missing
 * peer deps, etc).
 *
 * Custom sandbox: We build our own sandbox (rather than using
 * pi-test-harness's verifySandboxInstall) because stelow's
 * `optionalPeerDependencies` (e.g. `@earendil-works/pi-tui`) are not
 * auto-installed by the harness's minimal sandbox package.json. The
 * stelow extension REQUIRES them at runtime — this is a real
 * integration constraint, not a test artifact.
 *
 * Steps:
 *  1. npm pack → tarball
 *  2. Install in fresh temp dir
 *  3. ALSO install the runtime peer deps (the ones stelow actually
 *     imports at runtime) into the same temp dir
 *  4. Load extension via pi's real DefaultResourceLoader
 *  5. Assert: 1 extension registered, no load errors
 */
import { describe, it, expect, afterEach, beforeAll, afterAll } from "vitest";

// Heavy sandbox teardown can take 30+ seconds on macOS due to npm
// leaving locked file handles. Bump hook timeout for this file.
const HEAVY_HOOK_TIMEOUT = 30_000;
import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, copyFileSync, unlinkSync, writeFileSync, statSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { DefaultResourceLoader, SettingsManager } from "@earendil-works/pi-coding-agent";

const PACKAGE_DIR = resolve(__dirname, "..", "..");

/**
 * Peer deps that the stelow extension actually imports at runtime
 * (not just type-only). These MUST be installed alongside stelow in
 * any environment that runs the extension — including the sandbox.
 * If stelow is used inside real `pi`, pi provides these transitively;
 * in a clean sandbox we have to install them explicitly.
 */
const RUNTIME_PEER_DEPS = [
  "@earendil-works/pi-coding-agent",
  "@earendil-works/pi-tui",
  "@juicesharp/rpiv-ask-user-question",
  "@plannotator/pi-extension",
  "pi-intercom",
  "pi-subagents",
  "pi-supervisor",
];

interface SandboxResult {
  sandboxDir: string;
  tarballName: string;
  installOk: boolean;
  extensionPaths: string[];
  loadResult: {
    extensions: number;
    errors: Array<{ path: string; error: string }>;
  };
  skills: number;
}

async function buildSandbox(): Promise<SandboxResult> {
  // 1. npm pack → tarball
  const packOutput = execSync("npm pack --pack-destination .", {
    cwd: PACKAGE_DIR,
    encoding: "utf-8",
  }).trim();
  const tarballName = packOutput.split("\n").pop()!.trim();

  const tarballSrc = join(PACKAGE_DIR, tarballName);
  const sandboxDir = mkdtempSync(join(tmpdir(), "pi-sandbox-"));
  // Copy the tarball under a unique name inside the sandbox to avoid
  // collisions when multiple test files (e.g. pi-session-lifecycle)
  // pack the same source concurrently. We keep the source tarball
  // on disk (gitignored) so concurrent runs do not race on its
  // existence. .gitignore excludes `calionauta-stelow-*.tgz`.
  const tarballDest = join(sandboxDir, tarballName);
  copyFileSync(tarballSrc, tarballDest);

  // 2. Minimal sandbox package.json (without our peer deps — we add them next)
  const pkg = JSON.parse(readFileSync(join(PACKAGE_DIR, "package.json"), "utf-8"));
  const sandboxPkg = {
    name: "pi-test-sandbox",
    private: true,
    type: "module",
    dependencies: {
      [pkg.name]: `file:./${tarballName}`,
      // Install the actual published versions of stelow's runtime peers
      ...Object.fromEntries(RUNTIME_PEER_DEPS.map((d) => [d, "*"])),
    },
  };
  writeFileSync(join(sandboxDir, "package.json"), JSON.stringify(sandboxPkg, null, 2));

  // 3. Install
  let installOk = false;
  try {
    execSync("npm install --ignore-scripts=false", {
      cwd: sandboxDir,
      encoding: "utf-8",
      stdio: "pipe",
    });
    installOk = true;
  } catch {
    installOk = false;
  }

  // 4. Resolve extension paths from installed package
  const installedPkgDir = join(sandboxDir, "node_modules", ...pkg.name.split("/"));
  const installedPkg = JSON.parse(readFileSync(join(installedPkgDir, "package.json"), "utf-8"));
  const extensionPaths: string[] = [];
  if (installedPkg.pi?.extensions) {
    for (const ext of installedPkg.pi.extensions) {
      const resolved = resolve(installedPkgDir, ext);
      if (existsSync(resolved)) extensionPaths.push(resolved);
    }
  }

  // 5. Load via DefaultResourceLoader
  const settingsManager = SettingsManager.inMemory();
  const loader = new DefaultResourceLoader({
    cwd: sandboxDir,
    agentDir: sandboxDir,
    settingsManager,
    additionalExtensionPaths: extensionPaths,
  });
  await loader.reload();
  const extResult = loader.getExtensions();
  const skillsResult = loader.getSkills();

  return {
    sandboxDir,
    tarballName,
    installOk,
    extensionPaths,
    loadResult: {
      extensions: extResult.extensions.length,
      errors: extResult.errors.map((e) => ({ path: e.path, error: e.error })),
    },
    skills: skillsResult.skills.length,
  };
}

describe("pi sandbox install", () => {
  // Build the sandbox ONCE per describe block. Each build takes 30-60s
  // (npm install + DefaultResourceLoader), so we share the result across
  // tests. This is acceptable because the sandbox is read-only after build.
  let sharedResult: Awaited<ReturnType<typeof buildSandbox>>;
  let sharedSandboxDir: string;

  beforeAll(async () => {
    sharedResult = await buildSandbox();
    sharedSandboxDir = sharedResult.sandboxDir;
  }, 120_000);

  afterAll(() => {
    if (sharedSandboxDir) {
      try { rmSync(sharedSandboxDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* best-effort */ }
    }
  }, HEAVY_HOOK_TIMEOUT);

  it("stelow package installs cleanly from tarball", () => {
    expect(sharedResult.installOk).toBe(true);
    expect(sharedResult.tarballName).toMatch(/^calionauta-stelow-\d+\.\d+\.\d+\.tgz$/);
  });

  it("extension entry point is in the tarball", () => {
    expect(sharedResult.extensionPaths).toHaveLength(1);
    expect(sharedResult.extensionPaths[0]).toMatch(/index\.ts$/);
    expect(existsSync(sharedResult.extensionPaths[0])).toBe(true);
  });

  it("extension loads in a real pi environment (no load errors)", () => {
    expect(sharedResult.loadResult.errors).toEqual([]);
    expect(sharedResult.loadResult.extensions).toBe(1);
  });

  it("tarball bundles skills/ directory (stow's source of truth for skills)", () => {
    // DefaultResourceLoader.getSkills() returns 0 in a fresh sandbox
    // because pi discovers skills from ~/.pi/agent/skills/, which the
    // sandbox does not have. install.sh (run separately by users)
    // copies skills from package's skills/ to that dir. So skill
    // "discovery" is pi's install concern, not stelow's contract.
    //
    // What IS stelow's contract: skills/ directory must be in the
    // tarball (so install.sh can copy them). Verify by counting
    // SKILL.md files in the tarball.
    const tarballPath = join(PACKAGE_DIR, sharedResult.tarballName);
    const out = execSync(
      `tar -tzf "${tarballPath}" 2>/dev/null | grep -E "^package/skills/.*/SKILL.md$" | wc -l`,
      { encoding: "utf-8" }
    ).trim();
    const skillCount = parseInt(out, 10);
    expect(skillCount).toBeGreaterThan(20);
  });
});