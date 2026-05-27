/**
 * Generic CLI Adapter
 * 
 * Fallback adapter for unknown or generic CLI environments.
 * Provides basic functionality with no CLI-specific integrations.
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
import { BaseAdapter } from "./base";
import type { EventDispatcher } from "./event-dispatcher";
import type { CommandRegistration, ToolDefinition } from "./cli-adapter";
export class GenericAdapter extends BaseAdapter {
  readonly name: CLI = stryMutAct_9fa48("464") ? "" : (stryCov_9fa48("464"), "generic");
  private _eventDispatcher?: EventDispatcher;
  constructor() {
    super(stryMutAct_9fa48("465") ? "" : (stryCov_9fa48("465"), "generic"));
  }

  /**
   * Set an event dispatcher for this adapter.
   */
  setEventDispatcher(dispatcher: EventDispatcher): void {
    if (stryMutAct_9fa48("466")) {
      {}
    } else {
      stryCov_9fa48("466");
      this._eventDispatcher = dispatcher;
    }
  }

  /**
   * Set the API reference and ensure initialization.
   * Mirrors PiAdapter behavior for consistency.
   */
  setAPI(api: unknown): void {
    if (stryMutAct_9fa48("467")) {
      {}
    } else {
      stryCov_9fa48("467");
      this.initialize();
    }
  }
  initialize(): void {
    if (stryMutAct_9fa48("468")) {
      {}
    } else {
      stryCov_9fa48("468");
      console.log(stryMutAct_9fa48("469") ? "" : (stryCov_9fa48("469"), "[cali-product-workflow] Initialized generic adapter (limited functionality)"));
      super.initialize();
    }
  }
  registerCommands(): CommandRegistration[] {
    if (stryMutAct_9fa48("470")) {
      {}
    } else {
      stryCov_9fa48("470");
      // Generic adapter doesn't register commands by default
      // Subclasses should override if they support command registration
      return stryMutAct_9fa48("471") ? ["Stryker was here"] : (stryCov_9fa48("471"), []);
    }
  }
  getAvailableTools(): ToolDefinition[] {
    if (stryMutAct_9fa48("472")) {
      {}
    } else {
      stryCov_9fa48("472");
      // Basic tools available in all environments
      return stryMutAct_9fa48("473") ? [] : (stryCov_9fa48("473"), [stryMutAct_9fa48("474") ? {} : (stryCov_9fa48("474"), {
        name: stryMutAct_9fa48("475") ? "" : (stryCov_9fa48("475"), "read"),
        description: stryMutAct_9fa48("476") ? "" : (stryCov_9fa48("476"), "Read file contents")
      }), stryMutAct_9fa48("477") ? {} : (stryCov_9fa48("477"), {
        name: stryMutAct_9fa48("478") ? "" : (stryCov_9fa48("478"), "write"),
        description: stryMutAct_9fa48("479") ? "" : (stryCov_9fa48("479"), "Write content to file")
      }), stryMutAct_9fa48("480") ? {} : (stryCov_9fa48("480"), {
        name: stryMutAct_9fa48("481") ? "" : (stryCov_9fa48("481"), "bash"),
        description: stryMutAct_9fa48("482") ? "" : (stryCov_9fa48("482"), "Execute shell commands")
      }), stryMutAct_9fa48("483") ? {} : (stryCov_9fa48("483"), {
        name: stryMutAct_9fa48("484") ? "" : (stryCov_9fa48("484"), "edit"),
        description: stryMutAct_9fa48("485") ? "" : (stryCov_9fa48("485"), "Edit existing files")
      })]);
    }
  }
  showNotification(message: string, type: "info" | "warning" | "error" | "success" = stryMutAct_9fa48("486") ? "" : (stryCov_9fa48("486"), "info")): void {
    if (stryMutAct_9fa48("487")) {
      {}
    } else {
      stryCov_9fa48("487");
      console.log(stryMutAct_9fa48("488") ? `` : (stryCov_9fa48("488"), `[${stryMutAct_9fa48("489") ? type.toLowerCase() : (stryCov_9fa48("489"), type.toUpperCase())}] ${message}`));
    }
  }
}

// Factory function for lazy loading
export function createGenericAdapter(): GenericAdapter {
  if (stryMutAct_9fa48("490")) {
    {}
  } else {
    stryCov_9fa48("490");
    return new GenericAdapter();
  }
}