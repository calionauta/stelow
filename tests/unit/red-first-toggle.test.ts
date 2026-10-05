// tests/unit/red-first-toggle.test.ts
//
// Fase 0 kill-switch: single source `config.red_first` (strict|advisory|off).
//
// Behavioral contract (all tests spawn real bash against temp git repos or
// temp dirs — no implementation lives in this file):
//   - `seed --red-first <mode>` stores the mode; absent flag defaults by
//     quality (production→strict, experimental→advisory)
//   - `config get red_first` resolves STELOW_RED_FIRST > stored > quality default
//   - `config set red_first <mode>` persists to stelow.json + state.md
//   - `stelow_read_red_first` (read-config.sh) follows the same resolution
//   - stelow.schema.json and types/stages.ts agree (same literals, both optional)
//
// To run: npm run test:unit -- red-first-toggle

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { execSync, spawnSync } from "node:child_process";
import {
  mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync, rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { RED_FIRST_MODES } from "../../types/stages";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = join(dirname(__filename), "..", "..");
const HELPER_SRC = join(REPO_ROOT, "scripts", "stelow");
const TRANSITIONS_SRC = join(
  REPO_ROOT, "skills", "stelow-workflow-orchestrator", "references", "transitions.md",
);
const READ_CONFIG_SRC = join(
  REPO_ROOT, "skills", "stelow-workflow-orchestrator", "references", "cli-tools", "read-config.sh",
);
const SCHEMA_PATH = join(REPO_ROOT, "stelow.schema.json");

interface Workdir { dir: string; helper: string; statedir: string; }
const workdirs: string[] = [];

function makeWorkdir(): Workdir {
  const id = randomBytes(6).toString("hex");
  const dir = mkdtempSync(join(tmpdir(), `stelow-redfirst-${process.pid}-${id}`));
  execSync("git init -q", { cwd: dir });
  execSync("git config user.email test@test", { cwd: dir });
  execSync("git config user.name test", { cwd: dir });
  mkdirSync(join(dir, "skills", "stelow-workflow-orchestrator", "references"), { recursive: true });
  const helper = join(dir, "scripts", "stelow");
  mkdirSync(join(dir, "scripts"), { recursive: true });
  writeFileSync(helper, readFileSync(HELPER_SRC));
  execSync("chmod +x scripts/stelow", { cwd: dir });
  writeFileSync(
    join(dir, "skills", "stelow-workflow-orchestrator", "references", "transitions.md"),
    readFileSync(TRANSITIONS_SRC),
  );
  execSync("git add -A && git commit -q -m init", { cwd: dir });
  workdirs.push(dir);
  return { dir, helper, statedir: "" };
}

function run(
  wd: Workdir, args: string[], env: Record<string, string> = {},
): { status: number; stdout: string; stderr: string } {
  const r = spawnSync("bash", [wd.helper, ...args], {
    cwd: wd.dir, encoding: "utf8",
    env: { ...process.env, PATH: process.env.PATH ?? "", ...env },
  });
  return { status: r.status ?? -1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function seed(wd: Workdir, extra: string[] = [], quality = "production"): Workdir {
  const r = run(wd, ["seed", "--name", "w", "--intent", "feature", "--quality", quality, "--json", ...extra]);
  expect(r.status).toBe(0);
  const out = JSON.parse(r.stdout) as { statedir: string };
  return { ...wd, statedir: out.statedir };
}

function trackingEntry(wd: Workdir): Record<string, unknown> {
  const t = JSON.parse(readFileSync(join(wd.dir, "stelow.json"), "utf8")) as {
    workflows: Record<string, unknown>[];
  };
  const wf = t.workflows.find((w) => w["name"] === "w") as {
    config: Record<string, unknown>;
  };
  return wf.config;
}

afterAll(() => {
  for (const d of workdirs) {
    try { rmSync(d, { recursive: true, force: true }); } catch {}
  }
});

describe("seed --red-first (single source default)", () => {
  it("defaults to strict when quality is production", () => {
    const wd = seed(makeWorkdir(), [], "production");
    expect(trackingEntry(wd)["red_first"]).toBe("strict");
    const state = readFileSync(join(wd.statedir, "state.md"), "utf8");
    expect(state).toContain("red_first: strict");
  });

  it("defaults to advisory when quality is experimental", () => {
    const wd = seed(makeWorkdir(), [], "experimental");
    expect(trackingEntry(wd)["red_first"]).toBe("advisory");
  });

  it("stores an explicit --red-first off in stelow.json and state.md", () => {
    const wd = seed(makeWorkdir(), ["--red-first", "off"], "production");
    expect(trackingEntry(wd)["red_first"]).toBe("off");
    const state = readFileSync(join(wd.statedir, "state.md"), "utf8");
    expect(state).toContain("red_first: off");
  });

  it("rejects an invalid --red-first value with exit 2 and writes nothing", () => {
    const wd = makeWorkdir();
    const r = run(wd, ["seed", "--name", "w", "--intent", "feature", "--red-first", "bogus"]);
    expect(r.status).toBe(2);
    expect(existsSync(join(wd.dir, "stelow.json"))).toBe(false);
  });
});

describe("config get/set red_first", () => {
  it("config get returns the stored value", () => {
    const wd = seed(makeWorkdir(), ["--red-first", "advisory"]);
    const r = run(wd, ["config", "get", "red_first", "strict"], { STELOW_STATEDIR: wd.statedir });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe("advisory");
  });

  it("config get falls back to strict for production when unset", () => {
    const wd = seed(makeWorkdir(), [], "production");
    // strip red_first to simulate a pre-toggle workflow entry
    const path = join(wd.dir, "stelow.json");
    const t = JSON.parse(readFileSync(path, "utf8")) as {
      workflows: { name: string; config: Record<string, unknown> }[];
    };
    delete t.workflows.find((w) => w.name === "w")!.config["red_first"];
    writeFileSync(path, JSON.stringify(t, null, 2));
    const r = run(wd, ["config", "get", "red_first", "UNSET"], { STELOW_STATEDIR: wd.statedir });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe("strict");
  });

  it("config get falls back to advisory for experimental when unset", () => {
    const wd = seed(makeWorkdir(), [], "experimental");
    const path = join(wd.dir, "stelow.json");
    const t = JSON.parse(readFileSync(path, "utf8")) as {
      workflows: { name: string; config: Record<string, unknown> }[];
    };
    delete t.workflows.find((w) => w.name === "w")!.config["red_first"];
    writeFileSync(path, JSON.stringify(t, null, 2));
    const r = run(wd, ["config", "get", "red_first", "UNSET"], { STELOW_STATEDIR: wd.statedir });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe("advisory");
  });

  it("STELOW_RED_FIRST env override wins over the stored value", () => {
    const wd = seed(makeWorkdir(), ["--red-first", "strict"]);
    const r = run(wd, ["config", "get", "red_first", "strict"], {
      STELOW_STATEDIR: wd.statedir, STELOW_RED_FIRST: "off",
    });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe("off");
  });

  it("an invalid STELOW_RED_FIRST is ignored (stored value wins)", () => {
    const wd = seed(makeWorkdir(), ["--red-first", "strict"]);
    const r = run(wd, ["config", "get", "red_first", "strict"], {
      STELOW_STATEDIR: wd.statedir, STELOW_RED_FIRST: "bogus",
    });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe("strict");
  });

  it("config set persists to stelow.json and state.md", () => {
    const wd = seed(makeWorkdir(), ["--red-first", "strict"]);
    const s = run(wd, ["config", "set", "red_first", "advisory"], { STELOW_STATEDIR: wd.statedir });
    expect(s.status).toBe(0);
    expect(trackingEntry(wd)["red_first"]).toBe("advisory");
    const state = readFileSync(join(wd.statedir, "state.md"), "utf8");
    expect(state).toContain("red_first: advisory");
    const g = run(wd, ["config", "get", "red_first", "strict"], { STELOW_STATEDIR: wd.statedir });
    expect(g.stdout.trim()).toBe("advisory");
  });

  it("config set rejects an invalid value with exit 2 and keeps the old value", () => {
    const wd = seed(makeWorkdir(), ["--red-first", "strict"]);
    const s = run(wd, ["config", "set", "red_first", "bogus"], { STELOW_STATEDIR: wd.statedir });
    expect(s.status).toBe(2);
    expect(trackingEntry(wd)["red_first"]).toBe("strict");
  });
});

describe("read-config.sh stelow_read_red_first", () => {
  let tmpDir: string;
  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "stelow-redfirst-rc-"));
    workdirs.push(tmpDir);
  });

  function writeStelow(workflows: unknown[]): void {
    writeFileSync(join(tmpDir, "stelow.json"), JSON.stringify({
      $schema: "test", version: "1.0",
      created: new Date().toISOString(), updated: new Date().toISOString(),
      workflows,
    }, null, 2));
  }

  function readRedFirst(env: Record<string, string> = {}): string {
    return execSync(`cd "${tmpDir}" && bash -c 'source "${READ_CONFIG_SRC}" && stelow_read_red_first'`, {
      encoding: "utf-8", shell: "/bin/bash",
      env: { ...process.env, PATH: process.env.PATH ?? "", ...env },
    }).trim();
  }

  it("returns the stored value from the in-progress workflow", () => {
    writeStelow([
      { name: "old", status: "archived", config: { quality: "production", red_first: "off" } },
      { name: "active", status: "in-progress", config: { quality: "production", red_first: "advisory" } },
    ]);
    expect(readRedFirst()).toBe("advisory");
  });

  it("defaults to strict for production when unset", () => {
    writeStelow([{ name: "active", status: "in-progress", config: { quality: "production" } }]);
    expect(readRedFirst()).toBe("strict");
  });

  it("defaults to advisory for experimental when unset", () => {
    writeStelow([{ name: "active", status: "in-progress", config: { quality: "experimental" } }]);
    expect(readRedFirst()).toBe("advisory");
  });

  it("STELOW_RED_FIRST env override wins", () => {
    writeStelow([{ name: "active", status: "in-progress", config: { quality: "production", red_first: "strict" } }]);
    expect(readRedFirst({ STELOW_RED_FIRST: "off" })).toBe("off");
  });
});

