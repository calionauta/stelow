#!/usr/bin/env node
// One-off cleanup script for legacy workflow data.
// Run with: node tmp/clean-legacy-workflows.mjs [--clean] [--days=N]
//
//   (default)   Print report of global tracking + legacy workflows
//   --clean     Remove completed/archived entries from global tracking
//   --days=N    With --clean: only remove entries older than N days (default: 30)
//
// No cwd change. No backfill of missing `cwd` (can't infer project root
// without it — user must re-archive or manually re-create the workflow).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const GLOBAL = join(homedir(), ".cali-pw-global.json");
const args = process.argv.slice(2);
const doClean = args.includes("--clean");
const daysArg = args.find(a => a.startsWith("--days="));
const days = daysArg ? parseInt(daysArg.split("=")[1], 10) : 30;

if (!existsSync(GLOBAL)) {
  console.log(`No global tracking at ${GLOBAL}. Nothing to do.`);
  process.exit(0);
}

const data = JSON.parse(readFileSync(GLOBAL, "utf-8"));
const all = data.workflows ?? [];

console.log(`\n=== Global Tracking Report ===`);
console.log(`Path: ${GLOBAL}`);
console.log(`Total workflows: ${all.length}`);

// Group by status
const byStatus = {};
for (const w of all) {
  const s = w.status ?? "unknown";
  (byStatus[s] ??= []).push(w);
}
for (const [status, list] of Object.entries(byStatus)) {
  console.log(`  ${status.padEnd(12)} ${list.length}`);
}

// Legacy = no cwd field
const legacy = all.filter(w => !w.cwd);
console.log(`\n=== Legacy (no cwd) ===`);
console.log(`Count: ${legacy.length}`);
if (legacy.length > 0) {
  for (const w of legacy) {
    console.log(`  - ${w.name} (${w.status}) [${w.dirHash ?? "no hash"}]`);
  }
  console.log(`\nCannot auto-migrate (project root unknown). Options:`);
  console.log(`  1. Re-create workflow in correct project: cd <project> && /pw-start`);
  console.log(`  2. Manually edit ~/.cali-pw-global.json to set cwd`);
  console.log(`  3. Leave as-is — getActiveWorkflowCwd handles missing cwd conservatively (lock fires)`);
}

// In-progress projects (the only ones that affect active guards)
const inProgress = byStatus["in-progress"] ?? [];
console.log(`\n=== In-Progress (active) ===`);
for (const w of inProgress) {
  const cwd = w.cwd ?? "⚠️  MISSING";
  console.log(`  - ${w.name} → ${cwd}`);
}
if (inProgress.length === 0) {
  console.log(`  (none)`);
}

// Clean mode
if (doClean) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const keep = [];
  const removed = [];
  for (const w of all) {
    const isStale = w.status === "completed" || w.status === "archived";
    const updated = w.updated ? new Date(w.updated).getTime() : 0;
    if (isStale && updated > 0 && updated < cutoff) {
      removed.push(w);
    } else {
      keep.push(w);
    }
  }
  data.workflows = keep;
  data.updated = new Date().toISOString();
  writeFileSync(GLOBAL, JSON.stringify(data, null, 2));
  console.log(`\n=== Cleaned ===`);
  console.log(`Removed ${removed.length} stale entries (${days}d+ old, completed/archived).`);
  console.log(`Kept ${keep.length} entries.`);
  if (removed.length > 0) {
    console.log(`Removed:`);
    for (const w of removed) {
      console.log(`  - ${w.name} (${w.status}, updated ${w.updated})`);
    }
  }
}
