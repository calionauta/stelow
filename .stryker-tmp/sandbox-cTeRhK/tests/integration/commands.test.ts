/**
 * Integration Tests: Command Dispatcher
 * 
 * Tests for WORKFLOW_COMMANDS array and getCommandSystem():
 * - WORKFLOW_COMMANDS array structure and content
 * - getCommandSystem() for each CLI
 * - Command registration system interface compliance
 * - Command file generation for each CLI
 * 
 * Reference: docs/2026-05-20/multi-cli-plan/plans/spec-tech_multi-cli-impl-v1.md
 */
// @ts-nocheck

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CLI } from '../../extensions/cali-product-workflow/types';
import {
  WORKFLOW_COMMANDS,
  getCommandSystem,
  type CommandDescriptor,
  type CommandRegistrationSystem,
} from '../../extensions/cali-product-workflow/adapters/commands';

describe('Command Dispatcher Integration Tests', () => {
  // Store original env
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.PRODUCT_WORKFLOW_CLI;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ── WORKFLOW_COMMANDS Array Tests ───────────────────────────────────

  describe('WORKFLOW_COMMANDS array', () => {
    it('is an array of command descriptors', () => {
      expect(Array.isArray(WORKFLOW_COMMANDS)).toBe(true);
      expect(WORKFLOW_COMMANDS.length).toBeGreaterThan(0);
    });

    it('each command has required properties', () => {
      for (const cmd of WORKFLOW_COMMANDS) {
        expect(cmd).toHaveProperty('name');
        expect(cmd).toHaveProperty('description');
        expect(typeof cmd.name).toBe('string');
        expect(typeof cmd.description).toBe('string');
      }
    });

    it('all commands start with "pw-" prefix', () => {
      for (const cmd of WORKFLOW_COMMANDS) {
        expect(cmd.name.startsWith('pw-')).toBe(true);
      }
    });

    it('contains expected commands', () => {
      const commandNames = WORKFLOW_COMMANDS.map(cmd => cmd.name);
      
      expect(commandNames).toContain('pw-start');
      expect(commandNames).toContain('pw-stop');
      expect(commandNames).toContain('pw-pause');
      expect(commandNames).toContain('pw-resume');
      expect(commandNames).toContain('pw-status');
      expect(commandNames).toContain('pw-ls');
      expect(commandNames).toContain('pw-setphase');
      expect(commandNames).toContain('pw-next');
      expect(commandNames).toContain('pw-complete');
      expect(commandNames).toContain('pw-goto');
      expect(commandNames).toContain('pw-rename');
      expect(commandNames).toContain('pw-menu');
      expect(commandNames).toContain('pw-todo');
      expect(commandNames).toContain('pw-inbox');
      expect(commandNames).toContain('pw-archive');
      expect(commandNames).toContain('pw-unarchive');
    });

    it('has 16 commands defined', () => {
      expect(WORKFLOW_COMMANDS).toHaveLength(16);
    });

    it('each command has a unique name', () => {
      const names = WORKFLOW_COMMANDS.map(cmd => cmd.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(WORKFLOW_COMMANDS.length);
    });

    it('optional usage field is a string when present', () => {
      for (const cmd of WORKFLOW_COMMANDS) {
        if (cmd.usage !== undefined) {
          expect(typeof cmd.usage).toBe('string');
        }
      }
    });
  });

  // ── getCommandSystem() Tests ────────────────────────────────────────

  describe('getCommandSystem()', () => {
    it('returns a command system for "pi" CLI', () => {
      const system = getCommandSystem('pi');
      expect(system).toBeDefined();
      expect(system.cli).toBe('pi');
    });

    it('returns a command system for "opencode" CLI', () => {
      const system = getCommandSystem('opencode');
      expect(system).toBeDefined();
      expect(system.cli).toBe('opencode');
    });

    it('returns a command system for "claude-code" CLI', () => {
      const system = getCommandSystem('claude-code');
      expect(system).toBeDefined();
      expect(system.cli).toBe('claude-code');
    });

    it('returns a command system for "codex" CLI', () => {
      const system = getCommandSystem('codex');
      expect(system).toBeDefined();
      expect(system.cli).toBe('codex');
    });

    it('returns a command system for "generic" CLI', () => {
      const system = getCommandSystem('generic');
      expect(system).toBeDefined();
      expect(system.cli).toBe('generic');
    });

    it('returns command system matching explicit CLI argument', () => {
      const clis: CLI[] = ['pi', 'opencode', 'claude-code', 'codex', 'generic'];
      
      for (const cli of clis) {
        const system = getCommandSystem(cli);
        expect(system.cli).toBe(cli);
      }
    });
  });

  // ── Command Registration System Interface ────────────────────────────

  describe('CommandRegistrationSystem interface compliance', () => {
    const requiredMethods = [
      'supportsNativeCommands',
      'registerAll',
      'registerOne',
      'getCommandPrefix',
      'generateCommandFiles',
    ];

    it('pi command system implements all required methods', () => {
      const system = getCommandSystem('pi');
      for (const method of requiredMethods) {
        expect(system).toHaveProperty(method);
        expect(typeof system[method as keyof CommandRegistrationSystem]).toBe('function');
      }
    });

    it('opencode command system implements all required methods', () => {
      const system = getCommandSystem('opencode');
      for (const method of requiredMethods) {
        expect(system).toHaveProperty(method);
        expect(typeof system[method as keyof CommandRegistrationSystem]).toBe('function');
      }
    });

    it('claude-code command system implements all required methods', () => {
      const system = getCommandSystem('claude-code');
      for (const method of requiredMethods) {
        expect(system).toHaveProperty(method);
        expect(typeof system[method as keyof CommandRegistrationSystem]).toBe('function');
      }
    });

    it('codex command system implements all required methods', () => {
      const system = getCommandSystem('codex');
      for (const method of requiredMethods) {
        expect(system).toHaveProperty(method);
        expect(typeof system[method as keyof CommandRegistrationSystem]).toBe('function');
      }
    });

    it('generic command system implements all required methods', () => {
      const system = getCommandSystem('generic');
      for (const method of requiredMethods) {
        expect(system).toHaveProperty(method);
        expect(typeof system[method as keyof CommandRegistrationSystem]).toBe('function');
      }
    });
  });

  // ── supportsNativeCommands() Tests ──────────────────────────────────

  describe('supportsNativeCommands()', () => {
    it('pi supports native commands', () => {
      const system = getCommandSystem('pi');
      expect(system.supportsNativeCommands()).toBe(true);
    });

    it('opencode does not support native commands (uses skills)', () => {
      const system = getCommandSystem('opencode');
      expect(system.supportsNativeCommands()).toBe(false);
    });

    it('claude-code does not support native commands (uses skills)', () => {
      const system = getCommandSystem('claude-code');
      expect(system.supportsNativeCommands()).toBe(false);
    });

    it('codex does not support native commands (uses commands dir)', () => {
      const system = getCommandSystem('codex');
      expect(system.supportsNativeCommands()).toBe(false);
    });

    it('generic does not support native commands', () => {
      const system = getCommandSystem('generic');
      expect(system.supportsNativeCommands()).toBe(false);
    });
  });

  // ── registerAll() Tests ──────────────────────────────────────────────

  describe('registerAll()', () => {
    it('pi registerAll returns all workflow commands', () => {
      const system = getCommandSystem('pi');
      const commands = system.registerAll();
      
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBe(WORKFLOW_COMMANDS.length);
    });

    it('opencode registerAll returns all workflow commands', () => {
      const system = getCommandSystem('opencode');
      const commands = system.registerAll();
      
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBe(WORKFLOW_COMMANDS.length);
    });

    it('claude-code registerAll returns all workflow commands', () => {
      const system = getCommandSystem('claude-code');
      const commands = system.registerAll();
      
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBe(WORKFLOW_COMMANDS.length);
    });

    it('codex registerAll returns all workflow commands', () => {
      const system = getCommandSystem('codex');
      const commands = system.registerAll();
      
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBe(WORKFLOW_COMMANDS.length);
    });

    it('generic registerAll returns empty array', () => {
      const system = getCommandSystem('generic');
      const commands = system.registerAll();
      
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBe(0);
    });
  });

  // ── registerOne() Tests ─────────────────────────────────────────────

  describe('registerOne()', () => {
    it('pi registerOne returns true for valid command', () => {
      const system = getCommandSystem('pi');
      const result = system.registerOne(WORKFLOW_COMMANDS[0]);
      expect(result).toBe(true);
    });

    it('opencode registerOne returns true', () => {
      const system = getCommandSystem('opencode');
      const result = system.registerOne(WORKFLOW_COMMANDS[0]);
      expect(result).toBe(true);
    });

    it('claude-code registerOne returns true', () => {
      const system = getCommandSystem('claude-code');
      const result = system.registerOne(WORKFLOW_COMMANDS[0]);
      expect(result).toBe(true);
    });

    it('codex registerOne returns true', () => {
      const system = getCommandSystem('codex');
      const result = system.registerOne(WORKFLOW_COMMANDS[0]);
      expect(result).toBe(true);
    });

    it('generic registerOne returns false', () => {
      const system = getCommandSystem('generic');
      const result = system.registerOne(WORKFLOW_COMMANDS[0]);
      expect(result).toBe(false);
    });
  });

  // ── getCommandPrefix() Tests ─────────────────────────────────────────

  describe('getCommandPrefix()', () => {
    it('all CLIs return "/" as command prefix', () => {
      const clis: CLI[] = ['pi', 'opencode', 'claude-code', 'codex', 'generic'];
      
      for (const cli of clis) {
        const system = getCommandSystem(cli);
        expect(system.getCommandPrefix()).toBe('/');
      }
    });
  });

  // ── generateCommandFiles() Tests ────────────────────────────────────

  describe('generateCommandFiles()', () => {
    it('pi generates no command files (uses native)', () => {
      const system = getCommandSystem('pi');
      const files = system.generateCommandFiles();
      
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBe(0);
    });

    it('opencode generates 16 skill files', () => {
      const system = getCommandSystem('opencode');
      const files = system.generateCommandFiles();
      
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBe(16);
    });

    it('opencode skill files have skills/ path prefix', () => {
      const system = getCommandSystem('opencode');
      const files = system.generateCommandFiles();
      
      for (const file of files) {
        expect(file.path.startsWith('skills/')).toBe(true);
      }
    });

    it('opencode skill files contain command name in content', () => {
      const system = getCommandSystem('opencode');
      const files = system.generateCommandFiles();
      
      const startFile = files.find(f => f.path.includes('pw-start'));
      expect(startFile).toBeDefined();
      expect(startFile?.content).toContain('pw-start');
    });

    it('claude-code generates 16 skill files', () => {
      const system = getCommandSystem('claude-code');
      const files = system.generateCommandFiles();
      
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBe(16);
    });

    it('claude-code skill files have skills/ path prefix', () => {
      const system = getCommandSystem('claude-code');
      const files = system.generateCommandFiles();
      
      for (const file of files) {
        expect(file.path.startsWith('skills/')).toBe(true);
      }
    });

    it('codex generates 16 command files', () => {
      const system = getCommandSystem('codex');
      const files = system.generateCommandFiles();
      
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBe(16);
    });

    it('codex command files have commands/ path prefix', () => {
      const system = getCommandSystem('codex');
      const files = system.generateCommandFiles();
      
      for (const file of files) {
        expect(file.path.startsWith('commands/')).toBe(true);
      }
    });

    it('generic generates no command files', () => {
      const system = getCommandSystem('generic');
      const files = system.generateCommandFiles();
      
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBe(0);
    });

    it('generated files have path and content properties', () => {
      const system = getCommandSystem('opencode');
      const files = system.generateCommandFiles();
      
      for (const file of files) {
        expect(file).toHaveProperty('path');
        expect(file).toHaveProperty('content');
        expect(typeof file.path).toBe('string');
        expect(typeof file.content).toBe('string');
      }
    });
  });

  // ── Command File Content Format ──────────────────────────────────────

  describe('Command file content format', () => {
    it('opencode skill files have frontmatter', () => {
      const system = getCommandSystem('opencode');
      const files = system.generateCommandFiles();
      
      for (const file of files) {
        expect(file.content).toContain('---');
        expect(file.content).toContain('name:');
        expect(file.content).toContain('description:');
      }
    });

    it('claude-code skill files have frontmatter', () => {
      const system = getCommandSystem('claude-code');
      const files = system.generateCommandFiles();
      
      for (const file of files) {
        expect(file.content).toContain('---');
        expect(file.content).toContain('name:');
        expect(file.content).toContain('description:');
      }
    });

    it('codex command files have @agent directive', () => {
      const system = getCommandSystem('codex');
      const files = system.generateCommandFiles();
      
      for (const file of files) {
        expect(file.content).toContain('@agent');
      }
    });
  });

  // ── PRODUCT_WORKFLOW_CLI Override Tests ─────────────────────────────

  describe('PRODUCT_WORKFLOW_CLI override affects getCommandSystem()', () => {
    it('PRODUCT_WORKFLOW_CLI=pi uses pi command system', () => {
      process.env.PRODUCT_WORKFLOW_CLI = 'pi';
      const system = getCommandSystem();
      expect(system.cli).toBe('pi');
    });

    it('PRODUCT_WORKFLOW_CLI=opencode uses opencode command system', () => {
      process.env.PRODUCT_WORKFLOW_CLI = 'opencode';
      const system = getCommandSystem();
      expect(system.cli).toBe('opencode');
    });

    it('PRODUCT_WORKFLOW_CLI=claude-code uses claude-code command system', () => {
      process.env.PRODUCT_WORKFLOW_CLI = 'claude-code';
      const system = getCommandSystem();
      expect(system.cli).toBe('claude-code');
    });

    it('PRODUCT_WORKFLOW_CLI=codex uses codex command system', () => {
      process.env.PRODUCT_WORKFLOW_CLI = 'codex';
      const system = getCommandSystem();
      expect(system.cli).toBe('codex');
    });

    it('explicit CLI argument overrides PRODUCT_WORKFLOW_CLI', () => {
      process.env.PRODUCT_WORKFLOW_CLI = 'opencode';
      const system = getCommandSystem('claude-code');
      expect(system.cli).toBe('claude-code');
    });
  });

  // ── CLI-Specific Command System Differences ─────────────────────────

  describe('CLI-specific command system differences', () => {
    it('only pi uses native command registration', () => {
      const piSystem = getCommandSystem('pi');
      const opencodeSystem = getCommandSystem('opencode');
      const claudeCodeSystem = getCommandSystem('claude-code');
      const codexSystem = getCommandSystem('codex');
      const genericSystem = getCommandSystem('generic');

      expect(piSystem.supportsNativeCommands()).toBe(true);
      expect(opencodeSystem.supportsNativeCommands()).toBe(false);
      expect(claudeCodeSystem.supportsNativeCommands()).toBe(false);
      expect(codexSystem.supportsNativeCommands()).toBe(false);
      expect(genericSystem.supportsNativeCommands()).toBe(false);
    });

    it('opencode, claude-code, and codex generate file-based commands', () => {
      const opencodeSystem = getCommandSystem('opencode');
      const claudeCodeSystem = getCommandSystem('claude-code');
      const codexSystem = getCommandSystem('codex');

      expect(opencodeSystem.generateCommandFiles().length).toBe(16);
      expect(claudeCodeSystem.generateCommandFiles().length).toBe(16);
      expect(codexSystem.generateCommandFiles().length).toBe(16);
    });

    it('pi and generic generate no command files', () => {
      const piSystem = getCommandSystem('pi');
      const genericSystem = getCommandSystem('generic');

      expect(piSystem.generateCommandFiles().length).toBe(0);
      expect(genericSystem.generateCommandFiles().length).toBe(0);
    });
  });
});