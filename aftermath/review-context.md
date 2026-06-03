## Review Changes Summary (for all reviewers)

### Files changed in this session:

| File | What changed | Type |
|------|-------------|------|
| `start.ts` | currentPhase: 0→2, phase init status, index 0→2 | Code |
| `commands.ts` | SKIP_NEXT map in cmdNext, added STAGE import | Code |
| `setup.md` | Removed setup:0.40, removed capabilities question/placeholders, added mode-dependent tables | Skill |
| `ask-patterns.md` | Removed capabilities from Pattern 7, cleaned Pattern 5 safe-change, added mode notes | Skill |
| `SKILL.md` | Added Auto-Advance rule section | Skill |
| `stage-status.md` | Fixed index table 14→15 phases | Reference |
| `references/README.md` | Created new reference index | Reference |
| `~/.agents/skills/cali-product-tech-planning/SKILL.md` | Added mode gate for tech plan approval | Skill |

Also updated: `~/.pi/agent/settings.json` — fixed extension from `-` to `+` prefix, kept `skills: []`.

### Refinement plan items addressed:
- 4c: /pw-next phase fix (CRITICAL) ✅
- 1: Remove External Context Pre-Load ✅
- 3: Remove Capabilities ✅
- 4a: Auto/Light skip stage selection ✅
- 4b: Safe-change auto by mode ✅
- 4d: Auto-advance rule ✅
- 9: Tech plan mode gate ✅
- 5: Path resolution fix ✅
- 6: References README ✅
- stage-status.md: Fixed index mismatch ✅
