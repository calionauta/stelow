# Cross-Model Review

Trigger an independent review of code or artifacts using a **different CLI agent** than the one running the workflow. This mitigates the "shallow review trap" where the same model that wrote the code also reviews it.

## Why

When a single model writes code and then reviews it, blind spots transfer. A different model — or even the same model in a fully isolated process — has a genuine chance of catching issues the original missed (Ox Security "Army of Juniors" 2025).

## When to Use

- After any implementation phase, before or during Verification
- When the project requires a quality gate that involves a second independent pass
- When you want to validate that an implementation matches the plan from a fresh perspective

## CLI Commands (Non-Interactive)

Each CLI supports piping a prompt and optionally files for cross-model review. Choose based on what's installed on the system:

### pi.dev

```bash
# One-shot prompt (prints response, exits)
pi -p "Review this code for correctness, security issues, and missing edge cases: $(cat diff.txt)"

# Using a prompt file
pi -f /tmp/review-prompt.md

# Pipe stdin
echo "Review the following diff for anti-patterns..." | pi -p
```

### OpenCode

```bash
# Execute with file input
opencode --file prompt.md --yes

# Pipe prompt
echo "Review this implementation against the plan..." | opencode --yes
```

### Claude Code

```bash
# One-shot with pipe
echo "Review this diff: $(git diff HEAD~1)" | claude -p "Review for correctness"

# Using heredoc
claude -p "$(cat <<'EOF'
Review the following code changes:
$(git diff HEAD~1)
Focus on: error handling, security, edge cases
EOF
)"
```

### Codex CLI

```bash
# One-shot
codex "Review the diff at diff.txt for logic errors"
```

## How to Wire Into the Workflow

### Option A: Manual invocation (recommended first step)

Add this step in Verification after running the test suite:

```typescript
subagent({
  tasks: [{
    agent: "reviewer",
    task: `Run cross-model review by invoking a different CLI:
\`\`\`bash
pi -p "Review this diff against the spec at spec-tech.md: $(git diff HEAD~1)"
\`\`\`
Save the review output and compare it to the in-session review.
Flag any NEW issues found by the external reviewer that were missed internally.`,
    output: false,
    context: "fresh"
  }]
})
```

### Option B: Automated via two-CLI pipeline

If both `pi` and another CLI (e.g., `opencode`) are available on the system:

```bash
# Export the current diff to a temp file
git diff HEAD~1 > /tmp/_cross_review_diff.txt

# Call the external CLI
opencode --file /tmp/_cross_review_prompt.md --yes

# Read back the output
cat /tmp/_cross_review_output.md
```

## Limitations

- **Requires a second CLI installed.** If only `pi.dev` is available, this technique can still call `pi -p` for a fresh context — but it's the same model. The value comes from the separate process, not a different model.
- **Not automatic.** The workflow does not detect which CLIs are available. Cross-model review is opt-in.
- **Output may vary.** Different CLIs format output differently. The in-session agent must interpret the result.
- **Authentication.** Some CLIs may need session tokens when run non-interactively.
