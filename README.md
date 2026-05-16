# @renatocaliari/pi-product-workflow

Product workflow package for pi.dev coding agent. Includes 15 specialized skills for product planning, strategy, and execution.

## Skills

### Core Planning (7 skills)
| Skill | Invocação | Description |
|-------|-----------|-------------|
| **Product Workflow** | `/skill:cali-product-workflow` | Main workflow: Shape Up + Interface + Tech Planning + Critique + Gate |
| **Short Cycle** | `/skill:cali-product-short-cycle` | Rapid validation with experiments, metrics, pricing |
| **Opportunity Mapping** | `/skill:cali-product-opportunity-mapping` | Strategic opportunity analysis |
| **Job-to-Be-Done** | `/skill:cali-product-job-to-be-done` | JTBD framework for needs discovery |
| **Evolutionary Principles** | `/skill:cali-product-evolutionary-principles` | Stepping-stones and product evolution |
| **Multi-Method Market Analysis** | `/skill:cali-product-multi-method-market-analysis` | PESTLE, Wardley Maps, Delphi, Foresight |
| **Scope Executor** | `/skill:cali-product-scope-executor` | Execute approved scopes with autonomous overnight |

### Growth & Marketing (8 skills)
| Skill | Invocação | Description |
|-------|-----------|-------------|
| **Ads** | `/skill:cali-product-ads` | Advertising strategies (Transtheoretical Model) |
| **Business Models** | `/skill:cali-product-business-models` | Business model creativity |
| **Health** | `/skill:cali-product-health` | Product health monitoring |
| **Marketplace Playbook** | `/skill:cali-product-marketplace-playbook` | Supply/demand balance tactics |
| **Open Source** | `/skill:cali-product-open-source` | Open source strategy paradox |
| **Pricing** | `/skill:cali-product-pricing` | Pricing strategies and models |
| **Promotions** | `/skill:cali-product-promotions` | MAGIC launch promotion framework |
| **Trust Building** | `/skill:cali-product-trust-building` | Trust mechanisms and guarantees |

## Dependencies & Integration

This package integrates with other pi.dev extensions for full orchestration:

| Extension | Package | Author | Purpose |
|-----------|---------|--------|---------|
| **pi-subagents** | `pi-subagents` | nicobailon | Parallel subagent execution, built-in agents |
| **pi-goal** | `@capyup/pi-goal` | capyup | Goal mode: `/goal`, `/sisyphus`, `/goals-set` |
| **plannotator** | `@plannotator/pi-extension` | backnotprop | Plan review with annotations |
| **autoresearch** | `pi-autoresearch` | davebcn87 | Autonomous experiment loop |
| **ask-user-question** | `@juicesharp/rpiv-ask-user-question` | juicesharp | Structured user questions |
| **intercom** | `pi-intercom` | nicobailon | Session-to-session messaging |
| **supervisor** | `pi-supervisor` | tintinweb | Chat steering toward outcomes |

## Installation

### 1. Install the package
```bash
# From npm (when published)
pi install npm:@renatocaliari/pi-product-workflow

# Or from local path
pi install ./path/to/pi-product-workflow
```

### 2. Install dependencies (recommended)
```bash
pi install npm:pi-subagents
pi install npm:@capyup/pi-goal
pi install npm:@plannotator/pi-extension
pi install npm:pi-autoresearch
pi install npm:@juicesharp/rpiv-ask-user-question
pi install npm:pi-intercom
pi install npm:pi-supervisor
```

### 3. Or install all at once
```bash
pi install npm:pi-subagents npm:@capyup/pi-goal @plannotator/pi-extension pi-autoresearch @juicesharp/rpiv-ask-user-question pi-intercom pi-supervisor ./path/to/pi-product-workflow
```

## Usage

### Direct invocation
```bash
/skill:cali-product-workflow
/skill:cali-product-short-cycle "validate my idea"
/skill:cali-product-opportunity-mapping
/skill:cali-product-multi-method-market-analysis
/skill:cali-product-scope-executor
```

### Via AGENTS.md
The global AGENTS.md has the rule to trigger product-workflow automatically:
```
SEMPRE que o usuário pedir qualquer trabalho de software:
1. PARE — não implemente nada ainda
2. DISPARE /skill:cali-product-workflow
```

## Tracking

This package uses `cali-product-workflow.json` for workflow status tracking.

The extension creates:
- `product-workflow/` directory on session start
- `cali-product-workflow.json` tracking file

## Extension

The package includes a lightweight extension (`extensions/cali-product-workflow/`) that:
- Creates `product-workflow/` directory on session_start
- Creates tracking file template if not exists
- Notifies of in-progress workflows

## Package Structure

```
pi-product-workflow/
├── package.json
├── README.md, LICENSE, CHANGELOG.md
├── cali-product-workflow.schema.json
├── skills/                    # 15 skills
│   ├── cali-product-workflow/           # Main workflow
│   ├── cali-product-short-cycle/
│   ├── cali-product-opportunity-mapping/
│   ├── cali-product-job-to-be-done/
│   ├── cali-product-evolutionary-principles/
│   ├── cali-product-multi-method-market-analysis/
│   ├── cali-product-scope-executor/
│   ├── cali-product-ads/
│   ├── cali-product-business-models/
│   ├── cali-product-health/
│   ├── cali-product-marketplace-playbook/
│   ├── cali-product-open-source/
│   ├── cali-product-pricing/
│   ├── cali-product-promotions/
│   └── cali-product-trust-building/
├── extensions/
│   └── cali-product-workflow/
└── scripts/
```

## License

MIT - Cali 2024