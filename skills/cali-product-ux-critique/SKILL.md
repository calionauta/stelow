---
name: cali-product-ux-critique
description: >
  [Cali] Full UX critique for visual interfaces. Accepts a live URL, source code directory,
  or screenshot image. Evaluates accessibility (WCAG AA), Nielsen's 10 heuristics, visual
  hierarchy, cognitive load, consistency, mobile responsiveness, AI slop, emotional journey,
  and design personas — then generates a classified gap report.
  Standalone or integrated into cali-product-workflow and cali-product-testing-execution.
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
| **Accessibility (A11y)** | Contraste WCAG AA, ARIA, keyboard nav, alt text, foco, semântica HTML, forms | WCAG AA / UI Audit |
| **Nielsen Heuristics** | Visibilidade, consistência, prevenção de erros, liberdade, estética, etc. | Nielsen 10 |
| **Visual Hierarchy** | Primary action, visual weight, spacing, alinhamento, tipografia | UI Audit |
| **Cognitive Load** | Progressive disclosure, info density, grouping, labeling, decisões | 8-item checklist |
| **Consistency** | Design tokens, padrões de componentes, ícones, border-radius | UI Audit |
| **Mobile / Responsive** | Touch targets, breakpoints, text scaling, horizontal scroll | Design Quality |
| **Emotional Journey** | Peak-End, anxiety valleys, reassurance, progress indicators | Critique Frameworks |
| **Design Personas** | Alex (power), Jordan (first-timer), Sam (manager), Morgan (a11y), Taylor (mobile) | Critique Frameworks |
| **AI Slop Detection** | 10 tells + anti-patterns de interfaces geradas por IA | Critique Frameworks |

Aceita **3 tipos de input**, cada um ativando um subset diferente das dimensões:

| Input | Detecta | Dimensões cobertas |
|-------|---------|-------------------|
| **URL** | `http://` ou `https://` | **Todas** — auditoria completa ao vivo |
| **Codebase** | Diretório com código-fonte | **~80%** sem browser (exceto contraste exato, keyboard real, screen reader) |
| **Screenshot** | Arquivo `.png` `.jpg` `.webp` | **~60%** — visual hierarchy, AI slop, contraste estimado, cognitive load |

## Como Ativar

### Standalone (uso avulso)
Leia este arquivo e pule para o modo relevante.

### Via cali-product-testing-execution (Phase 3)
O orchestrator do testing-execution carrega esta skill automaticamente quando `Tem interface visual? → SIM`.

### Via cali-product-workflow (Stage Verification)
O stage `ui-quality` em `stages/verification.md` delega para esta skill.

---

## 🔀 Input Router

```
Input fornecido:
  ├── É uma URL (http:// ou https://)?
  │   └→ 🌐 Mode: Live Site Audit (todas as dimensões)
  ├── É um diretório ou arquivo de código?
  │   └→ 📁 Mode: Codebase Audit (~80% coverage)
  └── É uma imagem (.png/.jpg/.webp)?
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

```typescript
agent_browser({
  args: ["open", "--url", "{URL}", "--", "snapshot", "-i"]
})
```

Navegue pelos fluxos principais: login, ação primária, estado vazio, estado de erro,
confirmação destrutiva, formulários.

### 3. Run audit via subagent

```typescript
subagent({
  agent: "reviewer",
  task: `Audit this live site for UX quality.
Mode: Live Site
URL: {URL}
Browser snapshots available.

Use all reference files from:
- ui-audit-dimensions.md: Accessibility (contrast, ARIA, keyboard nav, alt text,
  focus management, semantic HTML, form labels/errors), Design Quality (visual hierarchy,
  cognitive load, consistency, mobile/responsive)
- ux-frameworks.md: Nielsen 10 Heuristics (apply all 10), Emotional Journey (Peak-End,
  anxiety valleys, reassurance), Personas (Alex/Jordan/Sam/Morgan/Taylor), AI Slop Detection
  (10 tells checklist)

Output per output-format.md:
1. 🎯 Executive Summary (accessibility + design scores, top issues)
2. 🚨 Critical Issues (P0 — WCAG A failure, blocking UX)
3. 🤔 Important Issues (P1-P2 — WCAG AA, significant difficulty)
4. 🔎 Minor Issues (P3 — polish, edge cases)
5. ✅ Strengths (what's working well)

For each issue: severity (P0/P1/P2/P3), dimension, what was observed, which checklist item
flagged it, actionable recommendation.

Save to .cali-ux-critique/live-audit-report.md`,
  output: ".cali-ux-critique/live-audit-report.md"
})
```

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

```typescript
subagent({
  agent: "reviewer",
  task: `Audit this codebase for UX quality.
Mode: Codebase
Input path: {INPUT_PATH}

Use all reference files from:
- ui-audit-dimensions.md: Accessibility from source (ARIA attributes, semantic HTML,
  heading hierarchy, alt text, form labels/errors/required indicators, keyboard event
  handlers, focus management via tabIndex, color contrast via CSS tokens). Design from
  source (visual hierarchy via component structure, cognitive load via props/state
  complexity, consistency via design tokens, mobile via media queries and touch target
  sizes in CSS).
- ux-frameworks.md: Nielsen Heuristics from source (consistency, error prevention,
  aesthetic design), cognitive load checklist, AI Slop Detection (generic component
  patterns, redundant microcopy, icon-only buttons without labels).

For each issue: note if it can be verified from source or [needs browser].

Output per output-format.md.
Save to .cali-ux-critique/codebase-audit-report.md`,
  output: ".cali-ux-critique/codebase-audit-report.md"
})
```

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

Leia o arquivo de imagem para análise visual, então:

```typescript
subagent({
  agent: "reviewer",
  task: `Audit this screenshot for UX quality.
Mode: Screenshot
Input file: {INPUT_PATH}

Use all reference files:
- ui-audit-dimensions.md: Accessibility limited to contrast (estimated), alt text
  presence, heading hierarchy visible in layout. Design Quality (visual hierarchy,
  cognitive load — info density, primary action clarity, grouping).
- ux-frameworks.md: Nielsen heuristics (visibility, consistency, aesthetic),
  personas (visual walkthrough), AI Slop Detection (10 tells).

Note limitations: contrast is estimated visually. [needs live testing] for keyboard,
  screen reader, focus, interactive states, animation.

Output per output-format.md.
Save to .cali-ux-critique/screenshot-audit-report.md`,
  output: ".cali-ux-critique/screenshot-audit-report.md"
})
```

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

Phase 3 delega para esta skill:

```
Phase 3: UI/UX Quality
  └── cali-product-ux-critique (URL ou codebase mode)
       ├── Accessibility (WCAG AA)
       ├── Nielsen 10 Heuristics
       ├── Design Quality (hierarchy, consistency, mobile)
       ├── Emotional Journey
       ├── Design Personas
       └── AI Slop Detection
```

### cali-product-workflow (Stage Verification)

O stage `ui-quality` em `stages/verification.md` delega para esta skill nos tiers
Quick (codebase mode) e Full (live site mode).

### cali-product-scope-executor

Quando um scope visual é executado, o executor delega a verificação de UX para
esta skill.

---

## Environment Adaptation

Se agent_browser não estiver disponível (ex: outros CLIs), use Codebase mode
(~80% coverage) e note no relatório o que não pôde ser verificado.

See `references/cli-tools/agent_browser.md` for availability details.
