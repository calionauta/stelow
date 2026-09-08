# Web research — layered evidence procedure

> One shared contract for every strategy that needs external evidence.
> Strategies reference this file instead of duplicating web instructions
> or naming signal sources individually.

## Layers (in order)

1. **Host-native web search first.** Use the harness's own search/fetch
   capability as the baseline for current facts.
2. **Primary sources + citations.** Cite evidence inline in the native
   strategy output (source + date). Prefer primary over secondary.
3. **Community/recency signal (`last30days`).** When current sentiment,
   recent launches, competitor moves, or last-30-day signals materially
   matter, invoke `last30days` as a complementary source — never the only
   source. Check availability with `npx skills list | grep -i last30days`
   (`npx skills find last30days` discovers it).
4. **Coverage record.** Record source coverage and limitations in the
   output. A missing or rate-limited connector is partial coverage —
   never proof of absence.
5. **No fabrication.** Do not invent findings when research tools are
   unavailable. Say what could not be verified.

## Install (optional, best-effort, confirmed)

```bash
# Source: https://github.com/mvanhorn/last30days-skill/tree/main/skills/last30days
npx skills add mvanhorn/last30days-skill@last30days   # global skills hub, only after user confirms
```

- No credentials required; run its doctor after install.
- Never fail the workflow or the stelow installation when it cannot
  install or sources are unavailable.
- Free/no-credential operation is partial coverage, not guaranteed
  complete coverage.
