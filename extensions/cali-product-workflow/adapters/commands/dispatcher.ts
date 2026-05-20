/**
 * Command Dispatcher
 * 
 * Routes command registration to the appropriate CLI-specific handler.
 * Provides a unified interface for all CLI command systems.
 */

import type { CLI, CLICapabilities } from "../../types";
import { detectCLI } from "../../state";

export interface CommandDescriptor {
  /** Full command name (e.g., "pw:start") */
  name: string;
  /** Canonical name for storage (e.g., "product-workflow-start") */
  canonicalName: string;
  /** Command description for help */
  description: string;
  /** Usage example */
  usage?: string;
}

/**
 * All workflow commands with their metadata.
 */
export const WORKFLOW_COMMANDS: CommandDescriptor[] = [
  {
    name: "pw:start",
    canonicalName: "product-workflow-start",
    description: "Start a new product workflow",
    usage: "/pw:start [name=...] [description=...] [@file]",
  },
  {
    name: "pw:stop",
    canonicalName: "product-workflow-stop",
    description: "Stop workflow(s)",
    usage: "/pw:stop | all | name1 name2",
  },
  {
    name: "pw:pause",
    canonicalName: "product-workflow-pause",
    description: "Pause active workflow",
    usage: "/pw:pause",
  },
  {
    name: "pw:resume",
    canonicalName: "product-workflow-resume",
    description: "Resume paused workflow",
    usage: "/pw:resume [name=name]",
  },
  {
    name: "pw:status",
    canonicalName: "product-workflow-status",
    description: "Show active workflow status",
    usage: "/pw:status",
  },
  {
    name: "pw:ls",
    canonicalName: "product-workflow-list",
    description: "List workflows",
    usage: "/pw:ls | all | archived | path=DIR",
  },
  {
    name: "pw:setphase",
    canonicalName: "product-workflow-setphase",
    description: "Jump to phase",
    usage: "/pw:setphase phase=N | phasename=Name",
  },
  {
    name: "pw:next",
    canonicalName: "product-workflow-next",
    description: "Advance to next phase",
    usage: "/pw:next",
  },
  {
    name: "pw:complete",
    canonicalName: "product-workflow-complete",
    description: "Mark active workflow complete",
    usage: "/pw:complete",
  },
  {
    name: "pw:goto",
    canonicalName: "product-workflow-goto",
    description: "Go to a workflow",
    usage: "/pw:goto [name=name]",
  },
  {
    name: "pw:rename",
    canonicalName: "product-workflow-rename",
    description: "Rename active workflow",
    usage: "/pw:rename novo-nome | name=novo-nome",
  },
  {
    name: "pw:menu",
    canonicalName: "product-workflow-menu",
    description: "Open workflow overview overlay",
    usage: "/pw:menu",
  },
  {
    name: "pw:clean",
    canonicalName: "product-workflow-clean",
    description: "Archive stale or purge archived",
    usage: "/pw:clean [hours=4] | purge",
  },
];

/**
 * Get commands that are aliases.
 */
export function getAliasCommands(): CommandDescriptor[] {
  return WORKFLOW_COMMANDS;
}

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
    case "opencode":
      return getOpenCodeCommandSystem();
    case "claude-code":
      return getClaudeCodeCommandSystem();
    case "codex":
      return getCodexCommandSystem();
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

// ── OpenCode Command System ───────────────────────────────────────────

function getOpenCodeCommandSystem(): CommandRegistrationSystem {
  return {
    cli: "opencode" as CLI,
    
    supportsNativeCommands(): boolean {
      return false; // OpenCode uses skill files
    },
    
    registerAll(): CommandDescriptor[] {
      // OpenCode uses skills/ directory
      return WORKFLOW_COMMANDS;
    },
    
    registerOne(_descriptor: CommandDescriptor): boolean {
      // Commands are file-based
      return true;
    },
    
    getCommandPrefix(): string {
      return "/";
    },
    
    generateCommandFiles(): Array<{ path: string; content: string }> {
      return WORKFLOW_COMMANDS.map(cmd => ({
        path: `skills/${cmd.name.replace(":", "-")}.md`,
        content: generateOpenCodeSkillFile(cmd),
      }));
    },
  };
}

function generateOpenCodeSkillFile(cmd: CommandDescriptor): string {
  return `---
name: ${cmd.name}
description: ${cmd.description}
---

${cmd.usage ? `// Usage: ${cmd.usage}` : ""}

/skill:cali-product-workflow

// Command: ${cmd.name}
// This skill delegates to the product-workflow skill
${cmd.name} {args}
`;
}

// ── Claude Code Command System ────────────────────────────────────────

function getClaudeCodeCommandSystem(): CommandRegistrationSystem {
  return {
    cli: "claude-code" as CLI,
    
    supportsNativeCommands(): boolean {
      return false; // Claude Code uses skills/
    },
    
    registerAll(): CommandDescriptor[] {
      return WORKFLOW_COMMANDS;
    },
    
    registerOne(_descriptor: CommandDescriptor): boolean {
      return true;
    },
    
    getCommandPrefix(): string {
      return "/";
    },
    
    generateCommandFiles(): Array<{ path: string; content: string }> {
      return WORKFLOW_COMMANDS.map(cmd => ({
        path: `skills/${cmd.name.replace(":", "-")}.md`,
        content: generateClaudeCodeSkillFile(cmd),
      }));
    },
  };
}

function generateClaudeCodeSkillFile(cmd: CommandDescriptor): string {
  return `---
name: ${cmd.name}
description: ${cmd.description}
---

// Usage: ${cmd.usage || cmd.description}
${cmd.name} {args}
`;
}

// ── Codex Command System ──────────────────────────────────────────────

function getCodexCommandSystem(): CommandRegistrationSystem {
  return {
    cli: "codex" as CLI,
    
    supportsNativeCommands(): boolean {
      return false; // Codex uses commands/ directory
    },
    
    registerAll(): CommandDescriptor[] {
      return WORKFLOW_COMMANDS;
    },
    
    registerOne(_descriptor: CommandDescriptor): boolean {
      return true;
    },
    
    getCommandPrefix(): string {
      return "/";
    },
    
    generateCommandFiles(): Array<{ path: string; content: string }> {
      return WORKFLOW_COMMANDS.map(cmd => ({
        path: `commands/${cmd.name.replace(":", "-")}.md`,
        content: generateCodexCommandFile(cmd),
      }));
    },
  };
}

function generateCodexCommandFile(cmd: CommandDescriptor): string {
  return `---
name: ${cmd.name}
description: ${cmd.description}
---

@agent
// Usage: ${cmd.usage || cmd.description}
${cmd.name} {args}
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
    console.log(`[cali-product-workflow] Installed: ${file.path}`);
  }
}