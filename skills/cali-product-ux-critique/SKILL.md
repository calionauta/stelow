---
name: cali-product-ux-critique
description: >
  [Cali] Full UX critique for visual interfaces. Accepts a live URL, source code directory,
  or screenshot image. Evaluates accessibility (WCAG AA), Nielsen's 10 heuristics, visual
  hierarchy, cognitive load, consistency, mobile responsiveness, AI slop, emotional journey,
  and design personas — then generates a classified gap report.
  Standalone or integrated into stelow and cali-product-testing-execution.
metadata:
  frequency: weekly
  category: product
  context-cost: medium
---

# UX Critique

> **Foco:** Auditoria completa de UX de interfaces — acessibilidade visual, usabilidade, design,
> jornada emocional e detecção de AI slop.
> **Inputs:** URL (live site), diretório (código-fonte), ou screenshot (imagem).
> **Saída:** Relatório classificado com gaps (🚨/🤔/🔎) + recomendações acionáveis.

> **Tools:** See `references/cli-tools/agent_browser.md` and `references/cli-tools/subagents.md` for tool patterns.

## Overview

Full UX audit for visual interfaces — accessibility (WCAG AA), Nielsen heuristics, visual hierarchy,
cognitive load, consistency, mobile/responsive, AI slop, emotional journey, and design personas.

## Visão Geral

Esta skill executa uma auditoria de UX completa focada em **todas as dimensões da experiência**
que podem ser avaliadas em uma interface visual ou código-fonte de UI:

| Dimensão | O que avalia | Framework |
|----------|-------------|-----------|
| **Accessibility (A11y)** | Contraste WCAG AA, ARIA, keyboard nav, alt text, foco, semântica HTML, forms, reduced motion, forced colors, dark mode | WCAG AA / UI Audit |
| **Nielsen Heuristics** | Visibilidade, consistência, prevenção de erros, liberdade, estética, etc. | Nielsen 10 |
| **Compositional Quality** | Work-pattern identification, purpose-layout alignment, density strategy, multi-pattern hierarchy | UI Audit |
| **Interaction States** | 9 estados por componente (idle, hover, active, focus, disabled, loading, empty, error, overflow) — baseline humana vs AI | UI Audit |
| **Visual Hierarchy** | Primary action, visual weight, spacing, alinhamento, tipografia | UI Audit |
| **Cognitive Load** | Progressive disclosure, info density, grouping, labeling, decisões | 8-item checklist |
| **Consistency** | Design tokens, padrões de componentes, ícones, border-radius | UI Audit |
| **Mobile / Responsive** | Touch targets, breakpoints, text scaling, horizontal scroll | Design Quality |
| **Emotional Journey** | Peak-End, anxiety valleys, reassurance, progress indicators | Critique Frameworks |
| **Design Personas** | Alex (power), Jordan (first-timer), Sam (manager), Morgan (a11y), Taylor (mobile) | Critique Frameworks |
| **AI Slop Detection** | 14 tells + anti-patterns de interfaces geradas por IA (empirically validated: ~10 patterns = ~90% of signal) | Critique Frameworks |

Aceita **3 tipos de input**, cada um ativando um subset diferente das dimensões:

| Input | Detecta | Dimensões cobertas |
|-------|---------|-------------------|
| **URL** | `http://` ou `https://` | **Todas** — auditoria completa ao vivo |
| **Codebase** | Diretório com código-fonte | **~80%** sem browser (exceto contraste exato, keyboard real, screen reader) |
| **Screenshot** | Arquivo `.png` `.jpg` `.webp` | **~60%** — visual hierarchy, AI slop, contraste estimado, cognitive load |

### Appetite Gate (auto-skip for scopes without UI changes)

**Before running UX critique**, check if the scope involves visual UI changes
and if appetite warrants a full audit.

```bash
# Read appetite from context; default M
APPETITE="${APPETITE:-Core}"
# Check if any visual files changed
UI_FILES=$(git diff --name-only HEAD~1 2>/dev/null | grep -cE '\.(templ|html|tsx|jsx|css)$' || echo "0")
```

| Appetite | UI files changed | Action |
|----------|-----------------|--------|
| `Lean` | any | **Skip.** No new UI or minimal scope — basic a11y covered by lint. |
| `Core` | 0 | **Skip.** |
| `Core` | 1+ | **Codebase mode (~80%).** No browser. Syntactic a11y + AI slop only. |
| `Complete` | 0 | **Skip** (no UI to audit) |
| `Complete` | 1+ | **Live Site mode.** Full audit with browser + real a11y. Human reviews report in Full Product/Full Product + Tech mode. |

**Rationale:** UX critique com browser é caro (abre URL, navega, tira screenshot).
Para Lean/Core, o custo operacional supera o valor — lint de a11y + revisão de código
já cobre os issues mais críticos.

### Standalone (uso avulso)
Leia este arquivo e pule para o modo relevante.

### Via cali-product-testing-execution (Phase 3)
O orchestrator do testing-execution carrega esta skill automaticamente quando `Tem interface visual? → SIM`.

### Via stelow (Stage Verification)
O stage `ui-quality` em `stages/verification.md` delega para esta skill.

---

## 🔀 Input Router

```
Input fornecido:
  ├── Is it a URL (http:// or https://)?
  │   └→ 🌐 Mode: Live Site Audit (all dimensions)
  ├── Is it a source directory or code file?
  │   └→ 📁 Mode: Codebase Audit (~80% coverage)
  └── Is it an image (.png/.jpg/.webp)?
      └→ 🖼️ Mode: Screenshot Audit (~60% coverage)
```

---

## 🌐 Mode: Live Site Audit

