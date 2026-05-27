/**
 * Command Dispatcher
 * 
 * Routes command registration to the appropriate CLI-specific handler.
 * Provides a unified interface for all CLI command systems.
 */
// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import type { CLI, CLICapabilities } from "../../types";
import { detectCLI } from "../../state";
export interface CommandDescriptor {
  /** Command name with kebab-case prefix (e.g., "pw-start") */
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
export const WORKFLOW_COMMANDS: CommandDescriptor[] = stryMutAct_9fa48("248") ? [] : (stryCov_9fa48("248"), [stryMutAct_9fa48("249") ? {} : (stryCov_9fa48("249"), {
  name: stryMutAct_9fa48("250") ? "" : (stryCov_9fa48("250"), "pw-start"),
  description: stryMutAct_9fa48("251") ? "" : (stryCov_9fa48("251"), "Start a new product workflow"),
  usage: stryMutAct_9fa48("252") ? "" : (stryCov_9fa48("252"), "/pw-start [name=...] [description=...] [@file]")
}), stryMutAct_9fa48("253") ? {} : (stryCov_9fa48("253"), {
  name: stryMutAct_9fa48("254") ? "" : (stryCov_9fa48("254"), "pw-stop"),
  description: stryMutAct_9fa48("255") ? "" : (stryCov_9fa48("255"), "Stop workflow(s)"),
  usage: stryMutAct_9fa48("256") ? "" : (stryCov_9fa48("256"), "/pw-stop | all | name1 name2")
}), stryMutAct_9fa48("257") ? {} : (stryCov_9fa48("257"), {
  name: stryMutAct_9fa48("258") ? "" : (stryCov_9fa48("258"), "pw-pause"),
  description: stryMutAct_9fa48("259") ? "" : (stryCov_9fa48("259"), "Pause active workflow"),
  usage: stryMutAct_9fa48("260") ? "" : (stryCov_9fa48("260"), "/pw-pause")
}), stryMutAct_9fa48("261") ? {} : (stryCov_9fa48("261"), {
  name: stryMutAct_9fa48("262") ? "" : (stryCov_9fa48("262"), "pw-resume"),
  description: stryMutAct_9fa48("263") ? "" : (stryCov_9fa48("263"), "Resume paused workflow"),
  usage: stryMutAct_9fa48("264") ? "" : (stryCov_9fa48("264"), "/pw-resume [name=name]")
}), stryMutAct_9fa48("265") ? {} : (stryCov_9fa48("265"), {
  name: stryMutAct_9fa48("266") ? "" : (stryCov_9fa48("266"), "pw-status"),
  description: stryMutAct_9fa48("267") ? "" : (stryCov_9fa48("267"), "Show active workflow status"),
  usage: stryMutAct_9fa48("268") ? "" : (stryCov_9fa48("268"), "/pw-status")
}), stryMutAct_9fa48("269") ? {} : (stryCov_9fa48("269"), {
  name: stryMutAct_9fa48("270") ? "" : (stryCov_9fa48("270"), "pw-ls"),
  description: stryMutAct_9fa48("271") ? "" : (stryCov_9fa48("271"), "List workflows"),
  usage: stryMutAct_9fa48("272") ? "" : (stryCov_9fa48("272"), "/pw-ls | all | archived | path=DIR")
}), stryMutAct_9fa48("273") ? {} : (stryCov_9fa48("273"), {
  name: stryMutAct_9fa48("274") ? "" : (stryCov_9fa48("274"), "pw-setphase"),
  description: stryMutAct_9fa48("275") ? "" : (stryCov_9fa48("275"), "Jump to phase"),
  usage: stryMutAct_9fa48("276") ? "" : (stryCov_9fa48("276"), "/pw-setphase phase=N | phasename=Name")
}), stryMutAct_9fa48("277") ? {} : (stryCov_9fa48("277"), {
  name: stryMutAct_9fa48("278") ? "" : (stryCov_9fa48("278"), "pw-next"),
  description: stryMutAct_9fa48("279") ? "" : (stryCov_9fa48("279"), "Advance to next phase"),
  usage: stryMutAct_9fa48("280") ? "" : (stryCov_9fa48("280"), "/pw-next")
}), stryMutAct_9fa48("281") ? {} : (stryCov_9fa48("281"), {
  name: stryMutAct_9fa48("282") ? "" : (stryCov_9fa48("282"), "pw-complete"),
  description: stryMutAct_9fa48("283") ? "" : (stryCov_9fa48("283"), "Mark active workflow complete"),
  usage: stryMutAct_9fa48("284") ? "" : (stryCov_9fa48("284"), "/pw-complete")
}), stryMutAct_9fa48("285") ? {} : (stryCov_9fa48("285"), {
  name: stryMutAct_9fa48("286") ? "" : (stryCov_9fa48("286"), "pw-goto"),
  description: stryMutAct_9fa48("287") ? "" : (stryCov_9fa48("287"), "Go to a workflow"),
  usage: stryMutAct_9fa48("288") ? "" : (stryCov_9fa48("288"), "/pw-goto [name=name]")
}), stryMutAct_9fa48("289") ? {} : (stryCov_9fa48("289"), {
  name: stryMutAct_9fa48("290") ? "" : (stryCov_9fa48("290"), "pw-rename"),
  description: stryMutAct_9fa48("291") ? "" : (stryCov_9fa48("291"), "Rename active workflow"),
  usage: stryMutAct_9fa48("292") ? "" : (stryCov_9fa48("292"), "/pw-rename novo-nome | name=novo-nome")
}), stryMutAct_9fa48("293") ? {} : (stryCov_9fa48("293"), {
  name: stryMutAct_9fa48("294") ? "" : (stryCov_9fa48("294"), "pw-menu"),
  description: stryMutAct_9fa48("295") ? "" : (stryCov_9fa48("295"), "Open workflow overview overlay"),
  usage: stryMutAct_9fa48("296") ? "" : (stryCov_9fa48("296"), "/pw-menu")
}), stryMutAct_9fa48("297") ? {} : (stryCov_9fa48("297"), {
  name: stryMutAct_9fa48("298") ? "" : (stryCov_9fa48("298"), "pw-archive"),
  description: stryMutAct_9fa48("299") ? "" : (stryCov_9fa48("299"), "Archive workflows"),
  usage: stryMutAct_9fa48("300") ? "" : (stryCov_9fa48("300"), "/pw-archive | /pw-archive name=X | /pw-archive purge")
}), stryMutAct_9fa48("301") ? {} : (stryCov_9fa48("301"), {
  name: stryMutAct_9fa48("302") ? "" : (stryCov_9fa48("302"), "pw-unarchive"),
  description: stryMutAct_9fa48("303") ? "" : (stryCov_9fa48("303"), "Unarchive a workflow"),
  usage: stryMutAct_9fa48("304") ? "" : (stryCov_9fa48("304"), "/pw-unarchive name=<workflow>")
}), stryMutAct_9fa48("305") ? {} : (stryCov_9fa48("305"), {
  name: stryMutAct_9fa48("306") ? "" : (stryCov_9fa48("306"), "pw-todo"),
  description: stryMutAct_9fa48("307") ? "" : (stryCov_9fa48("307"), "Manage phase todos"),
  usage: stryMutAct_9fa48("308") ? "" : (stryCov_9fa48("308"), "/pw-todo | add <task> | complete <id>"),
  piOnly: stryMutAct_9fa48("309") ? false : (stryCov_9fa48("309"), true)
}), stryMutAct_9fa48("310") ? {} : (stryCov_9fa48("310"), {
  name: stryMutAct_9fa48("311") ? "" : (stryCov_9fa48("311"), "pw-inbox"),
  description: stryMutAct_9fa48("312") ? "" : (stryCov_9fa48("312"), "Manage workflow inbox"),
  usage: stryMutAct_9fa48("313") ? "" : (stryCov_9fa48("313"), "/pw-inbox | add <text> | remove <text> | clear"),
  piOnly: stryMutAct_9fa48("314") ? false : (stryCov_9fa48("314"), true)
})]);

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
  generateCommandFiles(): Array<{
    path: string;
    content: string;
  }>;
}

