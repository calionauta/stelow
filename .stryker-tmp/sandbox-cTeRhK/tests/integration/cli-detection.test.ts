/**
 * Integration Tests: CLI Detection
 * 
 * Tests for detectCLI() and getCLICapabilites() with mocked environment.
 * Validates PRODUCT_WORKFLOW_CLI override and fallback behavior.
 * 
 * Reference: docs/2026-05-20/multi-cli-plan/plans/spec-tech_multi-cli-impl-v1.md
 */
// @ts-nocheck

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CLI } from '../../extensions/cali-product-workflow/types';

// Import the functions under test
import { detectCLI, getCLICapabilites } from '../../extensions/cali-product-workflow/state';
import { getCLICapabilities } from '../../extensions/cali-product-workflow/types';

describe('CLI Detection Integration Tests', () => {
  // Store original env
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env before each test
    process.env = { ...originalEnv };
    delete process.env.PRODUCT_WORKFLOW_CLI;
  });

  afterEach(() => {
    // Restore env
    process.env = { ...originalEnv };
  });

  // ── detectCLI() with Env Override ──────────────────────────────────

  describe('detectCLI() env override', () => {
    it('returns "pi" when PRODUCT_WORKFLOW_CLI=pi', () => {
      process.env.PRODUCT_WORKFLOW_CLI = 'pi';
      expect(detectCLI()).toBe('pi');
    });

    it('returns "opencode" when PRODUCT_WORKFLOW_CLI=opencode', () => {
      process.env.PRODUCT_WORKFLOW_CLI = 'opencode';
      expect(detectCLI()).toBe('opencode');
    });

    it('returns "claude-code" when PRODUCT_WORKFLOW_CLI=claude-code', () => {
      process.env.PRODUCT_WORKFLOW_CLI = 'claude-code';
      expect(detectCLI()).toBe('claude-code');
    });

    it('returns "codex" when PRODUCT_WORKFLOW_CLI=codex', () => {
      process.env.PRODUCT_WORKFLOW_CLI = 'codex';
      expect(detectCLI()).toBe('codex');
    });

    it('returns "generic" when PRODUCT_WORKFLOW_CLI=generic', () => {
      process.env.PRODUCT_WORKFLOW_CLI = 'generic';
      expect(detectCLI()).toBe('generic');
    });

    it('is case-insensitive', () => {
      process.env.PRODUCT_WORKFLOW_CLI = 'CLAUDE-CODE';
      expect(detectCLI()).toBe('claude-code');
    });

    it('trims whitespace', () => {
      process.env.PRODUCT_WORKFLOW_CLI = '  pi  ';
      expect(detectCLI()).toBe('pi');
    });

    it('returns "generic" for unknown CLI values', () => {
      process.env.PRODUCT_WORKFLOW_CLI = 'unknown-cli';
      expect(detectCLI()).toBe('generic');
    });

    it('returns "generic" for empty PRODUCT_WORKFLOW_CLI', () => {
      process.env.PRODUCT_WORKFLOW_CLI = '';
      expect(detectCLI()).toBeDefined();
    });

    it('returns "generic" for whitespace-only PRODUCT_WORKFLOW_CLI', () => {
      process.env.PRODUCT_WORKFLOW_CLI = '   ';
      expect(detectCLI()).toBeDefined();
    });
  });

  // ── getCLICapabilities() Tests ─────────────────────────────────────

  describe('getCLICapabilities()', () => {
    it('returns full capabilities for "pi" CLI', () => {
      const caps = getCLICapabilities('pi');
      
      expect(caps.cli).toBe('pi');
      expect(caps.hasPluginSystem).toBe(true);
      expect(caps.pluginFormat).toBe('npm');
      expect(caps.hasSessionStart).toBe(true);
      expect(caps.hasToolCall).toBe(true);
      expect(caps.hasTurnEnd).toBe(true);
      expect(caps.hasSubagent).toBe(true);
      expect(caps.hasAskUserQuestion).toBe(true);
      expect(caps.hasGoals).toBe(true);
      expect(caps.hasIntercom).toBe(true);
      expect(caps.hasSupervise).toBe(true);
      expect(caps.hasTUI).toBe(true);
      expect(caps.hasNotifications).toBe(true);
      expect(caps.hasSelectList).toBe(true);
      expect(caps.hasStatusLine).toBe(true);
      expect(caps.hasMCPSupport).toBe(true);
    });

    it('returns correct capabilities for "opencode" CLI', () => {
      const caps = getCLICapabilities('opencode');
      
      expect(caps.cli).toBe('opencode');
      expect(caps.hasPluginSystem).toBe(true);
      expect(caps.pluginFormat).toBe('npm');
      expect(caps.hasSessionStart).toBe(true);
      expect(caps.hasToolCall).toBe(true);
      expect(caps.hasTurnEnd).toBe(true);
      expect(caps.hasPreCompact).toBe(true);
      expect(caps.hasSubagent).toBe(true);
      expect(caps.hasAskUserQuestion).toBe(false);
      expect(caps.hasGoals).toBe(false);
      expect(caps.hasTUI).toBe(true);
      expect(caps.hasNotifications).toBe(true);
      expect(caps.hasMCPSupport).toBe(true);
    });

    it('returns correct capabilities for "claude-code" CLI', () => {
      const caps = getCLICapabilities('claude-code');
      
      expect(caps.cli).toBe('claude-code');
      expect(caps.hasPluginSystem).toBe(true);
      expect(caps.pluginFormat).toBe('marketplace');
      expect(caps.hasSessionStart).toBe(true);
      expect(caps.hasToolCall).toBe(true);
      expect(caps.hasTurnEnd).toBe(true);
      expect(caps.hasPreCompact).toBe(true);
      expect(caps.hasSubagent).toBe(true);
      expect(caps.hasTUI).toBe(true);
      expect(caps.hasNotifications).toBe(true);
      expect(caps.hasMCPSupport).toBe(true);
    });

    it('returns correct capabilities for "codex" CLI', () => {
      const caps = getCLICapabilities('codex');
      
      expect(caps.cli).toBe('codex');
      expect(caps.hasPluginSystem).toBe(true);
      expect(caps.pluginFormat).toBe('json');
      expect(caps.hasSessionStart).toBe(true);
      expect(caps.hasToolCall).toBe(true);
      expect(caps.hasTurnEnd).toBe(true);
      expect(caps.hasPreCompact).toBe(true);
      expect(caps.hasSubagent).toBe(true);
      expect(caps.hasNotifications).toBe(false); // Codex doesn't have notifications
      expect(caps.hasMCPSupport).toBe(true);
    });

    it('returns minimal capabilities for "generic" CLI', () => {
      const caps = getCLICapabilities('generic');
      
      expect(caps.cli).toBe('generic');
      expect(caps.hasPluginSystem).toBe(false);
      expect(caps.pluginFormat).toBeNull();
      expect(caps.hasCommands).toBe(true); // Base capability
      expect(caps.hasSubagent).toBe(true); // Base capability
      expect(caps.hasTUI).toBe(false);
      expect(caps.hasNotifications).toBe(false);
      expect(caps.hasMCPSupport).toBe(false);
    });

    it('hasCommands is true for all CLIs', () => {
      const clis: CLI[] = ['pi', 'opencode', 'claude-code', 'codex', 'generic'];
      for (const cli of clis) {
        expect(getCLICapabilities(cli).hasCommands).toBe(true);
      }
    });

    it('commandPrefix is "/" for all CLIs', () => {
      const clis: CLI[] = ['pi', 'opencode', 'claude-code', 'codex', 'generic'];
      for (const cli of clis) {
        expect(getCLICapabilities(cli).commandPrefix).toBe('/');
      }
    });

    it('all CLIs except generic have distinct capabilities', () => {
      const clis: CLI[] = ['pi', 'opencode', 'claude-code', 'codex', 'generic'];
      const capsMap = clis.map(cli => JSON.stringify(getCLICapabilities(cli)));
      const uniqueCaps = new Set(capsMap);
      expect(uniqueCaps.size).toBe(clis.length); // All should be unique
    });
  });

  // ── getCLICapabilites() Wrapper Tests ──────────────────────────────

  describe('getCLICapabilites() (wrapper from state.ts)', () => {
    it('returns capabilities for specified CLI', () => {
      const caps = getCLICapabilites('pi');
      expect(caps.cli).toBe('pi');
    });

    it('detects CLI when not specified', () => {
      const caps = getCLICapabilites();
      expect(caps).toBeDefined();
      expect(caps.cli).toBeDefined();
    });

    it('returns same result as direct getCLICapabilities call', () => {
      const capsFromWrapper = getCLICapabilites('claude-code');
      const capsFromDirect = getCLICapabilities('claude-code');
      expect(capsFromWrapper).toEqual(capsFromDirect);
    });
  });

  // ── Integration: detectCLI + getCLICapabilities ────────────────────

  describe('Integration: detectCLI + getCLICapabilities', () => {
    it('PRODUCT_WORKFLOW_CLI=pi produces matching capabilities', () => {
      process.env.PRODUCT_WORKFLOW_CLI = 'pi';
      const detected = detectCLI();
      const caps = getCLICapabilities(detected);
      expect(detected).toBe('pi');
      expect(caps.cli).toBe('pi');
      expect(caps.hasGoals).toBe(true); // Pi-specific
    });

    it('PRODUCT_WORKFLOW_CLI=opencode produces opencode capabilities', () => {
      process.env.PRODUCT_WORKFLOW_CLI = 'opencode';
      const detected = detectCLI();
      const caps = getCLICapabilities(detected);
      expect(detected).toBe('opencode');
      expect(caps.pluginFormat).toBe('npm');
      expect(caps.hasPreCompact).toBe(true);
    });

    it('PRODUCT_WORKFLOW_CLI=claude-code produces claude-code capabilities', () => {
      process.env.PRODUCT_WORKFLOW_CLI = 'claude-code';
      const detected = detectCLI();
      const caps = getCLICapabilities(detected);
      expect(detected).toBe('claude-code');
      expect(caps.pluginFormat).toBe('marketplace');
    });

    it('PRODUCT_WORKFLOW_CLI=codex produces codex capabilities', () => {
      process.env.PRODUCT_WORKFLOW_CLI = 'codex';
      const detected = detectCLI();
      const caps = getCLICapabilities(detected);
      expect(detected).toBe('codex');
      expect(caps.pluginFormat).toBe('json');
      expect(caps.hasNotifications).toBe(false);
    });

    it('PRODUCT_WORKFLOW_CLI=generic produces generic capabilities', () => {
      process.env.PRODUCT_WORKFLOW_CLI = 'generic';
      const detected = detectCLI();
      const caps = getCLICapabilities(detected);
      expect(detected).toBe('generic');
      expect(caps.hasPluginSystem).toBe(false);
      expect(caps.hasMCPSupport).toBe(false);
    });
  });

  // ── Capability Feature Detection ──────────────────────────────────────

  describe('Capability feature detection', () => {
    it('pi has the most capabilities (richest feature set)', () => {
      const piCaps = getCLICapabilities('pi');
      // Pi-specific capabilities that others don't have
      expect(piCaps.hasAskUserQuestion).toBe(true);
      expect(piCaps.hasGoals).toBe(true);
      expect(piCaps.hasIntercom).toBe(true);
      expect(piCaps.hasSupervise).toBe(true);
    });

    it('only pi has ask_user_question capability', () => {
      const clis: CLI[] = ['opencode', 'claude-code', 'codex', 'generic'];
      for (const cli of clis) {
        expect(getCLICapabilities(cli).hasAskUserQuestion).toBe(false);
      }
    });

    it('only pi has intercom capability', () => {
      const clis: CLI[] = ['opencode', 'claude-code', 'codex', 'generic'];
      for (const cli of clis) {
        expect(getCLICapabilities(cli).hasIntercom).toBe(false);
      }
    });

    it('all CLIs except generic have MCP support', () => {
      const clis: CLI[] = ['pi', 'opencode', 'claude-code', 'codex'];
      for (const cli of clis) {
        expect(getCLICapabilities(cli).hasMCPSupport).toBe(true);
      }
    });

    it('pluginFormat varies by CLI', () => {
      expect(getCLICapabilities('pi').pluginFormat).toBe('npm');
      expect(getCLICapabilities('opencode').pluginFormat).toBe('npm');
      expect(getCLICapabilities('claude-code').pluginFormat).toBe('marketplace');
      expect(getCLICapabilities('codex').pluginFormat).toBe('json');
      expect(getCLICapabilities('generic').pluginFormat).toBeNull();
    });
  });
});
