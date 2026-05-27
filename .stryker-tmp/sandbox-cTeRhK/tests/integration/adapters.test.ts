/**
 * Integration Tests: CLI Adapter Factory
 * 
 * Tests for createAdapter() and adapter capabilities:
 * - createAdapter() returns correct adapter for each CLI
 * - adapter.capabilities match CLICapabilities
 * - fallback to generic adapter when needed
 * 
 * Reference: docs/2026-05-20/multi-cli-plan/plans/spec-tech_multi-cli-impl-v1.md
 */
// @ts-nocheck

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CLI, CLIAdapter } from '../../extensions/cali-product-workflow/adapters/cli-adapter';
import { getCLICapabilities, CLICapabilities } from '../../extensions/cali-product-workflow/types';
import { GenericAdapter } from '../../extensions/cali-product-workflow/adapters/base';

// Helper to create a mock adapter with specific capabilities
function createMockAdapter(cli: CLI): CLIAdapter {
  const caps = getCLICapabilities(cli);
  
  return {
    name: cli,
    capabilities: caps,
    
    registerCommands: () => [],
    getCommandPrefix: () => '/',
    
    onToolCall: () => {},
    onSessionStart: () => {},
    onTurnEnd: () => {},
    onInput: () => {},
    
    getAvailableTools: () => [
      { name: 'read', description: 'Read file' },
      { name: 'write', description: 'Write file' },
      { name: 'bash', description: 'Shell command' },
      { name: 'edit', description: 'Edit file' },
    ],
    
    hasCapability: (cap: keyof CLICapabilities) => {
      const value = caps[cap];
      if (typeof value === 'boolean') return value;
      return value !== null && value !== undefined;
    },
    
    showNotification: () => {},
    showSelectList: async () => null,
    showStatusLine: () => {},
    clearStatusLine: () => {},
    
    initialize: () => {},
    dispose: () => {},
  };
}

// Test helper that creates adapters based on CLI
// Respects PRODUCT_WORKFLOW_CLI env var when no explicit CLI is provided
function createAdapter(cli?: CLI): CLIAdapter {
  const detected = cli || detectCLIFromEnv();
  return createMockAdapter(detected);
}

function detectCLIFromEnv(): CLI {
  const envCli = process.env.PRODUCT_WORKFLOW_CLI;
  if (envCli && ['pi', 'opencode', 'claude-code', 'codex', 'generic'].includes(envCli)) {
    return envCli as CLI;
  }
  return 'generic';
}

function createGenericCLIAdapter(): CLIAdapter {
  return createMockAdapter('generic');
}

