# Plano de Migração: cali-product-workflow → stelow

**Status:** 📋 Draft para revisão no Plannotator  
**Data:** 2026-06-19  
**Autor:** Planejamento automatizado

---

## Sumário Executivo

Renomear o produto de `cali-product-workflow` para **stelow** (styling: `stelow`).  
Tagline: *"opinionated product workflow. stellar clarity. low friction."*

Escopo total: **~255 arquivos fonte** com `cali-product-workflow` + **~161 arquivos** com `/sw-` comandos.

Quebra em 3 sub-projetos independentes:
1. **Mudanças no repositório GitHub** (About + repo rename)
2. **Mudanças no código** (constantes, paths, nomes de comando)
3. **Mudanças no ecossistema** (npm, install scripts, docs, CI)

---

## Fase 1 — GitHub About Field

**O que é:** Campo "Description" nas settings do repo (`gh repo view --json description`).  
**Atual:** `"product shaping and execution system for AI coding agents — turn ideas into approved plans, typed scopes, and verified delivery."`  
**Novo:** `"stelow — opinionated product workflow. stellar clarity. low friction."`

**Comando:**
```bash
gh repo edit -d 'stelow — opinionated product workflow. stellar clarity. low friction.'
```

**Risco:** Mínimo. Só metadado. Sem quebra.

---

## Fase 2 — Prefixo de Comando: Análise de Opções

### Mecanismo de Aliases no Pi

A extensão registra comandos via `pi.registerCommand(nome, {handler})`.  
Pi **não tem** sistema nativo de aliases. Mas a camada custom `HANDLER_BY_NAME` (Record<string, CmdHandler>) permite múltiplas entradas apontando pro mesmo handler.

**Implementação:** Adicionar ao `HANDLER_BY_NAME` e chamar `pi.registerCommand()` para cada alias. Ex.:

```typescript
// commands.ts — HANDLER_BY_NAME
"stelow-start": cmdStart,
"sw-start": cmdStart,

// registerCommands() itera sobre WORKFLOW_COMMANDS + aliases
for (const name of [c.name, ...getAliases(c.name)]) {
  pi.registerCommand(name, { description, handler });
}
```

### Tabela de Opções

| Prefixo | Exemplo | Chars | Prós | Contras |
|---------|---------|-------|------|---------|
| **`/sw-`** | `/sw-start` | 2 | Curto, "s"telow + "w"orkflow = sw, sonoridade limpa | Precisa explicar origem |
| **`/sl-`** | `/sl-start` | 2 | Curto, "st"e"l"ow = sl | Pode conflitar com Slack em alguns CLIs |
| **`/stelow-`** | `/stelow-start` | 7 | Auto-documentado, sem ambiguidade | Muito longo pra uso diário (17 comandos) |
| **`/st-`** | `/st-start` | 2 | Primeiras letras de "ST"elow | Genérico, colide com "status" em outros sistemas |

**Recomendação:** `/sw-` como primário, `/stelow-` como alias secundário (autodocumentado).  
Usuários podem digitar qualquer um dos dois.

### Impacto nos comandos

| Comando atual | Novo (`/sw-`) | Alias (`/stelow-`) |
|--------------|--------------|-------------------|
| `/sw-start` | `/sw-start` | `/stelow-start` |
| `/sw-abort` | `/sw-abort` | `/stelow-abort` |
| `/sw-pause` | `/sw-pause` | `/stelow-pause` |
| `/sw-resume` | `/sw-resume` | `/stelow-resume` |
| `/sw-status` | `/sw-status` | `/stelow-status` |
| `/sw-ls` | `/sw-ls` | `/stelow-ls` |
| `/sw-setphase` | `/sw-setphase` | `/stelow-setphase` |
| `/sw-next` | `/sw-next` | `/stelow-next` |
| `/sw-complete` | `/sw-complete` | `/stelow-complete` |
| `/sw-goto` | `/sw-goto` | `/stelow-goto` |
| `/sw-rename` | `/sw-rename` | `/stelow-rename` |
| `/sw-menu` | `/sw-menu` | `/stelow-menu` |
| `/sw-doctor` | `/sw-doctor` | `/stelow-doctor` |
| `/sw-archive` | `/sw-archive` | `/stelow-archive` |
| `/sw-unarchive` | `/sw-unarchive` | `/stelow-unarchive` |
| `/sw-unlock` | `/sw-unlock` | `/stelow-unlock` |
| `/sw-inbox` | `/sw-inbox` | `/stelow-inbox` |

### DIR hash e tracking global

| Atual | Novo |
|-------|------|
| `sw-ollc-whkaxv` (dirHash) | `sw-ollc-whkaxv` |
| `.stelow-global.json` | `.cali-sl-global.json` (ou `.stelow-global.json`) |

---

