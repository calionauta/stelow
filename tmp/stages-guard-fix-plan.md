# Stages Guard Fix — Plan

## Contexto

`extensions/cali-product-workflow/index.ts:getStageGuard` enforça stage locks via
`stages.yaml`. Bug: dogfooding guard incompleto + legacy path bypass.

**Cenários problemáticos (achados):**

1. `cali-product-workflow.json` existe, `hasActiveWorkflow()` retorna false (todos
   `archived`) → guard null. **Funciona.**
2. Mas legacy `.cali-product-workflow/state/current-stage.json` existe com
   `current_stage: "triage"` → branch `statePath.endsWith(TRACKING_FILE)` é
   FALSE → cai no `else if (!existsSync(statePath))` que também é FALSE →
   cria guard com default `triage` → **lock fantasma**.
3. Global tracking `~/.cali-pw-global.json` (15KB) pode ter workflow
   `in-progress` em outro projeto, mas guard local nem olha. **Decisão:** não
   ler global no guard (cross-project lock é hostil).

**Clean code:** sem legacy, sem backward compat. Deletar
`.cali-product-workflow/state/current-stage.json` órfão.

## Decisão de design

Guard fires **só** quando:

- Tracking file `cali-product-workflow.json` existe **E**
- Tem workflow com `status: "in-progress"` **E**
- `Workflow.cwd` do workflow ativo é ancestor (ou igual) ao `ctx.cwd`
  (valida que a trava é para ESTE dir, não outro projeto) **E**
- `process.env.CALI_PW_GUARD !== "off"`

Caso contrário: guard null, todas tools livres.

Comandos `/pw-pause` / `/pw-stop` / `/pw-archive` já mudam status para
`paused`/`archived`/`stopped` → `hasActiveWorkflow` retorna false → guard
null automaticamente. Não precisa wiring extra.

## Edits

### 1. `extensions/cali-product-workflow/adapters/stages-guard.ts`

Adicionar exports:

```ts
/**
 * Resolve the active workflow's cwd and return it. Returns null if none.
 * Used by guard to determine if the active workflow targets the current cwd.
 */
export function getActiveWorkflowCwd(trackingPath: string): string | null {
  if (!existsSync(trackingPath)) return null;
  try {
    const tracking = JSON.parse(readFileSync(trackingPath, "utf-8"));
    if (!Array.isArray(tracking?.workflows)) return null;
    const active = tracking.workflows.find(
      (w: any) => w && w.status === "in-progress"
    );
    return active?.cwd ?? null;
  } catch {
    return null;
  }
}

/**
 * Return true if `child` is `parent` or a descendant of `parent`.
 * Pure path utility, exported for testing.
 */
export function isAncestorOrSame(parent: string, child: string): boolean {
  const norm = (p: string) => p.replace(/\/+$/, "");
  const a = norm(parent);
  const c = norm(child);
  return c === a || c.startsWith(a + "/");
}
```

### 2. `extensions/cali-product-workflow/index.ts` — refatorar `getStageGuard`

Substituir a função inteira (linhas 60-93) por:

```ts
function getStageGuard(projectDir: string, cwd: string) {
  try {
    // Env escape hatch — debug/emergency unlock
    if (process.env.CALI_PW_GUARD === "off") {
      guardCheckTool = null;
      return guardCheckTool;
    }

    const stagesPath = join(projectDir, "skills", "cali-product-workflow", "stages.yaml");
    const trackingPath = join(projectDir, TRACKING_FILE);

    // No tracking file → no workflow possible → no guard
    if (!existsSync(trackingPath)) {
      guardCheckTool = null;
      return guardCheckTool;
    }

    // No in-progress workflow → guard is dormant
    if (!hasActiveWorkflow(trackingPath)) {
      guardCheckTool = null;
      return guardCheckTool;
    }

    // Active workflow must target the current cwd (or ancestor of it).
    // Cross-project lock is hostile: don't enforce in dir Y because of a
    // workflow running in dir X.
    const activeCwd = getActiveWorkflowCwd(trackingPath);
    if (activeCwd && !isAncestorOrSame(activeCwd, cwd)) {
      guardCheckTool = null;
      return guardCheckTool;
    }

    // Always re-create to pick up phase changes from /pw-next /pw-setphase
    guardCheckTool = createStagesGuardFromPaths(stagesPath, trackingPath);
  } catch {
    guardCheckTool = null;
  }
  return guardCheckTool;
}
```

### 3. `extensions/cali-product-workflow/index.ts` — atualizar import

Linha 8: estender import para incluir `getActiveWorkflowCwd`, `isAncestorOrSame`:

```ts
import {
  createStagesGuardFromPaths,
  hasActiveWorkflow,
  getActiveWorkflowCwd,
  isAncestorOrSame,
} from "./adapters/stages-guard";
```

### 4. `extensions/cali-product-workflow/index.ts` — atualizar caller

No hook `tool_call` (linha ~269):

```ts
// Antes:
const checker = getStageGuard(resolveProjectDir(ctx.cwd));

// Depois:
const checker = getStageGuard(resolveProjectDir(ctx.cwd), ctx.cwd);
```

