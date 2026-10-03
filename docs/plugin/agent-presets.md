# Agent presets

A preset is a named provider/model reasoning/permission profile (plus
optional environment, base branch, machine, and instructions). Cards
remember their preset; the worker thread spawns with that profile.

```bash
bb stelow preset list
bb stelow preset add --name "Deep shape" --model gpt-5 --reasoning high
bb stelow preset add --name "Quick" --model gpt-5-mini --reasoning low --permission auto
bb stelow preset assign --card <card_id> --preset <preset_id>
```

## Behavior worth knowing

- **Bands per track.** Manage presets groups bands by track (Research,
  Explore, Build) instead of a flat list — changing one default never
  leaks into another. First-visit setup explains presets once per track.
- **Composer override.** The creation dialog's provider/model choice is
  authoritative for that spawn and is pinned as the card's preset
  override, so restarts keep running what was picked.
- **Pi provider.** The picker shows only the configured Bifrost routes —
  never Pi's unrelated route catalog.
- **Applying a changed preset.** Assign it, then click **Repair** — the
  worker thread is recreated with the new profile.
