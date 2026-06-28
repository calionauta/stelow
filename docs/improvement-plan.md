# Stelow Improvement Plan

> Generated: 2026-06-21
> Source: Comprehensive investigation of token optimization, dependency management, UX clarity, and workflow efficiency opportunities.

---

## Priority Matrix

| Priority | Item | ROI | Effort | Dependencies |
|----------|------|-----|--------|--------------|
| P0 | Cache boundary reorganization | ⭐⭐⭐⭐⭐ | ✅ Done | Stable prefix + boundary marker in SKILL.md |
| P0 | External dependency auto-install | ⭐⭐⭐⭐⭐ | ✅ Done | Single script with confirmations |
| P1 | Model routing hints in stages.yaml | ⭐⭐⭐⭐ | ✅ Done | economy/standard/best per stage |
| P1 | Inbox grouping | ⭐⭐⭐⭐ | ✅ Done | Triage, Selection, Setup, SKILL.md |
| P2 | Review Mode rename | ⭐⭐⭐ | ✅ Done | All skills, docs, stages, tests |
| P2 | Structured output schemas per stage | ⭐⭐⭐ | 🔲 Not started | Lower priority |
| P2 | context-mode removal | ⭐⭐⭐ | ✅ Done | 24 files deleted, 8 files patched |
| P2 | context-efficiency.md | ⭐⭐ | ✅ Done | Tool-agnostic token strategies reference |
| P3 | Batch patterns | ⭐⭐ | ✅ Done | Documented in context-efficiency.md |
| P3 | Harness config detection | ⭐⭐ | 🔲 Not started | Needs stelow.config.yaml design |

---

## P0: Cache Boundary Reorganization

### Problem

The `SKILL.md` file interleaves stable content (tool definitions, safety rules, immutable rules) with stage-specific content (stage index, flow diagram). Each time the LLM reads the SKILL.md within a session, the entire content is re-processed because changes in the variable suffix break the cache prefix.

### Research Evidence (2026)

- Prompt caching saves **50-90%** on input cost per cache hit (Anthropic: 10% cost on hit vs 100% on miss)
- Break-even: **1.4-2 cache hits** per cached prefix per TTL window
- Agent workloads with stable system prompts: **89.3% cost reduction** documented in real deployments
- Key failure mode: "cache busting" — any change to the byte-identical prefix invalidates the entire cache
- "Cache-Aware Skill Design" pattern (Taylor Ortiz, 2026): skills must be structured with stable prefix first, variable content last

### Implementation

#### Step 1: Identify stable vs variable content

