## Strategic Context (optional)

> **Part of stelow** — See [`SKILL.md`](./SKILL.md) for stage sequence, safety rules, and capability reference.
> **Tool Restrictions:** See `stages.yaml` for blocked/allowed tools in this stage.

**After Setup**, the flow enters Strategic Context to enrich planning with optional context.
The LLM checks if the user should be offered strategic analysis and/or domain libraries.

**Prerequisites:** Appetite (Lean / Core / Complete) and Review Mode (Auto / Product Spec Gate / Product Spec + Interface Gates / Product Spec + Interface + Scopes / Product Spec + Interface + Tech Review / Product Spec + Interface + Tech Review + Code Diff) must already be declared in `setup:15` (Appetite) and `setup:16` (Review Mode), then stored in `index.json` (read via `stages.yaml` conventions).

### context:5 — Appetite & Review Mode Gate (auto-skip / reduced)

Before executing `context:10` or `context:20`, check the declared appetite and review mode.

**Canonical values:**
- Appetite: `Lean` | `Core` (Recommended) | `Complete`
- Review Mode: `Auto` | `Product Spec Gate` | `Product Spec + Interface Gates` | `Product Spec + Interface + Scopes` | `Product Spec + Interface + Tech Review` | `Product Spec + Interface + Tech Review + Code Diff`

**Gate matrix:**

| Appetite | Review Mode | `context:10` (Strategic Approaches — 5 options) | `context:20` (Domain Libraries — 8 options) |
|---|---|---|---|
| `Lean` | `Auto` | **Skip** entire Context stage → go directly to `shape:10` | **Skip** (not reached) |
| `Lean` | `Product Spec Gate` / `Product Spec + Interface Gates` / `Product Spec + Interface + Scopes` / `Product Spec + Interface + Tech Review` / `Product Spec + Interface + Tech Review + Code Diff` | **Reduced ask**: present all 5 strategic approaches, but mark execution as opt-in per approach (no automatic parallel subagents) | **Reference-only**: detect domain signals and load the 8 libraries as passive context for Shape/Scope; do not execute subagents per library |
| `Core` | any | **Full ask** (current behavior): present all 5, execute selected in parallel, consolidate into `strategic-insights.md` | **Full detect + execute**: 1..N of the 8 libraries via parallel subagents, inject into Shape/Scope/Interface |
| `Complete` | any | **Full ask** + advisory note: "Complete detected — running all 5 strategic approaches is recommended" | **Full detect + execute** of all 8 libraries detected |

**Skip log (when `Lean` + `Auto`):**

The LLM surfaces this message in the chat output (visible to the user) AND in the per-session log file under `.stelow/{date}/{dir}/session.log`:

```
echo "Lean appetite + Auto review mode detected — skipping Context per context:5 policy"
echo "Proceeding directly to shape:10"
```

**Reference-only library handling (when `Lean` + non-Auto):** Detected domain libraries are recorded in `spec-product.md` frontmatter as `domains_detected: [pricing, marketplace]` (single source of truth — canonical for subagent `reads`). They are NOT executed as subagents and no `strategic-insights.md` is produced. The downstream Shape/Scope/Interface/Planning stages load the listed libraries as passive context (their `SKILL.md` files are referenced on demand). A `## Domain Signals` body section is allowed for human-readable rationale but is not the canonical input for subagents.

**Why this gate exists:** Appetite controls depth, Mode controls breadth (see `README.md` "Appetite & Mode"). For Lean-appetite work under Auto mode, strategic analysis and domain library execution are overhead that defeats the purpose of the appetite declaration. The five Strategic Approaches and eight Domain Libraries remain available — only the *execution* is gated, not the *availability*.

### context:10 — Strategic Exploration (always ask unless gated by `context:5`)

**ALWAYS ask** — use **Pattern 1** from `stages/ask-patterns.md` for the question format.
**ALSO read** the "Strategic Approaches" table in the main `SKILL.md` for the full approach list with skill names and outputs.

> **⚠️ Multi-Select Rule:** When using `multiSelect: true`, DO NOT include "None", "Skip", or similar meta-options. User can select nothing to skip.

**If user selects one or more approaches:**
1. Read `references/strategic-exploration.md` for each approach's details
2. (Unless `context:5` reduced this to opt-in.) Execute the selected ones **in parallel** using the subagents tool (see `references/cli-tools/subagents.md`):
3. Consolidate into `strategic-insights.md`
4. Incorporate outputs as Shape Up input

**If nothing selected (No strategic analysis):** proceed directly to Domain Context Detection (`:20`).

### context:20 — Domain Context Detection (conditional)

**After Strategic Exploration (`:10`)**, the LLM analyzes the user's original request for **domain signals**:

| User Input Signal | Domain | Skill |
|---|---|---|
| "price", "pricing", "how much to charge", "subscription" | Pricing | `stelow-product-pricing` |
| "launch", "promotion", "black friday", "coupon", "discount" | Promotions | `stelow-product-promotions` |
| "ad", "ads", "facebook ads", "google ads", "paid traffic" | Ads | `stelow-product-ads` |
| "trust", "guarantee", "social proof", "credibility" | Trust | `stelow-product-trust-building` |
| "business model", "revenue", "monetize", "make money" | Business Models | `stelow-product-business-models` |
| "open source", "community edition" | Open Source | `stelow-product-open-source` |
| "product health", "product metrics", "addiction", "wellbeing" | Health | `stelow-product-health` |
| "marketplace", "marketplace supply", "marketplace demand" | Marketplace | `stelow-product-marketplace-playbook` |

**Two detection modes:**

**Mode A — Purely domain-specific request** (user asks only about a domain topic):
The user's request is exclusively about one of these domains (e.g., "help me define a pricing strategy").
→ Route directly to the detected skill. Do NOT proceed to Shape Up.
→ The user can always choose to continue to Shape Up afterwards.

**Mode B — General product request with domain overlap** (user asks for product planning but mentions domains):
The user wants full product planning but the input also contains domain signals.
→ Offer domain libraries as **complementary context** using the ask tool (see `references/cli-tools/ask.md`), referencing patterns from `stages/ask-patterns.md`:

```
ask tool: multiSelect question with detected domain options
```
})
```

**If user selects libraries:**
1. Load the selected skill(s) content as additional context
2. Proceed to Shape Up with domain context enriched
3. **Persist detected domains** to `index.json#config.domains_detected` (single source of truth — consumed by Shape Up's frontmatter generator and by all subagents via `reads: [spec-product.md]`):

```bash
INDEX="$(find .stelow/*/*/index.json -type f 2>/dev/null | head -1 | tr -d '\n')"
if [ -n "$INDEX" ] && [ -n "{selected_domains_json}" ]; then
  # Update domains_detected in-place (e.g., ["pricing", "marketplace"])
  python3 -c "
import json, sys
with open('$INDEX') as f: data = json.load(f)
data.setdefault('config', {})['domains_detected'] = {selected_domains_json}
with open('$INDEX', 'w') as f: json.dump(data, f, indent=2)
"
fi
```

**If nothing detected or user declines:** proceed directly to Shape Up or end (set `domains_detected: []` in index.json).
