# Implementation Plan: Tracking Gaps, To-Do Integration, Footer Removal

## Context

Based on deep investigation of the cali-product-workflow codebase, the following issues were identified:

### Gap 1: Phase Transitions via LLM (without command)
**Problem**: When LLM advances phase via skill conversation (not via `/pw-next`), `currentPhase` in tracking file is NOT updated.

### Gap 2: Index.json Desynchronized
**Problem**: `index.json` is written only in `cmdStart`. Never updated during workflow.

### Gap 3: Interrupted Sessions
**Problem**: If session dies mid-phase, in-memory `wf` state differs from tracking file.

### Gap 4: Footer Dependency
**Problem**: Footer uses Pi-only `ctx.ui` API. Not available in other CLIs.

### Gap 5: To-Do Tool Direct Calls in Skills
**Problem**: Skills may call `todo` tool directly instead of referencing `cli-tools/todo.md`.

---

## Implementation

### Phase 1: Create todo.md CLI tool reference
- [x] Created `references/cli-tools/todo.md` with phase task templates
- [x] Naming convention: `[PHASE-1]`, `[SHAPE-2]`, etc.
- [x] Status indicators: ✓ ◐ ○
- [x] CLI-specific commands for pi, claude-code, opencode, codex

### Phase 2: Fix index.ts turn_end handler
**File**: `extensions/cali-product-workflow/index.ts`

Add auto-sync logic to `turn_end` handler:
```typescript
// After checking phase change, sync wf in memory and write index.json
const tracking = readTracking(wd);
const current = tracking?.workflows.find(w => w.name === wf.name);
if (current && current.currentPhase !== wf.currentPhase) {
  // Phase was advanced by /pw-next - sync in-memory object
  wf.currentPhase = current.currentPhase;
  // Write index.json with updated phase
  writeIndexJson(wd, wf);
}
```

### Phase 3: Add writeIndexJson helper
**File**: `extensions/cali-product-workflow/state.ts`

Add function to update index.json on phase changes:
```typescript
export function writeIndexJson(wd: string, wf: Workflow): void {
  const ds = getDateStamp(new Date(wf.created));
  const idxPath = join(wd, WORKFLOW_DIR, ds, wf.dirHash!, "index.json");
  if (!existsSync(idxPath)) return;
  
  try {
    const raw = JSON.parse(readFileSync(idxPath, "utf-8"));
    raw.current_phase = PHASE_NAMES[wf.currentPhase].toLowerCase();
    raw.current_phase_index = wf.currentPhase;
    raw.updated_at = new Date().toISOString();
    raw.workflow_status = wf.status;
    writeFileSync(idxPath, JSON.stringify(raw, null, 2));
  } catch { /* skip */ }
}
```

### Phase 4: Update commands.ts to write index.json
**Files**: `commands.ts` - `cmdNext`, `cmdSetPhase`, `cmdPause`, `cmdResume`, `cmdComplete`, `cmdArchive`

Add `writeIndexJson` call after each `writeTracking`:
```typescript
// After writeTracking(wd, t) in cmdNext:
writeIndexJson(wd, wf);
```

### Phase 5: Remove footer dependency
**Files**: 
- `extensions/cali-product-workflow/ui.ts` - Keep for backward compat but make optional
- `extensions/cali-product-workflow/index.ts` - Remove mandatory footer updates
- `SKILL.md` - Add todo-based status display instead

**Changes**:
1. `updateFooter()` becomes no-op if `ctx.ui` unavailable
2. SKILL.md adds response format template with phase indicator
3. User sees phase status via LLM response, not via footer

### Phase 6: Update SKILL.md to reference todo.md
**File**: `skills/cali-product-workflow/SKILL.md`

Add to Tools & Packages table:
```
| `todo` | `references/cli-tools/todo.md` |
```

Add to SKILL.md rules:
```
6. **Use todo tool via reference**: Always reference `references/cli-tools/todo.md`
   for task management. Never call todo tools directly.
7. **Every response starts with phase indicator**: Format:
   ```
   🔍 [Phase Name] (N/13) — "[Workflow Name]"
   📋 Tasks:
   ✓ [PREFIX-1] ...
   ◐ [PREFIX-2] ...
   ○ [PREFIX-3] ...
   ```
```

### Phase 7: Add status.md file for ASCII status
**File**: `references/cli-tools/status.md` (rename/update phase-status.md)

Consolidate phase status display into a single reference file.

---

## Files to Modify

### Extension (TypeScript)
1. `extensions/cali-product-workflow/state.ts` - Add `writeIndexJson()`
2. `extensions/cali-product-workflow/index.ts` - Add auto-sync in turn_end
3. `extensions/cali-product-workflow/commands.ts` - Call `writeIndexJson()` in phase commands
4. `extensions/cali-product-workflow/ui.ts` - Make footer optional

### Skills (Markdown)
1. `skills/cali-product-workflow/SKILL.md` - Add todo reference, response format
2. `skills/cali-product-workflow/references/cli-tools/todo.md` - Already created
3. `skills/cali-product-workflow/references/cli-tools/README.md` - Add todo to tool list
4. `skills/cali-product-workflow/references/cli-tools/phase-status.md` - Update to use todo

---

## Testing Plan

1. **Tracking Sync Test**:
   - Start workflow with `/pw-start`
   - Advance phase with `/pw-next`
   - Verify `index.json` has updated `current_phase_index`
   - Verify `cali-product-workflow.json` has updated `currentPhase`

2. **Resume Test**:
   - Start workflow, advance to Phase 4 (Shape)
   - Kill session (simulate crash)
   - Resume with `/pw-resume`
   - Verify LLM shows correct phase and todos

3. **Cross-CLI Test**:
   - Start workflow in Pi
   - Resume same workflow in OpenCode
   - Verify tracking file is consistent
   - Verify phase todos display correctly

4. **To-Do Integration Test**:
   - Start workflow
   - Verify LLM creates phase-specific todos with `[PHASE-N]` naming
   - Verify status indicators (✓ ◐ ○) displayed correctly
   - Verify todos reset on `/pw-next`

---

## Rollout Order

1. [ ] Create `todo.md` reference (DONE)
2. [ ] Add `writeIndexJson()` to state.ts
3. [ ] Update commands.ts to call `writeIndexJson()`
4. [ ] Update index.ts turn_end handler
5. [ ] Update ui.ts to make footer optional
6. [ ] Update SKILL.md with todo reference and response format
7. [ ] Update README.md with todo in tool list
8. [ ] Test all scenarios
9. [ ] Deploy and verify