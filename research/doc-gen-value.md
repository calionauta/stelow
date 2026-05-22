# Research: What Makes Documentation/Spec Generation Skills Truly Valuable

> **Context:** Analyzed execution of `cali-codebase-spec` skill on `cali-product-workflow` codebase.
> **Goal:** Identify gaps, friction points, and improvements for making spec generation more valuable (80/20 principle).

---

## Part 1: What Went Wrong / Ambiguous During Execution

### 1.1 Output Path Was Wrong
- **Issue:** The skill specified `/mnt/user-data/outputs/<project-name>-spec.md` — this is a Pi-specific path that doesn't exist on the filesystem.
- **Fix needed:** Detect the actual environment or use a relative path.
- **Lesson:** Environment-specific paths should be abstracted or auto-detected.

### 1.2 No Clear Entry Point Prioritization
- **Issue:** The skill listed all reconnaissance steps sequentially (1.1-1.8) without priority signals.
- **What happened:** I read most files in order instead of starting with the most valuable ones first.
- **What would help:** A "Start Here" section that tells me which files to open first and why.

### 1.3 No Guidance on "How Deep" to Go
- **Issue:** The skill said "read all route/controller/page files" and "read data models/schemas" — but for a codebase with hundreds of files, this is overwhelming.
- **What happened:** I used batch commands to get file lists, but had no guidance on when to stop reading.
- **What would help:** A sampling strategy: "Read top 20 files by importance, then stop unless X signal found."

### 1.4 Ambiguous Phase Transitions
- **Issue:** Phase 2 (Synthesis) just says "synthesize the full picture before writing" — no concrete criteria for "when am I done reading?"
- **What happened:** I kept reading files until I felt done, which was inefficient.
- **What would help:** Saturation signals: "Stop when you can answer these 5 questions about the product."

### 1.5 No Handling of Multi-Module/Monorepo
- **Issue:** The skill assumes a single project, but `cali-product-workflow` is a monorepo with multiple packages (`extensions/`, `skills/`, `cli-agents/`).
- **What happened:** I had to figure out how to handle the nested structure on my own.
- **What would help:** Explicit handling for monorepos: "Identify root packages, treat each as a sub-product."

### 1.6 ASCII Art Burden
- **Issue:** The skill expects ASCII wireframes for every screen, which is time-consuming and often inaccurate.
- **What happened:** I generated wireframes based on component names and prop names, which is inference, not extraction.
- **What would help:** Make ASCII art optional for complex screens, or use a template that's easier to fill.

---

## Part 2: The Gap Between Simple Extraction vs. Deep Analysis

### Simple Extraction (What Most Tools Do)
```
Input: `src/auth/login.ts`
Output: "This file handles login"
```

### Deep Analysis (What Would Be Valuable)
```
Input: `src/auth/login.ts`
Output:
- This file handles login
- BUT: It's missing the `refresh_token` flow that the JWT middleware expects
- RISK: Users will be logged out after 15min (no sliding session)
- GAP: The `logout` endpoint exists but doesn't invalidate the refresh token
- QUESTION: Is this intentional or a bug?
```

### Key Difference: Inference vs. Assertion
| Simple Extraction | Deep Analysis |
|-----------------|--------------|
| "calls `validateEmail()`" | "expects valid email format but no regex shown in this file" |
| "returns User object" | "returns partial User — missing `role` field that middleware checks" |
| "handles error" | "catches error but doesn't log it — lost in production" |

### Techniques for Inferring Intent
1. **Cross-reference patterns:** If `validateEmail()` is called but never defined, note it.
2. **Dead code detection:** Fields/models that exist but are never used.
3. **Inconsistency hunting:** If one endpoint has rate limiting but siblings don't.
4. **Convention detection:** Infer what SHOULD be there based on project patterns.

---

## Part 3: What Users Actually Need from Code Analysis Tools

### Primary Use Cases (From Usage Patterns)

| Use Case | User Goal | Tool Should Deliver |
|----------|-----------|-------------------|
| **Onboarding** | "I just joined this team, teach me the product" | High-level overview + key flows + decision points |
| **Debugging** | "Something broke in auth, where do I look?" | Route to relevant files + known edge cases |
| **Refactoring** | "We want to change the pricing model" | Data models + business rules + dependencies |
| **Feature Add** | "Add SSO support" | API surface + auth flows + integration points |
| **Code Review** | "Is this PR safe to merge?" | Changed behavior + risk areas + test coverage |

