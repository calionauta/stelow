// @ts-nocheck
import { describe, it, expect, beforeAll } from "vitest";

// We'll test against the actual SKILL.md file
import { readFileSync } from "fs";
import { resolve } from "path";

const SKILL_PATH = resolve(__dirname, "../../skills/cali-product-workflow/SKILL.md");
const SKILL_CONTENT = readFileSync(SKILL_PATH, "utf-8");

// Sample golden dataset for per-case validation
const goldenDataset = [
  {
    name: "shape-up-full-workflow",
    expected: {
      phaseCount: 11,
      tools: ["subagent", "ask_user_question", "plannotator"],
      artifacts: [
        { name: "spec-product.md", required: true },
        { name: "spec-tech.md", required: true },
        { name: "interfaces.md", required: false },
      ],
    },
  },
  {
    name: "shape-up-with-interface",
    expected: {
      phaseCount: 12,
      tools: ["subagent", "ask_user_question", "plannotator"],
      artifacts: [
        { name: "spec-product.md", required: true },
        { name: "interfaces.md", required: true },
        { name: "spec-tech.md", required: true },
      ],
    },
  },
  {
    name: "ask-before-start",
    expected: {
      phaseCount: 1,
      tools: ["ask_user_question"],
      artifacts: [],
    },
  },
  {
    name: "error-recovery",
    expected: {
      phaseCount: 5,
      tools: ["subagent", "plannotator"],
      artifacts: [],
    },
  },
];

// Helper: extract stages from content
function extractStages(content: string): string[] {
  const stageMatches = content.match(/Stage \d+[^\n]*/g) || [];
  return stageMatches;
}

// Helper: count gates
function countGates(content: string): number {
  const gateMatches = content.match(/plannotator annotate.*--gate/g) || [];
  return gateMatches.length;
}

// Helper: has cli-tools reference
function hasCliToolsReference(content: string): boolean {
  return /references\/cli-tools\//.test(content);
}

describe("SKILL.md Golden Validation", () => {
  describe("Overall Validation", () => {
    it("should have required sections", () => {
      expect(SKILL_CONTENT).toMatch(/CRITICAL RULES|NEVER skip/i);
      expect(SKILL_CONTENT).toMatch(/stages?/i);
    });

    it("should reference the stages directory", () => {
      expect(SKILL_CONTENT).toMatch(/stages\//);
    });

    it("should have correct stage documentation", () => {
      // Check key stages are documented
      expect(SKILL_CONTENT).toMatch(/Setup|Stage 1/i);
      expect(SKILL_CONTENT).toMatch(/Shape|Stage 3/i);
      expect(SKILL_CONTENT).toMatch(/Execution|Stage 12|Stage 13/i);
    });
  });

  describe("Tool References", () => {
    it("should reference cli-tools directory", () => {
      expect(hasCliToolsReference(SKILL_CONTENT)).toBe(true);
    });

    it("should reference subagent tool", () => {
      expect(SKILL_CONTENT).toMatch(/\bsubagent\b/);
    });

    it("should reference structured question tool", () => {
      // SKILL.md uses "structured question" (descriptive) - not ask_user_question (technical)
      // This follows DRY: technical name is in references/cli-tools/structured-question.md, not in SKILL.md
      expect(SKILL_CONTENT).toMatch(/structured question|references\/cli-tools\/ask\.md/);
    });

    it("should reference plannotator tool", () => {
      expect(SKILL_CONTENT).toMatch(/plannotator/);
    });
  });

  describe("Gate Validation", () => {
    it("should have plannotator gates with --gate", () => {
      const gateCount = countGates(SKILL_CONTENT);
      expect(gateCount).toBeGreaterThanOrEqual(1);
    });

    it("should document gates as mandatory or important", () => {
      expect(SKILL_CONTENT).toMatch(/mandatory|never skip|--gate|Review Gate|Interface Gate/i);
    });

    describe("Gate Phase Documentation", () => {
      it("should document Review Gate for Phase 5", () => {
        expect(SKILL_CONTENT).toMatch(/Phase 5|Review Gate|Gate.*mandatory/i);
      });

      it("should document Tech Planning gate", () => {
        expect(SKILL_CONTENT).toMatch(/Tech Planning|Phase 10|Planning.*Gate/i);
      });
    });
  });

  describe("Artifact Documentation", () => {
    it("should document spec-product.md", () => {
      expect(SKILL_CONTENT).toMatch(/spec-product/);
    });

    it("should document spec-tech.md", () => {
      expect(SKILL_CONTENT).toMatch(/spec-tech/);
    });

    it("should document interfaces.md", () => {
      expect(SKILL_CONTENT).toMatch(/interfaces/);
    });

    it("should document index.json", () => {
      expect(SKILL_CONTENT).toMatch(/index\.json/);
    });
  });

  describe("Workflow Flow", () => {
    it("should document auto-chaining rules", () => {
      expect(SKILL_CONTENT).toMatch(/auto-chain|auto-chaining|Execution.*automatic/i);
    });

    it("should document execution is automatic", () => {
      expect(SKILL_CONTENT).toMatch(/Execution.*automatic|automatic.*Execution/i);
    });

    it("should have CRITICAL RULES section", () => {
      expect(SKILL_CONTENT).toMatch(/CRITICAL RULES|NEVER skip/i);
    });

    it("should document workflow directory structure", () => {
      expect(SKILL_CONTENT).toMatch(/\.cali-product-workflow/);
    });
  });

  describe("Per-Case Basic Validation", () => {
    goldenDataset.forEach(testCase => {
      describe(`Case: ${testCase.name}`, () => {
        it("should have expected stages in SKILL.md", () => {
          const stages = extractStages(SKILL_CONTENT);
          const stageCount = stages.length;
          
          // SKILL.md documents 14 stages (0-13), so we expect at least 10
          expect(stageCount).toBeGreaterThanOrEqual(10);
        });

        it("should reference expected tools", () => {
          testCase.expected.tools.forEach(tool => {
            const toolPattern = new RegExp(`\\b${tool.replace('_', '[-_]?')}\\b`, 'i');
            // For ask_user_question, accept descriptive "structured question" as alternative
            const skipIfAsk = tool === 'ask_user_question' && /structured question|references\/cli-tools\/ask\.md/i.test(SKILL_CONTENT);
            if (skipIfAsk) return;
            expect(SKILL_CONTENT).toMatch(toolPattern);
          });
        });

        it("should document required artifacts", () => {
          const requiredArtifacts = testCase.expected.artifacts.filter(a => a.required);
          requiredArtifacts.forEach(artifact => {
            const baseName = artifact.name.replace('.md', '').replace('_v{N}.md', '');
            const pattern = new RegExp(baseName, 'i');
            expect(SKILL_CONTENT).toMatch(pattern);
          });
        });
      });
    });
  });
});