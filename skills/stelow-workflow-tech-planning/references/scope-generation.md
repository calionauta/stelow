### planning:10 — Scope Generation

Use the references above to generate technical scopes.

Delegate to a planner subagent (see `cli-tools/subagents.md`):
- Agent: `planner` (if the harness's packaged planner defaults to fork, pass fresh explicitly — see `cli-tools/subagents.md`)
- Task: generate typed scopes (feature/optimization/spike) from the approved spec-product.md
- Follow steps: strategic stability check → codebase awareness → risk analysis → spike identification → scope definition → sequencing → DoD + ACs → formatting
- Output: `.stelow/{YYYY-MM-DD}/{_dir}/plans/spec-tech_{v}.md`
- Inputs (all via `reads:`):
  - `.stelow/{YYYY-MM-DD}/{_dir}/plans/spec-product_{v}.md` (canonical product spec)
  - `.stelow/{YYYY-MM-DD}/{_dir}/interfaces/selected-interface.md` (user's chosen interaction direction from int-gate — exists by this stage; absent only if interface stage was skipped via Review Mode)
  - `.stelow/{YYYY-MM-DD}/{_dir}/architecture/selected-architecture.md` (chosen construction direction from the architecture stage — exists by this stage; absent only for legacy states predating the stage)
  - context/tech-recon.md (tech constraints from shape:12)
- `context: "fresh"` — planner must NOT inherit orchestrator's deliberation

> **⚡ Estimation Bias Correction:** The planner subagent may tend to generate
> conservative scopes or suggest cuts by overestimating complexity
> (bias from human training data). Rules:
> 1. Do not cut scope out of fear of complexity — distrust your own bias.
> 2. If a feature seems "too complex", justify why and present an
>    alternative without assuming the estimate is correct.
> 3. Scope count vs the ceiling of 9 is an **indicator**, not a gate. 6 well-defined
>    scopes is not a violation.
> 4. Prefer quality solutions over "cheap" ones. The model should not
>    avoid complexity — it should manage it.

#### planning:10.5 — Codebase Feature Recon (brownfield only)

**Before generating scopes**, investigate existing features the new
scope must integrate with or might duplicate. Reuse-first: run
`ripwire --for "<scope outcome>" --json` and
`ripwire --exemplar "<domain concept>"` (or `--lego <Interface>` for a
known interface) to find the block to imitate before searching.
Cap planner context with `sem context --budget 8000 --headers --json`
and surface hotspots plus co-changes with `sem log --json`.
Tool ladder next (`cli-tools/code-map.md` — orient with ripwire on
unfamiliar code, then navigate). Exploration breadth controls depth,
not whether recon runs — the floor is `cymbal search --text` (does it
exist?) at every breadth to prevent scope duplication.
- Breadth 1–2: `cymbal search --text` — "does it exist?" (Quality Floor)
- Breadth 3: `search` + `cymbal refs` — where is it, who connects
- Breadth 4–5: `search` + `refs` + `cymbal impact` — blast radius

Start from the target repository root and run the canonical preflight. It
creates a receipt that must be cited by `spec-tech.md`; optional tools are
never installed from a workflow.

```bash
bash <skill-dir>/../../stelow-workflow-orchestrator/references/cli-tools/recon.sh feature-recon
```

```bash
# Detect brownfield
if [ ! -f "go.mod" ] && [ ! -f "package.json" ] && \
   [ ! -f "Cargo.toml" ] && [ ! -f "requirements.txt" ] && \
   [ ! -f "pyproject.toml" ] && [ ! -f "Gemfile" ]; then
  echo "Greenfield — skipping Codebase Feature Recon"
  exit 0
fi

# Read exploration breadth from workflow config (canonical source via helper)
# shellcheck disable=SC1091
source "$(dirname "${BASH_SOURCE[0]:-$0}")/../../stelow-workflow-orchestrator/references/cli-tools/read-config.sh"
EXPLORATION_COUNT=$(stelow_read_exploration_count)

# Read spec-product for IN scope concepts
SPEC_PRODUCT=$(ls .stelow/*/*/plans/spec-product*.md 2>/dev/null | head -1)

if [ -n "$SPEC_PRODUCT" ]; then
  # Extract key concepts from IN scope
  IN_SCOPES=$(grep -A30 '## IN scope' "$SPEC_PRODUCT" 2>/dev/null | head -30)
  
  # 1. Search each concept (RUNS AT ANY BREADTH)
  # Extract 1-3 word noun-phrase concepts first: whole spec lines dilute the query
  echo "$IN_SCOPES" | while read -r line; do
    [ -n "$line" ] && cymbal search --text "$line" --json 2>/dev/null | head -20 >> context/feature-locations.md
  done
  # For known symbols prefer exact search: cymbal search "<SymbolName>" --json
  
  # 2. Search by workflow name (RUNS AT ANY BREADTH)
  cymbal search --text "$(grep -oP '"name":\s*"([^"]+)"' .stelow/*/*/index.json 2>/dev/null | head -1 | grep -oP '"[^"]+"$' | tr -d '"')" 2>/dev/null | head -20 >> context/feature-locations.md
  
  # 3. refs — breadth 3 and above only
  if [ "$EXPLORATION_COUNT" -ge 3 ] 2>/dev/null; then
    for symbol in $(head -20 context/feature-locations.md | grep -oP '\b[A-Z][a-zA-Z]+\b' | sort -u | head -10); do
      cymbal refs "$symbol" 2>/dev/null >> context/feature-refs.md
    done
  fi
  
  # 4. impact — breadth 4-5 only (files -> importers; symbols only -> impact)
  if [ "$EXPLORATION_COUNT" -ge 4 ] 2>/dev/null; then
    for f in $(cat context/feature-locations.md | grep -oP '^[^:]+?\.(go|ts|rs|py|js)' | sort -u | head -10); do
      cymbal importers "$f" --json 2>/dev/null >> context/feature-impact.md
    done
    # for known symbols: cymbal impact "<SymbolName>" --json
  fi
fi
```

**Output:** `context/feature-locations.md` (always), `context/feature-refs.md`
(Core+Complete), `context/feature-impact.md` (Complete).

**How the planner subagent uses it:** reads these files before generating scopes.
- "Module `pricing.go` already implements similar logic — reuse instead of recreating"
- "Feature `checkout` connects to `payment.go` and `inventory.go` — new scope must respect existing interfaces"
- "Business rule `max_items` in `cart.go` conflicts with scope 3 proposal"

Fallback: if cymbal is unavailable, use `find` + `git log` + `grep` to record
candidate locations in `context/feature-locations.md`, and put
`TOOL_MISSING:cymbal` plus the path to `context/recon-receipt.json` in
`spec-tech.md`. Do not skip recon silently.

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

# Check sequencing with real lane computation (cycles + landing order).
# --brief takes ONE LINE PER LANE: build it from the scope headings.
grep "^### " "$SPEC_TECH" | sed 's/^### //' > /tmp/stelow-lanes.txt
ripwire --plan-lanes --brief=/tmp/stelow-lanes.txt 2>/dev/null || \
  echo "VALIDATION_WARN: ripwire absent — falling back to manual dependency review"

if [ "$VALID" = false ]; then
  echo "Required scope fields missing. Regenerating with validation errors flagged..."
  # Feed validation errors back to planner and regenerate once
fi

# Check ceiling violation: scope count vs the single ceiling of 9
SCOPE_COUNT=$(grep -c "^### " "$SPEC_TECH")

# P-1 fail-observed guard: AC-sem-teste=reject. Each scope contract must map
# every AC to a test in test_map; an unmapped AC rejects the scope.
for CONTRACT in .stelow/{YYYY-MM-DD}/{_dir}/scopes/scope-*.json; do
  [ -f "$CONTRACT" ] || continue
  python3 - "$CONTRACT" <<'EOF' || VALID=false
import json, sys
c = json.load(open(sys.argv[1]))
criteria = c.get("acceptance_criteria", [])
mapped = {a for tests in (c.get("test_map") or {}).values() for a in tests}
unmapped = [a for a in criteria if a not in mapped]
if unmapped:
    print(f"AC-sem-teste REJECT: {sys.argv[1]} — {len(unmapped)} unmapped AC(s)")
    sys.exit(1)
EOF
done

# Ceiling check: scope count stays at or under 9 (discovered, never a target)
if [ "$SCOPE_COUNT" -gt 9 ]; then
  echo "CEILING_VIOLATION: $SCOPE_COUNT scopes exceed the ceiling of 9. Consolidate or split into multiple cycles."
fi
```

> **Rationale:** Scopes missing TYPE, DoD, or ACs will fail at Execution time.
> Catching this at planning time saves wasted executor cycles.

**⚠️ FALLBACK — if subagent fails or is unavailable:**
Generate spec-tech.md INLINE using the same process. Read the references files
(`tech-context.md`, `scopes-and-sequencing.md`, `tech-output.md`)
and read `stelow-workflow-coding-standards` for universal coding principles,
then produce the spec-tech artifact directly in the current context.