### What Users DON'T Need
- Raw file dumps
- Line-by-line code explanations
- Tech stack worship (showing off that you can read TypeScript)
- Perfect ASCII art that took 20 minutes to draw

### What Users DO Need
- **Decisions:** "What can users do vs. what they can't?"
- **Rules:** "What governs those actions?"
- **Boundaries:** "Where does the system stop?"
- **Trust signals:** "Is this rule enforced or just wishful thinking?"

---

## Part 4: Structured Output Patterns That Work

### Pattern 1: Decision-First Documentation
```
# Auth Feature

## Can Users...
- [x] Login with email/password
- [x] Login with Google OAuth
- [ ] Login with SAML (planned Q3)
- [x] Logout (invalidates session)
- [ ] Delete account (GDPR request)

## Rules
- Sessions expire after 15min inactivity
- Max 5 failed attempts per 15min
- Refresh tokens rotate on each use
```

### Pattern 2: Question-Based Structure
Instead of "Data Models" section, answer:
- "What entities exist?"
- "How do they relate?"
- "What's missing that should exist?"

### Pattern 3: Confidence Levels
```
| Rule | Source | Confidence |
|------|--------|------------|
| Sessions expire 15min | `auth/middleware.ts:24` | HIGH (exact code) |
| Rate limit 5/15min | `auth/login.ts:42` + `redis.ts:10` | HIGH |
| Users can delete account | Admin panel found | MEDIUM (no delete code found) |
| SSO supported | README mentions | LOW (no SSO code found) |
```

### Pattern 4: Risk-Based Prioritization
```
## High Risk Areas (review carefully)
- Payment processing: Stripe webhook handler exists but `payment_failed` not handled
- Auth race condition: Token refresh not atomic
- Data loss risk: Soft delete not implemented

## Low Risk Areas (can skip)
- Static asset serving
- Health check endpoints
- Debug logging
```

---

## Part 5: Best Practices from Industry Research

### From "Developer Experience Documentation" Studies

1. **Context over completeness:** Developers want to answer a specific question, not read 200 pages.
2. **Decision provenance:** "Why was this built this way?" is more valuable than "What does this do?"
3. **Living documents:** Static specs die. Need to show how to update when code changes.
4. **Layered detail:** Start with 1-paragraph summary, drill down on demand.

### From "Technical Debt Identification AI" Research

1. **Inconsistency detection:** Compare similar modules for pattern violations.
2. **Coupling analysis:** Find modules that change together but shouldn't.
3. **Comment-code drift:** Flag comments that contradict the code.
4. **Abandoned feature detection:** Find imports/functions that are never called.

### From "Codebase Documentation Best Practices"

1. **Use code as source of truth:** Don't write docs that diverge from code.
2. **Document decisions, not implementation:** The code shows HOW; docs should explain WHY.
3. **Make implicit explicit:** Unwritten rules (like "we never delete users") should be stated.
4. **Visualize architecture:** ASCII diagrams that show connections, not just boxes.

---

## Part 6: Recommendations for Improving `cali-codebase-spec`

### High-Impact Improvements (80/20)

| Improvement | Impact | Effort |
|-------------|--------|--------|
| 1. Add "Start Here" with entry point files | High | Low |
| 2. Add saturation criteria for reading | High | Medium |
| 3. Detect environment for output path | High | Low |
| 4. Add confidence levels to rules | Medium | Low |
| 5. Make ASCII art optional/lightweight | Medium | Medium |
| 6. Add question-based synthesis prompts | High | Low |
| 7. Handle monorepos explicitly | Medium | Medium |
| 8. Add decision provenance section | High | Low |

### Specific Skill Changes

#### Before (Current):
```
## Phase 1 — Reconnaissance
1.1 Map the repository structure
1.2 Identify what kind of system this is
...
```

