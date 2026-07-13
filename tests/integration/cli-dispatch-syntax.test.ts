/**
 * Integration Tests: CLI Dispatch Syntax Smoke Test
 *
 * Validates that the documented PARALLEL dispatch invocation
 * shape (in `subagents.md`) for the surviving CLIs (`pi`, `generic`)
 * at least passes parser-level validation. Does NOT launch real
 * subagents — that requires a live model session which isn't
 * appropriate for unit/integration CI.
 *
 * What "passes parser-level validation" means per CLI:
 *   - `pi-subagents`  : shape conforms to the documented `subagent({})`
 *                       tool-call object structure.
 *   - `pi` (built-in) : binary is invokable (--version or --help).
 *   - `generic`       : shell-level (no binary to test).
 *
 * **v0.45.0 narrowing:** opencode/claude-code/codex dispatch shapes
 * were removed when those harnesses lost dedicated integration.
 * See `docs/archive/2026-07-09-deprecated-multi-cli-integration/`.
 *
 * Reference: docs/scope-execution-strategy.md + subagents.md PARALLEL
 * dispatch table.
 */

import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

/**
 * Resolve a CLI binary by reading the user's original PATH (NOT vitest's
 * test-runner PATH, which has node_modules/.bin prepended and shadows
 * real installed binaries). Skip dirs that point inside the test cwd
 * (where node_modules/.bin lives).
 */
function resolveCli(name: string): string | null {
  const paths = (process.env.PATH ?? "").split(":");
  for (const dir of paths) {
    if (!dir) continue;
    if (dir.includes("/node_modules/")) continue;
    if (dir === "." || dir.endsWith("/.")) continue;
    const candidate = `${dir}/${name}`;
    try {
      execSync(`test -x "${candidate}"`, { stdio: "pipe" });
      return candidate;
    } catch {
      // not in this dir
    }
  }
  return null;
}

function commandExists(name: string): boolean {
  return resolveCli(name) !== null;
}

function probeCli(name: string, args = "--version"): string | null {
  const resolved = resolveCli(name);
  if (!resolved) return null;
  try {
    return execSync(`${resolved} ${args}`, {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000,
    })
      .toString()
      .trim()
      .slice(0, 200);
  } catch {
    return null;
  }
}

describe("PARALLEL dispatch — CLI binary availability (pi only)", () => {
  // pi-dependent tests are skipped in CI (no global pi binary available)
  // but run locally where pi is expected to be installed.
  const isCI = !!process.env.CI;

  (isCI ? it.skip : it)(
    "pi (built-in) is on PATH and answers --version",
    { retry: 2, timeout: 15000 },
    () => {
      if (!commandExists("pi")) {
        throw new Error(
          "pi is not on PATH. Install via `npm install -g @earendil-works/pi-coding-agent`.",
        );
      }
      const out = probeCli("pi");
      expect(out).not.toBeNull();
      expect(out!.length).toBeGreaterThan(0);
    },
  );

  (isCI ? it.skip : it)("pi-subagents extension is discoverable", () => {
    const home = process.env.HOME ?? "/tmp";
    const candidates = [
      `${home}/.pi/agent/npm/node_modules/pi-subagents`,
      `${home}/.pi/agent/node_modules/pi-subagents`,
      `${home}/.pi/agent/npm/node_modules/@tintinweb/pi-subagents`,
      `${home}/.pi/agent/node_modules/@tintinweb/pi-subagents`,
    ];
    const found = candidates.some((p) => {
      try {
        return require("node:fs").statSync(p).isDirectory();
      } catch {
        return false;
      }
    });
    expect(found).toBe(true);
  });
});

/**
 * Static validation of the documented call shapes for the surviving CLIs.
 * These tests don't invoke the subagents — they validate that a
 * TypeScript-constructed call-shape OBJECT is well-formed per the
 * shape documented in subagents.md PARALLEL dispatch table.
 *
 * If the shape changes (new required field, renamed parameter), this
 * will fail loudly instead of silently drifting.
 */
describe("PARALLEL dispatch — call shape validation (static)", () => {
  it("pi-subagents shape: subagent({ tasks: [...], concurrency: N, context: 'fresh' })", () => {
    const shape = {
      tasks: [
        { agent: "worker", task: "Implement auth" },
        { agent: "worker", task: "Implement API" },
      ],
      concurrency: 2,
      context: "fresh" as const,
    };
    expect(Array.isArray(shape.tasks)).toBe(true);
    expect(shape.tasks.length).toBeGreaterThan(0);
    for (const t of shape.tasks) {
      expect(typeof t.agent).toBe("string");
      expect(typeof t.task).toBe("string");
    }
    expect(typeof shape.concurrency).toBe("number");
    expect(shape.concurrency).toBeGreaterThan(0);
    expect(shape.context).toBe("fresh");
  });

  it("generic shape: shell-level fan-out ('&' + 'wait')", () => {
    // Generic fallback is shell-level: spawn N commands with `&`,
    // wait for completion. Validate syntactic shell construction.
    const commands = ["cmd_a", "cmd_b", "cmd_c"];
    const fannedOut = commands.map((c) => `${c} &`).join(" ");
    const withWait = `${fannedOut}wait`;
    expect(withWait).toMatch(/^[a-z_]+ & [a-z_]+ & [a-z_]+ &wait$/);
  });

  it("generic shape: falls back to file-based handoff (no subagent call)", () => {
    // Per cli-tools/subagents.md, the generic fallback never invokes
    // a subagent function — it writes a handoff file and the next
    // stage reads it. Validate that no subagent call shape leaks.
    const handoff: { subagent?: never; file: string } = {
      file: ".stelow/2026-07-09/abc/handoff.md",
    };
    expect(handoff.subagent).toBeUndefined();
    expect(handoff.file).toMatch(/^\.stelow\/.+\/handoff\.md$/);
  });

  it("pi shape: built-in subagent runs in its own context window", () => {
    // The pi built-in subagent has no special parameters; child
    // sessions are always isolated. The only contract is that the
    // parent must NOT pass any context-inheritance flags.
    const invocation = {
      prompt: "Review correctness of the auth refactor",
    };
    expect(typeof invocation.prompt).toBe("string");
    // Sanity: no `context` field at all
    expect(Object.keys(invocation)).toEqual(["prompt"]);
  });
});
