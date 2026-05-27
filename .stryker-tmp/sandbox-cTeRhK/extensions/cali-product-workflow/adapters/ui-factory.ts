/**
 * UI Adapter Factory
 * 
 * Factory function to create the appropriate UI adapter based on CLI.
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
import type { CLI } from "../types";
import type { SelectOption, StatusInfo } from "./cli-adapter";
import { UIAdapter } from "./ui-adapter";
import { createPiUIAdapter } from "./pi/ui";
import { createOpenCodeUIAdapter } from "./opencode/ui";
import { createClaudeCodeUIAdapter } from "./claude-code/ui";
import { createCodexUIAdapter } from "./codex/ui";

// ── Factory Function ──────────────────────────────────────────────────

/**
 * Create a UI adapter for the specified CLI.
 * @param cli - CLI identifier (defaults to "generic")
 * @returns UIAdapter instance
 */
export function createUIAdapter(cli: CLI = stryMutAct_9fa48("582") ? "" : (stryCov_9fa48("582"), "generic")): UIAdapter {
  if (stryMutAct_9fa48("583")) {
    {}
  } else {
    stryCov_9fa48("583");
    switch (cli) {
      case stryMutAct_9fa48("585") ? "" : (stryCov_9fa48("585"), "pi"):
        if (stryMutAct_9fa48("584")) {} else {
          stryCov_9fa48("584");
          return createPiUIAdapter();
        }
      case stryMutAct_9fa48("587") ? "" : (stryCov_9fa48("587"), "opencode"):
        if (stryMutAct_9fa48("586")) {} else {
          stryCov_9fa48("586");
          return createOpenCodeUIAdapter();
        }
      case stryMutAct_9fa48("589") ? "" : (stryCov_9fa48("589"), "claude-code"):
        if (stryMutAct_9fa48("588")) {} else {
          stryCov_9fa48("588");
          return createClaudeCodeUIAdapter();
        }
      case stryMutAct_9fa48("591") ? "" : (stryCov_9fa48("591"), "codex"):
        if (stryMutAct_9fa48("590")) {} else {
          stryCov_9fa48("590");
          return createCodexUIAdapter();
        }
      default:
        if (stryMutAct_9fa48("592")) {} else {
          stryCov_9fa48("592");
          // Return a generic no-op adapter
          return createGenericUIAdapter();
        }
    }
  }
}

// ── Generic UI Adapter (Fallback) ────────────────────────────────────

/**
 * Generic UI adapter with no-op implementations.
 * Used when no specific CLI is detected.
 */
class GenericUIAdapter implements UIAdapter {
  readonly cliName: string = stryMutAct_9fa48("593") ? "" : (stryCov_9fa48("593"), "generic");
  notify(message: string, type = stryMutAct_9fa48("594") ? "" : (stryCov_9fa48("594"), "info")): void {
    if (stryMutAct_9fa48("595")) {
      {}
    } else {
      stryCov_9fa48("595");
      console.log(stryMutAct_9fa48("596") ? `` : (stryCov_9fa48("596"), `[${stryMutAct_9fa48("597") ? type.toLowerCase() : (stryCov_9fa48("597"), type.toUpperCase())}] ${message}`));
    }
  }
  async select(options: SelectOption[], _title?: string): Promise<string | null> {
    if (stryMutAct_9fa48("598")) {
      {}
    } else {
      stryCov_9fa48("598");
      console.warn(stryMutAct_9fa48("599") ? "" : (stryCov_9fa48("599"), "[GenericUI] Select not supported, returning first option"));
      return stryMutAct_9fa48("602") ? options[0]?.value && null : stryMutAct_9fa48("601") ? false : stryMutAct_9fa48("600") ? true : (stryCov_9fa48("600", "601", "602"), (stryMutAct_9fa48("603") ? options[0].value : (stryCov_9fa48("603"), options[0]?.value)) || null);
    }
  }
  setStatus(_info: StatusInfo): void {
    // No-op for generic
  }
  clearStatus(): void {
    // No-op for generic
  }
  getCapabilityLevel(): "native" | "ansi" | "plain" | "silent" {
    if (stryMutAct_9fa48("604")) {
      {}
    } else {
      stryCov_9fa48("604");
      return stryMutAct_9fa48("605") ? "" : (stryCov_9fa48("605"), "plain");
    }
  }
}

/**
 * Create a generic UI adapter (fallback).
 */
function createGenericUIAdapter(): UIAdapter {
  if (stryMutAct_9fa48("606")) {
    {}
  } else {
    stryCov_9fa48("606");
    return new GenericUIAdapter();
  }
}

// Re-export UIAdapter interface
export type { UIAdapter } from "./ui-adapter";
export { detectUIFallbackLevel, formatAnsiNotification, formatSelectList, formatStatusLine, AnsiColors } from "./ui-adapter";