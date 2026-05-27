// @ts-nocheck
const fs = require('fs');

let content = fs.readFileSync('README.md', 'utf8');

// 1. Remover "Why this matters" parágrafo
content = content.replace(
  /> \*\*Why this matters:\*\* Scope is shaped BEFORE planning, not after. Every plan gets adversarial critique. Gate approval prevents wasted technical work./,
  ''
);

// 2. Atualizar Domain Libraries no diagrama para mostrar como condicional
const oldDomainLibs = `### Domain Libraries (Tactical Reference)

Invoke via \`/skill:cali-product-{name}\` when relevant during planning/execution.

\`\`\`
┌──────────────────────────────────────────────────────────────┐
│  ┌──────────┐ ┌───────────────┐ ┌─────────┐ ┌────────────┐  │
│  │   Ads    │ │Business Models│ │ Pricing │ │Promotions │  │
│  └──────────┘ └───────────────┘ └─────────┘ └────────────┘  │
│  ┌──────────┐ ┌───────────────┐ ┌─────────┐ ┌────────────┐  │
│  │  Health  │ │  Marketplace  │ │Open Src │ │Trust Build│  │
│  └──────────┘ └───────────────┘ └─────────┘ └────────────┘  │
└──────────────────────────────────────────────────────────────┘
\`\`\``;

const newDomainLibsText = `### Domain Libraries (Automatic Detection)

The LLM automatically detects domain signals in your request and suggests relevant playbooks.

**Triggers (auto-detected):**

| User says... | Suggests... |
|---|---|
| "pricing", "subscription", "how much to charge" | Pricing strategy |
| "launch", "promotion", "black friday", "coupon" | Promotions framework |
| "ads", "paid traffic", "facebook ads" | Advertising stages |
| "trust", "guarantee", "social proof" | Trust building |
| "business model", "revenue", "monetize" | Business models |
| "marketplace", "supply/demand" | Marketplace tactics |

**Usage:** Invoke via \`/skill:cali-product-{name}\` when relevant during planning/execution.

\`\`\`
┌──────────────────────────────────────────────────────────────┐
│  DOMAIN LIBRARIES (auto-detected on user input)              │
│                                                              │
│  ┌──────────┐ ┌───────────────┐ ┌─────────┐ ┌────────────┐   │
│  │   Ads    │ │Business Models│ │ Pricing │ │Promotions │   │
│  └──────────┘ └───────────────┘ └─────────┘ └────────────┘   │
│  ┌──────────┐ ┌───────────────┐ ┌─────────┐ ┌────────────┐   │
│  │  Health  │ │  Marketplace  │ │Open Src │ │Trust Build│   │
│  └──────────┘ └───────────────┘ └─────────┘ └────────────┘   │
└──────────────────────────────────────────────────────────────┘
\`\`\``;

content = content.replace(oldDomainLibs, newDomainLibsText);

// 3. Atualizar o fluxo ASCII para incluir Domain Libraries como condicional
const oldFlowEnd = ` ═════▶  Required flow
 ─────▶  Optional / Conditional (dotted line)
\`\`\``;

const newFlowEnd = ` ═════▶  Required flow
 ─────▶  Optional / Conditional (dotted line)
```

┌─────────────────────────────────────────────────────────────┐
│  🔍 Domain Libraries (auto-detected on triggers)           │
│     Pricing · Promotions · Ads · Trust · Business Models    │
│     Health · Marketplace · Open Source                     │
└─────────────────────────────────────────────────────────────┘
\`\`\``;

content = content.replace(oldFlowEnd, newFlowEnd);

// Escrever
fs.writeFileSync('README.md', content);

console.log('README atualizado!');
console.log('Domain Libraries no diagrama:', content.includes('🔍 Domain Libraries'));
console.log('Why this matters removido:', !content.includes('Why this matters'));
console.log('Auto-detected mencionado:', content.includes('auto-detected'));