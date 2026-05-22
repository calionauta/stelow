/**
 * cali-product-workflow OpenCode Plugin
 * 
 * Provides:
 * - /pw:start, /pw:menu, /pw:status, /pw:help commands
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

// Phase names for the 11-phase workflow
const PHASE_NAMES: Record<number, string> = {
  1: "Setup",
  2: "Context",
  3: "Shape",
  4: "Critique",
  5: "Gate",
  6: "Scope",
  7: "Interface",
  8: "Int.Gate",
  9: "Selection",
  10: "Planning",
  11: "Execution",
};

/**
 * Start a new product workflow
 */
const pwStart = tool({
  description: "Start a new cali-product-workflow planning session",
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
      output: `Started "${workflowName}" at Phase 1 (Setup)\n\nThe workflow will guide you through:\nSetup → Context → Shape → Critique → Gate → Scope → Interface → Int.Gate → Selection → Planning → Execution\n\nUse /pw:status to check progress, /pw:menu for actions.`,
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
  description: "Show the current cali-product-workflow status",
  args: {},
  async execute(_args, ctx) {
    const sessionID = ctx.sessionID;
    const workflow = sessionWorkflows.get(sessionID);

    if (!workflow) {
      return {
        title: "No Active Workflow",
        output: "No workflow is active. Use /pw:start to begin.",
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
        output: "No workflow is active. Use /pw:start to begin.",
        metadata: {},
      };
    }

    if (workflow.phase >= 11) {
      return {
        title: "Workflow Complete",
        output: `${workflow.name} has completed all 11 phases!`,
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
  description: "Get help about cali-product-workflow",
  args: {},
  async execute(_args, _ctx) {
    return {
      title: "cali-product-workflow Help",
      output: `# cali-product-workflow Commands

| Command | Description |
|---------|-------------|
| /pw:start | Start a new workflow |
| /pw:menu | Show workflow menu |
| /pw:status | Show current status |
| /pw:help | Show this help |
| /pw:next | Advance to next phase |
| /pw:pause | Pause the workflow |
| /pw:resume | Resume paused workflow |
| /pw:stop | Stop the workflow |

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
11. **Execution** - Implement`,
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
      "pw:start": pwStart,
      "pw:status": pwStatus,
      "pw:next": pwNext,
      "pw:help": pwHelp,
    },
    hooks: {
      // Track session start
      "chat.message": async (input, output) => {
        console.log("[cali-product-workflow] Message in session:", input.sessionID);
      },
      // Log tool execution
      "tool.execute.after": async (input, output) => {
        console.log("[cali-product-workflow] Tool executed:", input.tool);
      },
    },
  };
};