/**
 * Get the appropriate command registration system for the current CLI.
 */
export function getCommandSystem(cli?: CLI): CommandRegistrationSystem {
  if (stryMutAct_9fa48("315")) {
    {}
  } else {
    stryCov_9fa48("315");
    const detected = stryMutAct_9fa48("318") ? cli && detectCLI() : stryMutAct_9fa48("317") ? false : stryMutAct_9fa48("316") ? true : (stryCov_9fa48("316", "317", "318"), cli || detectCLI());
    switch (detected) {
      case stryMutAct_9fa48("320") ? "" : (stryCov_9fa48("320"), "pi"):
        if (stryMutAct_9fa48("319")) {} else {
          stryCov_9fa48("319");
          return getPiCommandSystem();
        }
      case stryMutAct_9fa48("322") ? "" : (stryCov_9fa48("322"), "opencode"):
        if (stryMutAct_9fa48("321")) {} else {
          stryCov_9fa48("321");
          return getOpenCodeCommandSystem();
        }
      case stryMutAct_9fa48("324") ? "" : (stryCov_9fa48("324"), "claude-code"):
        if (stryMutAct_9fa48("323")) {} else {
          stryCov_9fa48("323");
          return getClaudeCodeCommandSystem();
        }
      case stryMutAct_9fa48("326") ? "" : (stryCov_9fa48("326"), "codex"):
        if (stryMutAct_9fa48("325")) {} else {
          stryCov_9fa48("325");
          return getCodexCommandSystem();
        }
      default:
        if (stryMutAct_9fa48("327")) {} else {
          stryCov_9fa48("327");
          return getGenericCommandSystem();
        }
    }
  }
}

