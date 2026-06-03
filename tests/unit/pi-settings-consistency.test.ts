/**
 * pi-settings-consistency.test.ts — Validate Pi settings.json for this project.
 *
 * The extension registers /pw- commands; skills live in ~/.agents/skills/
 * (kept fresh by syncSkillsFromClone()). To avoid duplication, the Pi package
 * entry in settings.json MUST have:
 *   - "extensions": ["+extensions/cali-product-workflow/index.ts"]
 *   - "skills": []
 *   - "source": "git:github.com/renatocaliari/cali-product-workflow"
 *
 * Tests use tempdir fixtures to validate the parser/validator logic, then
 * optionally check the real ~/.pi/agent/settings.json as integration check.
 */
import { describe, it, expect } from "vitest";
import {
  readFileSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { homedir } from "node:os";

// ── Types ────────────────────────────────────────────────────────────

interface PiPackageEntry {
  extensions?: string[];
  skills?: string[];
  source: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const PACKAGE_SOURCE = "git:github.com/renatocaliari/cali-product-workflow";

// ── Helpers ──────────────────────────────────────────────────────────

function readPackageEntry(jsonPath: string): PiPackageEntry | undefined {
  const raw = readFileSync(jsonPath, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data.packages)) return undefined;
  return data.packages.find(
    (p: unknown) =>
      typeof p === "object" &&
      p !== null &&
      (p as PiPackageEntry).source === PACKAGE_SOURCE,
  );
}

function withTempSettings(entries: unknown[]): {
  path: string;
  cleanup: () => void;
} {
  const dir = mkdtempSync(join(tmpdir(), "pi-settings-test-"));
  const path = join(dir, "settings.json");
  const content = JSON.stringify({ packages: entries }, null, 2);
  writeFileSync(path, content, "utf8");
  return {
    path,
    cleanup: () => {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    },
  };
}

/**
 * Validate a single Pi package entry.
 * Returns { valid, errors } where errors is a list of problems found.
 */
function validatePackageEntry(
  entry: PiPackageEntry | undefined,
): ValidationResult {
  const errors: string[] = [];

  if (!entry) {
    errors.push(`No package entry with source '${PACKAGE_SOURCE}' found.`);
    return { valid: false, errors };
  }

  // 1. Source
  if (entry.source !== PACKAGE_SOURCE) {
    errors.push(`Expected source '${PACKAGE_SOURCE}', got '${entry.source}'.`);
  }

  // 2. Extensions — must not be force-excluded
  if (!entry.extensions || entry.extensions.length === 0) {
    errors.push("Missing or empty 'extensions' array.");
  } else {
    for (const ext of entry.extensions) {
      if (ext.startsWith("-")) {
        errors.push(
          `Extension '${ext}' has '-' prefix (force-exclude). ` +
            `Commands /pw-start, /pw-menu, etc. will not register. ` +
            `Change to '+' or remove the '-' prefix.`,
        );
      }
      if (!ext.includes("cali-product-workflow")) {
        errors.push(
          `Extension '${ext}' does not reference cali-product-workflow.`,
        );
      }
    }
  }

  // 3. Skills must be [] to prevent duplicate discovery
  if (entry.skills === undefined) {
    errors.push(
      "Missing 'skills' field. Pi discovers skills from git clone AND from ~/.agents/skills/ " +
        "causing duplicates. Add 'skills': [].",
    );
  } else if (!Array.isArray(entry.skills)) {
    errors.push(`'skills' must be an array, got ${typeof entry.skills}.`);
  } else if (entry.skills.length > 0) {
    errors.push(
      `skills is [${entry.skills.join(", ")}]. Must be [] to prevent duplicate discovery. ` +
        "Skills are served from ~/.agents/skills/ via syncSkillsFromClone().",
    );
  }

  return { valid: errors.length === 0, errors };
}

// ── Test: entry detection ────────────────────────────────────────────

describe("pi settings — entry detection", () => {
  it("finds the package entry by source", () => {
    const { path, cleanup } = withTempSettings([
      { source: "git:github.com/some/other", extensions: ["./extras"] },
      {
        source: PACKAGE_SOURCE,
        extensions: ["+extensions/cali-product-workflow/index.ts"],
        skills: [],
      },
    ]);
    try {
      const entry = readPackageEntry(path);
      expect(entry).toBeDefined();
      expect(entry!.source).toBe(PACKAGE_SOURCE);
    } finally {
      cleanup();
    }
  });

  it("returns undefined when no entry matches", () => {
    const { path, cleanup } = withTempSettings([
      { source: "git:github.com/some/other" },
    ]);
    try {
      expect(readPackageEntry(path)).toBeUndefined();
    } finally {
      cleanup();
    }
  });

  it("handles malformed JSON gracefully", () => {
    const dir = mkdtempSync(join(tmpdir(), "pi-settings-test-"));
    const path = join(dir, "settings.json");
    writeFileSync(path, "NOT JSON", "utf8");
    try {
      expect(() => readPackageEntry(path)).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("handles missing packages key", () => {
    const { path, cleanup } = withTempSettings([]);
    try {
      expect(readPackageEntry(path)).toBeUndefined();
    } finally {
      cleanup();
    }
  });
});

// ── Test: validation logic ───────────────────────────────────────────

describe("pi settings — validatePackageEntry", () => {
  it("passes a correct entry", () => {
    const entry: PiPackageEntry = {
      source: PACKAGE_SOURCE,
      extensions: ["+extensions/cali-product-workflow/index.ts"],
      skills: [],
    };
    const result = validatePackageEntry(entry);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("accepts no prefix on extensions (default = load)", () => {
    const entry: PiPackageEntry = {
      source: PACKAGE_SOURCE,
      extensions: ["extensions/cali-product-workflow/index.ts"],
      skills: [],
    };
    const result = validatePackageEntry(entry);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects undefined entry", () => {
    const result = validatePackageEntry(undefined);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain(PACKAGE_SOURCE);
  });

  it("rejects force-excluded extension (- prefix)", () => {
    const entry: PiPackageEntry = {
      source: PACKAGE_SOURCE,
      extensions: ["-extensions/cali-product-workflow/index.ts"],
      skills: [],
    };
    const result = validatePackageEntry(entry);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("force-exclude"))).toBe(true);
  });

  it("rejects missing skills field", () => {
    const entry: PiPackageEntry = {
      source: PACKAGE_SOURCE,
      extensions: ["+extensions/cali-product-workflow/index.ts"],
    };
    const result = validatePackageEntry(entry);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Missing 'skills'"))).toBe(
      true,
    );
  });

  it("rejects non-empty skills array", () => {
    const entry: PiPackageEntry = {
      source: PACKAGE_SOURCE,
      extensions: ["+extensions/cali-product-workflow/index.ts"],
      skills: ["cali-product-workflow"],
    };
    const result = validatePackageEntry(entry);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Must be []"))).toBe(true);
  });

  it("rejects missing extensions", () => {
    const entry: PiPackageEntry = {
      source: PACKAGE_SOURCE,
      skills: [],
    };
    const result = validatePackageEntry(entry);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("extensions"))).toBe(true);
  });

  it("rejects empty extensions", () => {
    const entry: PiPackageEntry = {
      source: PACKAGE_SOURCE,
      extensions: [],
      skills: [],
    };
    const result = validatePackageEntry(entry);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("extensions"))).toBe(true);
  });
});

