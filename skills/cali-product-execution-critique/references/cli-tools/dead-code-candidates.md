# Dead Code Candidates via `sem graph --json`

`sem graph --json` dumps the full entity dependency graph (entities + edges).
Entities with **zero inbound edges** (no callers, no references) are candidates
for dead code — functions or methods no other entity invokes.

## How to use

```bash
# 1. Dump the graph
sem graph --json 2>/dev/null | python3 -c "
import sys, json

data = json.load(sys.stdin)
entities = data.get('entities', [])
edges = data.get('edges', [])

# Build set of all caller/referencer IDs
caller_ids = set()
for e in edges:
    # Each edge: [source_id, target_id, ...]
    if len(e) >= 2:
        caller_ids.add(e[0])

# Find entities with no inbound edges
# Filter to function/method kinds (not types, vars, consts)
orphans = [
    e for e in entities
    if e.get('id') not in caller_ids
    and e.get('kind') in ('function', 'method', 'func')
]

# Sort by file for easier review
orphans.sort(key=lambda e: (e.get('file',''), e.get('name','')))

print(f'Entities without callers ({len(orphans)} found):')
print(f'{\"-\"*60}')
for o in orphans:
    print(f\"  {o.get('name','?'):40s} {o.get('kind','?'):10s} {o.get('file','?')}\")
"
```

## Integration with execution critique

In criteria 2 (Implementation Quality), after running `sem diff`, also run the
dead code check. Flag any dead code candidates in the gap registry:

| Gap Type | Impact | Resolution |
|----------|--------|------------|
| dead-code | medium | Remove if confirmed unused; add TODO if intentional dead code for future use |

## Caveats

- **False positives**: entities called dynamically (reflection, interface dispatch,
  NATS handlers registered by name) won't appear in static call graph.
- **Entry points**: `main()`, init functions, HTTP handlers registered by framework
  may not be statically referenced in Go code. Check entry points separately.
- **Exported symbols**: public API surface functions may be dead from internal
  perspective but are part of the module contract. Verify before removing.

## Reliable confirmation

For a more precise dead code verdict, combine with runtime data or test coverage:

```bash
# Go: check if function appears in test coverage
go test -coverprofile=cover.out ./...
go tool cover -func=cover.out | grep TARGET_FUNC
```

```bash
# grep for any reference (including string-based)
grep -r "TARGET_FUNC" --include='*.go' .
```
