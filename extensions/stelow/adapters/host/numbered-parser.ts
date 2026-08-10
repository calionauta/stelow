/**
 * Numbered-options parser.
 *
 * The Multica adapter renders question options as a numbered markdown
 * list (per `docs/design/host-adapter-multica.md` §5.6 — Multica has no
 * native poll UI). Reviewers reply with a number, a comma-separated
 * list (multi-select), or free text.
 *
 * This parser turns that reply into `selections: string[]`:
 *
 *   "1"               → ["opt1 label"]
 *   "1, 3"            → ["opt1 label", "opt3 label"]
 *   "  2  "           → ["opt2 label"]      (whitespace tolerated)
 *   "Anything else"   → []                  (free-text → not a selection)
 *
 * Reserved tokens (`other`, `chat about this`, `next →`, `type something.`)
 * are NOT consumed — they belong to ask.md semantics and adapters strip
 * them at render time. This parser only matches indices against the
 * concrete options passed in.
 */

// ── Types ────────────────────────────────────────────────────────────

export interface ParseResult {
  /** Selected option labels, in the order the reviewer listed them. */
  selections: string[];
  /** True when the reply matched no numeric prefix — treated as free text. */
  isFreeText: boolean;
  /** Trimmed raw input, for the audit log. */
  raw: string;
}

// ── Parser ───────────────────────────────────────────────────────────

/**
 * Parse a reviewer reply into a `ParseResult`.
 *
 * @param raw   - The reviewer's reply text (trimmed externally).
 * @param options - The rendered option list (label per index).
 *                  Pass `[]` to disable numeric parsing (every reply is
 *                  treated as free text).
 */
export function parseNumberedReply(raw: string, options: { label: string }[]): ParseResult {
  const trimmed = raw.trim();
  const rawOut = trimmed;

  // Empty reply → free text with empty selection.
  if (!trimmed) {
    return { selections: [], isFreeText: true, raw: rawOut };
  }

  // No options configured → cannot interpret indices.
  if (options.length === 0) {
    return { selections: [], isFreeText: true, raw: rawOut };
  }

  // Tokenize on commas + whitespace; accept "1", "1,3", "1, 3".
  // First segment may include non-numeric content (free text) — in that
  // case we treat the whole reply as free text to avoid false positives
  // (e.g. reviewer writes "1. Actually let's go with option 2 instead").
  const tokens = trimmed.split(/[\s,]+/).filter(Boolean);
  const indices: number[] = [];
  let allNumeric = true;

  for (const tok of tokens) {
    if (!/^\d+$/.test(tok)) {
      allNumeric = false;
      break;
    }
    indices.push(parseInt(tok, 10));
  }

  if (!allNumeric) {
    return { selections: [], isFreeText: true, raw: rawOut };
  }

  // Validate each index → must be 1..options.length (no zero, no out-of-range).
  const selections: string[] = [];
  for (const idx of indices) {
    if (idx < 1 || idx > options.length) {
      return { selections: [], isFreeText: true, raw: rawOut };
    }
    const opt = options[idx - 1];
    if (opt?.label) selections.push(opt.label);
  }

  return { selections, isFreeText: false, raw: rawOut };
}