// ── Pi Command System ─────────────────────────────────────────────────

function getPiCommandSystem(): CommandRegistrationSystem {
  if (stryMutAct_9fa48("328")) {
    {}
  } else {
    stryCov_9fa48("328");
    return stryMutAct_9fa48("329") ? {} : (stryCov_9fa48("329"), {
      cli: "pi" as CLI,
      supportsNativeCommands(): boolean {
        if (stryMutAct_9fa48("330")) {
          {}
        } else {
          stryCov_9fa48("330");
          return stryMutAct_9fa48("331") ? false : (stryCov_9fa48("331"), true);
        }
      },
      registerAll(): CommandDescriptor[] {
        if (stryMutAct_9fa48("332")) {
          {}
        } else {
          stryCov_9fa48("332");
          // Pi uses native command registration via ExtensionAPI
          // This is handled in commands.ts with pi.registerCommand()
          return WORKFLOW_COMMANDS;
        }
      },
      registerOne(descriptor: CommandDescriptor): boolean {
        if (stryMutAct_9fa48("333")) {
          {}
        } else {
          stryCov_9fa48("333");
          // Pi handles this via registerCommands() in commands.ts
          return stryMutAct_9fa48("334") ? false : (stryCov_9fa48("334"), true);
        }
      },
      getCommandPrefix(): string {
        if (stryMutAct_9fa48("335")) {
          {}
        } else {
          stryCov_9fa48("335");
          return stryMutAct_9fa48("336") ? "" : (stryCov_9fa48("336"), "/");
        }
      },
      generateCommandFiles(): Array<{
        path: string;
        content: string;
      }> {
        if (stryMutAct_9fa48("337")) {
          {}
        } else {
          stryCov_9fa48("337");
          // Pi doesn't use file-based commands
          return stryMutAct_9fa48("338") ? ["Stryker was here"] : (stryCov_9fa48("338"), []);
        }
      }
    });
  }
}

// ── OpenCode Command System ───────────────────────────────────────────

