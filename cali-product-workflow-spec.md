# cali-product-workflow — Product Spec

> Reverse-engineered from source code. Tech-stack agnostic.
> Generated: 2026-05-22

## 1. Product Overview

**cali-product-workflow** is a multi-CLI product strategy orchestrator that transforms raw product ideas into approved, testable technical plans. It guides teams through a structured multi-stage workflow (Setup → Context → Shape → Critique → Gate → Scope → Interface → Int.Gate → Selection → Planning → Execution → Verification → Audit) combining Shape Up methodology, adversarial critique, interface alternatives with visual review gates, and AI-aware technical scoping with automatic execution routing.

**Who uses it:** AI coding agent users (Pi, OpenCode, Claude Code, Codex) who need systematic product planning before implementation.

**Core problem solved:** Prevents premature coding by enforcing structured planning phases with visual review gates (Plannotator), ensuring product decisions are debated before engineering resources are committed.

---

## 2. Tech Stack Summary (context only)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Extension | TypeScript (ESM) | Pi, OpenCode, Claude Code, Codex plugins |
| Skills | Markdown | 16 skill files for workflow phases |
| State | JSON files | Per-project + global tracking |
| CLI Detection | Node.js fs/path | Dir-based + env var |
| Security | Trivy, Socket.dev, OSV | Supply chain scanning |
| Testing | Vitest + Stryker | Unit + mutation testing |
| Distribution | Git (GitHub only) | No npm — security choice |

*Note: This section exists for context only. The rest of the spec is tech-agnostic.*

---

## 3. User Roles & Permissions

This is a single-user tool per coding agent session. No multi-user roles exist.

| Role | Capabilities |
|------|-------------|
| **Agent User** | Execute all workflow commands, access all phases |
| **Extension/Plugin** | Auto-registers commands, handles events, updates UI |

---

## 4. Features & Product Rules

### Feature: Multi-CLI Orchestration
**Description:** Single codebase adapts to 4 CLI harnesses (Pi, OpenCode, Claude Code, Codex) with appropriate capability mapping.

**Rules:**
- CLI detection: Priority 1 (env var `PRODUCT_WORKFLOW_CLI`), Priority 2 (config directories), Priority 3 (generic fallback)
- Capability matrix: Each CLI gets appropriate tool mappings (e.g., `ask_user_question` only on Pi)
- Adapter pattern: `createAdapter(cli)` generates CLI-specific event routing

---

### Feature: Workflow Orchestration (15 phases)
**Description:** Structured workflow from idea → plan → execution with safety gates.

```
Phase 0:  Inbox Triage      → Classify incoming request
Phase 1:  Item Selection    → User picks what to work on
Phase 2:  Project Setup     → Auto-discovery, stage selection
Phase 3:  Strategic Context → Optional, gated by `context:5` (appetite/mode): 5 strategic approaches (JTBD, Evolutionary, Opportunity Mapping, Multi-Method Market Analysis, Product Discovery) + 8 domain libraries (Pricing, Trust, Ads, Promotions, Health, Marketplace, Open Source, Business Models)
Phase 4:  Shape Up          → Shape the solution (IN/OUT scope)
Phase 5:  Plan Critique     → Adversarial review via subagent
Phase 6:  Review Gate       → Plannotator visual approval (REQUIRED)
Phase 7:  Scope Adjustment   → Fine-tune after gate approval
Phase 8:  Interface Alternatives → 5 ASCII proposals + hybrid
Phase 9:  Interface Gate    → Plannotator visual approval
Phase 10: Interface Selection → User picks via ask_user_question
Phase 11: Tech Planning     → Typed scopes (feature/spike/optimize)
Phase 12: Execution         → Automatic via subagent + acceptance (see goals.md)
Phase 13: Verification      → Full test suite, code review, UI/browser testing
Phase 14: Execution Critique    → Post-execution verification
```

**Rules:**
- Phases 0-8: Implementation tools (write/edit/bash) trigger "bypass" warning
- Phase 6 Gate: **MUST** use Plannotator before proceeding
- Phase 9 Interface Gate: **MUST** use Plannotator before selection
- Execution (Phase 12): **AUTOMATIC** after Plannotator approval — no confirmation prompt
- Verification (Phase 13): **AUTOMATIC** after Execution — runs test suite, code review, UI audit, browser testing
- Execution Critique (Phase 14): **AUTOMATIC** after Verification passes