### 5. `extensions/cali-product-workflow/index.ts` — adicionar hint no block

No mesmo hook, dentro do `if (!result.allowed)`:

```ts
if (!result.allowed) {
  const hint = `🔒 Tool '${tool}' blocked by workflow stage. Use /pw-pause to unlock, /pw-next to advance, or /pw-stop to end.`;
  console.warn(`[StagesGuard] ${result.reason}`);
  ctx.ui?.notify(hint, "warning");
  return { block: true, reason: result.reason || hint };
}
```

### 6. `extensions/cali-product-workflow/commands.ts` — `/pw-unlock`

Adicionar handler + registro:

```ts
function cmdUnlock(_pi: ExtensionAPI, _args: string, ctx: CmdCtx) {
  process.env.CALI_PW_GUARD = "off";
  reply(ctx, "🔓 Stages guard disabled for this session. Reopen pi to re-enable.");
}
```

Adicionar `"pw-unlock": cmdUnlock` ao `HANDLER_BY_NAME`.

### 7. `tests/unit/stages-guard.test.ts` — novos casos

```ts
import { getActiveWorkflowCwd, isAncestorOrSame } from '../../extensions/cali-product-workflow/adapters/stages-guard';

describe('isAncestorOrSame', () => {
  it('returns true for exact match', () => {
    expect(isAncestorOrSame('/a/b', '/a/b')).toBe(true);
  });
  it('returns true for descendant', () => {
    expect(isAncestorOrSame('/a', '/a/b/c')).toBe(true);
  });
  it('returns false for sibling', () => {
    expect(isAncestorOrSame('/a/b', '/a/c')).toBe(false);
  });
  it('returns false for parent of parent', () => {
    expect(isAncestorOrSame('/a/b/c', '/a/b')).toBe(false);
  });
  it('strips trailing slash', () => {
    expect(isAncestorOrSame('/a/b/', '/a/b/c')).toBe(true);
  });
});

describe('getActiveWorkflowCwd', () => {
  it('returns cwd of in-progress workflow', () => {
    const tmp = join(PROJECT_ROOT, '.tmp-cwd-active.json');
    require('node:fs').writeFileSync(tmp, JSON.stringify({
      workflows: [
        { name: "old", status: "archived" },
        { name: "active", status: "in-progress", cwd: "/foo/bar" },
      ],
    }));
    try { expect(getActiveWorkflowCwd(tmp)).toBe("/foo/bar"); }
    finally { require('node:fs').rmSync(tmp, { force: true }); }
  });

  it('returns null when no in-progress', () => {
    const tmp = join(PROJECT_ROOT, '.tmp-cwd-none.json');
    require('node:fs').writeFileSync(tmp, JSON.stringify({
      workflows: [{ name: "old", status: "archived" }],
    }));
    try { expect(getActiveWorkflowCwd(tmp)).toBe(null); }
    finally { require('node:fs').rmSync(tmp, { force: true }); }
  });

  it('returns null when active workflow has no cwd', () => {
    const tmp = join(PROJECT_ROOT, '.tmp-cwd-missing.json');
    require('node:fs').writeFileSync(tmp, JSON.stringify({
      workflows: [{ name: "active", status: "in-progress" }],
    }));
    try { expect(getActiveWorkflowCwd(tmp)).toBe(null); }
    finally { require('node:fs').rmSync(tmp, { force: true }); }
  });

  it('returns null for corrupt file', () => {
    const tmp = join(PROJECT_ROOT, '.tmp-cwd-corrupt.json');
    require('node:fs').writeFileSync(tmp, "{ bad");
    try { expect(getActiveWorkflowCwd(tmp)).toBe(null); }
    finally { require('node:fs').rmSync(tmp, { force: true }); }
  });
});
```

### 8. Deletar legacy

```bash
rm /Users/cali/Development/cali-product-workflow/.cali-product-workflow/state/current-stage.json
```

## Comportamento final

| Cenário | Lock? |
|---------|-------|
| Sem tracking file | ❌ livre |
| Tracking só com `paused`/`archived`/`completed` | ❌ livre |
| Tracking com `in-progress` mas `Workflow.cwd` ≠ este dir | ❌ livre |
| Tracking com `in-progress` e `Workflow.cwd` = este dir | ✅ bloqueia + notify |
| `CALI_PW_GUARD=off` no env | ❌ livre (sessão) |
| `/pw-pause` | ❌ livre (workflow pausa) |
| `/pw-stop` | ❌ livre (workflow some) |
| `/pw-archive` | ❌ livre (status=archived) |
| `/pw-unlock` | ❌ livre (env off) |

## Validação

```bash
cd /Users/cali/Development/cali-product-workflow
npm run typecheck
npm run test:unit -- stages-guard
npm run build
```

Teste manual depois:

1. Abrir pi neste dir → `bash` deve passar (todos workflows archived)
2. `/pw-start` num dir filho → `bash` deve passar até planning
3. Em outro dir sem workflow → `bash` livre sempre