function getOpenCodeCommandSystem(): CommandRegistrationSystem {
  if (stryMutAct_9fa48("339")) {
    {}
  } else {
    stryCov_9fa48("339");
    return stryMutAct_9fa48("340") ? {} : (stryCov_9fa48("340"), {
      cli: "opencode" as CLI,
      supportsNativeCommands(): boolean {
        if (stryMutAct_9fa48("341")) {
          {}
        } else {
          stryCov_9fa48("341");
          return stryMutAct_9fa48("342") ? true : (stryCov_9fa48("342"), false); // OpenCode uses skill files
        }
      },
      registerAll(): CommandDescriptor[] {
        if (stryMutAct_9fa48("343")) {
          {}
        } else {
          stryCov_9fa48("343");
          // OpenCode uses skills/ directory
          return WORKFLOW_COMMANDS;
        }
      },
      registerOne(_descriptor: CommandDescriptor): boolean {
        if (stryMutAct_9fa48("344")) {
          {}
        } else {
          stryCov_9fa48("344");
          // Commands are file-based
          return stryMutAct_9fa48("345") ? false : (stryCov_9fa48("345"), true);
        }
      },
      getCommandPrefix(): string {
        if (stryMutAct_9fa48("346")) {
          {}
        } else {
          stryCov_9fa48("346");
          return stryMutAct_9fa48("347") ? "" : (stryCov_9fa48("347"), "/");
        }
      },
      generateCommandFiles(): Array<{
        path: string;
        content: string;
      }> {
        if (stryMutAct_9fa48("348")) {
          {}
        } else {
          stryCov_9fa48("348");
          return WORKFLOW_COMMANDS.map(stryMutAct_9fa48("349") ? () => undefined : (stryCov_9fa48("349"), cmd => stryMutAct_9fa48("350") ? {} : (stryCov_9fa48("350"), {
            path: stryMutAct_9fa48("351") ? `` : (stryCov_9fa48("351"), `skills/${cmd.name}.md`),
            content: generateOpenCodeSkillFile(cmd)
          })));
        }
      }
    });
  }
}
function generateOpenCodeSkillFile(cmd: CommandDescriptor): string {
  if (stryMutAct_9fa48("352")) {
    {}
  } else {
    stryCov_9fa48("352");
    return stryMutAct_9fa48("353") ? `` : (stryCov_9fa48("353"), `---
name: ${cmd.name}
description: ${cmd.description}
---

// Usage: ${stryMutAct_9fa48("356") ? cmd.usage && cmd.description : stryMutAct_9fa48("355") ? false : stryMutAct_9fa48("354") ? true : (stryCov_9fa48("354", "355", "356"), cmd.usage || cmd.description)}

/skill:cali-product-workflow

// Command: ${cmd.name}
// This skill delegates to the product-workflow skill
${cmd.name} {args}
`);
  }
}

// ── Claude Code Command System ────────────────────────────────────────