---

### Feature: Domain Auto-Detection
**Description:** LLM analyzes user input for domain signals and offers relevant playbooks.

**Detected Domains:**

| Signal | Domain | Skill |
|--------|--------|-------|
| "price", "pricing", "subscription" | Pricing | `cali-product-pricing` |
| "promotion", "coupon", "discount" | Promotions | `cali-product-promotions` |
| "ad", "facebook ads", "google ads" | Ads | `cali-product-ads` |
| "trust", "guarantee", "social proof" | Trust | `cali-product-trust-building` |
| "business model", "monetize" | Business Models | `cali-product-business-models` |
| "open source", "community edition" | Open Source | `cali-product-open-source` |
| "product health", "wellbeing" | Health | `cali-product-health` |
| "marketplace" | Marketplace | `cali-product-marketplace-playbook` |

**Rules:**
- Mode A: Purely domain-specific request → Route to skill directly, skip Shape Up
- Mode B: General request with domain overlap → Offer as complementary context
- User selects which libraries to load via multi-select question

---

### Feature: Workflow State Management
**Description:** Persistent tracking via JSON files (per-project + global).

**Files:**
- `cali-product-workflow.json` — Project-local workflow tracking
- `.cali-pw-global.json` — Global cross-project workflows
- `.cali-product-workflow/{date}/{slug}/` — Per-workflow artifacts

**Rules:**
- Workflow status: `draft` | `planning` | `approved` | `in-progress` | `completed` | `archived`
- Orphan handling: If active workflow exists on start, show overlay to continue/archive/cancel
- Resume mechanics: `[RESUME]` token restores state, skips Phase 0
- Global workflows: Persist across sessions when project-local tracking is empty

---

### Feature: CLI Commands
**Description:** Slash commands for workflow control.

| Command | Alias | Purpose |
|---------|-------|---------|
| `/pw-start` | `/pw-start` | Start new workflow |
| `/pw-stop` | `/pw-stop` | Stop workflow(s) |
| `/pw-pause` | `/pw-pause` | Pause active workflow |
| `/pw-resume` | `/pw-resume` | Resume paused workflow |
| `/pw-next` | `/pw-next` | Advance to next phase |
| `/pw-goto` | `/pw-goto` | Jump to specific phase |
| `/pw-rename` | `/pw-rename` | Rename workflow |
| `/pw-menu` | `/pw-menu` | Show workflow menu |
| `/pw-archive` | `/pw-archive` | Archive workflow(s) |
| `/pw-unarchive` | `/pw-unarchive` | Restore archived workflow |

---

### Feature: TUI Status Footer
**Description:** Real-time workflow state display in agent UI footer.

**Rules:**
- Shows: Workflow name, current phase, phase progress
- Bypass indicator: Warning when implementation tools used in early phases
- Phase notifications: Toast on phase change
- CLI-aware: Uses CLI-specific notification/status APIs

---

### Feature: Interface Alternatives
**Description:** Generate 5 interface proposals (ASCII wireframes) then create hybrid.

**Rules:**
- 5 archetypes: Independent exploration of different approaches
- ASCII wireframes: Required for each proposal (5-10 lines)
- Hybrid creation: After all proposals complete, LLM creates hybrid
- User selection: ask_user_question with side-by-side preview (max 20 rows)
- Max options: 5 proposals + 1 hybrid = 6 options

---

### Feature: Scope Generation & Execution Routing
**Description:** Typed technical scopes with automatic executor routing.

**Scope Types:**

| Type | Executor | Use Case |
|------|----------|----------|
| `feature` | subagent + acceptance (see goals.md) + `/supervise` | Standard features |
| `optimization` | subagent + acceptance (benchmark verify) | Performance tuning |
| `spike` | subagent + acceptance (see goals.md) + `/supervise` | Research/uncertainty |
| `test-*` | subagent + acceptance (see goals.md) + testing gates | Test coverage |

**Rules:**
- Sequencing: Riskiest-first or UI-first principle
- Executor override: `[EXECUTOR] optimization-goal` optional tag
- TDD guidance: TDD for critical paths + mutation testing for AI-generated code
- Worktree: Optional git worktree for isolated execution in shared repo

---

