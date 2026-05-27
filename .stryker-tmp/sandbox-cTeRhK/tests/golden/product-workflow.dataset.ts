/**
 * Golden Dataset: Product Workflow Test Cases
 * 
 * This module defines real test cases that validate the product workflow
 * behavior. Each case represents a typical workflow scenario with expected
 * phases, gates, artifacts, and tool calls.
 * 
 * Use these cases to:
 * 1. Validate SKILL.md structure against expected workflow patterns
 * 2. Ensure new changes don't break expected workflow behavior
 * 3. Document what each workflow type should produce
 * 
 * @example
 * import { goldenDataset, validateAgainstGolden } from './product-workflow.dataset';
 * 
 * goldenDataset.forEach(testCase => {
 *   validateAgainstGolden(SKILL_CONTENT, testCase);
 * });
 */
// @ts-nocheck


import type { GoldenCase, PhaseExpectation, GateExpectation, ArtifactExpectation } from './types';

// ── Phase Definitions ───────────────────────────────────────────────────────────

const PHASES = {
  SETUP: 'Setup',
  CONTEXT: 'Context',
  SHAPE: 'Shape',
  CRITIQUE: 'Critique',
  GATE: 'Gate',
  SCOPE: 'Scope',
  INTERFACE: 'Interface',
  INT_GATE: 'Int.Gate',
  SELECTION: 'Selection',
  PLANNING: 'Planning',
  EXECUTION: 'Execution',
} as const;

// ── Tool Definitions ──────────────────────────────────────────────────────────

const TOOLS = {
  SUBAGENT: 'subagent',
  ASK: 'ask_user_question',
  PLANNATOR: 'plannotator',
  SUPERVISE: 'supervise',
  INTERCOM: 'intercom',
} as const;

// ── Artifact Definitions ──────────────────────────────────────────────────────

const ARTIFACTS = {
  SPEC_PRODUCT: 'spec-product.md',
  SPEC_TECH: 'spec-tech.md',
  INTERFACES: 'interfaces.md',
  INDEX: 'index.json',
} as const;

// ── Golden Test Cases ─────────────────────────────────────────────────────────

/**
 * Shape Up Full Workflow (without Interface)
 * 
 * Typical flow for building a backend service, CLI tool, or any project
 * where visual interface is not the primary concern.
 */
export const shapeUpFullWorkflow: GoldenCase = {
  name: 'shape-up-full-workflow',
  description: 'Shape Up workflow for backend/CLI projects without visual interface',
  category: 'shape-up',
  input: 'Build a snake game in Go for terminal',
  expected: {
    phases: [
      PHASES.SETUP,
      PHASES.CONTEXT,
      PHASES.SHAPE,
      PHASES.CRITIQUE,
      PHASES.GATE,
      PHASES.SCOPE,
      PHASES.PLANNING,
      PHASES.EXECUTION,
    ],
    phaseCount: 8,
    autoChainAfter: [PHASES.GATE, PHASES.PLANNING],
    gates: [
      {
        phase: 5, // Gate phase
        tool: TOOLS.PLANNATOR,
        flags: ['--gate'],
        purpose: 'Approve spec-product.md before tech planning',
      },
      {
        phase: 10, // Tech Planning phase
        tool: TOOLS.PLANNATOR,
        flags: ['--gate'],
        purpose: 'Approve spec-tech.md before execution',
      },
    ],
    artifacts: [
      {
        name: ARTIFACTS.SPEC_PRODUCT,
        required: true,
        sections: ['Problem', 'Solution', 'Scope', 'IN', 'OUT'],
      },
      {
        name: ARTIFACTS.SPEC_TECH,
        required: true,
        sections: ['Scopes', 'TYPE', 'DoD', 'AC'],
      },
    ],
    tools: [TOOLS.SUBAGENT, TOOLS.ASK, TOOLS.PLANNATOR],
  },
};

/**
 * Shape Up + Interface Workflow
 * 
 * Flow for web apps, mobile apps, or any project where visual interface
 * is a key deliverable.
 */
