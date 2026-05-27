/**
 * Base Adapter Utilities
 * 
 * Shared utilities and base class for CLI adapters.
 * Provides common functionality used across all adapter implementations.
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
import type { CLI, CLICapabilities } from "../types";
import { getCLICapabilites } from "../state";
import type { CLIAdapter, ToolCallHandler, SessionStartHandler, TurnEndHandler, InputHandler, NotificationType, SelectOption, StatusInfo, CommandRegistration, ToolDefinition } from "./cli-adapter";

// ── Base Adapter Class ────────────────────────────────────────────────

/**
 * Abstract base class for CLI adapters.
 * Provides default implementations for optional features.
 * Subclasses override only the methods their CLI supports.
 */
export abstract class BaseAdapter implements CLIAdapter {
  abstract readonly name: CLI;
  protected _capabilities: CLICapabilities;
  protected _handlers: {
    toolCall?: ToolCallHandler;
    sessionStart?: SessionStartHandler;
    turnEnd?: TurnEndHandler;
    input?: InputHandler;
  } = {};
  protected _initialized = stryMutAct_9fa48("0") ? true : (stryCov_9fa48("0"), false);
  protected _statusLine?: string;
  constructor(cli?: CLI) {
    if (stryMutAct_9fa48("1")) {
      {}
    } else {
      stryCov_9fa48("1");
      this._capabilities = getCLICapabilites(cli);
    }
  }
  get capabilities(): CLICapabilities {
    if (stryMutAct_9fa48("2")) {
      {}
    } else {
      stryCov_9fa48("2");
      return this._capabilities;
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────

  initialize(): void {
    if (stryMutAct_9fa48("3")) {
      {}
    } else {
      stryCov_9fa48("3");
      this._initialized = stryMutAct_9fa48("4") ? false : (stryCov_9fa48("4"), true);
    }
  }
  dispose(): void {
    if (stryMutAct_9fa48("5")) {
      {}
    } else {
      stryCov_9fa48("5");
      this._initialized = stryMutAct_9fa48("6") ? true : (stryCov_9fa48("6"), false);
      this._handlers = {};
      this.clearStatusLine();
    }
  }

  // ── Commands ───────────────────────────────────────────────────────

  registerCommands(): CommandRegistration[] {
    if (stryMutAct_9fa48("7")) {
      {}
    } else {
      stryCov_9fa48("7");
      // Default: no commands registered
      return stryMutAct_9fa48("8") ? ["Stryker was here"] : (stryCov_9fa48("8"), []);
    }
  }
  getCommandPrefix(): string {
    if (stryMutAct_9fa48("9")) {
      {}
    } else {
      stryCov_9fa48("9");
      return stryMutAct_9fa48("12") ? this._capabilities.commandPrefix && "/" : stryMutAct_9fa48("11") ? false : stryMutAct_9fa48("10") ? true : (stryCov_9fa48("10", "11", "12"), this._capabilities.commandPrefix || (stryMutAct_9fa48("13") ? "" : (stryCov_9fa48("13"), "/")));
    }
  }

  // ── Events ─────────────────────────────────────────────────────────

  onToolCall(handler: ToolCallHandler): void {
    if (stryMutAct_9fa48("14")) {
      {}
    } else {
      stryCov_9fa48("14");
      if (stryMutAct_9fa48("17") ? false : stryMutAct_9fa48("16") ? true : stryMutAct_9fa48("15") ? this._capabilities.hasToolCall : (stryCov_9fa48("15", "16", "17"), !this._capabilities.hasToolCall)) {
        if (stryMutAct_9fa48("18")) {
          {}
        } else {
          stryCov_9fa48("18");
          console.warn(stryMutAct_9fa48("19") ? `` : (stryCov_9fa48("19"), `[${this.name}] Tool call events not supported`));
          return;
        }
      }
      this._handlers.toolCall = handler;
    }
  }
  onSessionStart(handler: SessionStartHandler): void {
    if (stryMutAct_9fa48("20")) {
      {}
    } else {
      stryCov_9fa48("20");
      if (stryMutAct_9fa48("23") ? false : stryMutAct_9fa48("22") ? true : stryMutAct_9fa48("21") ? this._capabilities.hasSessionStart : (stryCov_9fa48("21", "22", "23"), !this._capabilities.hasSessionStart)) {
        if (stryMutAct_9fa48("24")) {
          {}
        } else {
          stryCov_9fa48("24");
          console.warn(stryMutAct_9fa48("25") ? `` : (stryCov_9fa48("25"), `[${this.name}] Session start events not supported`));
          return;
        }
      }
      this._handlers.sessionStart = handler;
    }
  }
  onTurnEnd(handler: TurnEndHandler): void {
    if (stryMutAct_9fa48("26")) {
      {}
    } else {
      stryCov_9fa48("26");
      if (stryMutAct_9fa48("29") ? false : stryMutAct_9fa48("28") ? true : stryMutAct_9fa48("27") ? this._capabilities.hasTurnEnd : (stryCov_9fa48("27", "28", "29"), !this._capabilities.hasTurnEnd)) {
        if (stryMutAct_9fa48("30")) {
          {}
        } else {
          stryCov_9fa48("30");
          console.warn(stryMutAct_9fa48("31") ? `` : (stryCov_9fa48("31"), `[${this.name}] Turn end events not supported`));
          return;
        }
      }
      this._handlers.turnEnd = handler;
    }
  }
  onInput(handler: InputHandler): void {
    if (stryMutAct_9fa48("32")) {
      {}
    } else {
      stryCov_9fa48("32");
      // Input handling is always supported (via parsing)
      this._handlers.input = handler;
    }
  }

  // ── Event Invokers ─────────────────────────────────────────────────

  /**
   * Invoke tool call handler.
   * Called by the integration code when a tool is invoked.
   */
  protected _invokeToolCall(tool: string, input: unknown): void | Promise<void> {
    if (stryMutAct_9fa48("33")) {
      {}
    } else {
      stryCov_9fa48("33");
      if (stryMutAct_9fa48("35") ? false : stryMutAct_9fa48("34") ? true : (stryCov_9fa48("34", "35"), this._handlers.toolCall)) {
        if (stryMutAct_9fa48("36")) {
          {}
        } else {
          stryCov_9fa48("36");
          return this._handlers.toolCall(tool, input);
        }
      }
    }
  }

  /**
   * Invoke session start handler.
   * Called by the integration code when a session starts.
   */
  protected _invokeSessionStart(cwd: string): void | Promise<void> {
    if (stryMutAct_9fa48("37")) {
      {}
    } else {
      stryCov_9fa48("37");
      if (stryMutAct_9fa48("39") ? false : stryMutAct_9fa48("38") ? true : (stryCov_9fa48("38", "39"), this._handlers.sessionStart)) {
        if (stryMutAct_9fa48("40")) {
          {}
        } else {
          stryCov_9fa48("40");
          return this._handlers.sessionStart(cwd);
        }
      }
    }
  }

  /**
   * Invoke turn end handler.
   * Called by the integration code when a turn ends.
   */
  protected _invokeTurnEnd(ctx: {
    cwd: string;
    sessionId?: string;
  }): void | Promise<void> {
    if (stryMutAct_9fa48("41")) {
      {}
    } else {
      stryCov_9fa48("41");
      if (stryMutAct_9fa48("43") ? false : stryMutAct_9fa48("42") ? true : (stryCov_9fa48("42", "43"), this._handlers.turnEnd)) {
        if (stryMutAct_9fa48("44")) {
          {}
        } else {
          stryCov_9fa48("44");
          return this._handlers.turnEnd(ctx);
        }
      }
    }
  }

  /**
   * Invoke input handler.
   * Called by the integration code when input is received.
   */
  protected _invokeInput(text: string, ctx: {
    cwd: string;
    sessionId?: string;
  }): void | Promise<void> {
    if (stryMutAct_9fa48("45")) {
      {}
    } else {
      stryCov_9fa48("45");
      if (stryMutAct_9fa48("47") ? false : stryMutAct_9fa48("46") ? true : (stryCov_9fa48("46", "47"), this._handlers.input)) {
        if (stryMutAct_9fa48("48")) {
          {}
        } else {
          stryCov_9fa48("48");
          return this._handlers.input(text, ctx);
        }
      }
    }
  }

  // ── Tools ──────────────────────────────────────────────────────────

  getAvailableTools(): ToolDefinition[] {
    if (stryMutAct_9fa48("49")) {
      {}
    } else {
      stryCov_9fa48("49");
      // Default: return standard tools available in all CLIs
      return stryMutAct_9fa48("50") ? [] : (stryCov_9fa48("50"), [stryMutAct_9fa48("51") ? {} : (stryCov_9fa48("51"), {
        name: stryMutAct_9fa48("52") ? "" : (stryCov_9fa48("52"), "read"),
        description: stryMutAct_9fa48("53") ? "" : (stryCov_9fa48("53"), "Read file contents")
      }), stryMutAct_9fa48("54") ? {} : (stryCov_9fa48("54"), {
        name: stryMutAct_9fa48("55") ? "" : (stryCov_9fa48("55"), "write"),
        description: stryMutAct_9fa48("56") ? "" : (stryCov_9fa48("56"), "Write content to file")
      }), stryMutAct_9fa48("57") ? {} : (stryCov_9fa48("57"), {
        name: stryMutAct_9fa48("58") ? "" : (stryCov_9fa48("58"), "bash"),
        description: stryMutAct_9fa48("59") ? "" : (stryCov_9fa48("59"), "Execute shell commands")
      }), stryMutAct_9fa48("60") ? {} : (stryCov_9fa48("60"), {
        name: stryMutAct_9fa48("61") ? "" : (stryCov_9fa48("61"), "edit"),
        description: stryMutAct_9fa48("62") ? "" : (stryCov_9fa48("62"), "Edit existing files")
      })]);
    }
  }
  hasCapability(capability: keyof CLICapabilities): boolean {
    if (stryMutAct_9fa48("63")) {
      {}
    } else {
      stryCov_9fa48("63");
      const value = this._capabilities[capability];
      // Handle boolean and non-null values
      if (stryMutAct_9fa48("66") ? typeof value !== "boolean" : stryMutAct_9fa48("65") ? false : stryMutAct_9fa48("64") ? true : (stryCov_9fa48("64", "65", "66"), typeof value === (stryMutAct_9fa48("67") ? "" : (stryCov_9fa48("67"), "boolean")))) return value;
      return stryMutAct_9fa48("70") ? value !== null || value !== undefined : stryMutAct_9fa48("69") ? false : stryMutAct_9fa48("68") ? true : (stryCov_9fa48("68", "69", "70"), (stryMutAct_9fa48("72") ? value === null : stryMutAct_9fa48("71") ? true : (stryCov_9fa48("71", "72"), value !== null)) && (stryMutAct_9fa48("74") ? value === undefined : stryMutAct_9fa48("73") ? true : (stryCov_9fa48("73", "74"), value !== undefined)));
    }
  }

  // ── UI ──────────────────────────────────────────────────────────────

  showNotification(message: string, type: NotificationType = stryMutAct_9fa48("75") ? "" : (stryCov_9fa48("75"), "info")): void {
    if (stryMutAct_9fa48("76")) {
      {}
    } else {
      stryCov_9fa48("76");
      if (stryMutAct_9fa48("79") ? false : stryMutAct_9fa48("78") ? true : stryMutAct_9fa48("77") ? this._capabilities.hasNotifications : (stryCov_9fa48("77", "78", "79"), !this._capabilities.hasNotifications)) {
        if (stryMutAct_9fa48("80")) {
          {}
        } else {
          stryCov_9fa48("80");
          console.log(stryMutAct_9fa48("81") ? `` : (stryCov_9fa48("81"), `[${stryMutAct_9fa48("82") ? type.toLowerCase() : (stryCov_9fa48("82"), type.toUpperCase())}] ${message}`));
          return;
        }
      }
      // Override in subclass for CLI-specific implementation
      this._showNotificationImpl(message, type);
    }
  }
  protected _showNotificationImpl(message: string, type: NotificationType): void {
    if (stryMutAct_9fa48("83")) {
      {}
    } else {
      stryCov_9fa48("83");
      // Default: log to console
      console.log(stryMutAct_9fa48("84") ? `` : (stryCov_9fa48("84"), `[${stryMutAct_9fa48("85") ? type.toLowerCase() : (stryCov_9fa48("85"), type.toUpperCase())}] ${message}`));
    }
  }
  async showSelectList(options: SelectOption[]): Promise<string | null> {
    if (stryMutAct_9fa48("86")) {
      {}
    } else {
      stryCov_9fa48("86");
      if (stryMutAct_9fa48("89") ? false : stryMutAct_9fa48("88") ? true : stryMutAct_9fa48("87") ? this._capabilities.hasSelectList : (stryCov_9fa48("87", "88", "89"), !this._capabilities.hasSelectList)) {
        if (stryMutAct_9fa48("90")) {
          {}
        } else {
          stryCov_9fa48("90");
          // Fallback: return first option or null
          console.warn(stryMutAct_9fa48("91") ? `` : (stryCov_9fa48("91"), `[${this.name}] Select list not supported, returning first option`));
          return stryMutAct_9fa48("94") ? options[0]?.value && null : stryMutAct_9fa48("93") ? false : stryMutAct_9fa48("92") ? true : (stryCov_9fa48("92", "93", "94"), (stryMutAct_9fa48("95") ? options[0].value : (stryCov_9fa48("95"), options[0]?.value)) || null);
        }
      }
      return this._showSelectListImpl(options);
    }
  }
  protected _showSelectListImpl(options: SelectOption[]): Promise<string | null> {
    if (stryMutAct_9fa48("96")) {
      {}
    } else {
      stryCov_9fa48("96");
      // Default: return first option
      return Promise.resolve(stryMutAct_9fa48("99") ? options[0]?.value && null : stryMutAct_9fa48("98") ? false : stryMutAct_9fa48("97") ? true : (stryCov_9fa48("97", "98", "99"), (stryMutAct_9fa48("100") ? options[0].value : (stryCov_9fa48("100"), options[0]?.value)) || null));
    }
  }
  showStatusLine(info: StatusInfo): void {
    if (stryMutAct_9fa48("101")) {
      {}
    } else {
      stryCov_9fa48("101");
      if (stryMutAct_9fa48("104") ? false : stryMutAct_9fa48("103") ? true : stryMutAct_9fa48("102") ? this._capabilities.hasStatusLine : (stryCov_9fa48("102", "103", "104"), !this._capabilities.hasStatusLine)) {
        if (stryMutAct_9fa48("105")) {
          {}
        } else {
          stryCov_9fa48("105");
          return;
        }
      }
      this._statusLine = info.text;
      this._showStatusLineImpl(info);
    }
  }
  protected _showStatusLineImpl(info: StatusInfo): void {
    // Default: no-op
  }
  clearStatusLine(): void {
    if (stryMutAct_9fa48("106")) {
      {}
    } else {
      stryCov_9fa48("106");
      this._statusLine = undefined;
      this._clearStatusLineImpl();
    }
  }
  protected _clearStatusLineImpl(): void {
    // Default: no-op
  }
}

// ── Utility Functions ────────────────────────────────────────────────

/**
 * Parse command arguments from a string.
 * Handles quoted strings and escapes special characters.
 */
export function parseCommandArgs(args: string): string[] {
  if (stryMutAct_9fa48("107")) {
    {}
  } else {
    stryCov_9fa48("107");
    const result: string[] = stryMutAct_9fa48("108") ? ["Stryker was here"] : (stryCov_9fa48("108"), []);
    let current = stryMutAct_9fa48("109") ? "Stryker was here!" : (stryCov_9fa48("109"), "");
    let inQuote = stryMutAct_9fa48("110") ? true : (stryCov_9fa48("110"), false);
    let quoteChar = stryMutAct_9fa48("111") ? "Stryker was here!" : (stryCov_9fa48("111"), "");
    for (let i = 0; stryMutAct_9fa48("114") ? i >= args.length : stryMutAct_9fa48("113") ? i <= args.length : stryMutAct_9fa48("112") ? false : (stryCov_9fa48("112", "113", "114"), i < args.length); stryMutAct_9fa48("115") ? i-- : (stryCov_9fa48("115"), i++)) {
      if (stryMutAct_9fa48("116")) {
        {}
      } else {
        stryCov_9fa48("116");
        const char = args[i];
        if (stryMutAct_9fa48("119") ? char === '"' || char === "'" || !inQuote : stryMutAct_9fa48("118") ? false : stryMutAct_9fa48("117") ? true : (stryCov_9fa48("117", "118", "119"), (stryMutAct_9fa48("121") ? char === '"' && char === "'" : stryMutAct_9fa48("120") ? true : (stryCov_9fa48("120", "121"), (stryMutAct_9fa48("123") ? char !== '"' : stryMutAct_9fa48("122") ? false : (stryCov_9fa48("122", "123"), char === (stryMutAct_9fa48("124") ? "" : (stryCov_9fa48("124"), '"')))) || (stryMutAct_9fa48("126") ? char !== "'" : stryMutAct_9fa48("125") ? false : (stryCov_9fa48("125", "126"), char === (stryMutAct_9fa48("127") ? "" : (stryCov_9fa48("127"), "'")))))) && (stryMutAct_9fa48("128") ? inQuote : (stryCov_9fa48("128"), !inQuote)))) {
          if (stryMutAct_9fa48("129")) {
            {}
          } else {
            stryCov_9fa48("129");
            inQuote = stryMutAct_9fa48("130") ? false : (stryCov_9fa48("130"), true);
            quoteChar = char;
          }
        } else if (stryMutAct_9fa48("133") ? char === quoteChar || inQuote : stryMutAct_9fa48("132") ? false : stryMutAct_9fa48("131") ? true : (stryCov_9fa48("131", "132", "133"), (stryMutAct_9fa48("135") ? char !== quoteChar : stryMutAct_9fa48("134") ? true : (stryCov_9fa48("134", "135"), char === quoteChar)) && inQuote)) {
          if (stryMutAct_9fa48("136")) {
            {}
          } else {
            stryCov_9fa48("136");
            inQuote = stryMutAct_9fa48("137") ? true : (stryCov_9fa48("137"), false);
            quoteChar = stryMutAct_9fa48("138") ? "Stryker was here!" : (stryCov_9fa48("138"), "");
          }
        } else if (stryMutAct_9fa48("141") ? char === "\\" || i + 1 < args.length : stryMutAct_9fa48("140") ? false : stryMutAct_9fa48("139") ? true : (stryCov_9fa48("139", "140", "141"), (stryMutAct_9fa48("143") ? char !== "\\" : stryMutAct_9fa48("142") ? true : (stryCov_9fa48("142", "143"), char === (stryMutAct_9fa48("144") ? "" : (stryCov_9fa48("144"), "\\")))) && (stryMutAct_9fa48("147") ? i + 1 >= args.length : stryMutAct_9fa48("146") ? i + 1 <= args.length : stryMutAct_9fa48("145") ? true : (stryCov_9fa48("145", "146", "147"), (stryMutAct_9fa48("148") ? i - 1 : (stryCov_9fa48("148"), i + 1)) < args.length)))) {
          if (stryMutAct_9fa48("149")) {
            {}
          } else {
            stryCov_9fa48("149");
            stryMutAct_9fa48("150") ? current -= args[++i] : (stryCov_9fa48("150"), current += args[stryMutAct_9fa48("151") ? --i : (stryCov_9fa48("151"), ++i)]);
          }
        } else if (stryMutAct_9fa48("154") ? char === " " || !inQuote : stryMutAct_9fa48("153") ? false : stryMutAct_9fa48("152") ? true : (stryCov_9fa48("152", "153", "154"), (stryMutAct_9fa48("156") ? char !== " " : stryMutAct_9fa48("155") ? true : (stryCov_9fa48("155", "156"), char === (stryMutAct_9fa48("157") ? "" : (stryCov_9fa48("157"), " ")))) && (stryMutAct_9fa48("158") ? inQuote : (stryCov_9fa48("158"), !inQuote)))) {
          if (stryMutAct_9fa48("159")) {
            {}
          } else {
            stryCov_9fa48("159");
            if (stryMutAct_9fa48("161") ? false : stryMutAct_9fa48("160") ? true : (stryCov_9fa48("160", "161"), current)) {
              if (stryMutAct_9fa48("162")) {
                {}
              } else {
                stryCov_9fa48("162");
                result.push(current);
                current = stryMutAct_9fa48("163") ? "Stryker was here!" : (stryCov_9fa48("163"), "");
              }
            }
          }
        } else {
          if (stryMutAct_9fa48("164")) {
            {}
          } else {
            stryCov_9fa48("164");
            stryMutAct_9fa48("165") ? current -= char : (stryCov_9fa48("165"), current += char);
          }
        }
      }
    }
    if (stryMutAct_9fa48("167") ? false : stryMutAct_9fa48("166") ? true : (stryCov_9fa48("166", "167"), current)) {
      if (stryMutAct_9fa48("168")) {
        {}
      } else {
        stryCov_9fa48("168");
        result.push(current);
      }
    }
    return result;
  }
}

/**
 * Format a notification message with ANSI colors.
 */
export function formatNotification(message: string, type: NotificationType): string {
  if (stryMutAct_9fa48("169")) {
    {}
  } else {
    stryCov_9fa48("169");
    const colors: Record<NotificationType, string> = stryMutAct_9fa48("170") ? {} : (stryCov_9fa48("170"), {
      info: stryMutAct_9fa48("171") ? "" : (stryCov_9fa48("171"), "\x1b[36m"),
      // cyan
      warning: stryMutAct_9fa48("172") ? "" : (stryCov_9fa48("172"), "\x1b[33m"),
      // yellow
      error: stryMutAct_9fa48("173") ? "" : (stryCov_9fa48("173"), "\x1b[31m"),
      // red
      success: stryMutAct_9fa48("174") ? "" : (stryCov_9fa48("174"), "\x1b[32m") // green
    });
    const reset = stryMutAct_9fa48("175") ? "" : (stryCov_9fa48("175"), "\x1b[0m");
    return stryMutAct_9fa48("176") ? `` : (stryCov_9fa48("176"), `${colors[type]}[${stryMutAct_9fa48("177") ? type.toLowerCase() : (stryCov_9fa48("177"), type.toUpperCase())}]${reset} ${message}`);
  }
}

/**
 * Truncate text to fit in status line.
 */
export function truncateStatusLine(text: string, maxWidth = 80): string {
  if (stryMutAct_9fa48("178")) {
    {}
  } else {
    stryCov_9fa48("178");
    if (stryMutAct_9fa48("182") ? text.length > maxWidth : stryMutAct_9fa48("181") ? text.length < maxWidth : stryMutAct_9fa48("180") ? false : stryMutAct_9fa48("179") ? true : (stryCov_9fa48("179", "180", "181", "182"), text.length <= maxWidth)) return text;
    return (stryMutAct_9fa48("183") ? text : (stryCov_9fa48("183"), text.slice(0, stryMutAct_9fa48("184") ? maxWidth + 3 : (stryCov_9fa48("184"), maxWidth - 3)))) + (stryMutAct_9fa48("185") ? "" : (stryCov_9fa48("185"), "..."));
  }
}

/**
 * Debounce a function call.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): (...args: Parameters<T>) => void {
  if (stryMutAct_9fa48("186")) {
    {}
  } else {
    stryCov_9fa48("186");
    let timeout: NodeJS.Timeout | null = null;
    return (...args: Parameters<T>) => {
      if (stryMutAct_9fa48("187")) {
        {}
      } else {
        stryCov_9fa48("187");
        if (stryMutAct_9fa48("189") ? false : stryMutAct_9fa48("188") ? true : (stryCov_9fa48("188", "189"), timeout)) clearTimeout(timeout);
        timeout = setTimeout(stryMutAct_9fa48("190") ? () => undefined : (stryCov_9fa48("190"), () => fn(...args)), delay);
      }
    };
  }
}

/**
 * Check if ANSI colors are supported in the terminal.
 */
export function supportsAnsiColors(): boolean {
  if (stryMutAct_9fa48("191")) {
    {}
  } else {
    stryCov_9fa48("191");
    if (stryMutAct_9fa48("194") ? typeof process !== "undefined" || process.env : stryMutAct_9fa48("193") ? false : stryMutAct_9fa48("192") ? true : (stryCov_9fa48("192", "193", "194"), (stryMutAct_9fa48("196") ? typeof process === "undefined" : stryMutAct_9fa48("195") ? true : (stryCov_9fa48("195", "196"), typeof process !== (stryMutAct_9fa48("197") ? "" : (stryCov_9fa48("197"), "undefined")))) && process.env)) {
      if (stryMutAct_9fa48("198")) {
        {}
      } else {
        stryCov_9fa48("198");
        // Check for common no-color environments
        if (stryMutAct_9fa48("201") ? process.env.NO_COLOR !== "1" : stryMutAct_9fa48("200") ? false : stryMutAct_9fa48("199") ? true : (stryCov_9fa48("199", "200", "201"), process.env.NO_COLOR === (stryMutAct_9fa48("202") ? "" : (stryCov_9fa48("202"), "1")))) return stryMutAct_9fa48("203") ? true : (stryCov_9fa48("203"), false);
        if (stryMutAct_9fa48("206") ? process.env.TERM !== "dumb" : stryMutAct_9fa48("205") ? false : stryMutAct_9fa48("204") ? true : (stryCov_9fa48("204", "205", "206"), process.env.TERM === (stryMutAct_9fa48("207") ? "" : (stryCov_9fa48("207"), "dumb")))) return stryMutAct_9fa48("208") ? true : (stryCov_9fa48("208"), false);
      }
    }

    // Check if stdout is a TTY (not reliable in all environments)
    if (stryMutAct_9fa48("211") ? typeof process !== "undefined" || process.stdout : stryMutAct_9fa48("210") ? false : stryMutAct_9fa48("209") ? true : (stryCov_9fa48("209", "210", "211"), (stryMutAct_9fa48("213") ? typeof process === "undefined" : stryMutAct_9fa48("212") ? true : (stryCov_9fa48("212", "213"), typeof process !== (stryMutAct_9fa48("214") ? "" : (stryCov_9fa48("214"), "undefined")))) && process.stdout)) {
      if (stryMutAct_9fa48("215")) {
        {}
      } else {
        stryCov_9fa48("215");
        return stryMutAct_9fa48("218") ? process.stdout.isTTY !== true : stryMutAct_9fa48("217") ? false : stryMutAct_9fa48("216") ? true : (stryCov_9fa48("216", "217", "218"), process.stdout.isTTY === (stryMutAct_9fa48("219") ? false : (stryCov_9fa48("219"), true)));
      }
    }
    return stryMutAct_9fa48("220") ? true : (stryCov_9fa48("220"), false);
  }
}

// ── Generic Adapter (Fallback) ────────────────────────────────────────

/**
 * Generic adapter with no-op implementations.
 * Used when no specific CLI is detected.
 */
export class GenericAdapter extends BaseAdapter {
  readonly name: CLI = stryMutAct_9fa48("221") ? "" : (stryCov_9fa48("221"), "generic");
  constructor() {
    super(stryMutAct_9fa48("222") ? "" : (stryCov_9fa48("222"), "generic"));
  }
  initialize(): void {
    if (stryMutAct_9fa48("223")) {
      {}
    } else {
      stryCov_9fa48("223");
      console.log(stryMutAct_9fa48("224") ? "" : (stryCov_9fa48("224"), "[cali-product-workflow] Initialized generic adapter (limited functionality)"));
      super.initialize();
    }
  }
  showNotification(message: string, type: NotificationType = stryMutAct_9fa48("225") ? "" : (stryCov_9fa48("225"), "info")): void {
    if (stryMutAct_9fa48("226")) {
      {}
    } else {
      stryCov_9fa48("226");
      console.log(stryMutAct_9fa48("227") ? `` : (stryCov_9fa48("227"), `[${stryMutAct_9fa48("228") ? type.toLowerCase() : (stryCov_9fa48("228"), type.toUpperCase())}] ${message}`));
    }
  }
}