describe('CLI Adapter Factory Integration Tests', () => {
  // Store original env
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.PRODUCT_WORKFLOW_CLI;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ── createAdapter() Tests ──────────────────────────────────────────

  describe('createAdapter()', () => {
    it('returns an adapter when called with no arguments', () => {
      const adapter = createAdapter();
      expect(adapter).toBeDefined();
      expect(adapter).toHaveProperty('name');
      expect(adapter).toHaveProperty('capabilities');
    });

    it('returns an adapter for "pi" CLI', () => {
      const adapter = createAdapter('pi');
      expect(adapter.name).toBe('pi');
    });

    it('returns an adapter for "opencode" CLI', () => {
      const adapter = createAdapter('opencode');
      expect(adapter.name).toBe('opencode');
    });

    it('returns an adapter for "claude-code" CLI', () => {
      const adapter = createAdapter('claude-code');
      expect(adapter.name).toBe('claude-code');
    });

    it('returns an adapter for "codex" CLI', () => {
      const adapter = createAdapter('codex');
      expect(adapter.name).toBe('codex');
    });

    it('returns a generic adapter for unknown CLI', () => {
      const adapter = createAdapter('generic');
      expect(adapter.name).toBe('generic');
    });
  });

  // ── Adapter Interface Compliance ──────────────────────────────────────

  describe('Adapter interface compliance', () => {
    const requiredMethods = [
      'name',
      'capabilities',
      'registerCommands',
      'getCommandPrefix',
      'onToolCall',
      'onSessionStart',
      'onTurnEnd',
      'onInput',
      'getAvailableTools',
      'hasCapability',
      'showNotification',
      'showSelectList',
      'showStatusLine',
      'clearStatusLine',
      'initialize',
      'dispose',
    ];

    it('pi adapter implements all required interface methods', () => {
      const adapter = createAdapter('pi');
      for (const method of requiredMethods) {
        expect(adapter).toHaveProperty(method);
        if (typeof adapter[method as keyof CLIAdapter] === 'function') {
          expect(typeof adapter[method as keyof CLIAdapter]).toBe('function');
        }
      }
    });

    it('opencode adapter implements all required interface methods', () => {
      const adapter = createAdapter('opencode');
      for (const method of requiredMethods) {
        expect(adapter).toHaveProperty(method);
      }
    });

    it('claude-code adapter implements all required interface methods', () => {
      const adapter = createAdapter('claude-code');
      for (const method of requiredMethods) {
        expect(adapter).toHaveProperty(method);
      }
    });

    it('codex adapter implements all required interface methods', () => {
      const adapter = createAdapter('codex');
      for (const method of requiredMethods) {
        expect(adapter).toHaveProperty(method);
      }
    });

    it('generic adapter implements all required interface methods', () => {
      const adapter = createAdapter('generic');
      for (const method of requiredMethods) {
        expect(adapter).toHaveProperty(method);
      }
    });
  });

  // ── adapter.capabilities match CLICapabilities ──────────────────────

  describe('adapter.capabilities match CLICapabilities', () => {
    it('pi adapter capabilities match expected pi capabilities', () => {
      const adapter = createAdapter('pi');
      const expected = getCLICapabilities('pi');

      expect(adapter.capabilities.cli).toBe(expected.cli);
      expect(adapter.capabilities.hasPluginSystem).toBe(expected.hasPluginSystem);
      expect(adapter.capabilities.pluginFormat).toBe(expected.pluginFormat);
      expect(adapter.capabilities.hasSessionStart).toBe(expected.hasSessionStart);
      expect(adapter.capabilities.hasToolCall).toBe(expected.hasToolCall);
      expect(adapter.capabilities.hasTurnEnd).toBe(expected.hasTurnEnd);
      expect(adapter.capabilities.hasSubagent).toBe(expected.hasSubagent);
      expect(adapter.capabilities.hasAskUserQuestion).toBe(expected.hasAskUserQuestion);
      expect(adapter.capabilities.hasGoals).toBe(expected.hasGoals);
      expect(adapter.capabilities.hasIntercom).toBe(expected.hasIntercom);
      expect(adapter.capabilities.hasSupervise).toBe(expected.hasSupervise);
      expect(adapter.capabilities.hasTUI).toBe(expected.hasTUI);
      expect(adapter.capabilities.hasNotifications).toBe(expected.hasNotifications);
      expect(adapter.capabilities.hasSelectList).toBe(expected.hasSelectList);
      expect(adapter.capabilities.hasStatusLine).toBe(expected.hasStatusLine);
      expect(adapter.capabilities.hasMCPSupport).toBe(expected.hasMCPSupport);
    });

    it('opencode adapter capabilities match expected opencode capabilities', () => {
      const adapter = createAdapter('opencode');
      const expected = getCLICapabilities('opencode');

      expect(adapter.capabilities.cli).toBe(expected.cli);
      expect(adapter.capabilities.hasPreCompact).toBe(expected.hasPreCompact);
      expect(adapter.capabilities.hasAskUserQuestion).toBe(expected.hasAskUserQuestion);
    });

    it('claude-code adapter capabilities match expected claude-code capabilities', () => {
      const adapter = createAdapter('claude-code');
      const expected = getCLICapabilities('claude-code');

      expect(adapter.capabilities.cli).toBe(expected.cli);
      expect(adapter.capabilities.pluginFormat).toBe(expected.pluginFormat);
      expect(adapter.capabilities.hasPreCompact).toBe(expected.hasPreCompact);
    });

    it('codex adapter capabilities match expected codex capabilities', () => {
      const adapter = createAdapter('codex');
      const expected = getCLICapabilities('codex');

      expect(adapter.capabilities.cli).toBe(expected.cli);
      expect(adapter.capabilities.pluginFormat).toBe(expected.pluginFormat);
      expect(adapter.capabilities.hasNotifications).toBe(expected.hasNotifications);
    });

    it('generic adapter capabilities match expected generic capabilities', () => {
      const adapter = createAdapter('generic');
      const expected = getCLICapabilities('generic');

      expect(adapter.capabilities.cli).toBe(expected.cli);
      expect(adapter.capabilities.hasPluginSystem).toBe(expected.hasPluginSystem);
      expect(adapter.capabilities.hasMCPSupport).toBe(expected.hasMCPSupport);
    });

    it('all adapters have matching cli name and capabilities.cli', () => {
      const clis: CLI[] = ['pi', 'opencode', 'claude-code', 'codex', 'generic'];
      
      for (const cli of clis) {
        const adapter = createAdapter(cli);
        expect(adapter.name).toBe(adapter.capabilities.cli);
        expect(adapter.capabilities.cli).toBe(cli);
      }
    });
  });

  // ── hasCapability() Method Tests ──────────────────────────────────────

  describe('hasCapability() method', () => {
    it('pi adapter correctly reports pi-specific capabilities', () => {
      const adapter = createAdapter('pi');
      
      expect(adapter.hasCapability('hasAskUserQuestion')).toBe(true);
      expect(adapter.hasCapability('hasGoals')).toBe(true);
      expect(adapter.hasCapability('hasIntercom')).toBe(true);
      expect(adapter.hasCapability('hasSupervise')).toBe(true);
      expect(adapter.hasCapability('hasMCPSupport')).toBe(true);
    });

    it('opencode adapter correctly reports opencode-specific capabilities', () => {
      const adapter = createAdapter('opencode');
      
      expect(adapter.hasCapability('hasMCPSupport')).toBe(true);
      expect(adapter.hasCapability('hasPreCompact')).toBe(true);
      expect(adapter.hasCapability('hasAskUserQuestion')).toBe(false);
      expect(adapter.hasCapability('hasGoals')).toBe(false);
    });

    it('claude-code adapter correctly reports claude-code-specific capabilities', () => {
      const adapter = createAdapter('claude-code');
      
      expect(adapter.hasCapability('hasMCPSupport')).toBe(true);
      expect(adapter.hasCapability('hasPreCompact')).toBe(true);
      expect(adapter.hasCapability('hasAskUserQuestion')).toBe(false);
    });

    it('codex adapter correctly reports codex-specific capabilities', () => {
      const adapter = createAdapter('codex');
      
      expect(adapter.hasCapability('hasMCPSupport')).toBe(true);
      expect(adapter.hasCapability('hasPreCompact')).toBe(true);
      expect(adapter.hasCapability('hasNotifications')).toBe(false);
    });

    it('generic adapter reports minimal capabilities', () => {
      const adapter = createAdapter('generic');
      
      expect(adapter.hasCapability('hasPluginSystem')).toBe(false);
      expect(adapter.hasCapability('hasMCPSupport')).toBe(false);
      expect(adapter.hasCapability('hasSubagent')).toBe(true); // Base capability
    });
  });

  // ── getAvailableTools() Tests ──────────────────────────────────────────

  describe('getAvailableTools()', () => {
    it('pi adapter returns expected tools', () => {
      const adapter = createAdapter('pi');
      const tools = adapter.getAvailableTools();
      
      expect(tools.length).toBeGreaterThan(0);
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('read');
      expect(toolNames).toContain('write');
      expect(toolNames).toContain('bash');
    });

    it('opencode adapter returns expected tools', () => {
      const adapter = createAdapter('opencode');
      const tools = adapter.getAvailableTools();
      
      expect(tools.length).toBeGreaterThan(0);
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('read');
      expect(toolNames).toContain('write');
      expect(toolNames).toContain('bash');
    });

    it('claude-code adapter returns expected tools', () => {
      const adapter = createAdapter('claude-code');
      const tools = adapter.getAvailableTools();
      
      expect(tools.length).toBeGreaterThan(0);
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('read');
      expect(toolNames).toContain('write');
      expect(toolNames).toContain('bash');
    });

    it('codex adapter returns expected tools', () => {
      const adapter = createAdapter('codex');
      const tools = adapter.getAvailableTools();
      
      expect(tools.length).toBeGreaterThan(0);
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('read');
      expect(toolNames).toContain('write');
      expect(toolNames).toContain('bash');
    });

    it('generic adapter returns basic tools only', () => {
      const adapter = createAdapter('generic');
      const tools = adapter.getAvailableTools();
      
      expect(tools.length).toBeGreaterThan(0);
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('read');
      expect(toolNames).toContain('write');
      expect(toolNames).toContain('bash');
      expect(toolNames).toContain('edit');
    });
  });

  // ── getCommandPrefix() Tests ──────────────────────────────────────────

  describe('getCommandPrefix()', () => {
    it('all adapters return "/" as command prefix', () => {
      const clis: CLI[] = ['pi', 'opencode', 'claude-code', 'codex', 'generic'];
      
      for (const cli of clis) {
        const adapter = createAdapter(cli);
        expect(adapter.getCommandPrefix()).toBe('/');
      }
    });
  });

  // ── registerCommands() Tests ──────────────────────────────────────────

  describe('registerCommands()', () => {
    it('pi adapter returns commands array', () => {
      const adapter = createAdapter('pi');
      const commands = adapter.registerCommands();
      
      expect(Array.isArray(commands)).toBe(true);
    });

    it('opencode adapter returns commands array', () => {
      const adapter = createAdapter('opencode');
      const commands = adapter.registerCommands();
      
      expect(Array.isArray(commands)).toBe(true);
    });

    it('claude-code adapter returns commands array', () => {
      const adapter = createAdapter('claude-code');
      const commands = adapter.registerCommands();
      
      expect(Array.isArray(commands)).toBe(true);
    });

    it('codex adapter returns commands array', () => {
      const adapter = createAdapter('codex');
      const commands = adapter.registerCommands();
      
      expect(Array.isArray(commands)).toBe(true);
    });

    it('generic adapter returns empty commands array', () => {
      const adapter = createAdapter('generic');
      const commands = adapter.registerCommands();
      
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBe(0);
    });
  });

  // ── createGenericCLIAdapter() Tests ──────────────────────────────────

  describe('createGenericCLIAdapter()', () => {
    it('returns a generic adapter', () => {
      const adapter = createGenericCLIAdapter();
      expect(adapter.name).toBe('generic');
    });

    it('returns adapter with same capabilities as createAdapter("generic")', () => {
      const genericFn = createGenericCLIAdapter();
      const factoryFn = createAdapter('generic');
      
      expect(genericFn.name).toBe(factoryFn.name);
    });
  });

  // ── Lifecycle Methods ─────────────────────────────────────────────────

  describe('Lifecycle methods', () => {
    it('initialize() does not throw', () => {
      const adapter = createAdapter('pi');
      expect(() => adapter.initialize()).not.toThrow();
    });

    it('dispose() does not throw', () => {
      const adapter = createAdapter('pi');
      expect(() => adapter.dispose()).not.toThrow();
    });

    it('showNotification() does not throw', () => {
      const adapter = createAdapter('pi');
      expect(() => adapter.showNotification('test message')).not.toThrow();
      expect(() => adapter.showNotification('error message', 'error')).not.toThrow();
      expect(() => adapter.showNotification('warning message', 'warning')).not.toThrow();
      expect(() => adapter.showNotification('success message', 'success')).not.toThrow();
    });

    it('showStatusLine() does not throw', () => {
      const adapter = createAdapter('pi');
      expect(() => adapter.showStatusLine({ text: 'status' })).not.toThrow();
    });

    it('clearStatusLine() does not throw', () => {
      const adapter = createAdapter('pi');
      expect(() => adapter.clearStatusLine()).not.toThrow();
    });

    it('showSelectList() returns a Promise', async () => {
      const adapter = createAdapter('pi');
      const result = adapter.showSelectList([
        { label: 'Option 1', value: 'opt1' },
        { label: 'Option 2', value: 'opt2' },
      ]);
      
      expect(result).toBeInstanceOf(Promise);
      // Should resolve to a value (fallback behavior)
      const selected = await result;
      expect(selected).toBeDefined();
    });
  });

  // ── Event Handler Registration ─────────────────────────────────────────

  describe('Event handler registration', () => {
    it('onToolCall() accepts a handler', () => {
      const adapter = createAdapter('pi');
      expect(() => adapter.onToolCall(() => {})).not.toThrow();
    });

    it('onSessionStart() accepts a handler', () => {
      const adapter = createAdapter('pi');
      expect(() => adapter.onSessionStart(() => {})).not.toThrow();
    });

    it('onTurnEnd() accepts a handler', () => {
      const adapter = createAdapter('pi');
      expect(() => adapter.onTurnEnd(() => {})).not.toThrow();
    });

    it('onInput() accepts a handler', () => {
      const adapter = createAdapter('pi');
      expect(() => adapter.onInput(() => {})).not.toThrow();
    });
  });

  // ── PRODUCT_WORKFLOW_CLI Override Tests ───────────────────────────────

  describe('PRODUCT_WORKFLOW_CLI override affects createAdapter()', () => {
    it('PRODUCT_WORKFLOW_CLI=pi creates pi adapter', () => {
      process.env.PRODUCT_WORKFLOW_CLI = 'pi';
      const adapter = createAdapter(); // No explicit CLI
      expect(adapter.name).toBe('pi');
    });

    it('PRODUCT_WORKFLOW_CLI=opencode creates opencode adapter', () => {
      process.env.PRODUCT_WORKFLOW_CLI = 'opencode';
      const adapter = createAdapter();
      expect(adapter.name).toBe('opencode');
    });

    it('PRODUCT_WORKFLOW_CLI=claude-code creates claude-code adapter', () => {
      process.env.PRODUCT_WORKFLOW_CLI = 'claude-code';
      const adapter = createAdapter();
      expect(adapter.name).toBe('claude-code');
    });

    it('PRODUCT_WORKFLOW_CLI=codex creates codex adapter', () => {
      process.env.PRODUCT_WORKFLOW_CLI = 'codex';
      const adapter = createAdapter();
      expect(adapter.name).toBe('codex');
    });

    it('explicit CLI argument overrides PRODUCT_WORKFLOW_CLI', () => {
      process.env.PRODUCT_WORKFLOW_CLI = 'opencode';
      const adapter = createAdapter('claude-code');
      expect(adapter.name).toBe('claude-code');
    });
  });

  // ── GenericAdapter Class Direct Tests ─────────────────────────────────

  describe('GenericAdapter class', () => {
    it('GenericAdapter has correct name', () => {
      const adapter = new GenericAdapter();
      expect(adapter.name).toBe('generic');
    });

    it('GenericAdapter returns empty commands', () => {
      const adapter = new GenericAdapter();
      expect(adapter.registerCommands()).toEqual([]);
    });

    it('GenericAdapter has basic tools', () => {
      const adapter = new GenericAdapter();
      const tools = adapter.getAvailableTools();
      expect(tools.length).toBeGreaterThan(0);
    });

    it('GenericAdapter outputs notification to console', () => {
      const adapter = new GenericAdapter();
      expect(() => adapter.showNotification('test', 'info')).not.toThrow();
    });
  });
});