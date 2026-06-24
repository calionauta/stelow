/**
 * Build the user message that activates the /skill:stelow-product-orchestrator
 * skill, embedding the user's brief and any @file source contents so the
 * LLM has the full context on first contact. The /sw-start command itself
 * is intercepted and not delivered to the LLM, so without this injection
 * the LLM would need to discover the brief via bash (fragile, easy to lose).
 *
 * Pure function — no imports, no side effects. Kept in a separate file
 * so unit tests can import it without pulling in the full adapter chain
 * (which depends on optional peer deps like @earendil-works/pi-tui).
 *
 * @param displayLabel - Workflow display name
 * @param draftText - User's original brief text
 * @param allSrc - Source file contents (from @refs)
 * @param intent - Detected intent category from /sw-start
 * @param initialPhase - PHASE_NAMES index where workflow starts
 */
export function buildSkillActivationMessage(
  displayLabel: string,
  draftText: string,
  allSrc: string,
  intent: string = "unknown",
  initialPhase: number = 2
): string {
  const phaseName = phaseNames[initialPhase] || "Setup";

  // Intent-specific stage instructions and pipeline
  // ALL intents start at Setup (phase 2) — the intent determines what happens
  // during stage selection (setup:20) and which stages auto-advance.
  let stageSection: string;
  let pipelineSection: string;
  let overrideNote: string;

  switch (intent) {
    case "bugfix":
      stageSection =
        `\nCurrent stage: ${phaseName} (phase ${initialPhase + 1}/15)` +
        `\n` +
        `\nThis workflow was classified as a BUGFIX.` +
        `\nDuring stage selection (setup:20), pick ONLY Tech Planning (\"Tech Planning Sequencing\").` +
        `\nSkip Shape Up, Interface Alternatives, and all Gates.` +
        `\nThen auto-advance through: planning \u2192 execution \u2192 verification \u2192 audit.`;
      pipelineSection = `\n`;
      overrideNote =
        `\n\n>>> BUGFIX OVERRIDE <<<` +
        `\nStage selection: only Tech Planning. Appetite can be Lean (quick fix).` +
        `\nExecution: single scope to fix the bug. No spec-product.md needed.` +
        `\nVerification: bug is fixed, no regressions.`;
      break;

    case "refactor":
      stageSection =
        `\nCurrent stage: ${phaseName} (phase ${initialPhase + 1}/15)` +
        `\n` +
        `\nThis workflow was classified as a REFACTOR.` +
        `\nDuring stage selection (setup:20), pick ONLY Tech Planning (\"Tech Planning Sequencing\").` +
        `\nSkip Shape Up, Interface Alternatives, and all Gates.` +
        `\nThen auto-advance through: planning \u2192 execution \u2192 verification \u2192 audit.`;
      pipelineSection = `\n`;
      overrideNote =
        `\n\n>>> REFACTOR OVERRIDE <<<` +
        `\nStage selection: only Tech Planning. Appetite can be Lean (no new functionality).` +
        `\nExecution: single refactoring scope. No spec-product.md needed.` +
        `\nVerification: behavior unchanged, all tests pass.`;
      break;

    case "investigate":
      stageSection =
        `\nCurrent stage: ${phaseName} (phase ${initialPhase + 1}/15)` +
        `\n` +
        `\nThis workflow was classified as INVESTIGATE / RESEARCH.` +
        `\nDuring stage selection (setup:20), pick ONLY Tech Planning with a spike scope.` +
        `\nSkip Shape Up, Interface Alternatives, and all Gates.`;
      pipelineSection = `\n`;
      overrideNote =
        `\n\n>>> INVESTIGATE OVERRIDE <<<` +
        `\nStage selection: only Tech Planning. Appetite can be Lean (quick research).` +
        `\nExecution: single spike scope to research the question.` +
        `\nNo code changes expected unless the research leads to implementation.`;
      break;

    case "new-product":
    case "feature":
      // new-product and feature — full pipeline
      stageSection =
        `\nCurrent stage: ${phaseName} (phase ${initialPhase + 1}/15)` +
        `\nFollow \`stages/setup.md\` in order:` +
        `\n  1. Inbox check \u2014 deferred items from prior sessions` +
        `\n  2. Lessons learned \u2014 reflect on past cycle patterns` +
        `\n  3. Session knowledge \u2014 passive context notes` +
        `\n  4. Auto-discovery \u2014 existing in-progress workflows` +
        `\n  5. Appetite & Mode declaration (Patterns 7, 8 \u2014 fixed for the cycle)` +
        `\n  6. Stage selection (Pattern 5, mode-dependent)`;
      pipelineSection =
        `\n` +
        `\nAfter setup, auto-advance through context \u2192 shape \u2192 critique \u2192 gate ` +
        `\u2192 scope \u2192 interface \u2192 int.gate \u2192 selection \u2192 planning ` +
        `\u2192 execution \u2192 verification \u2192 audit.`;
      overrideNote = ``;
      break;

    default:
      // unknown — skill classifies the brief during setup
      stageSection =
        `\nCurrent stage: ${phaseName} (phase ${initialPhase + 1}/15)` +
        `\n\nCLASSIFY THE USER BRIEF FIRST (if brief exists).` +
        `\nRead the brief below and decide: new-product, feature, bugfix, refactor, or investigate.` +
        `\n` +
        `\nUse \`ask_user_question\` (Pattern 4 from stages/ask-patterns.md) with these options:` +
        `\n  - New Product (full pipeline)` +
        `\n  - Feature (standard pipeline)` +
        `\n  - Bugfix (Tech Planning only)` +
        `\n  - Refactor (Tech Planning only)` +
        `\n  - Investigate / Research (spike only)` +
        `\nState your recommended classification in the question. Proceed after the user confirms.` +
        `\n` +
        `\nIf no brief exists, default to Feature pipeline and skip this step.` +
        `\n` +
        `\nThen follow \`stages/setup.md\` in order:` +
        `\n  1. Inbox check \u2014 deferred items from prior sessions` +
        `\n  2. Lessons learned \u2014 reflect on past cycle patterns` +
        `\n  3. Session knowledge \u2014 passive context notes` +
        `\n  4. Auto-discovery \u2014 existing in-progress workflows` +
        `\n  5. Appetite & Mode declaration (Patterns 7, 8 \u2014 fixed for the cycle)` +
        `\n  6. Stage selection (Pattern 5, mode-dependent)`;
      pipelineSection =
        `\n` +
        `\nAfter setup, the pipeline depends on the classification. The stage selection ` +
        `\noverrides in setup:20 will set the correct auto-advance chain.`;
      overrideNote =
        `\n\n>>> CLASSIFICATION OVERRIDE <<<` +
        `\nIntent is unknown. Classify the brief during setup, then proceed.` +
        `\nIf no brief exists, default to feature pipeline.`;
      break;
  }

  // The "Do NOT ask the user" instruction is only valid when the intent is
  // pre-classified. When intent is "unknown", the skill MUST ask the user
  // to confirm the classification before proceeding.
  const askRule = intent === "unknown"
    ? "\nClassification needs user confirmation. Ask the user to confirm your classification before proceeding."
    : "\nDo NOT ask the user what to do next \u2014 the workflow is automatic.";

  let msg =
    "/skill:stelow-product-orchestrator" +
    "\n\n>>> WORKFLOW STARTED: '" + displayLabel + "' <<<" +
    "\nIntent: " + intent +
    "\nALL prior work is PAUSED. Do NOT continue previous tasks." +
    "\nAuto-advance mode: ON. Proceed to the next stage when current one completes." +
    "\nUse /sw-next only if the workflow was explicitly paused or after an error." +
    "\nDo NOT implement anything until the Execution stage." +
    askRule +
    stageSection +
    pipelineSection +
    overrideNote;

  if (draftText) {
    msg += "\n\n=== USER BRIEF ===\n\n" + draftText;
  }
  if (allSrc) {
    msg += "\n\n=== SOURCE FILES ===\n\n" + allSrc;
  }
  return msg;
}

/**
 * Local copy of PHASE_NAMES — avoids import dependency.
 * Must stay in sync with types.ts:PHASE_NAMES.
 */
const phaseNames = [
  "Triage",
  "ItemSelect",
  "Setup",
  "Context",
  "Shape",
  "Critique",
  "Gate",
  "Scope",
  "Interface",
  "Int.Gate",
  "Selection",
  "Planning",
  "Execution",
  "Verification",
  "Audit",
];
