/**
 * Command Dispatcher
 * 
 * Routes command registration to the appropriate CLI-specific handler.
 * Provides a unified interface for all CLI command systems.
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import type { CLI, CLICapabilities } from "../../types";
import { detectHost } from "../../state";

export interface CommandDescriptor {
  /** Command name with kebab-case prefix (e.g., "sw-start") */
  name: string;
  /** Command description for help */
  description: string;
  /** Usage example */
  usage?: string;
  /** True if this command requires the Pi extension (TUI, state hooks, etc.) */
  piOnly?: boolean;
}

/**
 * All workflow commands with their metadata.
 */
export const WORKFLOW_COMMANDS: CommandDescriptor[] = [
  {
    name: "sw-start",
    description: "Start a new product workflow",
    usage: "/sw-start [name=...] [description=...] [@file] | (empty = reads inbox)",
  },
  {
    name: "sw-abort",
    description: "Abort and archive workflow(s) — kill active, keep disk copy",
    usage: "/sw-abort | all | name1 name2",
  },
  {
    name: "sw-pause",
    description: "Pause active workflow",
    usage: "/sw-pause",
  },
  {
    name: "sw-resume",
    description: "Resume paused workflow",
    usage: "/sw-resume [name=name]",
  },
  {
    name: "sw-status",
    description: "Show active workflow status",
    usage: "/sw-status",
  },
  {
    name: "sw-ls",
    description: "List workflows",
    usage: "/sw-ls | all | archived | path=DIR",
  },
  {
    name: "sw-setphase",
    description: "Jump to phase",
    usage: "/sw-setphase phase=N | phasename=Name",
  },
  {
    name: "sw-next",
    description: "Advance to next phase",
    usage: "/sw-next",
  },
  {
    name: "sw-complete",
    description: "Mark active workflow complete",
    usage: "/sw-complete",
  },
  {
    name: "sw-info",
    description: "Go to a workflow",
    usage: "/sw-info [name=name]",
  },
  {
    name: "sw-rename",
    description: "Rename active workflow",
    usage: "/sw-rename novo-nome | name=novo-nome",
  },
  {
    name: "sw-doctor",
    description: "Diagnose workflow tracking health",
    usage: "/sw-doctor",
  },
  {
    name: "sw-archive",
    description: "Archive workflows",
    usage: "/sw-archive | /sw-archive name=X | /sw-archive purge",
  },
  {
    name: "sw-unarchive",
    description: "Unarchive a workflow",
    usage: "/sw-unarchive name=<workflow>",
  },
  {
    name: "sw-recover",
    description: "Recover orphan workflow directories (workflow dirs on disk with no stelow.json entry)",
    usage: "/sw-recover | /sw-recover all",
  },
  {
    name: "sw-unlock",
    description: "Disable stage guard for this session (debug/emergency)",
    usage: "/sw-unlock",
    piOnly: true,
  },
  {
    name: "sw-inbox",
    description: "Manage workflow inbox",
    usage: "/sw-inbox | add <text> | remove <text> | clear | history",
    piOnly: true,
  },
  {
    name: "sw-pulse",
    description: "Manage automatic inbox processing (Pulse)",
    usage: "/sw-pulse | status | pause | resume | process | log [n]",
    piOnly: true,
  },
  {
    name: "sw-audit",
    description: "Show audit trail — full lineage from origin to delivery",
    usage: "/sw-audit [--scope <id>] [--format json|markdown]",
  },
];

/**
 * Command registration system interface.
 * Each CLI implements this to provide command registration.
 */
export interface CommandRegistrationSystem {
  /** Get CLI identifier */
  readonly cli: CLI;
  
  /** Check if this CLI supports native command registration */
  supportsNativeCommands(): boolean;
  
  /**
   * Register all workflow commands.
   * Returns list of successfully registered commands.
   */
  registerAll(): CommandDescriptor[];
  
  /**
   * Register a single command.
   */
  registerOne(descriptor: CommandDescriptor): boolean;
  
  /**
   * Get the command prefix for this CLI.
   * e.g., "/" for slash commands.
   */
  getCommandPrefix(): string;
  
  /**
   * Generate command files for CLIs that use file-based commands.
   * Returns array of {path, content} for files to create.
   */
  generateCommandFiles(): Array<{ path: string; content: string }>;
}

/**
 * Get the appropriate command registration system for the current CLI.
 */
export function getCommandSystem(cli?: CLI): CommandRegistrationSystem {
  const detected = cli || detectHost();

  switch (detected) {
    case "pi":
      return getPiCommandSystem();
    case "fusion":
      return getFusionCommandSystem();
    default:
      return getGenericCommandSystem();
  }
}