### Feature: Claim Verification
**Description:** Before Plannotator gate, verify spec claims against actual codebase.

**Rules:**
- Regex extract: `grep -E '\`[^\`]+:[0-9]+\`' spec-product.md`
- Verification: Check each code reference exists and matches claim
- Report: ✅ Verified / ⚠️ Discrepancies / ❌ Not Found
- Fix requirement: Resolve before gate submission

---

## 5. User Flows

### New Workflow Flow
```
User Input
    │
    ▼
[pw-start] command
    │
    ▼
Orphan Check ───► [Show overlay if active workflow exists]
    │
    ▼
CLI Detection
    │
    ▼
Auto-Discovery Check (context, skills, recent plans)
    │
    ▼
Stage Selection (new vs resume)
    │
    ▼
[Phase 0-4] Shape Up Planning
    │
    ▼
[Phase 5] Critique via subagent
    │
    ▼
[Phase 6] Review Gate (Plannotator)
    │         │
    │    ┌───┴───┐
    │   PASS    FAIL
    │    │        │
    │    ▼        ▼
    │ [Continue] [Revise spec]
    │    │        │
    └────┴────────┘
    │
    ▼
[Phase 7] Scope Adjustment
    │
    ▼
[Phase 8] Interface Alternatives (conditional)
    │
    ▼
[Phase 9] Interface Gate (Plannotator)
    │
    ▼
[Phase 10] Interface Selection (ask_user_question)
    │
    ▼
[Phase 11] Tech Planning (subagent)
    │
    ▼
[Phase 12] Execution (automatic)
    │
    ▼
[Phase 13] Verification (test suite, review, UI audit)
    │
    ▼
[Phase 14] Execution Critique
```

### Interface Alternatives Flow
```
User accepts Interface phase
    │
    ▼
Generate 5 proposals (parallel subagents)
    │
    ├── Proposal A ──► ASCII Wireframe
    ├── Proposal B ──► ASCII Wireframe
    ├── Proposal C ──► ASCII Wireframe
    ├── Proposal D ──► ASCII Wireframe
    └── Proposal E ──► ASCII Wireframe
    │
    ▼
Create Hybrid (best elements)
    │
    ▼
[Phase 9] Plannotator review
    │
    ▼
[Phase 10] User selection (ask_user_question)
    │         │
    │    ┌───┴───┐
    │   A    B    C    D    E    H
    │                      │
    ▼                      ▼
[Continue to Tech Planning]
```

### Execution Routing Flow
```
Plannotator approves spec-tech_v{N}.md
    │
    ▼
Worktree Check ───► [Create git worktree if needed]
    │
    ▼
For each scope (in sequence):
    │
    ├── TYPE=feature ──► subagent + acceptance + /supervise
    ├── TYPE=optimization ──► subagent + acceptance (benchmark verify)
    ├── TYPE=spike ──► subagent + acceptance + /supervise
    └── TYPE=test-* ──► subagent + acceptance + testing gates
    │
    ▼
Code Quality Gate (optional)
    │
    ▼
[Phase 13] Verification (test suite, review, UI audit)
    │
    ▼
[Phase 14] Execution Critique
```

---

## 6. Screens & Components

### TUI Footer (All CLIs)
```
┌──────────────────────────────────────────────────────────────────────┐
│ Workflow: "feature-auth" | Phase 4/14 [Shape] | ●●●●○○○○○○○○○○○ | ⚠BYPASS │
└──────────────────────────────────────────────────────────────────────┘
```
- **Purpose:** Show current workflow state at a glance
- **Components:** Workflow name, phase name, progress dots, bypass warning
- **States:** Normal (dots), Bypass warning (⚠), Phase change notification

---

### Orphan Workflow Overlay (Pi)
```
┌──────────────────────────────────────────────────────────────────────┐
│ ⚠ Active Workflow Found                                        [X] │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Workflow: "feature-login"                                          │
│  Phase: 4/13 [Shape]                                                │
│  Started: 2026-05-22                                                 │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │  [Continue Current]  [Archive & Start New]  [Cancel]       │     │
│  └──────────────────────────────────────────────────────────────┘     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```
- **Purpose:** Handle conflict when starting new workflow with existing active one
- **Components:** Workflow summary, action buttons
- **States:** Awaiting choice

---

