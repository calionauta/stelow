# Web research — layered evidence procedure

> One shared contract for every strategy that needs external evidence.
> Strategies reference this file instead of duplicating web instructions
> or naming signal sources individually.

## Layers (in order)

1. **Host-native web search first.** Use the harness's own search/fetch
   capability as the baseline for current facts.
2. **Primary sources + citations.** Cite evidence inline in the native
   strategy output (source + date). Prefer primary over secondary.
3. **Fetch router (`agent-reach`).** When evidence lives on
   social/video/dev platforms (X, Reddit, YouTube, GitHub, Bilibili,
   Xiaohongshu, LinkedIn, RSS), route fetches through `agent-reach`
   instead of inventing per-platform commands — never the only source.
   Check availability with `npx skills list | grep -i agent-reach`
   (`agent-reach doctor --json` reports which backend serves each
   platform; follow its `active_backend`). Fetch only — synthesis stays
   in the strategy output.
4. **Community/recency signal (`last30days`).** When current sentiment,
   recent launches, competitor moves, or last-30-day signals materially
   matter, invoke `last30days` as a complementary source — never the only
   source. Check availability with `npx skills list | grep -i last30days`
   (`npx skills find last30days` discovers it).
5. **Coverage record.** Record source coverage and limitations in the
   output. A missing or rate-limited connector is partial coverage —
   never proof of absence.
6. **No fabrication.** Do not invent findings when research tools are
   unavailable. Say what could not be verified.

## Install (optional, best-effort, confirmed)

```bash
# Source: https://github.com/mvanhorn/last30days-skill/tree/main/skills/last30days
npx skills add mvanhorn/last30days-skill@last30days   # global skills hub, only after user confirms
```

```text
# Source: https://github.com/Panniantong/agent-reach
# Install is agent-guided (not a one-liner): paste this to your agent,
# only after the user confirms:
#   help me install Agent Reach: https://raw.githubusercontent.com/Panniantong/agent-reach/main/docs/install.md
```

- No credentials required for the zero-config channels; login-backed
  platforms need the user's own browser session or cookies — use a
  secondary account, never the primary.
- Never fail the workflow or the stelow installation when either cannot
  install or sources are unavailable.
- Free/no-credential operation is partial coverage, not guaranteed
  complete coverage.