describe("status --json surfaces red_first (single source visible)", () => {
  it("reports the stored mode in status --json config", () => {
    const wd = seed(makeWorkdir(), ["--red-first", "off"]);
    const r = run(wd, ["status", "--json"], { STELOW_STATEDIR: wd.statedir });
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { config: Record<string, string> };
    expect(out.config["red_first"]).toBe("off");
  });

  it("reports the quality default (strict) when seeded without a flag", () => {
    const wd = seed(makeWorkdir(), [], "production");
    const r = run(wd, ["status", "--json"], { STELOW_STATEDIR: wd.statedir });
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout) as { config: Record<string, string> };
    expect(out.config["red_first"]).toBe("strict");
  });
});

describe("contract parity: schema and types agree on red_first", () => {
  function schemaAllows(doc: unknown): boolean {
    const r = spawnSync("python3", ["-c", [
      "import json, sys, jsonschema",
      "schema = json.load(open(sys.argv[1]))",
      "doc = json.loads(sys.stdin.read())",
      "try:",
      "    jsonschema.validate(doc, schema)",
      "except Exception:",
      "    sys.exit(1)",
    ].join("\n"), SCHEMA_PATH], {
      input: JSON.stringify(doc), encoding: "utf8",
    });
    return (r.status ?? -1) === 0;
  }

  function workflowDoc(config?: Record<string, unknown>): unknown {
    const wf: Record<string, unknown> = { name: "w", status: "in-progress", phases: [] };
    if (config !== undefined) wf["config"] = config;
    return {
      $schema: "test", version: "1.0",
      created: new Date().toISOString(), updated: new Date().toISOString(),
      workflows: [wf],
    };
  }

  it("stelow.schema.json accepts strict|advisory|off and rejects bogus", () => {
    for (const mode of ["strict", "advisory", "off"]) {
      expect(schemaAllows(workflowDoc({ quality: "production", red_first: mode }))).toBe(true);
    }
    expect(schemaAllows(workflowDoc({ quality: "production", red_first: "bogus" }))).toBe(false);
  });

  it("stelow.schema.json leaves red_first optional (absent config validates)", () => {
    expect(schemaAllows(workflowDoc())).toBe(true);
    expect(schemaAllows(workflowDoc({ quality: "production" }))).toBe(true);
  });

  it("types/stages.ts RED_FIRST_MODES agrees with the schema enum (imported, not grepped)", () => {
    expect([...RED_FIRST_MODES]).toEqual(["strict", "advisory", "off"]);
    const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8")) as {
      definitions: {
        workflow: {
          properties: { config: { properties: { red_first: { enum: string[] } } } };
        };
      };
    };
    expect(schema.definitions.workflow.properties.config.properties.red_first.enum)
      .toEqual([...RED_FIRST_MODES]);
  });
});