### Workflow Menu (Pi)
```
┌──────────────────────────────────────────────────────────────────────┐
│ 📋 cali-product-workflow — Workflow Menu                      [X]   │
├──────────────────────────────────────────────────────────────────┬───┤
│                                                                   │
│  🟢 Active (1)                                                   │
│  ├─ feature-auth        [Shape 4/13]  ●●●●○○○○○○○                │
│                                                                   │
│  🟡 Paused (0)                                                    │
│  └─ (none)                                                        │
│                                                                   │
│  🔵 Archived (2)                                                   │
│  ├─ feature-dashboard    [Audit 13/13] ●●●●●●●●●●●●               │
│  └─ spike-search        [Cancelled]                              │
│                                                                   │
│  ────────────────────────────────────────────────────────────────  │
│                                                                   │
│  [🏠 Dashboard]  [▶️ Start New]  [📊 Audit Report]  [❌ Close]   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┴───┘
```
- **Purpose:** Central hub for workflow management
- **Components:** Status sections (Active/Paused/Archived), action buttons
- **States:** Loaded, empty

---

### Interface Selection Question (Pi)
```
┌──────────────────────────────────────────────────────────────────────┐
│ Which interface direction to follow?                                  │
│ Recommendation: Hybrid (combination of each proposal's strengths).   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐ ┌─────────────────────────────────────────┐    │
│  │ A — Proposal A  │ │ ┌───────────────────────────────────┐   │    │
│  │                 │ │ │ Header: Auth Flow                 │   │    │
│  │ Archetype:       │ │ ├───────────────────────────────────┤   │    │
│  │ Linear Flow      │ │ │ [Login] ──► [Verify] ──► [Home]  │   │    │
│  │                 │ │ └───────────────────────────────────┘   │    │
│  │ Description:     │ │                                      │    │
│  │ Simple linear   │ │ • Key step visibility                │    │
│  │ authentication  │ │ • Clear progress                      │    │
│  │ flow...         │ │ • Error inline                        │    │
│  └─────────────────┘ └─────────────────────────────────────────┘    │
│                                                                      │
│  [A] [B] [C] [D] [E] [H — Hybrid (Recommended)]                      │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```
- **Purpose:** Visual comparison for interface direction selection
- **Components:** Side-by-side option previews with ASCII wireframes
- **States:** Loading (hatched), populated (wireframes), selected

---

