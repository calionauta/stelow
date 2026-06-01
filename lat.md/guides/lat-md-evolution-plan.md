# Guia de Evolução: lat.md + cali-lat-md-seed

Recomendações de engenharia para melhorar o skill `cali-lat-md-seed` e o
AGENTS.md, baseadas na experiência prática de seeded documentation no projeto
cali-product-workflow (Junho 2026).

> **Este não é um artefato do workflow — é uma recomendação de engenharia**
> baseada na experiência prática de seeded documentation no projeto
> cali-product-workflow (Junho 2026). Documenta o que precisa ser mudado
> no skill `cali-lat-md-seed` e no AGENTS.md para evitar contaminação
> por artefatos desatualizados.

---

## Problema Detectado

O skill `cali-lat-md-seed` **não faz verificação de staleness** antes de usar
artefatos do `cali-product-workflow`. Ele detecta arquivos `.md` em
`.cali-product-workflow/` e os usa como seed — mesmo que o código tenha
mudado significantemente depois.

**Evidência:** Nesta sessão, 77 commits de código desde o artefato mais recente
(22/05 → 01/06). Resultado: 2 arquivos contaminados, 1 skill renomeado não
detectado (`delivery-audit` → `execution-critique`).

---

## O Que Mudar

Sete itens de melhoria, priorizados por criticidade. Os primeiros dois previnem contaminação de documentação por artefatos desatualizados.

### 1. AGENTS.md do projeto cali-product-workflow — Adicionar seção lat.md

**Local:** `/Users/cali/Development/cali-product-workflow/AGENTS.md`

Adicionar no bloco de **Architecture** ou como nova seção **Documentation**:

```markdown
## Living Documentation (lat.md)

This project uses [[lat.md/lat.md]] as its living documentation — a knowledge
graph of markdown files with [[wiki links]], `// @lat:` code refs, and
semantic search.

### Roles

| Camada | O que contém | Quem atualiza |
|---|---|---|
| `lat.md/` (raiz) | Arquivos markdown editados manualmente | Mantenedores humanos + agentes |
| `.pi/extensions/lat.md.ts` | Pi extension com 6 tools de busca/verificação | Template do lat.md |
| `// @lat:` annotations | Links do código → documentação | Agentes durante implementação |

### Freshness Policy

- **Artefatos do workflow** (`spec-*.md`, `critique-*.md`) são documentos
  históricos — registram intenção, não realidade construída
- **`lat.md/`** é a fonte da verdade *atual* — deve refletir o que o código
  faz hoje, não o que foi planejado
- Após implementar um escopo, rodar `lat check` e atualizar a documentação
  se o `// @lat:` link for afetado

### Tools disponíveis (via Pi extension)

- `lat_search <query>` — busca semântica na documentação
- `lat_section <path>` — lê seção específica
- `lat_locate <term>` — encontra onde termo é documentado
- `lat_check` — valida links e estrutura
- `lat_expand` — visualiza grafo de dependências
- `lat_refs <section>` — lista `// @lat:` apontando para uma seção
```

#### Como detectar staleness no CI (futuro)

Comando futuro para CI que alerta quando código muda sem atualização do lat.md.

```bash
# Verificar se lat.md está atualizado vs código
lat check
sem diff --since $(git log --oneline lat.md/ | tail -1 | awk '{print $1}') \
  | grep -q "modified" && echo "⚠️ Código mudou desde última atualização do lat.md"
```

---

### 2. Skill `cali-lat-md-seed` — Melhorias prioritárias

Quatro sub-melhorias no skill de seed: staleness gate, integração sem, checklist de verificação, e limpeza de artefatos velhos.

#### 2a. Staleness Gate antes de usar artefatos (CRÍTICO)

Atualmente Step 2 diz "Detect planning artifacts" → "If found → Seed-from-Plans".
**Falta um gate antes de usar:**

```yaml
# NOVO: Staleness Gate (inserir entre detecção e seed)

Staleness Gate:
  1. Para cada artefato encontrado, capture a data:
     git log -1 --format=%ci -- <artifact_path>
  2. Capture a data do commit mais recente no código:
     git log -1 --format=%ci -- <code_dirs>
  3. Se código é mais recente que artefato:
     → Mode: Hybrid-Seed (artefato só para conceitos, código para nomes)
     → Avisar: "Artefato <X> desatualizado. Usando conceitos do artefato +
       estrutura real do código."

