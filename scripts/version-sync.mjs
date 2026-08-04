#!/usr/bin/env node
/**
 * Version Sync Script
 *
 * Keeps version numbers in sync between:
 * - Main package.json
 *
 * Run automatically via `npm version` lifecycle hook.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Project root
const ROOT = join(__dirname, "..");

// JSON targets (plugin manifests, marketplace.json)
const JSON_TARGETS = [
  join(ROOT, "plugins", "fusion-plugin-stelow", "manifest.json"),
  join(ROOT, "plugins", "fusion-plugin-stelow", "package.json"),
];

// No host-specific manifests are version-synchronized.
const TOML_TARGETS = [];

// Files to sync
const FILES_TO_SYNC = [
  {
    source: join(ROOT, "package.json"),
    jsonTargets: JSON_TARGETS,
    tomlTargets: TOML_TARGETS,
  },
];

// Read version from source file
function readVersion(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const pkg = JSON.parse(content);
  return pkg.version;
}

// Write version to JSON target file
function writeVersion(filePath, version) {
  const content = readFileSync(filePath, "utf-8");
  const pkg = JSON.parse(content);
  // marketplace.json files use metadata.version (Claude schema);
  // plugin.json files use a root-level version. Prefer metadata when
  // present, fall back to root.
  // Host plugin manifests opt into this list explicitly.
  // for individual harnesses (where a user-supplied adapter PRs one) opt
  // into this list on a case-by-case basis.
  if (pkg.metadata && typeof pkg.metadata === "object") {
    pkg.metadata.version = version;
  } else {
    pkg.version = version;
  }
  writeFileSync(filePath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`  ✅ Synced version to: ${filePath.replace(ROOT + "/", "")}`);
}

// Write version to a TOML target file.
// Naive line-based replace: matches `^version = "..."` in the [package]
// section. Sufficient for the stelow plugin; if other TOML files
// with nested version fields need syncing, switch to a TOML parser.
function writeTomlVersion(filePath, version) {
  const content = readFileSync(filePath, "utf-8");
  // Use a regex object + .test() so we can distinguish a genuine
  // "no version line found" (regex.test() === false) from a no-op
  // (file already at target version, regex matched but replace() was
  // effectively a no-op). The naive `updated === content` check
  // spuriously reports "no match" when the file already has the
  // desired version, causing unnecessary errors on idempotent runs.
  const VERSION_LINE = /^version\s*=\s*".*"$/m;
  if (!VERSION_LINE.test(content)) {
    throw new Error(`no version line matched in ${filePath}`);
  }
  const updated = content.replace(
    VERSION_LINE,
    `version = "${version}"`,
  );
  writeFileSync(filePath, updated);
  console.log(`  ✅ Synced version to: ${filePath.replace(ROOT + "/", "")}`);
}

// Main sync function
function syncVersions() {
  console.log("🔄 Syncing versions...\n");

  for (const { source, jsonTargets, tomlTargets } of FILES_TO_SYNC) {
    try {
      const version = readVersion(source);
      console.log(`📦 Source: ${source.replace(ROOT + "/", "")} (v${version})`);

      for (const target of jsonTargets ?? []) {
        try {
          writeVersion(target, version);
        } catch (err) {
          console.error(`  ❌ Failed to sync ${target}: ${err.message}`);
        }
      }
      for (const target of tomlTargets ?? []) {
        try {
          writeTomlVersion(target, version);
        } catch (err) {
          console.error(`  ❌ Failed to sync ${target}: ${err.message}`);
        }
      }
    } catch (err) {
      console.error(`❌ Failed to read source ${source}: ${err.message}`);
    }
  }

  console.log("\n✨ Version sync complete!");
}

// Run if executed directly
syncVersions();

// Export for programmatic use
export { syncVersions, readVersion, writeVersion, writeTomlVersion };