// ── Pi Command System ─────────────────────────────────────────────────

function getPiCommandSystem(): CommandRegistrationSystem {
  return {
    cli: "pi" as CLI,
    
    supportsNativeCommands(): boolean {
      return true;
    },
    
    registerAll(): CommandDescriptor[] {
      // Pi uses native command registration via ExtensionAPI
      // This is handled in commands.ts with pi.registerCommand()
      return WORKFLOW_COMMANDS;
    },
    
    registerOne(descriptor: CommandDescriptor): boolean {
      // Pi handles this via registerCommands() in commands.ts
      return true;
    },
    
    getCommandPrefix(): string {
      return "/";
    },
    
    generateCommandFiles(): Array<{ path: string; content: string }> {
      // Pi doesn't use file-based commands
      return [];
    },
  };
}

/**
 * Filter out Pi-only commands when targeting non-Pi hosts. Pi-only commands
 * rely on the Pi TUI/state-hooks/auto-sync primitives that Fusion does not
 * expose (Fusion supervises its own state natively). Surfacing them in
 * `.fusion/commands/` would emit broken artifacts that point at tools
 * Fusion doesn't have.
 */
function filterForHost(descriptors: CommandDescriptor[], host: CLI): CommandDescriptor[] {
  if (host === "pi") return descriptors;
  return descriptors.filter((d) => !d.piOnly);
}

function getFusionCommandSystem(): CommandRegistrationSystem {
  return {
    cli: "fusion",
    supportsNativeCommands: () => false,
    registerAll: () => filterForHost(WORKFLOW_COMMANDS, "fusion"),
    registerOne: (descriptor) => !descriptor.piOnly,
    getCommandPrefix: () => "/",
    generateCommandFiles: () => filterForHost(WORKFLOW_COMMANDS, "fusion").map(descriptor => ({
      path: `.fusion/commands/${descriptor.name}.md`,
      content: renderCommandFile(descriptor, "fusion"),
    })),
  };
}

function renderCommandFile(descriptor: CommandDescriptor, host: CLI): string {
  const usage = descriptor.usage ?? `/${descriptor.name}`;
  return `---
name: ${descriptor.name}
description: ${descriptor.description}
usage: ${usage}
host: ${host}
---
# /${descriptor.name}

${descriptor.description}

Usage: \`${usage}\`

## Fusion dispatch

This file is an executable agent command prompt; Fusion does **not** load the
Pi extension adapter at runtime.

1. Read \`skills/stelow-product-orchestrator/SKILL.md\` and the current
   project \`stelow.json\`.
2. Execute the \`${descriptor.name}\` operation described in
   \`cli-agents/COMMANDS.md\`, preserving the command arguments supplied
   after \`/${descriptor.name}\`.
3. Use Fusion-native tools where the skill names an agnostic tool:
   \`ask_user_question\` → \`fn_ask_question\`, \`subagent\` →
   \`fn_spawn_agent\`. Fusion has no native \`visual_review\`; write the
   documented fallback receipt at
   \`.stelow/approvals/{dirHash}/{file}.approved.md\`.
4. Persist workflow state in project-root \`stelow.json\`; do not move it
   into \`.fusion/\`.

For first-time Fusion setup, validate
\`.fusion/workflows/stelow-v2.json\` with \`fn_workflow_validate\`, then
register it with \`fn_workflow_create\`. Do not bypass Fusion validation.
`;
}

// ── Generic Command System (Fallback) ─────────────────────────────────

function getGenericCommandSystem(): CommandRegistrationSystem {
  return {
    cli: "generic" as CLI,
    
    supportsNativeCommands(): boolean {
      return false;
    },
    
    registerAll(): CommandDescriptor[] {
      // No commands registered in generic mode
      return [];
    },
    
    registerOne(_descriptor: CommandDescriptor): boolean {
      return false;
    },
    
    getCommandPrefix(): string {
      return "/";
    },
    
    generateCommandFiles(): Array<{ path: string; content: string }> {
      return [];
    },
  };
}

/**
 * Write command files to disk for CLI-specific command systems.
 * Call this during installation or first-run setup.
 * 
 * @param baseDir - Base directory to write command files
 * @param cli - Target CLI (defaults to detected)
 */
export function installCommandFiles(baseDir: string, cli?: CLI): void {
  const system = getCommandSystem(cli);
  const files = system.generateCommandFiles();

  for (const file of files) {
    const fullPath = `${baseDir}/${file.path}`;
    const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(fullPath, file.content, "utf8");
    console.log(`[stelow] Installed: ${file.path}`);
  }
}
