/**
 * Command Dispatcher
 * 
 * Routes command registration to the appropriate CLI-specific handler.
 * Provides a unified interface for all CLI command systems.
 */

import type { CLI, CLICapabilities } from "../../types";
import { detectCLI } from "../../state";

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
  const detected = cli || detectCLI();

  switch (detected) {
    case "pi":
      return getPiCommandSystem();
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
  const { writeFileSync, mkdirSync, existsSync } = require("node:fs");
  
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