function getClaudeCodeCommandSystem(): CommandRegistrationSystem {
  if (stryMutAct_9fa48("357")) {
    {}
  } else {
    stryCov_9fa48("357");
    return stryMutAct_9fa48("358") ? {} : (stryCov_9fa48("358"), {
      cli: "claude-code" as CLI,
      supportsNativeCommands(): boolean {
        if (stryMutAct_9fa48("359")) {
          {}
        } else {
          stryCov_9fa48("359");
          return stryMutAct_9fa48("360") ? true : (stryCov_9fa48("360"), false); // Claude Code uses skills/
        }
      },
      registerAll(): CommandDescriptor[] {
        if (stryMutAct_9fa48("361")) {
          {}
        } else {
          stryCov_9fa48("361");
          return WORKFLOW_COMMANDS;
        }
      },
      registerOne(_descriptor: CommandDescriptor): boolean {
        if (stryMutAct_9fa48("362")) {
          {}
        } else {
          stryCov_9fa48("362");
          return stryMutAct_9fa48("363") ? false : (stryCov_9fa48("363"), true);
        }
      },
      getCommandPrefix(): string {
        if (stryMutAct_9fa48("364")) {
          {}
        } else {
          stryCov_9fa48("364");
          return stryMutAct_9fa48("365") ? "" : (stryCov_9fa48("365"), "/");
        }
      },
      generateCommandFiles(): Array<{
        path: string;
        content: string;
      }> {
        if (stryMutAct_9fa48("366")) {
          {}
        } else {
          stryCov_9fa48("366");
          return WORKFLOW_COMMANDS.map(stryMutAct_9fa48("367") ? () => undefined : (stryCov_9fa48("367"), cmd => stryMutAct_9fa48("368") ? {} : (stryCov_9fa48("368"), {
            path: stryMutAct_9fa48("369") ? `` : (stryCov_9fa48("369"), `skills/${cmd.name}.md`),
            content: generateClaudeCodeSkillFile(cmd)
          })));
        }
      }
    });
  }
}
function generateClaudeCodeSkillFile(cmd: CommandDescriptor): string {
  if (stryMutAct_9fa48("370")) {
    {}
  } else {
    stryCov_9fa48("370");
    return stryMutAct_9fa48("371") ? `` : (stryCov_9fa48("371"), `---
name: ${cmd.name}
description: ${cmd.description}
---

// Usage: ${stryMutAct_9fa48("374") ? cmd.usage && cmd.description : stryMutAct_9fa48("373") ? false : stryMutAct_9fa48("372") ? true : (stryCov_9fa48("372", "373", "374"), cmd.usage || cmd.description)}
${cmd.name} {args}
`);
  }
}

// ── Codex Command System ──────────────────────────────────────────────

function getCodexCommandSystem(): CommandRegistrationSystem {
  if (stryMutAct_9fa48("375")) {
    {}
  } else {
    stryCov_9fa48("375");
    return stryMutAct_9fa48("376") ? {} : (stryCov_9fa48("376"), {
      cli: "codex" as CLI,
      supportsNativeCommands(): boolean {
        if (stryMutAct_9fa48("377")) {
          {}
        } else {
          stryCov_9fa48("377");
          return stryMutAct_9fa48("378") ? true : (stryCov_9fa48("378"), false); // Codex uses commands/ directory
        }
      },
      registerAll(): CommandDescriptor[] {
        if (stryMutAct_9fa48("379")) {
          {}
        } else {
          stryCov_9fa48("379");
          return WORKFLOW_COMMANDS;
        }
      },
      registerOne(_descriptor: CommandDescriptor): boolean {
        if (stryMutAct_9fa48("380")) {
          {}
        } else {
          stryCov_9fa48("380");
          return stryMutAct_9fa48("381") ? false : (stryCov_9fa48("381"), true);
        }
      },
      getCommandPrefix(): string {
        if (stryMutAct_9fa48("382")) {
          {}
        } else {
          stryCov_9fa48("382");
          return stryMutAct_9fa48("383") ? "" : (stryCov_9fa48("383"), "/");
        }
      },
      generateCommandFiles(): Array<{
        path: string;
        content: string;
      }> {
        if (stryMutAct_9fa48("384")) {
          {}
        } else {
          stryCov_9fa48("384");
          return WORKFLOW_COMMANDS.map(stryMutAct_9fa48("385") ? () => undefined : (stryCov_9fa48("385"), cmd => stryMutAct_9fa48("386") ? {} : (stryCov_9fa48("386"), {
            path: stryMutAct_9fa48("387") ? `` : (stryCov_9fa48("387"), `commands/${cmd.name}.md`),
            content: generateCodexCommandFile(cmd)
          })));
        }
      }
    });
  }
}
function generateCodexCommandFile(cmd: CommandDescriptor): string {
  if (stryMutAct_9fa48("388")) {
    {}
  } else {
    stryCov_9fa48("388");
    return stryMutAct_9fa48("389") ? `` : (stryCov_9fa48("389"), `---
name: ${cmd.name}
description: ${cmd.description}
---

@agent
// Usage: ${stryMutAct_9fa48("392") ? cmd.usage && cmd.description : stryMutAct_9fa48("391") ? false : stryMutAct_9fa48("390") ? true : (stryCov_9fa48("390", "391", "392"), cmd.usage || cmd.description)}
${cmd.name} {args}
`);
  }
}

