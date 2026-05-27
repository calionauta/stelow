/**
 * Golden Dataset Validator
 * 
 * Validates SKILL.md and skill files against golden test cases.
 * This module provides functions to validate content against expected patterns.
 */
// @ts-nocheck


import type { GoldenCase, ValidationResult, ValidationError, ValidationWarning, ValidateOptions } from './types';

// ── Pattern Library ────────────────────────────────────────────────────────────

/**
 * Default patterns for validating workflow structure
 */
export const PATTERNS = {
  // Phase patterns
  phaseIndex: /\|\s*(\d+)\s*\|\s*\*\*(.+?)\*\*\s*\|/g,
  phaseTable: /##\s*Phase\s*Index.*?(?=##|$)/is,
  
  // Gate patterns
  plannotatorGate: /plannotator\s+annotate.*--gate/gi,
  gateMandatory: /(mandatory|never\s+skip|obligatory|--gate.*obligatory)/i,
  
  // Tool patterns
  toolReference: /(subagent|ask_user_question|plannotator|supervise|intercom)/gi,
  cliToolsReference: /references\/cli-tools\//,
  
  // Artifact patterns
  specProduct: /spec-product/,
  specTech: /spec-tech/,
  interfaces: /interfaces/,
  indexJson: /index\.json/,
  
  // Workflow patterns
  autoChain: /auto-chain|automatic.*after/i,
  executionAutomatic: /Execution.*automatic|automatic.*Execution/i,
  
  // Safety patterns
  criticalRules: /CRITICAL\s+RULES|NEVER\s+skip/i,
  reviewGate: /Review\s+Gate|Phase\s+5.*Gate/i,
  interfaceGate: /Interface\s+Gate|Phase\s+8.*Gate/i,
  
  // Section patterns
  problemSection: /##\s*Problem/i,
  solutionSection: /##\s*Solution/i,
  scopeSection: /##\s*Scope/i,
  inItems: /###\s*IN/i,
  outItems: /###\s*OUT/i,
  scopesSection: /##\s*Scopes/i,
  typeAnnotation: /\[TYPE:\s*(feature|optimization|spike)\]/i,
  dodSection: /DoD:|Done\s+when:/i,
  acSection: /AC:|Acceptance\s+Criteria:/i,
  
  // Interface patterns
  proposalA: /##\s*Proposal\s*[A-E]/i,
  hybridRecommendation: /##\s*Hybrid/i,
} as const;

// ── Validation Functions ───────────────────────────────────────────────────────

/**
 * Validate that content matches golden case expectations
 */
export function validateAgainstGolden(content: string, goldenCase: GoldenCase): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 1. Validate tool references
  validateToolReferences(content, goldenCase, errors);

  // 2. Validate phase structure
  validatePhaseStructure(content, goldenCase, errors, warnings);

  // 3. Validate gates
  validateGates(content, goldenCase, errors);

  // 4. Validate artifacts
  validateArtifacts(content, goldenCase, errors);

  // 5. Validate safety rules
  validateSafetyRules(content, goldenCase, errors, warnings);

  return {
    passed: errors.length === 0,
    caseName: goldenCase.name,
    errors,
    warnings,
  };
}

/**
 * Validate tool references match expected tools
 */
function validateToolReferences(
  content: string,
  goldenCase: GoldenCase,
  errors: ValidationError[]
): void {
  goldenCase.expected.tools.forEach(tool => {
    const pattern = new RegExp(`\\b${tool}\\b`, 'i');
    if (!pattern.test(content)) {
      errors.push({
        expected: `Tool "${tool}" should be referenced`,
        actual: `Tool "${tool}" not found in content`,
        location: 'Tools & Packages section',
      });
    }
  });
}

/**
 * Validate phase structure
 */
function validatePhaseStructure(
  content: string,
  goldenCase: GoldenCase,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // Count phases in content
  const phaseMatches = content.match(PATTERNS.phaseIndex);
  const phaseCount = phaseMatches ? phaseMatches.length : 0;

  if (phaseCount < goldenCase.expected.phaseCount) {
    errors.push({
      expected: `At least ${goldenCase.expected.phaseCount} phases`,
      actual: `Found only ${phaseCount} phases`,
      location: 'Phase Index',
    });
  }

  // Validate each expected phase exists
  goldenCase.expected.phases.forEach(phaseName => {
    const phasePattern = new RegExp(`\\*\\*${phaseName}\\*\\*`, 'i');
    if (!phasePattern.test(content)) {
      errors.push({
        expected: `Phase "${phaseName}" should exist`,
        actual: `Phase "${phaseName}" not found`,
        location: 'Phase Index',
      });
    }
  });

  // Validate auto-chain rules
  if (goldenCase.expected.autoChainAfter.length > 0) {
    if (!PATTERNS.autoChain.test(content)) {
      warnings.push({
        message: 'Auto-chain rules not found (optional but recommended)',
        location: 'Auto-chaining section',
      });
    }
  }

  // Validate execution is automatic
  if (goldenCase.expected.autoChainAfter.includes('Planning') || 
      goldenCase.expected.autoChainAfter.includes('Gate')) {
    if (!PATTERNS.executionAutomatic.test(content)) {
      warnings.push({
        message: 'Execution should be automatic after final gate',
        location: 'Execution section',
      });
    }
  }
}