| Content | Stability | Belongs in |
|---------|-----------|------------|
| `name`, `description` in frontmatter | Always stable | Cached prefix |
| Safety rules (#1-7) | Always stable | Cached prefix |
| Tool reference table (subagent, plannotator, etc.) | Always stable | Cached prefix |
| Directory structure | Always stable | Cached prefix |
| Strategic approaches table | Always stable | Cached prefix |
| Domain libraries table | Always stable | Cached prefix |
| Context Rot Awareness section | Always stable | Cached prefix |
| Environment Adaptation section | Always stable | Cached prefix |
| Cross-CLI Notes | Always stable | Cached prefix |
| Stage Index (`## Stage Index` onward) | **VARIABLE** (read once, changes per stage) | After cache boundary |
| Flow diagram | **VARIABLE** | After cache boundary |
| Auto-chaining rules | **VARIABLE** | After cache boundary |

#### Step 2: Add cache boundary marker

```markdown
<!-- ═══ CACHE BOUNDARY ═══ -->
<!-- Everything above is a stable prefix cached by the provider. -->
<!-- Everything below is read fresh per turn or per stage. -->
<!-- Do NOT insert dynamic content (dates, stage names, user context) above this line. -->
```

#### Step 3: Reorganize SKILL.md

Move Stage Index, Flow Diagram, Auto-chaining rules to AFTER the boundary. Move safety rules, tool references, tables BEFORE the boundary.

#### Step 4: Apply same pattern to sub-skills

Each `cali-product-*/SKILL.md` should also have:
1. Stable prefix (tool defs, immutable rules)
2. Cache boundary marker
3. Variable content (stage instructions, conditional logic)

#### Expected Savings

| Metric | Before | After |
|--------|--------|-------|
| SKILL.md reads per session | ~25 (one per turn) | ~25 |
| Cached prefix size | ~0 (no cache structure) | ~6-8K tokens |
| Cache hit rate | ~5% (accidental) | ~70-85% |
| Cost per read (Anthropic) | 100% of prefix | 10% of prefix after 1st hit |
| **Input token cost for SKILL.md** | **100% baseline** | **~25-35% of baseline** |

### Files to Modify

- `skills/stelow/SKILL.md` — reorganize + add boundary
- `skills/cali-product-*/SKILL.md` — apply same pattern
- `docs/improvement-plan.md` (this file) — track completion

---

## P0: External Dependency Auto-Install

### Problem

Three tools provide significant value but are not auto-installed:
- **cymbal**: Codebase recon (symbol search, impact analysis, refs) — transforms Tech Preview from basic `find` to full code navigation
- **ctx7**: Current library docs during execution setup — prevents hallucinated APIs
- **npx skills**: Stack-matched skill discovery — already available via npx (no install needed)

Users often don't know these tools exist or what they'd gain. The workflow falls back gracefully without them, but the experience is degraded.

### Research Findings

**cymbal:**
- Install: `brew install 1broseidon/tap/cymbal` (macOS), `go install` (Linux), or binary download
- Size: ~30MB, no runtime dependencies
- Self-indexes on first use (no manual `cymbal index .`)
- Agent hooks available: `cymbal hook install opencode|claude-code` (injects reminder into session start)
- `pi-cymbal` extension available for deeper Pi integration

**npx skills:**
- Already bundled with Node.js (required by stelow)
- Zero additional install cost
- `npx skills add renatocaliari/stelow -g` installs skills to `~/.agents/skills/`

**ctx7:**
- Use: `npx @vedanth/context7` (auto-install via npx, requires Node.js)
- Requires OAuth authentication (interactive web flow)
- Cannot be fully automated in a script

### Proposal: `setup-full.sh`

Create a new script that wraps `install.sh` and adds auto-detection + installation of external tools:

```bash
# scripts/setup-full.sh
# - Runs install.sh (skills + Pi extension)
# - Detects and installs cymbal (brew/go)
# - Recommends ctx7 setup (OAuth required)
# - All steps optional, skip with --minimal or env var
```

#### Step 1: Detect existing tools

```bash
check_dep() {
  if command -v "$1" &>/dev/null; then
    echo "✅ $1 found"
    return 0
  else
    echo "❌ $1 not found"
    return 1
  fi
}

check_dep cymbal
check_dep ctx7
# npx skills is auto-detected via `npx --help`
```

#### Step 2: Offer installation per tool

```bash
install_cymbal() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v brew &>/dev/null; then
      brew install 1broseidon/tap/cymbal
    else
      echo "Homebrew not found. Install cymbal manually:"
      echo "  brew install 1broseidon/tap/cymbal"
      echo "  OR: go install github.com/1broseidon/cymbal@latest"
    fi
  elif command -v go &>/dev/null; then
    CGO_CFLAGS="-DSQLITE_ENABLE_FTS5" go install github.com/1broseidon/cymbal@latest
  else
    echo "Install cymbal manually from: https://github.com/1broseidon/cymbal"
  fi
}

install_ctx7() {
  echo "ctx7 requires OAuth setup. Run manually:"
  echo "  npx @vedanth/context7 setup"
  echo "This opens a browser for authentication."
}
```

#### Step 3: Install cymbal agent hooks

```bash
if command -v cymbal &>/dev/null; then
  cymbal hook install opencode 2>/dev/null || true
  cymbal hook install claude-code 2>/dev/null || true
fi
```

#### Step 4: Modify `install.sh` to call `setup-full.sh` with `--auto-deps` flag

```bash
# install.sh
case "$cmd" in
  install|i) install_full "$@" ;;
  minimal|--minimal) install_minimal "$@" ;;
  *) legacy behavior ;;
esac
```

Where `install_full` calls `install_minimal` then `scripts/setup-deps.sh`.

### Risk Analysis

| Risk | Mitigation |
|------|------------|
| `brew install` fails (no brew) | Fallback to `go install` or binary download |
| cymbal requires CGO on Linux | Detect `go` + `gcc`; if missing, offer binary release |
| ctx7 OAuth blocks automation | Skip auto-install, document `npx @vedanth/context7 setup` as post-install step |
| User doesn't want auto-deps | `setup-full.sh --minimal` skips all external installs |
| Network issues during install | Each step is independent with retry + skip |

### Expected Impact

| Tool | Before (% of users who have it) | After | Gain |
|------|-------------------------------|-------|------|
| cymbal | ~10% (brew users, go devs) | ~70% (auto-installed) | Tech Preview goes from `find`/`grep` to full impact analysis |
| ctx7 | ~5% (discovered independently) | ~30% (recommended, not forced) | Execution has current docs instead of hallucinated APIs |
| npx skills | ~100% (npx is Node.js) | ~100% | Already covered |

### Files to Create/Modify

- `scripts/setup-full.sh` — new file, auto-dependency installer
- `scripts/setup-deps.sh` — new file, dependency detection + install
- `install.sh` — add `--auto-deps` flag
- `docs/INSTALLATION.md` — add Path D (Full Setup with auto-deps)
- `README.md` — update installation section

---

## P1: Model Routing Hints in stages.yaml

### Problem

All stages use whatever model the user has configured as their default. Simple stages (triage, selection, verification) waste frontier model capacity. Complex stages (shape, critique, planning) get the same compute as trivial ones.

### Research Evidence (2026)

- ARK (agent runtime, 2026): tool calls → cheap models, reasoning → expensive — **40-60% cost reduction**
- Tian Pan "Token Economics" (2026): 60% of agent tasks run fine on sub-$1/M models, 25% on mid-tier, 15% on frontier
- Market consensus: LiteLLM, OpenRouter, Fabric Harness all support `provider/model-id` routing
- Hint-based routing (not enforcement) is the established pattern

### Implementation

#### Step 1: Add `model_hint` to `stages.yaml`

```yaml
stages:
  - name: triage
    model_hint: economy
    ...
  - name: select
    model_hint: economy
    ...
  - name: setup
    model_hint: standard
    ...
  - name: shape
    model_hint: best
    ...
  - name: critique
    model_hint: best
    ...
  - name: planning
    model_hint: best
    ...
  - name: execution
    model_hint: standard
    ...
  - name: verification
    model_hint: economy
    ...
  - name: audit
    model_hint: standard
```

#### Step 2: Add `model_config` section to `stages.yaml` or create `stelow.config.yaml`

```yaml
# stelow.config.yaml (optional, project-specific)
model_hints:
  economy: "haiku"         # or "gpt-4o-mini" or "gemini-flash"
  standard: "sonnet"       # or "gpt-4o" or "gemini-pro"
  best: "opus"             # or "o3" or "gemini-ultra"
```

#### Step 3: Orchestrator resolves hints at runtime

The orchestrator SKILL.md should include:

```markdown
## Model Routing

Each stage has a `model_hint` in `stages.yaml`:
- **economy**: triage, select, scope, verification — cheap model
- **standard**: setup, context, execution, audit — mid-tier
- **best**: shape, critique, interface, planning — frontier

If your harness supports per-stage model selection (e.g., via `model` parameter on tools or subagent), use the hint to select the appropriate model. If not, the hint is informational.
```

#### Step 4: Make hints resolvable

Look for `stelow.config.yaml` in the project root. If it exists, use its model mappings. If not, use built-in defaults. Never override the harness's configured model.

### Harness Compatibility

| Harness | Can use hints? | Mechanism |
|---------|---------------|-----------|
| Pi | ✅ Yes | `ask_user_question` with `model` param |
| OpenCode | ⚠️ Partially | Via plugin or `opencode.json` config |
| Claude Code | ⚠️ Partially | Via plugin or `CLAUDE.md` config |
| LiteLLM | ✅ Yes | Via `model_list` + `router_settings` |
| OpenRouter | ✅ Yes | Via `models` array with fallbacks |
| Generic | ❌ No | Hints are informational only |

### Expected Impact

| Stage Group | Current Cost | With Routing | Savings |
|-------------|-------------|--------------|---------|
| Economy stages (40% of turns) | 100% frontier | ~15% of frontier | ~85% on these turns |
| Standard stages (35% of turns) | 100% frontier | ~60% of frontier | ~40% on these turns |
| Best stages (25% of turns) | 100% frontier | 100% frontier | 0% |
| **Overall** | **100%** | **~67%** | **~33%** |

### Files to Modify

- `skills/stelow/stages.yaml` — add `model_hint` to each stage
- `skills/stelow/SKILL.md` — add Model Routing section
- `skills/stelow/references/cli-tools/model-routing.md` — new reference file

---

## P1: Inbox Grouping ✅ Done

Implemented in previous work cycle.

### Files Modified

- `skills/stelow/stages/triage.md` — group as first-class outcome with manifest files
- `skills/stelow/stages/selection.md` — groups + individuals as candidate pool
- `skills/stelow/stages/setup.md` — `setup:12` group context injection
- `skills/stelow/SKILL.md` — stage descriptions + flow diagram

---

## P2: Autonomy Level Rename

### Problem

"Mode" is too generic. The name doesn't communicate what it controls (human involvement level). Current values mix intensity descriptors ("Light", "Moderate") with feature descriptors ("Full Product", "Full Product + Tech").

### Naming Proposal

| Current Name | Proposed Name | Rationale |
|---|---|---|
| Mode | **Autonomy Level** | Communicates "how much the LLM decides vs human decides" |
| Auto | **Autonomous** | Clear: zero human intervention needed |
| Light | **Light Review** | 1 gate product review, no choices |
| Moderate | **Guided Review** | 1 gate + user chooses interface |
| Full Product | **Product Review** | All product gates, but execution is autonomous |
| Full Product + Tech | **Product & Tech Review** | Product Review + tech plan gate + tech questions |

### Evaluation of "Product & Tech Review" vs "Full Oversight"

| Aspect | "Product & Tech Review" | "Full Oversight" |
|--------|------------------------|------------------|
| Clarity | ✅ Explicit: "this reviews product AND tech" | ⚠️ "Oversight" is abstract, could mean anything |
| Contrast with "Product Review" | ✅ Clear progression: Product → Product & Tech | ⚠️ Weak contrast: doesn't say WHAT is overseen |
| Length | Moderately long (4 words) | Short (2 words) |
| Memorability | Clear but verbose | Short but vague |
| New user understanding | "I get it — this level adds tech to the product review" | "What does 'oversight' cover exactly?" |

**Recommendation: "Product & Tech Review"** — explicit, self-documenting, and contrasts clearly with "Product Review".

### Revised Hierarchy

| Level | Name | Description | Gates |
|---|---|---|---|
| 0 | **Autonomous** | Zero human intervention. AI resolves all. | None |
| 1 | **Light Review** | One Plannotator gate on product spec. AI makes all decisions. | 1 (pre-tech) |
| 2 | **Guided Review** | One gate + user chooses interface from alternatives. | 1 + ask |
| 3 | **Product Review** | All product gates active. User confirms IN/OUT. Execution runs autonomously. | 2 (gate + int-gate) |
| 4 | **Product & Tech Review** | Product Review + tech plan goes through Plannotator + tech questions. | 2 + tech gate |

### Migration Plan

1. Update `README.md` — rename section, update table, update all references
2. Update `skills/stelow/SKILL.md` — rename in stage index, flow diagram
3. Update `skills/stelow/stages/setup.md` — rename in Pattern 8, validation, storage
4. Update `skills/stelow/stages/gate.md` — rename in gate matrix
5. Update `skills/stelow/stages/context.md` — rename in gate matrix
6. Update `skills/stelow/stages/ask-patterns.md` — rename in Pattern 8
7. Update `skills/stelow/stages/execution.md` — rename references
8. Update `skills/stelow/stages/verification.md` — rename references
9. Update `extensions/stelow/types.ts` — update PHASE_NAMES if needed
10. Update `docs/INSTALLATION.md` — rename references
11. Update `docs/agents-md-refs/*.md` — rename references
13. Update `tests/` — update test fixtures and assertions

**Backward compatibility:** The `index.json` field `"mode"` should continue to be accepted for at least one version, with a deprecation log. This prevents breaking in-progress workflows on upgrade.

### Files to Modify

~30 files across skills, extension, tests, and docs.

---

## P2: Structured Output Schemas

### Problem

Stages output unstructured markdown that is re-parsed by subsequent stages. This wastes tokens on formatting and introduces ambiguity.

### Implementation

Add optional `output_schema` to `stages.yaml`:

```yaml
- name: audit
  output_schema:
    type: object
    properties:
      gaps:
        type: array
        items:
          type: object
          properties:
            type: { enum: ["FIXED", "DOCUMENTED", "ESCALATED"] }
            description: { type: string }
```

When the harness supports JSON mode (Pi does, OpenCode/Claude Code via providers do), the LLM outputs structured JSON instead of prose. This saves 200-500 tokens per output.

### Expected Impact

| Stage | Current Output | With JSON Mode | Tokens Saved |
|-------|---------------|----------------|--------------|
| Triage | ~5 items as prose | JSON array | ~100-200 |
| Selection | 3 ranked items | JSON with scores | ~100-200 |
| Critique | 5-paragraph critique | JSON with severity fields | ~300-500 |
| Audit | Gap classification | JSON with structured gaps | ~200-400 |
| Verification | Narrative report | JSON with pass/fail matrix | ~300-500 |

### Files to Modify

- `skills/stelow/stages.yaml` — add `output_schema` to eligible stages
- `skills/stelow/references/cli-tools/structured-output.md` — new reference file

---

---

## P3: Batch Patterns Per Tool

### Problem

No documented pattern for batch tool calls. Each tool call inflates context with tool definition overhead + tool result overhead.

### Research Findings

- MCP Tax (arXiv 2604.21816): tool schemas cost 10-60K tokens per turn
- PASTE (arXiv 2603.18897): speculative parallel execution saves latency but requires infra
- `cymbal show X Y Z` already supports batch natively (multi-symbol)
- `agent_browser` already supports batch via `snapshot -i` + re-snapshot
- Subagents already support batch via `parallel` array

### Implementation

**Do NOT create `batch.md`.** Instead, document batch patterns per tool:

```markdown
# In cymbal.md:
## Batching
Use multi-symbol syntax instead of sequential calls:
  - Good: cymbal show AuthHandler LoginHandler UserHandler
  - Bad:  cymbal show AuthHandler → then → cymbal show LoginHandler
  - Savings: ~60% (one tool call vs three)

# In agent_browser.md:
## Batching
Use snapshot with multiple get_refs:
  - batch: [["get","text","@e1"],["get","text","@e2"],["get","text","@e3"]]
  - This is a single tool call with 3 extractions

# In subagents.md:
## Batching
Use parallel array for concurrent agents:
  - parallel: [{agent: "a", task: "x"}, {agent: "b", task: "y"}]
  - All agents run concurrently, results merge
```

### Expected Impact

| Tool | Without Batching | With Batching | Tokens Saved |
|------|-----------------|---------------|--------------|
| cymbal (3 lookups) | 3 tool calls + 3 tool defs | 1 tool call | ~40-60% |
| cymbal (5 lookups) | 5 tool calls | 1-2 tool calls | ~50-70% |
| agent_browser (3 gets) | 3 tool calls | 1 batch | ~50% |
| read (3 files) | 3 tool calls | Plan: `read X Y Z` | ~40% |

### Files to Modify

- `skills/stelow/references/cli-tools/cymbal.md` — add batching section
- `skills/stelow/references/cli-tools/agent-browser.md` — add batching section
- `skills/stelow/references/cli-tools/subagents.md` — document parallel patterns already exist
- All sub-skill copies of these files

---

## P3: Harness Config Detection at Setup

### Problem

The setup stage doesn't know what provider/model the user has configured. Model routing hints (P1) can't be resolved without this information.

### Research Findings

Universal pattern across all harnesses (2026):

| Setting | Where it lives | How to read |
|---------|---------------|-------------|
| Provider API key | Environment variable | `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY` |
| Default model | Harness config file | Pi: `settings.json`, OpenCode: `opencode.json`, Claude: `settings.json` |
| Available models | Harness config + env | Check env vars for configured providers |

### Implementation

Add a detection step at `setup:13` (between group context injection and appetite declaration):

```bash
# Detect available providers from environment
detect_providers() {
  local providers=""
  [[ -n "${ANTHROPIC_API_KEY:-}" ]] && providers+="anthropic "
  [[ -n "${OPENAI_API_KEY:-}" ]] && providers+="openai "
  [[ -n "${GOOGLE_API_KEY:-}" ]] && providers+="google "
  [[ -n "${OPENROUTER_API_KEY:-}" ]] && providers+="openrouter "
  echo "${providers:-unknown}"
}
```

Store detected providers in `index.json`:

```json
{
  "config": {
    "appetite": "...",
    "autonomy_level": "...",
    "detected_providers": ["anthropic"],
    "detected_models": {
      "economy": "claude-haiku-4-5",
      "standard": "claude-sonnet-4-6",
      "best": "claude-opus-4-6"
    }
  }
}
```

This does NOT change anything — it only logs what's available. Future stages can reference it for informational purposes.

### Files to Modify

- `skills/stelow/stages/setup.md` — add `setup:13` provider detection
- `skills/stelow/SKILL.md` — document the detection

---

## Summary of Expected Token Savings

| Initiative | Savings | Type |
|------------|---------|------|
| Cache boundary (SKILL.md) | ~65-75% on SKILL.md input cost | Cost |
| Model routing hints | ~33% on total LLM cost | Cost |
| Structured output | ~200-500 tokens per stage output | Cost |
| Batch patterns | ~40-60% on multi-tool calls | Cost + Latency |
| **Combined (conservative)** | **~60-70% total token reduction** | **Cost + Context** |

---

## File Change Index

| File | P0 | P1 | P2 | P3 | Action |
|------|----|----|----|----|--------|
| `skills/stelow/SKILL.md` | ✅ | ✅ | ✅ | — | Reorganize + add cache boundary + model routing section |
| `skills/stelow/stages.yaml` | — | ✅ | ✅ | — | Add model_hint + output_schema |
| `skills/stelow/stages/setup.md` | — | — | ✅ | ✅ | Add setup:13 provider detection |
| `skills/stelow/stages/gate.md` | — | — | ✅ | — | Rename Mode → Autonomy Level |
| `skills/stelow/stages/context.md` | — | — | ✅ | — | Rename Mode → Autonomy Level |
| `skills/stelow/stages/ask-patterns.md` | — | — | ✅ | — | Rename Mode → Autonomy Level |
| `skills/stelow/stages/execution.md` | — | — | ✅ | — | Rename Mode references |
| `skills/cali-product-*/SKILL.md` | ✅ | — | — | — | Add cache boundary |
| `scripts/setup-full.sh` | ✅ | — | — | — | NEW FILE: auto-dependency installer |
| `scripts/setup-deps.sh` | ✅ | — | — | — | NEW FILE: dep detection + install |
| `install.sh` | ✅ | — | — | — | Add --auto-deps flag |
| `README.md` | ✅ | — | ✅ | — | Update install section + rename |
| `docs/INSTALLATION.md` | ✅ | — | ✅ | — | Add Path D + rename |
| `docs/agents-md-refs/*.md` | — | — | ✅ | — | Rename references |
| `extensions/stelow/types.ts` | — | — | ✅ | — | Rename if needed |
| `tests/` | — | — | ✅ | — | Update test fixtures |
| `skills/stelow/references/cli-tools/model-routing.md` | — | ✅ | — | — | NEW FILE |
| `skills/stelow/references/cli-tools/cymbal.md` | — | — | — | ✅ | Add batch patterns |
| `skills/stelow/references/cli-tools/agent-browser.md` | — | — | — | ✅ | Add batch patterns |

