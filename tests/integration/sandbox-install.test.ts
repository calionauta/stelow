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
import { join } from 'node:path';

const PROJECT_ROOT = '/Users/cali/Development/pi-product-workflow';

describe('Sandbox Install Verification', () => {
  
  // ── Package Structure ────────────────────────────────────────────────

  describe('Package Structure', () => {
    it('should have package.json', () => {
      const pkgPath = join(PROJECT_ROOT, 'package.json');
      expect(existsSync(pkgPath)).toBe(true);
    });

    it('should have valid package name', () => {
      const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'));
      expect(pkg.name).toBe('@renatocaliari/pi-product-workflow');
    });

    it('should declare pi extension', () => {
      const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'));
      expect(pkg.pi).toBeDefined();
      expect(pkg.pi.extensions).toBeDefined();
      expect(pkg.pi.extensions).toContain('./extensions/cali-product-workflow');
    });

    it('should declare all skill paths', () => {
      const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'));
      expect(pkg.pi.skills).toBeDefined();
      expect(pkg.pi.skills.length).toBeGreaterThanOrEqual(15);
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

    it('should have package.json with correct name', () => {
      const extPkg = JSON.parse(readFileSync(join(extPath, 'package.json'), 'utf-8'));
      expect(extPkg.name).toMatch(/@renatocaliari\/pi-product-workflow/);
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
      
      const skills = ['cali-shape-up', 'cali-interface-brainstorm', 'cali-plan-critique', 'cali-tech-planning'];
      skills.forEach(skill => {
        expect(existsSync(join(workflowPath, skill, 'SKILL.md'))).toBe(true);
      });
    });

    it('should have strategic analysis skills', () => {
      const stratPath = join(PROJECT_ROOT, 'skills/cali-product-workflow/skills-strategic-analysis');
      expect(existsSync(stratPath)).toBe(true);
    });

    it('should have domain library skills', () => {
      const domainPath = join(PROJECT_ROOT, 'skills/cali-product-workflow/skills-domain-libraries');
      expect(existsSync(domainPath)).toBe(true);
    });

    it('should have execution skills', () => {
      const execPath = join(PROJECT_ROOT, 'skills/cali-product-workflow/skills-execution');
      expect(existsSync(execPath)).toBe(true);
      expect(existsSync(join(execPath, 'cali-product-scope-executor', 'SKILL.md'))).toBe(true);
    });
  });

  // ── References Structure ─────────────────────────────────────────────

  describe('References Structure', () => {
    const refsPath = join(PROJECT_ROOT, 'skills/cali-product-workflow/references');

    it('should have references directory', () => {
      expect(existsSync(refsPath)).toBe(true);
    });

    it('should have pi-tools directory', () => {
      const piToolsPath = join(refsPath, 'pi-tools');
      expect(existsSync(piToolsPath)).toBe(true);
    });

    it('should have pi-tools reference files', () => {
      const piToolsPath = join(refsPath, 'pi-tools');
      
      // Expected files
      const expectedFiles = ['plannotator.md', 'subagents.md', 'goals.md', 'ask.md'];
      expectedFiles.forEach(file => {
        expect(existsSync(join(piToolsPath, file))).toBe(true);
      });
    });

    it('should have phases directory', () => {
      const phasesPath = join(PROJECT_ROOT, 'skills/cali-product-workflow/phases');
      expect(existsSync(phasesPath)).toBe(true);
      
      // Expected phase files
      const expectedPhases = ['setup.md', 'context.md', 'gate.md', 'execution.md'];
      expectedPhases.forEach(phase => {
        expect(existsSync(join(phasesPath, phase))).toBe(true);
      });
    });
  });

  // ── Peer Dependencies ─────────────────────────────────────────────────

  describe('Peer Dependencies', () => {
    it('should declare required peer dependencies', () => {
      const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'));
      expect(pkg.peerDependencies).toBeDefined();
      
      // Check for key dependencies
      expect(pkg.peerDependencies['@earendil-works/pi-coding-agent']).toBeDefined();
      expect(pkg.peerDependencies['pi-subagents']).toBeDefined();
      expect(pkg.peerDependencies['@plannotator/pi-extension']).toBeDefined();
    });

    it('should declare optional peer dependencies', () => {
      const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'));
      expect(pkg.optionalPeerDependencies).toBeDefined();
      expect(pkg.optionalPeerDependencies['cali-short-cycle-product']).toBe('*');
    });
  });

  // ── Files to Publish ─────────────────────────────────────────────────

  describe('Files to Publish', () => {
    it('should declare publishable files', () => {
      const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'));
      expect(pkg.files).toBeDefined();
      expect(pkg.files).toContain('skills/');
      expect(pkg.files).toContain('extensions/');
      expect(pkg.files).toContain('scripts/');
    });

    it('should include README in published files', () => {
      const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'));
      expect(pkg.files).toContain('README.md');
    });
  });

  // ── Scripts ─────────────────────────────────────────────────────────

  describe('Scripts', () => {
    it('should have test script', () => {
      const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'));
      expect(pkg.scripts.test).toBeDefined();
      expect(pkg.scripts.test).toContain('vitest');
    });

    it('should have test coverage script', () => {
      const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'));
      expect(pkg.scripts['test:coverage']).toBeDefined();
    });

    it('should have layer-specific test scripts', () => {
      const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'));
      expect(pkg.scripts['test:unit']).toBeDefined();
      expect(pkg.scripts['test:integration']).toBeDefined();
      expect(pkg.scripts['test:skills']).toBeDefined();
      expect(pkg.scripts['test:artifacts']).toBeDefined();
    });
  });

  // ── Node Engine ──────────────────────────────────────────────────────

  describe('Node Engine', () => {
    it('should require Node >= 20', () => {
      const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'));
      expect(pkg.engines).toBeDefined();
      expect(pkg.engines.node).toMatch(/^>=20/);
    });
  });
});

// ── Smoke Test Preparation ───────────────────────────────────────────────────

/**
 * Notes for future smoke tests with pi-test-harness:
 * 
 * The actual smoke test would use verifySandboxInstall:
 * 
 * ```typescript
 * import { verifySandboxInstall } from '@marcfargas/pi-test-harness';
 * 
 * const result = await verifySandboxInstall({
 *   packageDir: PROJECT_ROOT,
 *   expect: {
 *     extensions: 1,
 *     skills: 18,
 *   },
 * });
 * 
 * expect(result.loaded.extensions).toBe(1);
 * expect(result.loaded.extensionErrors).toHaveLength(0);
 * ```
 * 
 * This requires:
 * 1. Running `npm pack` to create tarball
 * 2. Installing in temp dir
 * 3. Loading via DefaultResourceLoader
 * 
 * For now, we verify the file structure that would be discovered.
 */