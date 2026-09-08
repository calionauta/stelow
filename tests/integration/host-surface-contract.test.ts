/**
 * Host-surface contract: pins the exact file surface third-party
 * hosts/plugins (bb-plugin-stelow today, others tomorrow) vendor or wrap.
 *
 * If a refactor renames, moves, or deletes one of these paths, hosts break
 * silently at sync time — this test fails loudly instead. Update HOSTING.md
 * in the same commit whenever this surface intentionally changes.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import {
  readdirSync, readFileSync, existsSync, statSync,
} from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");

function skillDirs(prefix: string): string[] {
  return readdirSync(join(ROOT, "skills"))
    .filter((d) => d.startsWith(prefix))
    .filter((d) => statSync(join(ROOT, "skills", d)).isDirectory());
}

describe("host vendoring surface", () => {
  it("scripts/stelow exists and is executable", () => {
    const helper = join(ROOT, "scripts", "stelow");
    expect(existsSync(helper)).toBe(true);
    expect(statSync(helper).mode & 0o111).toBeTruthy();
  });

  it("transitions.md exists (stage slugs hosts enforce)", () => {
    expect(
      existsSync(join(ROOT, "skills", "stelow-workflow-orchestrator", "references", "transitions.md")),
    ).toBe(true);
  });

  it("stelow.schema.json exists and parses", () => {
    const raw = readFileSync(join(ROOT, "stelow.schema.json"), "utf8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("hosting contract docs exist", () => {
    for (const doc of ["HOSTING.md", "references/host-levers.md"]) {
      expect(existsSync(join(ROOT, doc)), doc).toBe(true);
    }
  });

  it("exactly 14 workflow + 14 product skills with SKILL.md", () => {
    const workflow = skillDirs("stelow-workflow-");
    const product = skillDirs("stelow-product-");
    expect(workflow.length).toBe(14);
    expect(product.length).toBe(14);
    for (const dir of [...workflow, ...product]) {
      expect(existsSync(join(ROOT, "skills", dir, "SKILL.md")), dir).toBe(true);
    }
  });
});

describe("transitions mirror stages.yaml (no drift)", () => {
  function yamlStages(): string[] {
    const text = readFileSync(
      join(ROOT, "skills", "stelow-workflow-orchestrator", "stages.yaml"), "utf8",
    );
    return [...text.matchAll(/^\s*- name:\s*(\S+)\s*$/gm)].map((m) => m[1]);
  }

  function transitionsStages(): string[] {
    const text = readFileSync(
      join(ROOT, "skills", "stelow-workflow-orchestrator", "references", "transitions.md"), "utf8",
    );
    return [...text.matchAll(/^### (\S+)\s*$/gm)].map((m) => m[1]);
  }

  it("same stage slugs, same order", () => {
    const yaml = yamlStages();
    const md = transitionsStages();
    expect(yaml.length).toBeGreaterThan(0);
    expect(md).toEqual(yaml);
  });
});

describe("helper self-description covers the contract", () => {
  it("--help documents every host-facing subcommand", () => {
    let out = "";
    try {
      out = execFileSync(join(ROOT, "scripts", "stelow"), ["--help"], { encoding: "utf8" });
    } catch (err: any) {
      out = String(err.stdout ?? "");
    }
    for (const cmd of ["status", "advance", "doctor", "seed", "schema", "ask", "sync-scopes", "lock", "config"]) {
      expect(out, `--help mentions ${cmd}`).toMatch(new RegExp(`\\b${cmd}\\b`));
    }
  });

  it("schema subcommand emits JSON for every subcommand", () => {
    const out = execFileSync(join(ROOT, "scripts", "stelow"), ["schema"], { encoding: "utf8" });
    const body = JSON.parse(out);
    for (const cmd of ["status", "advance", "doctor", "seed", "ask", "sync-scopes", "lock", "config"]) {
      expect(body, `schema documents ${cmd}`).toHaveProperty(cmd);
    }
  });
});
