/**
 * Golden Dataset Type Definitions
 * 
 * Type definitions for golden test cases that validate product workflow behavior.
 */
// @ts-nocheck


// ── Phase Types ────────────────────────────────────────────────────────────────

/**
 * Expected phase in workflow
 */
export interface PhaseExpectation {
  /** Phase name */
  name: string;
  /** Whether this phase should auto-chain to next */
  autoChain?: boolean;
  /** Expected tools that should be called in this phase */
  tools?: string[];
}

// ── Gate Types ────────────────────────────────────────────────────────────────

/**
 * Expected gate (approval checkpoint)
 */
export interface GateExpectation {
  /** Phase number where gate occurs (1-indexed) */
  phase: number;
  /** Tool that should be called for gate */
  tool: string;
  /** Required flags for gate command */
  flags: string[];
  /** Purpose of this gate */
  purpose: string;
}

// ── Artifact Types ────────────────────────────────────────────────────────────

/**
 * Expected artifact output
 */
export interface ArtifactExpectation {
  /** Artifact filename */
  name: string;
  /** Whether this artifact is required or optional */
  required: boolean;
  /** Required sections/headers in the artifact */
  sections: string[];
  /** Optional path pattern */
  pathPattern?: string;
}

// ── Expectations Types ────────────────────────────────────────────────────────

/**
 * Expected behavior for a workflow
 */
export interface WorkflowExpectations {
  /** Ordered list of phase names */
  phases: string[];
  /** Total number of phases expected */
  phaseCount: number;
  /** Phases that should auto-chain to next */
  autoChainAfter: string[];
  /** Required approval gates */
  gates: GateExpectation[];
  /** Expected artifacts */
  artifacts: ArtifactExpectation[];
  /** Tools that should be referenced/called */
  tools: string[];
}

// ── Golden Case ────────────────────────────────────────────────────────────────

/**
 * A golden test case representing a typical workflow scenario
 */
export interface GoldenCase {
  /** Unique case identifier */
  name: string;
  /** Human-readable description */
  description: string;
  /** Category for grouping */
  category: 'shape-up' | 'interface' | 'quick' | 'clarification' | 'error';
  /** Sample user input that triggers this workflow */
  input: string;
  /** Expected workflow behavior */
  expected: WorkflowExpectations;
}

// ── Validation Result ────────────────────────────────────────────────────────────

/**
 * Result of validating content against a golden case
 */
export interface ValidationResult {
  /** Whether validation passed */
  passed: boolean;
  /** Name of the case that was validated */
  caseName: string;
  /** All validation errors */
  errors: ValidationError[];
  /** Warnings (non-breaking issues) */
  warnings: ValidationWarning[];
}

export interface ValidationError {
  /** What was expected */
  expected: string;
  /** What was actually found */
  actual: string;
  /** Where the error was found */
  location: string;
}

export interface ValidationWarning {
  /** Warning message */
  message: string;
  /** Where the warning was triggered */
  location?: string;
}

// ── Helper Types ─────────────────────────────────────────────────────────────

/**
 * Options for validation
 */
export interface ValidateOptions {
  /** Whether to fail on missing optional items */
  strict?: boolean;
  /** Custom patterns to use instead of defaults */
  patterns?: Record<string, RegExp>;
}

// ── Test Case Builder ──────────────────────────────────────────────────────────

/**
 * Builder for creating test cases programmatically
 */
export class GoldenCaseBuilder {
  private case_: Partial<GoldenCase> = {
    expected: {
      phases: [],
      phaseCount: 0,
      autoChainAfter: [],
      gates: [],
      artifacts: [],
      tools: [],
    },
  };

  withName(name: string): this {
    this.case_.name = name;
    return this;
  }

  withDescription(description: string): this {
    this.case_.description = description;
    return this;
  }

  withCategory(category: GoldenCase['category']): this {
    this.case_.category = category;
    return this;
  }

  withInput(input: string): this {
    this.case_.input = input;
    return this;
  }

  withPhases(...phases: string[]): this {
    if (this.case_.expected) {
      this.case_.expected.phases = phases;
      this.case_.expected.phaseCount = phases.length;
    }
    return this;
  }

  withAutoChain(...phases: string[]): this {
    if (this.case_.expected) {
      this.case_.expected.autoChainAfter = phases;
    }
    return this;
  }

  withGate(gate: GateExpectation): this {
    if (this.case_.expected) {
      this.case_.expected.gates.push(gate);
    }
    return this;
  }

  withArtifact(artifact: ArtifactExpectation): this {
    if (this.case_.expected) {
      this.case_.expected.artifacts.push(artifact);
    }
    return this;
  }

  withTool(tool: string): this {
    if (this.case_.expected) {
      this.case_.expected.tools.push(tool);
    }
    return this;
  }

  build(): GoldenCase {
    if (!this.case_.name || !this.case_.expected) {
      throw new Error('GoldenCase requires name and expected values');
    }
    return this.case_ as GoldenCase;
  }
}