Audita um site ao vivo abrindo no browser e avaliando a UX completa.

### 1. Read reference files

| File | Covers |
|------|--------|
| `references/ui-audit-dimensions.md` | Accessibility (WCAG) + Design Quality checklists |
| `references/ux-frameworks.md` | Nielsen 10, Emotional Journey, Personas |
| `references/output-format.md` | Formato do relatório |

### 2. Open and explore

Use the browser tool (see `references/cli-tools/agent_browser.md`) to open the URL and explore main flows (login, primary action, empty state, error state, destructive confirmation, forms).

### 3. Run audit via subagent

Use the subagents tool (see `references/cli-tools/subagents.md`) to audit the live site:

```
Agent: reviewer
Task: Audit live site for UX quality (Live Site mode)
Reads: ui-audit-dimensions.md, ux-frameworks.md
Mode: {URL}
Output: .cali-ux-critique/live-audit-report.md (per output-format.md)
```

The reviewer applies all checklists from the reference files and produces a report
with severity-classified findings (P0-P3), dimension tags, and actionable recommendations.

### 4. Gap Resolution

| Severidade | Ação |
|------------|------|
| **P0 — Blocking** | Corrigir imediatamente |
| **P1 — Major** | Corrigir antes do release |
| **P2 — Minor** | Próximo ciclo |
| **P3 — Polish** | Se houver tempo |

---

## 📁 Mode: Codebase Audit

Audita código-fonte de componentes de UI sem precisar de browser.
Cobre ~80% dos issues (AccessGuru arXiv 2025).

### 1. Read references

| File | Covers |
|------|--------|
| `references/ui-audit-dimensions.md` | Accessibility + Design Quality checklists |
| `references/ux-frameworks.md` | Nielsen heuristics, AI slop, cognitive load |

### 2. Discover structure

```bash
find {INPUT_PATH} -maxdepth 3 -type f \( -name "*.templ" -o -name "*.html" -o -name "*.tsx" -o -name "*.jsx" -o -name "*.css" -o -name "*.py" \) | head -50
```

### 3. Run audit via subagent

Use the subagents tool (see `references/cli-tools/subagents.md`) to audit the codebase:

```
Agent: reviewer
Task: Audit codebase for UX quality (Codebase mode)
Reads: ui-audit-dimensions.md, ux-frameworks.md
Input: {INPUT_PATH}
Output: .cali-ux-critique/codebase-audit-report.md (per output-format.md)
```

The reviewer applies checklists adapted for source code analysis:
- ARIA attributes, heading hierarchy, alt text, form labels, keyboard event handlers
- Visual hierarchy via component structure, cognitive load via props/state complexity
- Consistency via design tokens, responsiveness via media queries
- AI slop detection (generic patterns, redundant microcopy, icon-only buttons)

For each issue: severity, dimension, if it can be verified from source or [needs browser].

### 4. Flag what needs browser

Issues marcados como `[needs browser]` devem ser verificados ao vivo.

---

## 🖼️ Mode: Screenshot Audit

Audita uma imagem de screenshot para análise visual rápida (~60% coverage).

### 1. Read references

| File | Covers |
|------|--------|
| `references/ui-audit-dimensions.md` | Design Quality (visual) |
| `references/ux-frameworks.md` | Nielsen, personas, AI slop |

### 2. Analyze screenshot

Leia o arquivo de imagem para análise visual. Use o subagents tool (see `references/cli-tools/subagents.md`) to audit:

```
Agent: reviewer
Task: Audit screenshot for UX quality (Screenshot mode)
Reads: ui-audit-dimensions.md, ux-frameworks.md
Input: {INPUT_PATH}
Output: .cali-ux-critique/screenshot-audit-report.md (per output-format.md)
```

The reviewer is limited to what's visible: estimated contrast, alt text presence,
heading hierarchy, visual density. Notes limitations: [needs live testing] for
keyboard, screen reader, focus, interactive states, animation.

### 3. Limitations

| Cobre | Não cobre |
|-------|-----------|
| Contraste estimado | Contraste exato |
| Visual hierarchy | Keyboard navigation |
| AI slop detection | Screen reader |
| Cognitive load | Focus management |
| Nielsen heuristics (visual) | Interactive states |
| Personas (visual) | ARIA attributes |
| Layout/spacing | Animations |

---

## Output

| Mode | Output Path |
|------|-------------|
| **Live Site** | `.cali-ux-critique/live-audit-report.md` |
| **Codebase** | `.cali-ux-critique/codebase-audit-report.md` |
| **Screenshot** | `.cali-ux-critique/screenshot-audit-report.md` |

```
.cali-ux-critique/
  {mode}-audit-report.md     ← main report
```

---

## Integração com outras skills

### cali-product-testing-execution (Phase 3)

Phase 3 delegates to this skill:

```
Phase 3: UI/UX Quality
  └── cali-product-ux-critique (URL or codebase mode)
       ├── Accessibility (WCAG AA)
       ├── Nielsen 10 Heuristics
       ├── Design Quality (hierarchy, consistency, mobile)
       ├── Emotional Journey
       ├── Design Personas
       └── AI Slop Detection
```

### stelow (Stage Verification)

The `ui-quality` stage in `stages/verification.md` delegates to this skill on tiers
Quick (codebase mode) e Full (live site mode).

### cali-product-scope-executor

When a visual scope is executed, the executor delegates UX verification to
esta skill.

---

## Environment Adaptation

Se agent_browser não estiver disponível (ex: outros CLIs), use Codebase mode
(~80% coverage) e note no relatório o que não pôde ser verificado.

See `references/cli-tools/agent_browser.md` for availability details.