/**
 * Validate gates are present at expected phases
 */
function validateGates(
  content: string,
  goldenCase: GoldenCase,
  errors: ValidationError[]
): void {
  goldenCase.expected.gates.forEach(gate => {
    // Check for plannotator gate
    if (!PATTERNS.plannotatorGate.test(content)) {
      errors.push({
        expected: `Plannotator gate at Phase ${gate.phase}`,
        actual: 'Plannotator gate with --gate flag not found',
        location: `Phase ${gate.phase}`,
      });
    }

    // Check gate is mandatory
    if (!PATTERNS.gateMandatory.test(content)) {
      errors.push({
        expected: 'Gate should be documented as mandatory',
        actual: 'Gate mandatory statement not found',
        location: 'Safety Rules',
      });
    }
  });
}

/**
 * Validate artifacts are documented
 */
function validateArtifacts(
  content: string,
  goldenCase: GoldenCase,
  errors: ValidationError[]
): void {
  goldenCase.expected.artifacts.forEach(artifact => {
    if (artifact.required) {
      const artifactPattern = new RegExp(artifact.name.replace('.', '\\.'), 'i');
      if (!artifactPattern.test(content)) {
        errors.push({
          expected: `Artifact "${artifact.name}" should be documented`,
          actual: `Artifact "${artifact.name}" not found`,
          location: 'Directory Structure',
        });
      }

      // Validate required sections
      artifact.sections.forEach(section => {
        const sectionPattern = new RegExp(section.replace(' ', '\\s+'), 'i');
        if (section && !sectionPattern.test(content)) {
          errors.push({
            expected: `Section "${section}" in ${artifact.name}`,
            actual: `Section "${section}" not documented`,
            location: artifact.name,
          });
        }
      });
    }
  });
}

/**
 * Validate safety rules are present
 */
function validateSafetyRules(
  content: string,
  goldenCase: GoldenCase,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // CRITICAL RULES section
  if (!PATTERNS.criticalRules.test(content)) {
    errors.push({
      expected: 'CRITICAL RULES section should exist',
      actual: 'CRITICAL RULES section not found',
      location: 'CRITICAL RULES',
    });
  }

  // Review Gate
  if (goldenCase.expected.gates.some(g => g.phase === 5)) {
    if (!PATTERNS.reviewGate.test(content)) {
      errors.push({
        expected: 'Review Gate for Phase 5 should be documented',
        actual: 'Review Gate documentation not found',
        location: 'Safety Rules',
      });
    }
  }

  // Interface Gate (for interface workflows)
  if (goldenCase.category === 'interface') {
    if (!PATTERNS.interfaceGate.test(content)) {
      errors.push({
        expected: 'Interface Gate for Phase 8 should be documented',
        actual: 'Interface Gate documentation not found',
        location: 'Safety Rules',
      });
    }
  }
}

// ── Batch Validation ───────────────────────────────────────────────────────────

/**
 * Validate content against multiple golden cases
 */
export function validateAgainstDataset(
  content: string,
  goldenCases: GoldenCase[]
): Map<string, ValidationResult> {
  const results = new Map<string, ValidationResult>();

  goldenCases.forEach(goldenCase => {
    const result = validateAgainstGolden(content, goldenCase);
    results.set(goldenCase.name, result);
  });

  return results;
}

/**
 * Get summary of all validation results
 */
export function getValidationSummary(results: Map<string, ValidationResult>): {
  total: number;
  passed: number;
  failed: number;
  failedCases: string[];
} {
  let passed = 0;
  let failed = 0;
  const failedCases: string[] = [];

  results.forEach((result, name) => {
    if (result.passed) {
      passed++;
    } else {
      failed++;
      failedCases.push(name);
    }
  });

  return {
    total: results.size,
    passed,
    failed,
    failedCases,
  };
}

// ── Pattern Helpers ────────────────────────────────────────────────────────────

/**
 * Extract phases from content
 */
export function extractPhases(content: string): Array<{ index: number; name: string }> {
  const phases: Array<{ index: number; name: string }> = [];
  const regex = new RegExp(PATTERNS.phaseIndex.source, 'gi');
  let match;

  while ((match = regex.exec(content)) !== null) {
    phases.push({
      index: parseInt(match[1], 10),
      name: match[2].trim(),
    });
  }

  return phases;
}

/**
 * Check if content references cli-tools directory
 */
export function hasCliToolsReference(content: string): boolean {
  return PATTERNS.cliToolsReference.test(content);
}

/**
 * Count gates in content
 */
export function countGates(content: string): number {
  const matches = content.match(PATTERNS.plannotatorGate);
  return matches ? matches.length : 0;
}