### planning:10 — Scope Generation

Use the references above to generate technical scopes.

Delegate to a planner subagent (see `cli-tools/subagents.md`):
- Agent: `planner` (if the harness's packaged planner defaults to fork, pass fresh explicitly — see `cli-tools/subagents.md`)
- Task: generate typed scopes (feature/optimization/spike) from the approved spec-product.md
- Follow steps: strategic stability check → codebase awareness → risk analysis → spike identification → scope definition → sequencing → DoD + ACs → formatting
- Output: `.stelow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_{v}.md`
- Inputs (all via `reads:`):
  - `.stelow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md` (canonical product spec)
  - `.stelow/{YYYY-MM-DD}/{_dir}/interfaces/selected-interface.md` (user's chosen interface direction from int-gate — exists by this stage; absent only if interface stage was skipped via Review Mode)
  - context/tech-recon.md (tech constraints from shape:12)
- `context: "fresh"` — planner must NOT inherit orchestrator's deliberation

> **⚡ Estimation Bias Correction:** The planner subagent may tend to generate
> conservative scopes or suggest cuts by overestimating complexity
> (bias from human training data). Rules:
> 1. Do not cut scope out of fear of complexity — distrust your own bias.
> 2. If a feature seems "too complex", justify why and present an
>    alternative without assuming the estimate is correct.
> 3. Scope count vs appetite is an **indicator**, not a gate. 4 well-defined
>    Lean scopes is not a violation.
> 4. Prefer quality solutions over "cheap" ones. The model should not
>    avoid complexity — it should manage it.

#### planning:10.5 — Codebase Feature Recon (brownfield only)

**Before generating scopes**, investigate existing features the new
scope must integrate with or might duplicate. Tool ladder first
(`cli-tools/code-map.md` — orient with ripwire on unfamiliar
code, then navigate). Appetite controls depth,
not whether recon runs — the floor is `cymbal search --text` (does it
exist?) at every appetite to prevent scope duplication.
- Lean: `cymbal search --text` — "does it exist?" (Quality Floor)
- Core: `search` + `cymbal refs` — where is it, who connects
- Complete: `search` + `refs` + `cymbal impact` — blast radius

```bash
# Detect brownfield
if [ ! -f "go.mod" ] && [ ! -f "package.json" ] && \
   [ ! -f "Cargo.toml" ] && [ ! -f "requirements.txt" ] && \
   [ ! -f "pyproject.toml" ] && [ ! -f "Gemfile" ]; then
  echo "Greenfield — skipping Codebase Feature Recon"
  exit 0
fi

# Read appetite from workflow config (canonical source via helper)
# shellcheck disable=SC1091
source "$(dirname "${BASH_SOURCE[0]:-$0}")/../../stelow-workflow-orchestrator/references/cli-tools/read-config.sh"
APPETITE=$(stelow_read_appetite)

# Read spec-product for IN scope concepts
SPEC_PRODUCT=$(ls .stelow/*/*/plans/spec-product*.md 2>/dev/null | head -1)

if [ -n "$SPEC_PRODUCT" ]; then
  # Extract key concepts from IN scope
  IN_SCOPES=$(grep -A30 '## IN scope' "$SPEC_PRODUCT" 2>/dev/null | head -30)
  
  # 1. Search each concept (RUNS ON ANY APPETITE)
  echo "$IN_SCOPES" | while read -r line; do
    [ -n "$line" ] && cymbal search --text "$line" 2>/dev/null | head -10 >> context/feature-locations.md
  done
  
  # 2. Search by workflow name (RUNS ON ANY APPETITE)
  cymbal search --text "$(grep -oP '"name":\s*"([^"]+)"' .stelow/*/*/index.json 2>/dev/null | head -1 | grep -oP '"[^"]+"$' | tr -d '"')" 2>/dev/null | head -20 >> context/feature-locations.md
  
  # 3. refs — CORE and COMPLETE only
  if [ "$APPETITE" = "Core" ] || [ "$APPETITE" = "Complete" ]; then
    for symbol in $(head -20 context/feature-locations.md | grep -oP '\b[A-Z][a-zA-Z]+\b' | sort -u | head -10); do
      cymbal refs "$symbol" 2>/dev/null >> context/feature-refs.md
    done
  fi
  
  # 4. impact — COMPLETE only
  if [ "$APPETITE" = "Complete" ]; then
    for module in $(cat context/feature-locations.md | grep -oP '^[^:]+?\.(go|ts|rs|py|js)' | sort -u | head -10); do
      cymbal impact "$module" 2>/dev/null >> context/feature-impact.md
    done
  fi
fi
```

**Output:** `context/feature-locations.md` (always), `context/feature-refs.md`
(Core+Complete), `context/feature-impact.md` (Complete).

**How the planner subagent uses it:** reads these files before generating scopes.
- "Module `pricing.go` already implements similar logic — reuse instead of recreating"
- "Feature `checkout` connects to `payment.go` and `inventory.go` — new scope must respect existing interfaces"
- "Business rule `max_items` in `cart.go` conflicts with scope 3 proposal"

Fallback: if cymbal is unavailable, skip silently.

#### planning:10.10 — Output Validation Guard

After the subagent writes spec-tech.md, validate every scope has required fields:

```bash
SPEC_TECH=".stelow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_{v}.md"
VALID=true

# Check each scope for required fields
for SCOPE_LINE in $(grep -n "^### " "$SPEC_TECH" | sed 's/:.*//'); do
  # Each scope must have TYPE, DoD, and AC
  tail -n +$SCOPE_LINE "$SPEC_TECH" | head -50 | grep -q "TYPE:" || {
    echo "VALIDATION_FAILED: scope at line $SCOPE_LINE missing TYPE"; VALID=false;
  }
  tail -n +$SCOPE_LINE "$SPEC_TECH" | head -50 | grep -q -E "(DoD|Definition of Done)" || {
    echo "VALIDATION_FAILED: scope at line $SCOPE_LINE missing DoD"; VALID=false;
  }
  tail -n +$SCOPE_LINE "$SPEC_TECH" | head -50 | grep -q -E "(AC|Acceptance Criteria)" || {
    echo "VALIDATION_FAILED: scope at line $SCOPE_LINE missing AC"; VALID=false;
  }
  # Tasks table is recommended (Shape Up hill chart collapse).
  # Not a hard requirement — empty table is allowed when the scope is
  # small enough that the DoD itself is the task list. WARN, not FAIL.
  if ! tail -n +$SCOPE_LINE "$SPEC_TECH" | head -80 | grep -q "^| # .* Task "; then
    echo "VALIDATION_WARN: scope at line $SCOPE_LINE has no Tasks table (Shape Up hill chart). Consider adding one for runtime tracking."
  fi
done

# Check for circular dependencies (>5 levels of nesting = probable error)
if grep -q "depends_on.*depends_on.*depends_on.*depends_on.*depends_on" "$SPEC_TECH" 2>/dev/null; then
  echo "VALIDATION_WARN: possible circular or deeply nested dependencies"
fi

if [ "$VALID" = false ]; then
  echo "Required scope fields missing. Regenerating with validation errors flagged..."
  # Feed validation errors back to planner and regenerate once
fi

# Check appetite violation: scope count vs appetite
APPETITE=$(grep -oP '^appetite:\s*\K\S+' .stelow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md 2>/dev/null || echo "Core")
SCOPE_COUNT=$(grep -c "^### " "$SPEC_TECH")

# Appetite boundary check: scope count should stay within appetite
# Lean ≤ 2, Core ≤ 5, Complete > 5
case "$APPETITE" in
  Lean) [ "$SCOPE_COUNT" -gt 2 ] && echo "APPETITE_VIOLATION: Lean appetite but $SCOPE_COUNT scopes. Consolidate or split into multiple cycles." ;;
  Core)  [ "$SCOPE_COUNT" -gt 5 ] && echo "APPETITE_VIOLATION: Core appetite but $SCOPE_COUNT scopes. Consider reducing scope." ;;
  Complete)  ;;  # Complete has no upper limit by scope count alone
esac
```

> **Rationale:** Scopes missing TYPE, DoD, or ACs will fail at Execution time.
> Catching this at planning time saves wasted executor cycles.

**⚠️ FALLBACK — if subagent fails or is unavailable:**
Generate spec-tech.md INLINE using the same process. Read the references files
(`tech-context.md`, `scopes-and-sequencing.md`, `tech-output.md`)
and read `stelow-workflow-coding-standards` for universal coding principles,
then produce the spec-tech artifact directly in the current context.

