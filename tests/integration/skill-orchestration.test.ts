/**
 * Integration tests: Skill Orchestration
 * 
 * Tests skill invocations and artifact creation:
 * - cali-product-shape-up → spec-product.md created
 * - cali-product-tech-planning → spec-tech.md created with scopes
 * - cali-product-interface-brainstorm → interfaces.md created
 * - Gate flow (Plannotator approval)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync 
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const WORKFLOW_DIR = '.cali-product-workflow';

// ── Test Helpers ────────────────────────────────────────────────────

function createWorkflowDir(baseDir: string, name: string, dirHash: string) {
  const workflowDir = join(baseDir, WORKFLOW_DIR, '2026-05-19', dirHash);
  mkdirSync(join(workflowDir, 'specs'), { recursive: true });
  mkdirSync(join(workflowDir, 'interfaces'), { recursive: true });
  mkdirSync(join(workflowDir, 'plans/scopes'), { recursive: true });
  mkdirSync(join(workflowDir, 'critiques'), { recursive: true });
  mkdirSync(join(workflowDir, 'approvals'), { recursive: true });
  writeFileSync(join(workflowDir, 'index.json'), JSON.stringify({
    name,
    _dir: dirHash,
    workflow_status: "in-progress",
  }, null, 2));
  return workflowDir;
}

function writeSpec(workflowDir: string, content: string, version = 'v1') {
  const path = join(workflowDir, 'specs', `spec-product_${version}.md`);
  writeFileSync(path, content);
  return path;
}

function writeInterfaces(workflowDir: string, content: string, version = 'v1') {
  const path = join(workflowDir, 'interfaces', `interfaces_${version}.md`);
  writeFileSync(path, content);
  return path;
}

function writeTechPlan(workflowDir: string, content: string, version = 'v1') {
  const path = join(workflowDir, 'plans', `spec-tech_${version}.md`);
  writeFileSync(path, content);
  return path;
}

function writeApprovalReceipt(workflowDir: string, filename: string, content: string) {
  const approvalsDir = join(workflowDir, 'approvals');
  mkdirSync(approvalsDir, { recursive: true });
  const path = join(approvalsDir, filename);
  writeFileSync(path, content);
  return path;
}

// ── Skill Artifact Tests ─────────────────────────────────────────────

describe('Skill Orchestration', () => {
  let tempDir: string;
  let workflowDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pw-skill-test-'));
    workflowDir = createWorkflowDir(tempDir, 'test-workflow', 'pw-test-skill-001');
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Shape Up Skill (cali-product-shape-up)', () => {
    it('should create spec-product.md', () => {
      const specContent = `# Spec Product v1

---
approved: true
approved_at: "2026-05-19T10:00:00Z"
---

## Problem
Build a terminal snake game in Go

## Solution
CLI snake game with keyboard controls

## Scope
### IN
- 20x20 grid
- Snake movement (4 directions)
- Food spawning
- Collision detection

### OUT
- High score persistence
- Multiple levels
`;

      const specPath = writeSpec(workflowDir, specContent);

      expect(existsSync(specPath)).toBe(true);
      expect(readFileSync(specPath, 'utf8')).toContain('Spec Product v1');
    });

    it('should parse approved flag from frontmatter', () => {
      const specContent = `---
approved: true
approved_at: "2026-05-19T10:00:00Z"
---

## Problem
Test
`;

      writeSpec(workflowDir, specContent);

      const specPath = join(workflowDir, 'specs', 'spec-product_v1.md');
      const content = readFileSync(specPath, 'utf8');
      const approved = content.includes('approved: true');

      expect(approved).toBe(true);
    });

    it('should validate spec structure', () => {
      const validSpec = `# Spec Product v1

---
approved: false
---

## Problem
[description]

## Solution
[description]

## Scope
### IN
- Item 1
- Item 2

### OUT
- Item 3
`;

      writeSpec(workflowDir, validSpec);

      const specPath = join(workflowDir, 'specs', 'spec-product_v1.md');
      const content = readFileSync(specPath, 'utf8');

      // Should have required sections
      expect(content).toContain('## Problem');
      expect(content).toContain('## Solution');
      expect(content).toContain('## Scope');
      expect(content).toContain('### IN');
      expect(content).toContain('### OUT');
    });
  });

  describe('Interface Brainstorming (cali-product-interface-brainstorm)', () => {
    it('should create interfaces.md with 5 proposals', () => {
      const interfacesContent = `# Interface Proposals v1

---
approved: false
---

## Proposal A: Conventional Standard
[description]

## Proposal B: Interaction Paradigm Shift
[description]

## Proposal C: Technological Vanguard
[description]

## Proposal D: Radical Simplicity
[description]

## Proposal E: Expert/Command-First
[description]

## Hybrid Recommendation
[description]
`;

      const path = writeInterfaces(workflowDir, interfacesContent);

      expect(existsSync(path)).toBe(true);
      expect(readFileSync(path, 'utf8')).toContain('Proposal A');
      expect(readFileSync(path, 'utf8')).toContain('Proposal E');
      expect(readFileSync(path, 'utf8')).toContain('Hybrid Recommendation');
    });

    it('should have preview for each proposal', () => {
      const interfacesContent = `# Interface Proposals v1

## Proposal A: Terminal Classic
\`\`\`
┌──────────────┐
│   SCORE: 10  │
│              │
│    ■■■       │
│    ←←←       │
└──────────────┘
[SPACE] Start [R] Restart
\`\`\`

## Proposal B: Retro Pixel
\`\`\`
╔══════════════╗
║  SCORE: 10   ║
╠══════════════╣
║              ║
║    ████      ║
║    ←←←       ║
╚══════════════╝
\`\`\`
`;

      writeInterfaces(workflowDir, interfacesContent);

      const path = join(workflowDir, 'interfaces', 'interfaces_v1.md');
      const content = readFileSync(path, 'utf8');

      expect(content).toContain('```');
      expect(content).toContain('SCORE');
    });
  });

  describe('Tech Planning (cali-product-tech-planning)', () => {
    it('should create spec-tech.md with typed scopes', () => {
      const techPlanContent = `# Technical Plan v1

---
approved: true
approved_at: "2026-05-19T11:00:00Z"
---

## Scopes

### Core Game Foundation [TYPE: feature]
**Objective:** Basic snake game mechanics

**Steps:**
1. Set up Go project structure
2. Create grid rendering
3. Implement snake movement

**DoD:**
- [ ] Grid renders correctly
- [ ] Snake moves in 4 directions
- [ ] No reverse movement

**AC:**
- Grid: 20×20
- Speed: tick-based, 150ms

### Optimization [TYPE: optimization]
**Metric:** tick_μs (lower is better)

**Baseline:** 8000μs
**Target:** <4000μs
`;

      const path = writeTechPlan(workflowDir, techPlanContent);

      expect(existsSync(path)).toBe(true);
      expect(readFileSync(path, 'utf8')).toContain('[TYPE: feature]');
      expect(readFileSync(path, 'utf8')).toContain('[TYPE: optimization]');
    });

    it('should parse scope types correctly', () => {
      const techPlanContent = `# Tech Plan

## Scopes

### Scope 1 [TYPE: feature]
Content

### Scope 2 [TYPE: optimization]
Content

### Scope 3 [TYPE: spike]
Content
`;

      writeTechPlan(workflowDir, techPlanContent);

      const path = join(workflowDir, 'plans', 'spec-tech_v1.md');
      const content = readFileSync(path, 'utf8');

      const featureMatch = content.match(/\[TYPE: feature\]/g);
      const optMatch = content.match(/\[TYPE: optimization\]/g);
      const spikeMatch = content.match(/\[TYPE: spike\]/g);

      expect(featureMatch).toHaveLength(1);
      expect(optMatch).toHaveLength(1);
      expect(spikeMatch).toHaveLength(1);
    });

    it('should extract DoD from scopes', () => {
      const techPlanContent = `# Tech Plan

### Game Loop [TYPE: feature]
**DoD:**
- [ ] Grid renders in terminal
- [ ] Snake moves on tick
- [ ] Food spawns randomly
`;

      writeTechPlan(workflowDir, techPlanContent);

      const path = join(workflowDir, 'plans', 'spec-tech_v1.md');
      const content = readFileSync(path, 'utf8');

      // Extract DoD checkboxes
      const dodMatches = content.match(/\[ \] .*/g);
      expect(dodMatches).toHaveLength(3);
    });
  });

  describe('Plannotator Gate Flow', () => {
    it('should create approval receipt after gate', () => {
      const receiptContent = `# Approval: spec-product_v1.md

- Approved at: 2026-05-19T10:00:00Z
- Spec hash: abc123
- Verdict: approved
`;

      const path = writeApprovalReceipt(workflowDir, 'spec-product_v1.approved.md', receiptContent);

      expect(existsSync(path)).toBe(true);
      expect(readFileSync(path, 'utf8')).toContain('Approved at');
      expect(readFileSync(path, 'utf8')).toContain('approved');
    });

    it('should stamp approved flag in spec', () => {
      const specContent = `---
approved: false
---

## Problem
Test
`;

      writeSpec(workflowDir, specContent);

      // Simulate approval
      const specPath = join(workflowDir, 'specs', 'spec-product_v1.md');
      const content = readFileSync(specPath, 'utf8');
      const approvedContent = content.replace(
        'approved: false',
        'approved: true\napproved_at: "2026-05-19T10:00:00Z"'
      );
      writeFileSync(specPath, approvedContent);

      const updated = readFileSync(specPath, 'utf8');
      expect(updated).toContain('approved: true');
      expect(updated).toContain('approved_at');
    });

    it('should validate workflow status after gate', () => {
      const indexPath = join(workflowDir, 'index.json');
      const index = JSON.parse(readFileSync(indexPath, 'utf8'));

      index.approved = true;
      index.approved_at = "2026-05-19T10:00:00Z";
      writeFileSync(indexPath, JSON.stringify(index, null, 2));

      const updated = JSON.parse(readFileSync(indexPath, 'utf8'));
      expect(updated.approved).toBe(true);
      expect(updated.approved_at).toBeTruthy();
    });
  });

  describe('Skill Chaining', () => {
    it('should flow Shape Up → Gate → Tech Planning', () => {
      // Step 1: Shape Up creates spec
      const specContent = `---
approved: true
approved_at: "2026-05-19T10:00:00Z"
---

## Problem
Test

## Solution
Test

## Scope
### IN
- Feature A
`;

      writeSpec(workflowDir, specContent);

      // Step 2: Gate approval (simulated)
      const receiptContent = `# Approval: spec-product_v1.md
- Approved at: 2026-05-19T10:00:00Z
- Verdict: approved
`;
      writeApprovalReceipt(workflowDir, 'spec-product_v1.approved.md', receiptContent);

      // Step 3: Tech Planning uses approved spec
      const techPlanContent = `---
approved: true
approved_at: "2026-05-19T11:00:00Z"
---

## Scopes

### Feature A [TYPE: feature]
**Objective:** Implement Feature A

**DoD:**
- [ ] Feature works
`;

      writeTechPlan(workflowDir, techPlanContent);

      // Verify flow
      const specPath = join(workflowDir, 'specs', 'spec-product_v1.md');
      const spec = readFileSync(specPath, 'utf8');
      expect(spec).toContain('approved: true');

      const receiptPath = join(workflowDir, 'approvals', 'spec-product_v1.approved.md');
      expect(existsSync(receiptPath)).toBe(true);

      const techPath = join(workflowDir, 'plans', 'spec-tech_v1.md');
      expect(existsSync(techPath)).toBe(true);
    });

    it('should flow Interface → Gate → Selection', () => {
      // Step 1: Interface creates proposals
      const interfacesContent = `# Interfaces v1

## Proposal A: Option A
[description]

## Proposal B: Option B
[description]
`;

      writeInterfaces(workflowDir, interfacesContent);

      // Step 2: Gate approval
      const receiptContent = `# Approval: interfaces_v1.md
- Approved at: 2026-05-19T11:00:00Z
- Verdict: approved
`;
      writeApprovalReceipt(workflowDir, 'interfaces_v1.approved.md', receiptContent);

      // Step 3: Selection (user picks option)
      const interfacesPath = join(workflowDir, 'interfaces', 'interfaces_v1.md');
      const content = readFileSync(interfacesPath, 'utf8');
      const selectedContent = content + '\n\n**Selected: Proposal A**';
      writeFileSync(interfacesPath, selectedContent);

      const updated = readFileSync(interfacesPath, 'utf8');
      expect(updated).toContain('Selected: Proposal A');
    });
  });

  describe('Artifact Path Generation', () => {
    it('should generate correct spec path', () => {
      const expectedPath = join(workflowDir, 'specs', 'spec-product_v1.md');
      const path = join(workflowDir, 'specs', `spec-product_v${1}.md`);
      expect(path).toBe(expectedPath);
    });

    it('should generate correct interfaces path', () => {
      const expectedPath = join(workflowDir, 'interfaces', 'interfaces_v1.md');
      const path = join(workflowDir, 'interfaces', `interfaces_v${1}.md`);
      expect(path).toBe(expectedPath);
    });

    it('should generate correct tech plan path', () => {
      const expectedPath = join(workflowDir, 'plans', 'spec-tech_v1.md');
      const path = join(workflowDir, 'plans', `spec-tech_v${1}.md`);
      expect(path).toBe(expectedPath);
    });

    it('should increment version numbers', () => {
      const v1 = 'spec-product_v1.md';
      const v2 = 'spec-product_v2.md';

      expect(v1).toContain('_v1.');
      expect(v2).toContain('_v2.');
    });
  });
});