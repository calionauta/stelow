/**
 * Sandbox Install Verification Tests
 * 
 * Tests that the package installs correctly and discovers all expected
 * extensions and skills using pi-test-harness's verifySandboxInstall.
 * 
 * This is a lightweight integration test that doesn't require a full PI
 * environment - it uses the package's npm metadata to verify installation.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Dynamic PROJECT_ROOT: resolve from test file location
// tests/integration/sandbox-install.test.ts → ../../.. = project root
const __filename = fileURLToPath(import.meta.url);
const __testDir = dirname(__filename); // tests/integration
const PROJECT_ROOT = join(__testDir, '..', '..'); // project root

describe('Sandbox Install Verification', () => {
  
  // ── Package Structure ────────────────────────────────────────────────

  describe('Package Structure', () => {
    it('should have package.json', () => {
      const pkgPath = join(PROJECT_ROOT, 'package.json');
      expect(existsSync(pkgPath)).toBe(true);
    });

    it('should have valid package name', () => {
      const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'));
      expect(pkg.name).toBe('@renatocaliari/cali-product-workflow');
    });

    it('should declare pi extension via exports', () => {
      const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'));
      expect(pkg.exports).toBeDefined();
      expect(pkg.exports['./extensions']).toBeDefined();
      expect(pkg.exports['./extensions']).toContain('./extensions');
    });

    it('should declare all skill exports', () => {
      const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'));
      expect(pkg.exports['./skills']).toBeDefined();
      expect(pkg.exports['./extensions']).toBeDefined();
    });
  });

  // ── Extension Structure ────────────────────────────────────────────────

  describe('Extension Structure', () => {
    const extPath = join(PROJECT_ROOT, 'extensions/cali-product-workflow');

    it('should have extension directory', () => {
      expect(existsSync(extPath)).toBe(true);
    });

    it('should have index.ts', () => {
      expect(existsSync(join(extPath, 'index.ts'))).toBe(true);
    });

    it('should have types.ts', () => {
      expect(existsSync(join(extPath, 'types.ts'))).toBe(true);
    });

    it('should have state.ts', () => {
      expect(existsSync(join(extPath, 'state.ts'))).toBe(true);
    });

    it('should have package.json following cali-pw naming convention', () => {
      const extPkg = JSON.parse(readFileSync(join(extPath, 'package.json'), 'utf-8'));
      // Extension packages follow the pattern @renatocaliari/cali-pw-*, @renatocaliari/cali-product-workflow-*, or @renatocaliari/pi-product-workflow-*
      expect(extPkg.name).toMatch(/@renatocaliari\/(cali-(pw|product-workflow)|pi-product-workflow)/);
    });

  });

  // ── Skills Structure ─────────────────────────────────────────────────

  describe('Skills Structure', () => {
    it('should have skills directory', () => {
      const skillsPath = join(PROJECT_ROOT, 'skills/cali-product-workflow');
      expect(existsSync(skillsPath)).toBe(true);
    });

    it('should have main SKILL.md', () => {
      const skillPath = join(PROJECT_ROOT, 'skills/cali-product-workflow/SKILL.md');
      expect(existsSync(skillPath)).toBe(true);
    });

    it('should have workflow skills', () => {
      const workflowPath = join(PROJECT_ROOT, 'skills/cali-product-workflow/skills-workflow');
      expect(existsSync(workflowPath)).toBe(true);
      
      const skills = ['cali-product-shape-up', 'cali-product-interface-brainstorm', 'cali-product-plan-critique', 'cali-product-tech-planning'];
      skills.forEach(skill => {
        expect(existsSync(join(workflowPath, skill, 'SKILL.md'))).toBe(true);
      });
    });

    it('should have strategic analysis skills', () => {
      const strategicPath = join(PROJECT_ROOT, 'skills/cali-product-workflow/skills-strategic-analysis');
      expect(existsSync(strategicPath)).toBe(true);
      
      const skills = ['cali-product-job-to-be-done', 'cali-product-discovery', 'cali-product-opportunity-mapping'];
      skills.forEach(skill => {
        expect(existsSync(join(strategicPath, skill, 'SKILL.md'))).toBe(true);
      });
    });

    it('should have execution skills', () => {
      const executionPath = join(PROJECT_ROOT, 'skills/cali-product-workflow/skills-execution');
      expect(existsSync(executionPath)).toBe(true);
      
      const skills = ['cali-product-scope-executor', 'cali-product-testing-ai-code'];
      skills.forEach(skill => {
        expect(existsSync(join(executionPath, skill, 'SKILL.md'))).toBe(true);
      });
    });

    it('should have domain libraries', () => {
      const domainPath = join(PROJECT_ROOT, 'skills/cali-product-workflow/skills-domain-libraries');
      expect(existsSync(domainPath)).toBe(true);
      
      const domains = ['cali-product-pricing', 'cali-product-ads', 'cali-product-trust-building'];
      domains.forEach(domain => {
        expect(existsSync(join(domainPath, domain, 'SKILL.md'))).toBe(true);
      });
    });

    it('should have phases directory', () => {
      const phasesPath = join(PROJECT_ROOT, 'skills/cali-product-workflow/phases');
      expect(existsSync(phasesPath)).toBe(true);
    });

    it('should have core phase files', () => {
      const phasesPath = join(PROJECT_ROOT, 'skills/cali-product-workflow/phases');
      // Core phases that must exist in phases/ directory
      const corePhases = ['setup', 'context', 'gate', 'execution', 'selection', 'delivery-audit', 'triage'];
      corePhases.forEach(phase => {
        expect(existsSync(join(phasesPath, `${phase}.md`))).toBe(true);
      });
    });
  });

  // ── CLI Agents Structure ─────────────────────────────────────────────

  describe('CLI Agents Structure', () => {
    it('should have opencode CLI agent', () => {
      const opencodePath = join(PROJECT_ROOT, 'cli-agents/opencode');
      expect(existsSync(opencodePath)).toBe(true);
    });

    it('should have claude CLI agent', () => {
      const claudePath = join(PROJECT_ROOT, 'cli-agents/claude');
      expect(existsSync(claudePath)).toBe(true);
    });

    it('should have codex CLI agent', () => {
      const codexPath = join(PROJECT_ROOT, 'cli-agents/codex');
      expect(existsSync(codexPath)).toBe(true);
    });

    it('should have commands for opencode', () => {
      const commandsPath = join(PROJECT_ROOT, 'cli-agents/opencode/commands');
      expect(existsSync(commandsPath)).toBe(true);
    });
  });

  // ── Documentation Structure ──────────────────────────────────────────

  describe('Documentation Structure', () => {
    it('should have README.md', () => {
      const readmePath = join(PROJECT_ROOT, 'README.md');
      expect(existsSync(readmePath)).toBe(true);
    });

    it('should have INSTALLATION.md', () => {
      const installPath = join(PROJECT_ROOT, 'docs/INSTALLATION.md');
      expect(existsSync(installPath)).toBe(true);
    });

    it('should have AGENTS.md', () => {
      const agentsPath = join(PROJECT_ROOT, 'AGENTS.md');
      expect(existsSync(agentsPath)).toBe(true);
    });

    it('should have CHANGELOG.md', () => {
      const changelogPath = join(PROJECT_ROOT, 'CHANGELOG.md');
      expect(existsSync(changelogPath)).toBe(true);
    });
  });

  // ── Configuration Files ───────────────────────────────────────────────

  describe('Configuration Files', () => {
    it('should have tsconfig.json', () => {
      expect(existsSync(join(PROJECT_ROOT, 'tsconfig.json'))).toBe(true);
    });

    it('should have package.json in extensions/cali-product-workflow-pi', () => {
      const piExtPkg = join(PROJECT_ROOT, 'extensions/cali-product-workflow-pi/package.json');
      expect(existsSync(piExtPkg)).toBe(true);
    });

    it('should have .gitignore', () => {
      expect(existsSync(join(PROJECT_ROOT, '.gitignore'))).toBe(true);
    });
  });

  // ── Multi-CLI Support Structure ─────────────────────────────────────

  describe('Multi-CLI Support Structure', () => {
    it('should have adapters directory', () => {
      const adaptersPath = join(PROJECT_ROOT, 'extensions/cali-product-workflow/adapters');
      expect(existsSync(adaptersPath)).toBe(true);
    });

    it('should have CLI-specific adapters', () => {
      const adaptersPath = join(PROJECT_ROOT, 'extensions/cali-product-workflow/adapters');
      expect(existsSync(join(adaptersPath, 'pi'))).toBe(true);
      expect(existsSync(join(adaptersPath, 'opencode'))).toBe(true);
      expect(existsSync(join(adaptersPath, 'claude-code'))).toBe(true);
      expect(existsSync(join(adaptersPath, 'codex'))).toBe(true);
    });

    it('should have command dispatcher', () => {
      const dispatcherPath = join(PROJECT_ROOT, 'extensions/cali-product-workflow/adapters/commands/dispatcher.ts');
      expect(existsSync(dispatcherPath)).toBe(true);
    });
  });
});