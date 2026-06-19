/**
 * stelow OpenCode Plugin - Hooks
 * 
 * Session lifecycle hooks for workflow tracking
 */

/**
 * Hook: Session start
 * Called when a new chat session starts
 */
export async function onSessionStart(input: { sessionID: string }, output: any) {
  console.log("[stelow] Session started:", input.sessionID);
}

/**
 * Hook: Chat message received
 * Called when a new message is received
 */
export async function onChatMessage(input: { sessionID: string; messageID: string }, output: any) {
  console.log("[stelow] Message in session:", input.sessionID);
}

/**
 * Hook: Tool execution before
 * Called before a tool is executed
 */
export async function onToolExecuteBefore(input: { tool: string; sessionID: string }, output: any) {
  console.log("[stelow] Tool about to execute:", input.tool);
}

/**
 * Hook: Tool execution after
 * Called after a tool has been executed
 */
export async function onToolExecuteAfter(input: { tool: string; sessionID: string }, output: any) {
  console.log("[stelow] Tool executed:", input.tool);
}

/**
 * Hook: Session compaction before
 * Called before session context is compacted
 */
export async function onSessionCompacting(input: { sessionID: string }, output: any) {
  console.log("[stelow] Session compacting:", input.sessionID);
}

/**
 * Hook: Compaction auto-continue after
 * Called after compaction with overflow content
 */
export async function onCompactionAutoContinue(
  input: { sessionID: string; overflow: string },
  output: any
) {
  console.log("[stelow] Session compacted with overflow");
}