// ── Generic Command System (Fallback) ─────────────────────────────────

function getGenericCommandSystem(): CommandRegistrationSystem {
  if (stryMutAct_9fa48("393")) {
    {}
  } else {
    stryCov_9fa48("393");
    return stryMutAct_9fa48("394") ? {} : (stryCov_9fa48("394"), {
      cli: "generic" as CLI,
      supportsNativeCommands(): boolean {
        if (stryMutAct_9fa48("395")) {
          {}
        } else {
          stryCov_9fa48("395");
          return stryMutAct_9fa48("396") ? true : (stryCov_9fa48("396"), false);
        }
      },
      registerAll(): CommandDescriptor[] {
        if (stryMutAct_9fa48("397")) {
          {}
        } else {
          stryCov_9fa48("397");
          // No commands registered in generic mode
          return stryMutAct_9fa48("398") ? ["Stryker was here"] : (stryCov_9fa48("398"), []);
        }
      },
      registerOne(_descriptor: CommandDescriptor): boolean {
        if (stryMutAct_9fa48("399")) {
          {}
        } else {
          stryCov_9fa48("399");
          return stryMutAct_9fa48("400") ? true : (stryCov_9fa48("400"), false);
        }
      },
      getCommandPrefix(): string {
        if (stryMutAct_9fa48("401")) {
          {}
        } else {
          stryCov_9fa48("401");
          return stryMutAct_9fa48("402") ? "" : (stryCov_9fa48("402"), "/");
        }
      },
      generateCommandFiles(): Array<{
        path: string;
        content: string;
      }> {
        if (stryMutAct_9fa48("403")) {
          {}
        } else {
          stryCov_9fa48("403");
          return stryMutAct_9fa48("404") ? ["Stryker was here"] : (stryCov_9fa48("404"), []);
        }
      }
    });
  }
}

/**
 * Write command files to disk for CLI-specific command systems.
 * Call this during installation or first-run setup.
 * 
 * @param baseDir - Base directory to write command files
 * @param cli - Target CLI (defaults to detected)
 */
export function installCommandFiles(baseDir: string, cli?: CLI): void {
  if (stryMutAct_9fa48("405")) {
    {}
  } else {
    stryCov_9fa48("405");
    const {
      writeFileSync,
      mkdirSync,
      existsSync
    } = require("node:fs");
    const system = getCommandSystem(cli);
    const files = system.generateCommandFiles();
    for (const file of files) {
      if (stryMutAct_9fa48("406")) {
        {}
      } else {
        stryCov_9fa48("406");
        const fullPath = stryMutAct_9fa48("407") ? `` : (stryCov_9fa48("407"), `${baseDir}/${file.path}`);
        const dir = stryMutAct_9fa48("408") ? fullPath : (stryCov_9fa48("408"), fullPath.substring(0, fullPath.lastIndexOf(stryMutAct_9fa48("409") ? "" : (stryCov_9fa48("409"), "/"))));
        if (stryMutAct_9fa48("412") ? false : stryMutAct_9fa48("411") ? true : stryMutAct_9fa48("410") ? existsSync(dir) : (stryCov_9fa48("410", "411", "412"), !existsSync(dir))) {
          if (stryMutAct_9fa48("413")) {
            {}
          } else {
            stryCov_9fa48("413");
            mkdirSync(dir, stryMutAct_9fa48("414") ? {} : (stryCov_9fa48("414"), {
              recursive: stryMutAct_9fa48("415") ? false : (stryCov_9fa48("415"), true)
            }));
          }
        }
        writeFileSync(fullPath, file.content, stryMutAct_9fa48("416") ? "" : (stryCov_9fa48("416"), "utf8"));
        console.log(stryMutAct_9fa48("417") ? `` : (stryCov_9fa48("417"), `[cali-product-workflow] Installed: ${file.path}`));
      }
    }
  }
}