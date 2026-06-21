# Harness Config Detection — Alternatives & Plan

**Goal:** Let stelow know what model provider the user has, so `model_hint` in `stages.yaml` (economy/standard/best) can resolve to concrete models. Currently hints are purely informational.

## Context

- stelow added `model_hint: economy|standard|best` to every stage in `stages.yaml`
- The orchestrator SKILL.md documents: "Use economy for triage, best for shape"
- But without knowing the user's provider, these hints are abstract
- The LLM can still request a specific model IF the harness supports it (Pi does via subagent `model` param)

## Alternatives

### A — stelow.config.yaml (project-level file)

User creates `stelow.config.yaml` at project root:

```yaml
model_hints:
  economy: "haiku"         # or gpt-4o-mini, gemini-flash
  standard: "sonnet"       # or gpt-4o, gemini-pro
  best: "sonnet"           # or o3, gemini-ultra
```

| Pro | Con |
|---|---|
| Explicit, portable, version-controllable | Yet another config file |
| Works for all users regardless of setup | User must create it manually |
| No coupling to harness internals | Not auto-detected — user opt-in only |
| Can store other stelow config too | |

### B — Env var detection (auto-detect at setup)

At `setup:13`, check standard env vars:

```bash
[[ -n "$ANTHROPIC_API_KEY" ]] && PROVIDER="anthropic"
[[ -n "$OPENAI_API_KEY" ]] && PROVIDER="openai"
[[ -n "$GOOGLE_API_KEY" ]] && PROVIDER="google"
```

Map to defaults: anthropic → haiku/sonnet/opus, openai → gpt-4o-mini/gpt-4o/o3, etc.

| Pro | Con |
|---|---|
| Zero config for users with env vars | Most users config model in harness UI, not env vars |
| Automatic, no user action needed | Only detects provider, not model preference |
| | User might want different models than defaults |

### C — Ask the user (one question at setup)

During `setup:15` or dedicated `setup:13`:

```text
"Which AI provider do you use? (select one)"
  - Anthropic (Claude)
  - OpenAI (GPT)
  - Google (Gemini)
  - OpenRouter (multi-provider)
  - Other / Not sure
```

| Pro | Con |
|---|---|
| Works for everyone | One more question during setup |
| Simple, reliable | User might not know or care |
| No file parsing, no coupling | Not repeatable (forgotten next session) |

### D — Read harness config files

Read `~/.pi/agent/settings.json` (Pi), `~/.config/opencode/opencode.json` (OpenCode), etc.

| Pro | Con |
|---|---|
| Zero user effort | **Fragile** — paths vary by OS, install method, version |
| Most accurate source of truth | Different format per harness |
| | Permission issues (agent may not access home dir) |
| | Couples stelow to harness internals |

**Verdict:** Too fragile. Rejected.

### E — OpenRouter/proxy detection

Check for `OPENAI_BASE_URL` or similar proxy env vars.

| Pro | Con |
|---|---|
| Works with proxy users | Only proxy users (~10%) |
| | Doesn't solve direct API users |

### F — No detection (status quo)

`model_hint` remains purely informational. LLM reads "economy" and uses whatever model the harness has configured.

| Pro | Con |
|---|---|
| Zero effort, zero coupling | Misses cost savings |
| Simple to understand | Hints are abstract |

## Recommendation: C (ask) + A (config) + F (fallback)

Three-tier, first-match-wins:

```
1. stelow.config.yaml exists?         → Use its model mappings    (A)
2. No config but env vars found?      → Use provider defaults     (B)
3. Neither? Ask user at setup once    → Store in index.json       (C)
4. User says "not sure"?              → Hints are informational   (F)
```

### Implementation in setup.md

Add `setup:13` (after group context injection, before appetite declaration):

```markdown
### setup:13 — Provider Detection

Check for existing config in order:

1. **stelow.config.yaml** in project root:
   ```bash
   if [ -f "stelow.config.yaml" ]; then
     grep "economy:" stelow.config.yaml | cut -d: -f2 | xargs
     echo "PROVIDER_CONFIG_FOUND"
   fi
   ```

2. **Environment variables** (auto-detect):
   ```bash
   PROVIDERS=""
   [ -n "$ANTHROPIC_API_KEY" ] && PROVIDERS+="anthropic "
   [ -n "$OPENAI_API_KEY" ] && PROVIDERS+="openai "
   [ -n "$GOOGLE_API_KEY" ] && PROVIDERS+="google "
   [ -n "$OPENROUTER_API_KEY" ] && PROVIDERS+="openrouter "
   echo "DETECTED_PROVIDERS: $PROVIDERS"
   ```

3. **Ask user** (if neither config nor env vars):
   Use Pattern 9 (Provider Detection).
   Options: Anthropic, OpenAI, Google, OpenRouter, Not sure

4. **Store in index.json**:
   ```json
   "config": {
     "appetite": "...",
     "review_mode": "...",
     "detected_providers": ["anthropic"],
     "model_hints": {
       "economy": "claude-haiku-4-5",
       "standard": "claude-sonnet-4-6",
       "best": "claude-opus-4-6"
     }
   }
   ```

5. **Display** in session context:
   > Detected provider: anthropic | Model routing: economy→haiku, standard→sonnet, best→opus
```

### What this enables

Once provider is known, the orchestrator can output concrete model names:

```markdown
## Model Routing
| Hint | Resolves to | Stages |
|------|-------------|--------|
| economy | claude-haiku-4-5 | triage, select, scope, verification |
| standard | claude-sonnet-4-6 | setup, context, execution, audit |
| best | claude-opus-4-6 | shape, critique, interface, planning |
```

The LLM can then request `model: "claude-haiku-4-5"` when the harness supports per-call model selection (Pi subagent, LiteLLM, OpenRouter).

### Effort: Medium (4-6 hours)
### Risk: Low (all paths have fallback — status quo if nothing detected)
### Priority: P3 (lower than structured output, which is P2)
