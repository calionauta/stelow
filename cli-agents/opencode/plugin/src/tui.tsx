/**
 * cali-product-workflow TUI Plugin
 * 
 * Provides:
 * - Workflow status in sidebar
 * - Phase progress indicator
 * - Quick actions overlay
 */

import type { TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui";

export const tui: TuiPluginModule["tui"] = async (api, options, meta) => {
  // Store workflow state for display
  let currentWorkflow: { name: string; phase: number; phaseName: string } | null = null;

  // Register sidebar footer slot for workflow status
  const unregisterSlot = api.slots.register({
    name: "pw_sidebar_footer",
    render: () => {
      if (!currentWorkflow) {
        return null;
      }

      return (
        <div class="pw-status">
          <div class="pw-name">◆ {currentWorkflow.name}</div>
          <div class="pw-phase">◆ {currentWorkflow.phaseName} {currentWorkflow.phase}</div>
        </div>
      );
    },
  });

  // Listen for workflow events
  const unsubscribeWorkflow = api.event.on("workflow.started", (event) => {
    currentWorkflow = {
      name: event.workflowName,
      phase: 1,
      phaseName: "Setup",
    };
    api.ui.toast({
      variant: "success",
      title: "Workflow Started",
      message: event.workflowName,
    });
  });

  const unsubscribePhase = api.event.on("workflow.phase.changed", (event) => {
    if (currentWorkflow) {
      currentWorkflow.phase = event.phase;
      currentWorkflow.phaseName = event.phaseName;
    }
  });

  const unsubscribeComplete = api.event.on("workflow.completed", () => {
    currentWorkflow = null;
    api.ui.toast({
      variant: "info",
      title: "Workflow Complete",
      message: "All phases finished",
    });
  });

  // Register keyboard shortcut for workflow menu
  api.keymap.registerLayer({
    commands: ["pw-menu", "pw-status"],
    bindings: [
      { key: "ctrl+w", command: "pw-menu" },
    ],
  });

  // Cleanup on dispose
  api.lifecycle.onDispose(() => {
    unregisterSlot();
    unsubscribeWorkflow();
    unsubscribePhase();
    unsubscribeComplete();
  });
};