export const shapeUpWithInterface: GoldenCase = {
  name: 'shape-up-with-interface',
  description: 'Shape Up workflow for projects requiring visual interface design',
  category: 'interface',
  input: 'Build a web dashboard with great UX',
  expected: {
    phases: [
      PHASES.SETUP,
      PHASES.CONTEXT,
      PHASES.SHAPE,
      PHASES.CRITIQUE,
      PHASES.GATE,
      PHASES.SCOPE,
      PHASES.INTERFACE,
      PHASES.INT_GATE,
      PHASES.SELECTION,
      PHASES.PLANNING,
      PHASES.EXECUTION,
    ],
    phaseCount: 11,
    autoChainAfter: [PHASES.GATE, PHASES.INT_GATE, PHASES.PLANNING],
    gates: [
      {
        phase: 5,
        tool: TOOLS.PLANNATOR,
        flags: ['--gate'],
        purpose: 'Approve spec-product.md',
      },
      {
        phase: 8, // Interface Gate
        tool: TOOLS.PLANNATOR,
        flags: ['--gate'],
        purpose: 'Approve interface proposals',
      },
      {
        phase: 10,
        tool: TOOLS.PLANNATOR,
        flags: ['--gate'],
        purpose: 'Approve spec-tech.md',
      },
    ],
    artifacts: [
      {
        name: ARTIFACTS.SPEC_PRODUCT,
        required: true,
        sections: ['Problem', 'Solution', 'Scope', 'IN', 'OUT'],
      },
      {
        name: ARTIFACTS.INTERFACES,
        required: true,
        sections: ['Proposal A', 'Proposal B', 'Proposal C', 'Proposal D', 'Proposal E', 'Hybrid'],
      },
      {
        name: ARTIFACTS.SPEC_TECH,
        required: true,
        sections: ['Scopes', 'TYPE', 'DoD', 'AC'],
      },
    ],
    tools: [TOOLS.SUBAGENT, TOOLS.ASK, TOOLS.PLANNATOR],
  },
};

/**
 * Quick Execution (minimal workflow)
 * 
 * For simple tasks or when user just wants to code without planning.
 * Still has Setup phase but minimal overhead.
 */
export const quickExecution: GoldenCase = {
  name: 'quick-execution',
  description: 'Minimal workflow for quick tasks or simple fixes',
  category: 'quick',
  input: 'Just code it - quick fix',
  expected: {
    phases: [PHASES.SETUP, PHASES.EXECUTION],
    phaseCount: 2,
    autoChainAfter: [],
    gates: [],
    artifacts: [
      {
        name: ARTIFACTS.INDEX,
        required: true,
        sections: ['workflow_status', 'current_phase'],
      },
    ],
    tools: [],
  },
};

/**
 * Ask Before Starting
 * 
 * When user asks a question before initiating formal workflow.
 * System should ask for clarification or initiate context phase.
 */
export const askBeforeStart: GoldenCase = {
  name: 'ask-before-start',
  description: 'Workflow triggered by vague request requiring clarification',
  category: 'clarification',
  input: 'Can you help me plan something?',
  expected: {
    phases: [PHASES.SETUP, PHASES.CONTEXT],
    phaseCount: 2,
    autoChainAfter: [],
    gates: [],
    artifacts: [
      {
        name: ARTIFACTS.INDEX,
        required: true,
        sections: [],
      },
    ],
    tools: [TOOLS.ASK],
  },
};

/**
 * Error Recovery Flow
 * 
 * When workflow encounters an error and needs to recover.
 */
export const errorRecovery: GoldenCase = {
  name: 'error-recovery',
  description: 'Workflow handles errors and recovers gracefully',
  category: 'error',
  input: 'Build a complex system',
  expected: {
    phases: [
      PHASES.SETUP,
      PHASES.CONTEXT,
      PHASES.SHAPE,
    ],
    phaseCount: 3,
    autoChainAfter: [],
    gates: [],
    artifacts: [
      {
        name: ARTIFACTS.INDEX,
        required: true,
        sections: ['workflow_status'],
      },
    ],
    tools: [TOOLS.SUBAGENT, TOOLS.ASK],
  },
};

// ── Dataset Export ────────────────────────────────────────────────────────────

/**
 * All golden test cases
 */
export const goldenDataset: GoldenCase[] = [
  shapeUpFullWorkflow,
  shapeUpWithInterface,
  quickExecution,
  askBeforeStart,
  errorRecovery,
];

// ── Metadata ─────────────────────────────────────────────────────────────────

/**
 * Categories for grouping test cases
 */
export const categories = [...new Set(goldenDataset.map(c => c.category))] as const;

/**
 * Get test cases by category
 */
export function getByCategory(category: GoldenCase['category']): GoldenCase[] {
  return goldenDataset.filter(c => c.category === category);
}

/**
 * Get test case by name
 */
export function getByName(name: string): GoldenCase | undefined {
  return goldenDataset.find(c => c.name === name);
}

// ── Constants for reuse ────────────────────────────────────────────────────────

export { PHASES, TOOLS, ARTIFACTS };