#!/usr/bin/env node
/**
 * Version Sync Script
 * 
 * Keeps version numbers in sync between:
 * - Main package.json
 * - extensions/cali-pw-pi/package.json
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

// Files to sync
const FILES_TO_SYNC = [
  {
    source: join(ROOT, "package.json"),
    targets: [
      join(ROOT, ".claude-plugin/plugin.json"),
      join(ROOT, ".claude-plugin/marketplace.json"),
      join(ROOT, ".codex-plugin/plugin.json"),
      join(ROOT, ".codex-plugin/marketplace.json"),
      join(ROOT, ".opencode-plugin/plugin.json"),
    ],
  },
];

// Read version from source file
function readVersion(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const pkg = JSON.parse(content);
  return pkg.version;
}

// Write version to target file
function writeVersion(filePath, version) {
  const content = readFileSync(filePath, "utf-8");
  const pkg = JSON.parse(content);
  // marketplace.json files use metadata.version (Claude/Codex schema);
  // plugin.json files use a root-level version. Prefer metadata when
  // present, fall back to root.
  if (pkg.metadata && typeof pkg.metadata === "object") {
    pkg.metadata.version = version;
  } else {
    pkg.version = version;
  }
  writeFileSync(filePath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`  ✅ Synced version to: ${filePath.replace(ROOT + "/", "")}`);
}

// Main sync function
function syncVersions() {
  console.log("🔄 Syncing versions...\n");

  for (const { source, targets } of FILES_TO_SYNC) {
    try {
      const version = readVersion(source);
      console.log(`📦 Source: ${source.replace(ROOT + "/", "")} (v${version})`);

      for (const target of targets) {
        try {
          writeVersion(target, version);
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
export { syncVersions, readVersion, writeVersion };