### Phase Status Report (Pi)
```
┌──────────────────────────────────────────────────────────────────────┐
│ 📍 Workflow Status                                                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Workflow: feature-auth                                            │
│  Status: planning                                                   │
│  Created: 2026-05-22T10:30:00Z                                     │
│  Updated: 2026-05-22T11:45:00Z                                     │
│                                                                      │
│  Phase Progress:                                                    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 0️⃣ Triage   │ 1️⃣ Select │ 2️⃣ Setup  │ 3️⃣ Context │ 4️⃣ Shape   │    │
│  │  ●        │    ○     │    ●     │    ○     │    ○     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Current: Setup (phase 2)                                          │
│  └─ Next: Strategic Context (phase 3)                               │
│                                                                      │
│  Bypass Status: ⚠️ Implementation tools used before Gate           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 7. Data Models

### Entity: Workflow
| Field | Type | Rules / Notes |
|-------|------|---------------|
| name | string | Human-readable, unique per project |
| dirHash | string | Stable directory name (e.g., `pw-ollc-whkaxv`) |
| description | string | Brief description |
| draftContent | string | Original user input text |
| source | string | File paths referenced |
| status | enum | draft/planning/approved/in-progress/completed/archived |
| currentPhase | number | 0-14 |
| phases | Phase[] | Array of phase status objects |
| created | timestamp | ISO 8601 |
| updated | timestamp | ISO 8601 |
| cwd | string | Working directory path |
| worktreePath | string | Git worktree path if created |
| detectedCLI | string | CLI harness at creation |

### Entity: Phase
| Field | Type | Rules / Notes |
|-------|------|---------------|
| id | string | Phase identifier |
| name | string | Human-readable name |
| status | enum | pending/in-progress/completed/skipped |
| started | timestamp | ISO 8601 (optional) |
| completed | timestamp | ISO 8601 (optional) |

### Entity: TrackingData
| Field | Type | Rules / Notes |
|-------|------|---------------|
| $schema | string | URL to JSON schema |
| version | string | Semantic version |
| created | timestamp | ISO 8601 |
| updated | timestamp | ISO 8601 |
| workflows | Workflow[] | Array of workflow entries |

### Entity: CLI Capabilities
| Field | Type | Rules / Notes |
|-------|------|---------------|
| cli | enum | pi/opencode/claude-code/codex/generic |
| hasPluginSystem | boolean | Supports extensions |
| hasCommands | boolean | Supports slash commands |
| hasSubagent | boolean | Subagent delegation |
| hasAskUserQuestion | boolean | ask_user_question tool |
| hasGoals | boolean | Goal system (ordered/flexible modes) |
| hasIntercom | boolean | Cross-session messaging |
| hasSupervise | boolean | Supervisor tracking |
| hasTUI | boolean | UI overlay |
| hasMCPSupport | boolean | MCP tools |

---

## 8. API Surface

This is a local agent tool — no external API. Commands are processed via CLI extension.

### `/pw-start`
**Purpose:** Create new workflow
**Auth:** Any authenticated agent session
**Args:** `name=<string>` `description=<string>` `source=<@filepath>`
**Returns:** Workflow created, TUI updated
**Rules:**
- Orphan check before creation
- Auto-generates dirHash for untitled workflows
- Stores in local cali-product-workflow.json

### `/pw-stop`
**Purpose:** Stop active workflow(s)
**Auth:** Any authenticated agent session
**Args:** `all` | `name=<workflow>` | positional names
**Returns:** Workflow archived, TUI cleared

### `/pw-next`
**Purpose:** Advance to next phase
**Auth:** Any authenticated agent session
**Returns:** currentPhase incremented, phase marked complete
**Rules:**
- Only advances forward (no backward by default)
- Emits phase change notification

### `/pw-goto`
**Purpose:** Jump to specific phase
**Auth:** Any authenticated agent session
**Args:** `phase=<0-14>`
**Returns:** Workflow updated to target phase
**Rules:**
- Used for recovery/skipping
- Logs as intentional override

### `/pw-rename`
**Purpose:** Rename active workflow
**Auth:** Any authenticated agent session
**Args:** `name=<new-name>`
**Returns:** Workflow name updated, dirHash stable
**Rules:**
- dirHash remains unchanged (directory reference stable)

---

## 9. AI / LLM Integration

### AI Feature: Subagent Review (Plan Critique)

**Provider:** Inherited from parent agent (any LLM)
**Model:** Agent's default model
**Streaming:** Inherited

**System Prompt:**
```
Role: Adversarial reviewer
Task: Analyze spec-product.md using checklists from references/
Output: Executive Summary + Critical Questions (🚨) + Important (🤔) + Minor (🔎) + Strengths
Format: Per output-format.md
```

**User Prompt Template:**
```
Review the spec-product.md using checklists from references/.
Use: plan-critique-context.md (role), checklists.md (primary), critique-frameworks.md (UX), audit-dimensions.md (technical).
Do NOT resolve gaps — only identify and classify.
Save to .cali-product-workflow/{date}/{dir}/plans/critique-report.md
```

**Input:** spec-product.md + reference checklists
**Output:** critique-report.md with categorized findings
**Post-processing:** Report must pass format validation before gate

---

### AI Feature: Subagent Tech Planning (Scope Generation)

**Provider:** Inherited from parent agent
**Model:** Agent's default model
**Streaming:** Inherited

**System Prompt:**
```
Task: Generate tech scopes for the approved spec-product.md
Steps: 1) Check strategic stability, 2) Codebase awareness, 3) Technical risk analysis, 4) Identify spikes, 5) Define typed scopes, 6) Sequence, 7) Detail DoD + acceptance criteria, 8) Format per output-format.md
```

**User Prompt Template:**
```
Using references/tech-context.md, references/scopes-and-sequencing.md, references/tech-output.md:
Also reference cali-product-code-standards for coding principles + Datastar framework philosophy.
1. Check strategic stability (Step 0)
2. Codebase awareness check (Step 1)
3. Technical risk analysis (Step 2)
4. Identify spikes (Step 3)
5. Define typed scopes: feature | optimization | spike (Step 4)
6. Sequence (riskiest-first or ui-first) (Step 5)
7. Detail each scope with DoD + acceptance criteria (Step 6)
8. Format per output-format.md (Step 7)

