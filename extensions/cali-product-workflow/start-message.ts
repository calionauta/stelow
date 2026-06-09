/**
 * Build the user message that activates the /skill:cali-product-workflow
 * skill, embedding the user's brief and any @file source contents so the
 * LLM has the full context on first contact. The /pw-start command itself
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
  let msg = "/skill:cali-product-workflow\n\n>>> WORKFLOW STARTED: '" + displayLabel + "' <<<\nALL prior work is PAUSED. Do NOT continue previous tasks.\nFollow the workflow one phase at a time via /pw-next.\nPhase 1: Setup/Clarify — ask questions, gather context.\nDo NOT implement anything until Phase 10 (Planning).";
  if (draftText) {
    msg += "\n\n=== USER BRIEF ===\n\n" + draftText;
  }
  if (allSrc) {
    msg += "\n\n=== SOURCE FILES ===\n\n" + allSrc;
  }
  return msg;
}