Mode: Hybrid-Seed
  - Extrair do artefato: regras de negócio, motivações, decisões conceituais
  - Verificar no código: nomes de skills, funções, arquivos, comandos
  - Se nome no artefato não existir no código → ignorar (pode ter sido renomeado)

Mode: Seed-from-Plans (só se artefato é mais recente que código)
  - Usar artefato como fonte primária
  - Ainda verificar nomes no código como sanity check
```

#### 2b. Opcional: Integração com `sem` para detecção semântica

**Quando `sem` está disponível no PATH**, usar como alternativa mais precisa
que `git log`:

```bash
# Em vez de git log nas datas:
if which sem >/dev/null 2>&1; then
  # sem diff detecta mudanças semânticas, não só linhas
  CHANGED=$(sem diff --since $(git log -1 --format=%H -- lat.md/) 2>/dev/null | \
    grep -c "^  - .*modified" || echo "0")
  echo "Entity changes since last lat.md update: $CHANGED"

  # Se >0 entidades modificadas, usar Hybrid-Seed
fi
```

Também pode gerar um relatório de quais entidades mudaram para o agente
saber o que verificar:

```bash
sem diff --since <commit> --format json 2>/dev/null | \
  jq -r '.diffs[] | select(.status == "modified") | .entity'
```

#### 2c. Validar cada afirmação do artefato (CRÍTICO)

Adicionar no Step 2 um checklist de verificação obrigatório:

```markdown
### Verification Checklist (após extrair de artefatos)

Para cada afirmação extraída, verificar no código real:

- [ ] Nomes de skills/diretórios existem (`ls skills/cali-product-<name>`)
- [ ] Funções/classes mencionadas existem (`grep -rn <name> src/`)
- [ ] Comandos mencionados existem (ex: `grep '"pw-"' dispatcher.ts`)
- [ ] Arquivos de configuração mencionados existem
- [ ] Dependências mencionadas estão no package.json

Se algum falhar:
  1. Remover ou marcar a afirmação como "histórica (do plano)"
  2. Extrair o nome real do código
  3. Adicionar nota em `lat.md/decisions.md` documentando a divergência
```

#### 2d. Limitar artefatos lidos (otimização)

Atualmente o Step 2 lê **todos** os artefatos encontrados. Melhor:

```bash
# 1. Só ler versões mais recentes (v3 > v2 > v1)
ARTIFACTS=$(find . -path '*/spec-tech_v*.md' 2>/dev/null | sort | tail -1)
# 2. Ignorar artefatos >30 dias
```

#### 2e. Mode: Verify (freshness) — melhorar

O modo Verify existe mas é genérico. Especificar:

```yaml
Mode: Verify (lat.md/ exists)
  1. git log -1 --format=%ci -- lat.md/        # quando doc foi atualizada
  2. git log -1 --format=%ci -- <code_dirs>    # quando código mudou
  3. sem diff --since <lat.md_commit>           # entidades que mudaram
  4. Se código > doc:
     - Warning: "lat.md pode estar desatualizado (código mudou em <data>)"
     - Listar entidades com // @lat: que foram modificadas
     - Perguntar: "Quer que eu atualize as seções afetadas?"
```

---

### 3. Mudanças no `architecture.md` do projeto

O `architecture.md` (raiz do projeto, não lat.md/) tem o diagrama de 4 camadas
que também mostra `modules/` no nível raiz. Deve ser corrigido para:

```
│  MODULES (extensions/cali-product-workflow/modules/)        │
```

---

### Prioridades

Tabela priorizando os 7 itens por impacto vs esforço, do crítico ao cosmético.

| # | O que | Onde | Impacto | Esforço |
|---|---|---|---|---|
| 1 | Staleness Gate | Skill Step 2 (crítico) | 🔴 Evita contaminação | 30 min |
| 2 | Verification Checklist | Skill Step 2 (crítico) | 🔴 Pega renomes | 15 min |
| 3 | Seção lat.md no AGENTS.md | AGENTS.md | 🟡 Clareza | 10 min |
| 4 | Mode: Verify melhorado | Skill Step 5 | 🟡 Detecção precoce | 20 min |
| 5 | Integração `sem` (opcional) | Skill Step 2 | 🟢 Precisão semântica | 30 min |
| 6 | Limitar artefatos >30 dias | Skill Step 2 | 🟢 Performance | 5 min |
| 7 | architecture.md diagrama | architecture.md | 🟢 Precisão | 2 min |
