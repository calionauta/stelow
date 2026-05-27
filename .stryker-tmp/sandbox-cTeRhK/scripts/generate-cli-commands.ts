#!/usr/bin/env tsx
// @ts-nocheck
/**
 * generate-cli-commands.ts
 * 
 * Generates command files (markdown) for all supported CLIs
 * from the WORKFLOW_COMMANDS single source of truth in the dispatcher.
 * 
 * Usage:
 *   npx tsx scripts/generate-cli-commands.ts
 * 
 * Run before publish or during install to keep CLI command files in sync.
 */

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");

// ── Ensure build exists ─────────────────────────────────────────────

const buildDir = join(PROJECT_ROOT, "build", "extensions", "cali-product-workflow", "adapters", "commands");
const dispatcherJs = join(buildDir, "dispatcher.js");

if (!existsSync(dispatcherJs)) {
  console.log("[generate-cli-commands] Building project first...");
  execSync("npm run build", { cwd: PROJECT_ROOT, stdio: "inherit" });
}

// ── Import WORKFLOW_COMMANDS from compiled output ───────────────────

// Dynamic import of the built JS module
const dispatcher = await import("file://" + dispatcherJs);
const WORKFLOW_COMMANDS = dispatcher.WORKFLOW_COMMANDS;

if (!WORKFLOW_COMMANDS || !Array.isArray(WORKFLOW_COMMANDS)) {
  console.error("[generate-cli-commands] ERROR: WORKFLOW_COMMANDS not found in dispatcher.js");
  process.exit(1);
}

console.log(`[generate-cli-commands] Found ${WORKFLOW_COMMANDS.length} commands in dispatcher`);

// ── CLI configs ─────────────────────────────────────────────────────

interface CLIConfig {
  name: string;
  dir: string;
  format: "skill" | "command";
  fileHeader: (cmd: CommandInfo) => string;
  fileBody: (cmd: CommandInfo) => string;
}

interface CommandInfo {
  name: string;
  description: string;
  usage: string;
  piOnly: boolean;
}

const CLIS: CLIConfig[] = [
  {
    name: "opencode",
    dir: join(PROJECT_ROOT, "cli-agents", "opencode", "commands"),
    format: "skill",
    fileHeader: (c) => `---
name: ${c.name}
description: ${c.piOnly ? "[Pi only] " : ""}${c.description}
---

`,
    fileBody: (c) => c.piOnly
      ? `> ⚠️ This command requires the Pi extension for full functionality.
> Use /skill:cali-product-workflow and ask to ${c.name}.

/skill:cali-product-workflow ${c.name}
`
      : `/skill:cali-product-workflow

${c.name} {args}
`,
  },
  {
    name: "claude-code",
    dir: join(PROJECT_ROOT, "cli-agents", "claude", "commands"),
    format: "skill",
    fileHeader: (c) => `---
name: ${c.name}
description: ${c.piOnly ? "[Pi only] " : ""}${c.description}
---

`,
    fileBody: (c) => c.piOnly
      ? `> ⚠️ This command requires the Pi extension for full functionality.
> Use /skill:cali-product-workflow and ask to ${c.name}.

/skill:cali-product-workflow ${c.name}
`
      : `/skill:cali-product-workflow

${c.name} {args}
`,
  },
  {
    name: "codex",
    dir: join(PROJECT_ROOT, "cli-agents", "codex", "commands"),
    format: "command",
    fileHeader: (c) => `---
name: ${c.name}
description: ${c.piOnly ? "[Pi only] " : ""}${c.description}
---

@agent
`,
    fileBody: (c) => c.piOnly
      ? `> ⚠️ This command requires the Pi extension. Use the skill instead.
/skill:cali-product-workflow ${c.name}
`
      : `${c.name} {args}
`,
  },
];

// ── Generate ────────────────────────────────────────────────────────

function buildCommandInfo(cmd: any): CommandInfo {
  return {
    name: cmd.name,
    description: cmd.description,
    usage: cmd.usage || cmd.name,
    piOnly: !!cmd.piOnly,
  };
}

let totalGenerated = 0;

for (const cli of CLIS) {
  // Clean existing files (remove all pw-*.md)
  if (existsSync(cli.dir)) {
    const existing = readdirSync(cli.dir).filter(f => f.startsWith("pw-") && f.endsWith(".md"));
    for (const f of existing) {
      rmSync(join(cli.dir, f));
    }
  } else {
    mkdirSync(cli.dir, { recursive: true });
  }

  let count = 0;
  for (const rawCmd of WORKFLOW_COMMANDS) {
    const cmd = buildCommandInfo(rawCmd);
    const filePath = join(cli.dir, `${cmd.name}.md`);
    const content = cli.fileHeader(cmd) + cli.fileBody(cmd);

    writeFileSync(filePath, content, "utf-8");
    count++;
  }

  console.log(`[generate-cli-commands] ${cli.name}: generated ${count} command files → ${cli.dir}`);
  totalGenerated += count;
}

console.log(`[generate-cli-commands] ✅ Done — ${totalGenerated} files generated across ${CLIS.length} CLIs`);