// ── Full entry via temp settings.json ─────────────────────────────────

describe("pi settings — file integration", () => {
  it("validates a correct settings.json end-to-end", () => {
    const { path, cleanup } = withTempSettings([
      {
        source: PACKAGE_SOURCE,
        extensions: ["+extensions/cali-product-workflow/index.ts"],
        skills: [],
      },
    ]);
    try {
      const entry = readPackageEntry(path);
      const result = validatePackageEntry(entry);
      expect(result.valid).toBe(true);
    } finally {
      cleanup();
    }
  });

  it("detects force-excluded extension from file", () => {
    const { path, cleanup } = withTempSettings([
      {
        source: PACKAGE_SOURCE,
        extensions: ["-extensions/cali-product-workflow/index.ts"],
        skills: [],
      },
    ]);
    try {
      const entry = readPackageEntry(path);
      const result = validatePackageEntry(entry);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("force-exclude"))).toBe(
        true,
      );
    } finally {
      cleanup();
    }
  });

  it("detects missing skills from file", () => {
    const { path, cleanup } = withTempSettings([
      {
        source: PACKAGE_SOURCE,
        extensions: ["+extensions/cali-product-workflow/index.ts"],
      },
    ]);
    try {
      const entry = readPackageEntry(path);
      const result = validatePackageEntry(entry);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Missing 'skills'"))).toBe(
        true,
      );
    } finally {
      cleanup();
    }
  });

  it("detects non-empty skills from file", () => {
    const { path, cleanup } = withTempSettings([
      {
        source: PACKAGE_SOURCE,
        extensions: ["+extensions/cali-product-workflow/index.ts"],
        skills: ["cali-product-workflow"],
      },
    ]);
    try {
      const entry = readPackageEntry(path);
      const result = validatePackageEntry(entry);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Must be []"))).toBe(true);
    } finally {
      cleanup();
    }
  });
});

// ── Real settings.json (solo, runs only when file exists) ─────────────

describe("pi settings — real ~/.pi/agent/settings.json", () => {
  const realPath = join(homedir(), ".pi/agent/settings.json");
  const fileExists = existsSync(realPath);

  it("exists", () => {
    expect(
      existsSync(realPath),
      `Real settings.json not found at ${realPath}. ` +
        "This is a Pi environment check — skip if running outside Pi.",
    ).toBe(true);
  });

  (fileExists ? it : it.skip)(
    "has a valid cali-product-workflow entry",
    () => {
      const entry = readPackageEntry(realPath);
      const result = validatePackageEntry(entry);

      if (!result.valid) {
        const msg =
          [
            `❌ settings.json entry for ${PACKAGE_SOURCE} is invalid:`,
            ...result.errors.map((e: string) => `  • ${e}`),
            "",
            "Run: jq '" +
              "(.packages // []) |= map(if type == \"object\" and .source == \"" +
              PACKAGE_SOURCE +
              "\" then .skills = [] else . end)'" +
              " ~/.pi/agent/settings.json > ~/.pi/agent/settings.json.tmp && mv ~/.pi/agent/settings.json.tmp ~/.pi/agent/settings.json",
            "Then also ensure extensions have '+' (not '-') prefix.",
          ].join("\n");
        throw new Error(msg);
      }

      expect(result.valid).toBe(true);
    },
  );
});