Input: .cali-product-workflow/{date}/{dir}/plans/spec-product_{v}.md
Output: .cali-product-workflow/{date}/{dir}/plans/spec-tech_{v}.md
```

**Scope Types (output):**
```
[SCOPE-1]
[TYPE] feature
[NAME] User authentication
[DESCRIPTION] Implement JWT-based auth with refresh tokens
[DoD] - Login/logout functional
      - Token refresh works
[ACCEPTANCE] - User can login
             - Session persists 7 days
```

---

### AI Feature: Interface Alternatives Proposals

**Provider:** Inherited from parent agent
**Model:** Agent's default model

**Process:**
1. Generate 5 independent proposals (parallel subagents)
2. Each proposal: ASCII wireframe + key characteristics + trade-offs
3. Create hybrid combining best elements

**Output Structure:**
```
## Proposal A: [Name]
### ASCII Wireframe
┌─────────────────────────────────┐
│ Header                           │
├─────────────────────────────────┤
│ Content                          │
└─────────────────────────────────┘

### Key Characteristics
- Characteristic 1
- Characteristic 2

### Trade-offs
✅ Strength: ...
⚠️ Risk: ...
```

---

## 10. Business Rules Catalog

BR-001: Workflow starts only after orphan check confirms no active workflow conflict.

BR-002: Implementation tools (write/edit/bash) in phases 0-8 trigger bypass warning but do not block.

BR-003: Phase 6 Gate MUST use Plannotator visual review — no skip allowed.

BR-004: Phase 9 Interface Gate MUST use Plannotator visual review — no skip allowed.

BR-005: Execution (Phase 12) is AUTOMATIC after Plannotator approval — no confirmation prompt.

BR-006: CLI detection priority: env var > config directories > command availability > generic fallback.

BR-007: Workflow status transitions: draft → planning → approved → in-progress → completed → archived.

BR-008: Global workflows persist when project-local tracking has no matching workflow.

BR-009: Domain auto-detection offers playbooks only for detected signals — no false positives.

BR-010: Interface Alternatives generates exactly 5 proposals + 1 hybrid recommendation.

BR-011: ask_user_question with previews limited to 20 rows for side-by-side mode.

BR-012: Scope executor routing: feature→subagent+acceptance, optimization→subagent+acceptance with benchmark verify, spike→subagent+acceptance, test-*→subagent+acceptance+testing gates.

BR-013: TDD recommended only for critical business logic; test-after for external APIs and AI workflows.

BR-014: Git worktree creation is optional for execution in shared repositories.

BR-015: Claim verification extracts code references via regex before gate submission.

BR-016: Workflow rename preserves dirHash for stable directory reference.

BR-017: Resume token `[RESUME]` restores state and skips Phase 0 triage.

BR-018: Multi-select questions suppress "Type something." row automatically.

BR-019: Bypass flag cleared when agent advances to Phase 10 (Selection) or beyond via /pw-next.

BR-020: Orphan overlay options: Continue Current, Archive & Start New, Cancel.

BR-021: Schema validation on tracking file read; schema URL points to GitHub raw.

BR-022: Security: No npm distribution — GitHub-only for supply chain safety.

BR-023: Supply chain scanning via Trivy (recommended), Socket.dev (behavioral), OSV-scanner (precision).

---

## 11. Open Questions / Inferred Behavior

⚠️ **INFERRED:** The `worktreePath` field exists but worktree creation/cleanup logic appears incomplete in the source — unclear if worktrees are automatically removed after execution.

⚠️ **INCOMPLETE:** The delivery audit (Phase 14) references an audit checklist but the actual audit automation implementation was not fully traced.

⚠️ **INFERRED:** The `hasGoals` capability is tracked but no direct integration with `/goals` was found in the workflow phases — may be reserved for future use.

❓ **UNCLEAR:** The `draftContent` field stores original user input but there's no explicit length limit — could grow unbounded for very long feature requests.

❓ **UNCLEAR:** The `detectedCLI` field captures CLI at workflow creation but doesn't track if user switches CLIs mid-session.

❓ **UNCLEAR:** The global tracking file (`.cali-pw-global.json`) appears designed for cross-project workflow visibility but the full synchronization logic was not traced.