#### After (Improved):
```
## Phase 1 — Reconnaissance

### Start Here
Read these files FIRST (in order):
1. `package.json` or `pyproject.toml` — identifies system type + dependencies
2. `src/main.ts` or `app.py` — entry point shows what loads first
3. `README.md` — human context if exists

### Stop When饱和 (Saturated)
Stop reading when you can answer:
- [ ] What problem does this product solve?
- [ ] Who are the users?
- [ ] What are the 5 main things a user can do?
- [ ] Where does AI/LLM fit in (if at all)?
- [ ] What are the 3 most important business rules?

### Sampling Strategy
- Small repo (<50 files): Read everything
- Medium repo (50-200 files): Read top 30 by importance
- Large repo (200+ files): Read package.json roots, then feature directories

### Monorepo Handling
If multiple `package.json` files found:
- Treat each as a sub-product
- Generate one master spec + sub-specs
- Link related modules across packages
```

### Adding Confidence Levels

```markdown
### BR-004: Rate limiting on login
**Confidence:** HIGH
**Evidence:** `src/auth/login.ts:42` + `redis.ts:10`
**Code:**
```typescript
const attempts = await redis.incr(`login:${email}`);
if (attempts > 5) throw new RateLimitError();
```

**Confidence:** LOW (inferred)
**Evidence:** Comment in `src/auth/login.ts:100`
**Comment:** "// TODO: add rate limiting"
**Note:** Not implemented yet, may be skipped.
```

### Adding Decision Provenance

```markdown
### Why does this product use webhooks instead of polling?

**Decision:** Webhook-based notifications
**Date:** ~2024-03 (git history)
**Rationale found:** `src/webhooks/README.md:1` - "Avoids polling overhead"
**Alternative considered:** Polling (rejected due to "unnecessary API calls")
**Status:** Active

### Why is there no soft-delete?

**Decision:** Hard delete only
**Rationale found:** None in code/comments
**Possible reasons:**
1. GDPR compliance (hard delete required)
2. Simplicity (not a consideration)
3. Oversight (technical debt)
**Recommendation:** Ask team/check meeting notes.
```

---

## Part 7: Competitive Analysis — What Similar Tools Do

### Tools That Do Code → Documentation

| Tool | Approach | Strengths | Weaknesses |
|------|----------|-----------|------------|
| **Doxygen** | Extract from comments | Works with many languages | Only documents what's commented |
| **Swagger/OpenAPI** | API-first | Standard format | Only covers API surface |
| **Mermaid diagram generators** | Visual | Pretty diagrams | Often wrong/misleading |
| **GitBook** | Human-written | Good UX | Can diverge from code |
| **AI code explainers** | LLM-based | Fast | Often generic/nonsensical |
| **Storybook** | Component docs | Visual + interactive | Frontend only |

### What's Missing in the Market
1. **Business logic extraction** — finding rules, not just structure
2. **Decision tracking** — why was this built this way?
3. **Gap analysis** — what's missing that should exist?
4. **Risk identification** — where are the danger zones?
5. **Confidence scoring** — how sure are we about each finding?

---

## Part 8: Summary — Key Principles for 80/20 Value

### The 20% That Delivers 80% of Value

1. **Entry Point First** — Show me where to start
2. **Saturation Signals** — Tell me when to stop reading
3. **Confidence Levels** — Don't pretend we're 100% sure
4. **Decision Provenance** — Explain WHY, not just WHAT
5. **Question-Based** — Answer what users actually need to know
6. **Risk-Based** — Prioritize what matters most
7. **Environment Detection** — Don't hardcode paths

### The 80% That Can Be Cut

1. Perfect ASCII art wireframes
2. Line-by-line code explanations
3. Exhaustive file listings
4. Tech stack worship
5. "As shown in file X" references without verification
6. Format compliance over usefulness

### Final Recommendation

The skill should be re-written around **questions users need answered**, not **files that need reading**. Structure it as:

```
# Codebase Spec

## 30-Second Summary
[One paragraph: what this is, who uses it, core value]

## 5 Things Users Can Do
[Bullet list with references]

## Key Decisions (with confidence)
[Table: decision, rationale, confidence, status]

## High-Risk Areas
[Code references + what could go wrong]

## Important Business Rules
[Numbered list with source confidence]

## Open Questions
[What we don't know but should]

## How to Update This Spec
[When code changes, what to check]
```

---

## Appendix: Research Sources

1. "Developer Experience Documentation" — Atlassian best practices
2. "Technical Debt Identification in AI Code Generation" — MSR 2024
3. "Codebase Documentation Patterns" — various engineering blogs
4. "Living Documentation" by Cyrille Martraire — book on continuous documentation
5. "Architectural Decision Records" — industry pattern for decision provenance