/**
 * stelow OpenCode Plugin
 * 
 * Provides:
 * - /sw-start, /sw-status, /sw-help commands
 * - Workflow lifecycle hooks
 * - TUI status overlay
 */

import { tool, type Plugin } from "@opencode-ai/plugin/tool";

// Workflow state management
interface WorkflowState {
  name: string;
  phase: number;
  phaseName: string;
  startedAt: string;
}

// Track active workflows per session
const sessionWorkflows = new Map<string, WorkflowState>();

import { PHASE_NAMES, MAX_PHASE } from "./phase-names.generated";

/**
 * Start a new product workflow
 */
const pwStart = tool({
  description: "Start a new stelow planning session",
  args: {
    name: tool.schema.string().optional().describe("Workflow name"),
    description: tool.schema.string().optional().describe("Workflow description"),
    source: tool.schema.string().optional().describe("Source file path (e.g., @brief.md)"),
  },
  async execute(args, ctx) {
    const workflowName = args.name || "unnamed-workflow";
    const sessionID = ctx.sessionID;

    // Create workflow state
    const workflow: WorkflowState = {
      name: workflowName,
      phase: 1,
      phaseName: PHASE_NAMES[1],
      startedAt: new Date().toISOString(),
    };

    sessionWorkflows.set(sessionID, workflow);

    // Trigger the skill
    await ctx.ask({
      permission: "run",
      patterns: [],
      always: [],
      metadata: {
        workflow: workflowName,
        description: args.description,
        source: args.source,
      },
    });

    return {
      title: "Workflow Started",
      output: `Started "${workflowName}" at Phase 1 (Setup)\n\nThe workflow will guide you through:\nSetup → Context → Shape → Critique → Gate → Scope → Interface → Int.Gate → Selection → Planning → Execution → Verification → Audit\n\nUse /sw-status to check progress.`,
      metadata: {
        workflowName,
        phase: 1,
        phaseName: "Setup",
      },
    };
  },
});

/**
 * Show workflow status
 */
const pwStatus = tool({
  description: "Show the current stelow workflow status",
  args: {},
  async execute(_args, ctx) {
    const sessionID = ctx.sessionID;
    const workflow = sessionWorkflows.get(sessionID);

    if (!workflow) {
      return {
        title: "No Active Workflow",
        output: "No workflow is active. Use /sw-start to begin.",
        metadata: {},
      };
    }

    return {
      title: `Workflow: ${workflow.name}`,
      output: `◆ ${workflow.name}  │  ◆ ${workflow.phaseName} ${workflow.phase}`,
      metadata: {
        workflowName: workflow.name,
        phase: workflow.phase,
        phaseName: workflow.phaseName,
      },
    };
  },
});

/**
 * Advance to next phase
 */
const pwNext = tool({
  description: "Advance to the next workflow phase",
  args: {},
  async execute(_args, ctx) {
    const sessionID = ctx.sessionID;
    const workflow = sessionWorkflows.get(sessionID);

    if (!workflow) {
      return {
        title: "No Active Workflow",
        output: "No workflow is active. Use /sw-start to begin.",
        metadata: {},
      };
    }

    if (workflow.phase >= MAX_PHASE) {
      return {
        title: "Workflow Complete",
        output: `${workflow.name} has completed all phases!`,
        metadata: {
          workflowName: workflow.name,
          phase: workflow.phase,
        },
      };
    }

    workflow.phase += 1;
    workflow.phaseName = PHASE_NAMES[workflow.phase];

    return {
      title: "Phase Advanced",
      output: `Moved to Phase ${workflow.phase}: ${workflow.phaseName}\n\n◆ ${workflow.name}  │  ◆ ${workflow.phaseName} ${workflow.phase}`,
      metadata: {
        workflowName: workflow.name,
        phase: workflow.phase,
        phaseName: workflow.phaseName,
      },
    };
  },
});

/**
 * Get workflow help
 */
const pwHelp = tool({
  description: "Get help about stelow",
  args: {},
  async execute(_args, _ctx) {
    return {
      title: "stelow Help",
      output: `# stelow Commands

| Command | Description |
|---------|-------------|
| /sw-start | Start a new workflow |
| /sw-status | Show current status |
| /sw-help | Show this help |
| /sw-next | Advance to next phase |
| /sw-pause | Pause the workflow |
| /sw-resume | Resume paused workflow |
| /sw-abort | Abort and archive the workflow |

## Workflow Phases

1. **Setup** - Gather requirements
2. **Context** - Understand the problem
3. **Shape** - Shape the solution
4. **Critique** - Review and identify gaps
5. **Gate** - Visual review
6. **Scope** - Break into scopes
7. **Interface** - Interface design
8. **Int.Gate** - Interface review
9. **Selection** - Select approach
10. **Planning** - Create plan
11. **Execution** - Implement features
12. **Verification** - Test suite, code review, UI audit, browser testing
13. **Audit** - Delivery audit and sign-off`,
      metadata: {},
    };
  },
});

/**
 * Plugin export
 */
export default async (input: Parameters<Plugin>[0]) => {
  return {
    tool: {
      "sw-start": pwStart,
      "sw-status": pwStatus,
      "sw-next": pwNext,
      "sw-help": pwHelp,
    },
    hooks: {
      // Track session start
      "chat.message": async (input, output) => {
        console.log("[stelow] Message in session:", input.sessionID);
      },
      // Log tool execution
      "tool.execute.after": async (input, output) => {
        console.log("[stelow] Tool executed:", input.tool);
      },
    },
  };
};