## Fase 3 — Bulk Rename: Estratégia e Segurança

### Categorias de Mudança (12)

| # | Categoria | Arquivos | Ferramenta | Risco |
|---|-----------|----------|------------|-------|
| 1 | **Constantes no código** (types.ts: WORKFLOW_DIR, TRACKING_FILE, SCHEMA_URL, GLOBAL_TRACKING_FILE) | 4 TS files | Edição manual | 🟡 Médio — quebra runtime se errar |
| 2 | **Nomes de diretório** (extensions/, skills/) | 4 diretórios | `git mv` + sed imports | 🔴 Alto — imports quebram |
| 3 | **Comandos** (HANDLER_BY_NAME, WORKFLOW_COMMANDS, registerCommands) | 3 TS files | Edição manual | 🟡 Médio — nomes errados quebram dispatch |
| 4 | **Skill activation** (`/skill:stelow`) | ~80 md/json files | `sed` | 🟢 Baixo — string fixa |
| 5 | **URLs** (GitHub, raw.githubusercontent, badges) | ~15 files | `sed` | 🟢 Baixo — URLs fixas |
| 6 | **Schema JSON** (`$id`, filename) | 2 files | Manual + `git mv` | 🟡 Médio — schema URL quebra tracking files existentes |
| 7 | **CLI command files** (cli-agents/*/commands/) | ~45 md files | `sed` + `git mv` | 🟢 Baixo — conteúdo template |
| 8 | **Scripts de instalação** (install.sh, setup.sh) | ~6 sh files | `sed` | 🟢 Baixo — strings fixas |
| 9 | **Plugin identity** (.claude-plugin/, .codex-plugin/, .opencode-plugin/) | 6 json files | `sed` | 🟢 Baixo |
| 10 | **Documentação** (README, CHANGELOG, docs/) | ~20 md files | `sed` + revisão | 🟢 Baixo |
| 11 | **Testes** | ~20 TS files | `sed` + verificação | 🟡 Médio — paths de import |
| 12 | **Runtime artifact dir** (`.stelow/`) | 7 TS + 30+ md files | `sed` | 🔴 Alto — quebra skills que acessam tracking files |

### Estratégia de Execução

**Abordagem: Transplante completo em 3 passes + 1 verificação**

#### Passo 1 — Renomear constantes + diretórios (risco alto, execução manual)
1. Editar `types.ts`: WORKFLOW_DIR, TRACKING_FILE, SCHEMA_URL, GLOBAL_TRACKING_FILE, hash prefix
2. `git mv extensions/cali-product-workflow extensions/stelow`
3. `git mv extensions/cali-product-workflow-pi extensions/stelow-pi`
4. `git mv extensions/cali-product-workflow-muxy extensions/stelow-muxy`
5. `git mv skills/cali-product-workflow skills/stelow`
6. `git mv stelow.schema.json stelow.schema.json`
7. `git mv stelow-spec.md stelow-spec.md`
8. Atualizar todos os imports nos TS files para os novos paths

#### Passo 2 — Renomear comandos (risco médio, edição manual)
1. Adicionar aliases ao HANDLER_BY_NAME em `commands.ts`
2. Adicionar aliases ao WORKFLOW_COMMANDS em `dispatcher.ts` OU criar função de aliases
3. Atualizar `registerCommands()` para registrar ambos os nomes
4. Atualizar `COMMANDS.md` com nova tabela
5. Atualizar `generate-cli-commands.ts` para gerar ambos os prefixos

#### Passo 3 — Substituições em massa com sed (risco baixo)
Usar `sed` para substituições determinísticas:
```bash
# Substituir constantes de path
find . -type f \( -name "*.ts" -o -name "*.md" \) \
  ! -path "*/node_modules/*" ! -path "*/build/*" \
  -exec sed -i '' 's|\.stelow|\.stelow|g' {} +

# Substituir tracking file name
find . -type f \( -name "*.ts" -o -name "*.md" \) \
  ! -path "*/node_modules/*" ! -path "*/build/*" \
  -exec sed -i '' 's/cali-product-workflow\.json/stelow\.json/g' {} +

# Substituir schema file name + URL
find . -type f \( -name "*.ts" -o -name "*.md" -o -name "*.json" \) \
  ! -path "*/node_modules/*" ! -path "*/build/*" \
  -exec sed -i '' 's/cali-product-workflow\.schema/stelow\.schema/g' {} +

# Substituir comando prefixo
find . -type f \( -name "*.ts" -o -name "*.md" -o -name "*.json" \) \
  ! -path "*/node_modules/*" ! -path "*/build/*" \
  -exec sed -i '' 's|/sw-|/sw-|g' {} +
  # E também /stelow- como alias

# Substituir GLOBAL_TRACKING
find . -type f \( -name "*.ts" -o -name "*.md" \) \
  ! -path "*/node_modules/*" ! -path "*/build/*" \
  -exec sed -i '' 's/\.stelow-global/\.stelow-global/g' {} +

# Substituir dirHash prefix
find . -type f \( -name "*.ts" -o -name "*.md" \) \
  ! -path "*/node_modules/*" ! -path "*/build/*" \
  -exec sed -i '' 's/`sw-/`sw-/g' {} +
```

#### Passo 4 — Substituições contextuais (risco médio, requer revisão)
Substituições que precisam de contexto (não podem ser sed cego):
- `package.json` — `name`, `repository.url`, `homepage`, `bugs.url`, `exports`, `files[]`, `pi.extensions[]`
- `package-lock.json` — `name`
- Plugin JSON files — `name`, `url` em `.claude-plugin/`, `.codex-plugin/`, `.opencode-plugin/`
- Schema `$id` URL
- README.md — título, badges, URLs
- URLs raw.githubusercontent.com

#### Passo 5 — Verificação (gap zero)
```bash
# Check se sobrou algum "cali-product-workflow" no código fonte
grep -r "cali-product-workflow" --include="*.ts" --include="*.md" --include="*.json" \
  --include="*.yaml" --include="*.js" --include="*.sh" . 2>/dev/null | \
  grep -v node_modules | grep -v "/build/" | grep -v "/.git/" | grep -v "/.stryker-tmp/" | \
  grep -v "/dist/" | grep -v "/.stelow/"

# Build test
npm run build

# Type check
npm run typecheck

# Testes
npm test
```

### Análise de Risco

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Import path quebrado (git mv mudou dir) | Alta | 🔴 Build quebra | `sed` nos imports + `npm run build` valida |
| Tracking file runtime quebrado (`.stelow/` → `.stelow/`) | Média | 🔴 Perde workflows existentes | Script de migração que move dados |
| Schema URL quebrada (raw.githubusercontent) | Média | 🟡 Tracking files existentes não validam mais | GitHub redirect funciona |
| Comando antigo não registrado (esqueceu alias) | Média | 🟡 `/sw-start` para de funcionar | Teste de regressão |
| Teste com path hardcoded quebrado | Baixa | 🟡 Teste falha | `npm test` captura |

### Conclusão de Segurança

**Sim, é possível mudar tudo de uma vez de forma garantida**, desde que:
1. Execute num branch separado (nunca em main)
2. Siga a ordem: constantes → dirs → sed massa → contextuais → build → test
3. Tenha script de migração pra runtime data (`.stelow/` → `.stelow/`)
4. Mantenha aliases dos comandos antigos por pelo menos 1 release

**Contra-indicações:**
- ✗ Tentar fazer tudo no mesmo commit (risco de conflito enorme)
- ✗ Fazer merge sem CI passar
- ✗ Esquecer de migrar `.stelow/` dados existentes

---

## Fase 4 — Renomear Repositório GitHub

### Comando
```bash
gh repo rename stelow
```

### Efeitos

| Aspecto | Impacto | Mitigação |
|---------|---------|-----------|
| **URL do repo** | `github.com/renatocaliari/stelow` → `github.com/renatocaliari/stelow` | GitHub cria redirect automático |
| **Git remote local** | `git remote -v` aponta pro nome antigo | `git remote set-url origin` |
| **raw.githubusercontent.com** | URLs como `raw.githubusercontent.com/renatocaliari/stelow/main/...` **NÃO** redirecionam automaticamente | ❗ Precisam ser atualizadas manualmente no schema.json e docs |
| **npm package name** | `@renatocaliari/stelow` é SEPARADO do repo name | Fica como está OU muda pra `@renatocaliari/stelow` via `npm publish` |
| **Badges no README** | URLs de badge apontam pro repo antigo | Atualizar no README |
| **CI/CD** | GitHub Actions works porque usa `${{ github.repository }}` | ✅ Sem impacto |
| **Issues/PRs** | GitHub redirect mantém acesso | ✅ Funciona |
| **Git clone URLs** | HTTPS antigo redireciona, SSH precisa atualizar | Documentar no CHANGELOG |
| **GitHub Pages** | Se existir, URL muda | Verificar se há Pages ativo |

### Sincronização npm package

O nome do pacote npm (`@renatocaliari/stelow`) é independente do nome do repo GitHub.
Opções:
1. **Manter** `@renatocaliari/stelow` — menos quebra, mas confuso (nome repo != npm)
2. **Mudar** pra `@renatocaliari/stelow` — consistente, mas precisa publicar novo pacote + deprecated old

**Recomendação:** Opção 2 (nova identidade completa). Fazer `npm publish --access public` com novo nome e deprecated o antigo.

---

## Fase 5 — Plano de Execução (Ordem das Operações)

```
Semana 1: Planejamento e preparação
  └── Revisar este plano no Plannotator
  └── Aprovar decisions (qual prefixo, quais aliases)

Semana 2: Branch de migração
  └── git checkout -b rename-to-stelow
  ├── Fase 1: GitHub About (1 comando, imediato)
  ├── Fase 2: Constantes + paths no código
  ├── Fase 3: git mv diretórios
  ├── Fase 4: sed massa paths/URLs
  ├── Fase 5: Edições contextuais (package.json, plugin files)
  ├── Fase 6: Comandos (aliases + rename)
  ├── Fase 7: Testes passam
  └── git commit

Semana 3: GitHub + npm
  ├── gh repo rename stelow
  ├── git remote update
  ├── npm publish @renatocaliari/stelow
  ├── npm deprecate @renatocaliari/stelow
  └── git push + merge PR

Semana 4: Pós-migração
  └── Verificar redirects
  └── Atualizar documentação externa
  └── Comunicar breaking change
```

---

## Anexo: Mapeamento de Arquivos Críticos

### Arquivos com mudanças obrigatórias (não-sed)

| Arquivo | Tipo de mudança |
|---------|----------------|
| `package.json` | name, repository.url, homepage, bugs.url, exports.*, files[], pi.extensions[] |
| `package-lock.json` | name (2 ocorrências) |
| `skills-lock.json` | skill name refs |
| `extensions/cali-product-workflow/types.ts` | WORKFLOW_DIR, TRACKING_FILE, SCHEMA_URL, GLOBAL_TRACKING_FILE, hash prefix |
| `extensions/cali-product-workflow/commands.ts` | HANDLER_BY_NAME, registerCommands(), getCommandNames() |
| `extensions/cali-product-workflow/adapters/commands/dispatcher.ts` | WORKFLOW_COMMANDS[] names, skill reference |
| `extensions/cali-product-workflow/index.ts` | Skill path, GIT_DIR, tool blocking msg |
| `extensions/cali-product-workflow/state.ts` | hash prefix `sw-`, dir scan patterns |
| `extensions/cali-product-workflow/ui.ts` | Command references |
| `extensions/cali-product-workflow/doctor.ts` | Path patterns |
| `extensions/cali-product-workflow/start.ts` | skill reference |
| `extensions/cali-product-workflow/start-message.ts` | Product name string |
| `.claude-plugin/plugin.json` | Name, URLs |
| `.claude-plugin/marketplace.json` | Name, URLs |
| `.codex-plugin/plugin.json` | Name, URLs |
| `.codex-plugin/marketplace.json` | Name, URLs |
| `.opencode-plugin/plugin.json` | Name, URLs |
| `stelow.schema.json` | $id URL |
| `cli-agents/COMMANDS.md` | Full rewrite |
| `cli-agents/opencode/plugin/src/index.ts` | Plugin description strings |
| `cli-agents/opencode/plugin/package.json` | Plugin name |
| `scripts/generate-cli-commands.ts` | Generated file content references |
| `stryker.conf.json` | Removed during test cleanup |
| `.gitignore` | Comment header, ignore patterns |

### Arquivos que o sed pode cobrir (~200 arquivos)

| Padrão sed | Escopo | Exemplo |
|------------|--------|---------|
| `s/\.stelow/\.stelow/g` | Todos .ts, .md | path references |
| `s/cali-product-workflow\.json/stelow\.json/g` | Todos .ts, .md | tracking file |
| `s|/skill:stelow|/skill:stelow|g` | Todos .md | skill activation |
| `s|/sw-|/sw-|g` | Todos .ts, .md, .json | commands |
| `s/stelow-spec/stelow-spec/g` | .md files | spec document |
| `s/cali-product-workflow/stelow/g` | Todos .ts, .md, .json, .sh | general (cuidado com overlap) |

### Artefatos de runtime que precisam migração

| Caminho runtime | Ação |
|----------------|------|
| `.stelow/` | Renomear para `.stelow/` |
| `stelow.json` | Renomear para `stelow.json` (conteúdo também tem schema URL) |
| `cali-pw-global.json` | Renomear para `stelow-global.json` |
| Dados de workflow existentes | Script de migração: copiar + substituir paths no conteúdo |

---

## Decisões Pendentes

1. **Prefixo de comando:** `/sw-` ou `/sl-` ou `/stelow-`?
2. **Aliases:** Manter `/sw-` como alias por 1 release para backward compat?
3. **npm package:** `@renatocaliari/stelow` ou manter `@renatocaliari/stelow`?
4. **Schema URL:** Apontar pra `raw.githubusercontent.com/renatocaliari/stelow/...`?
5. **Ordem:** Renomear repo GitHub antes ou depois do merge do código?

---

*Fim do plano. Abrir no Plannotator para revisão.*
