/**
 * Build the user message that activates the /skill:stelow
 * skill, embedding the user's brief and any @file source contents so the
 * LLM has the full context on first contact. The /sw-start command itself
 * is intercepted and not delivered to the LLM, so without this injection
 * the LLM would need to discover the brief via bash (fragile, easy to lose).
 *
 * Pure function — no imports, no side effects. Kept in a separate file
 * so unit tests can import it without pulling in the full adapter chain
 * (which depends on optional peer deps like @earendil-works/pi-tui).
 */
export function buildSkillActivationMessage(
  displayLabel: string,
  draftText: string,
  allSrc: string
): string {
  let msg =
    "/skill:stelow" +
    "\n\n>>> WORKFLOW STARTED: '" + displayLabel + "' <<<" +
    "\nALL prior work is PAUSED. Do NOT continue previous tasks." +
    "\nAuto-advance mode: ON. Proceed to the next stage when current one completes." +
    "\nUse /sw-next only if the workflow was explicitly paused or after an error." +
    "\n" +
    "\nCurrent stage: Setup (phase 2/14)" +
    "\nFollow `stages/setup.md` in order:" +
    "\n  1. Inbox check — deferred items from prior sessions" +
    "\n  2. Lessons learned — reflect on past cycle patterns" +
    "\n  3. Session knowledge — passive context notes" +
    "\n  4. Auto-discovery — existing in-progress workflows" +
    "\n  5. Appetite & Mode declaration (Patterns 7, 8 — fixed for the cycle)" +
    "\n  6. Stage selection (Pattern 5, mode-dependent)" +
    "\n" +
    "\nAfter setup, auto-advance through context → shape → critique → gate → scope → interface → int.gate → selection → planning → execution → verification → audit." +
    "\nDo NOT implement anything until the Execution stage." +
    "\nDo NOT ask the user what to do next — the workflow is automatic.";
  if (draftText) {
    msg += "\n\n=== USER BRIEF ===\n\n" + draftText;
  }
  if (allSrc) {
    msg += "\n\n=== SOURCE FILES ===\n\n" + allSrc;
  }
  return msg;
}
