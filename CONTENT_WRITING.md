# Stelow
## Content Angle

### Core thesis running through all angles:
Stelow pushes AI agents to behave less like coding assistants and more like cross-functional product teams — each phase maps to a role (PM doing discovery, EM doing tech alignment, QA doing adversarial review) rather than to a skill.

Note: underlying principles that originally came from narrative-practice thinking (inquiry before action, outside perspective correcting blind spots, calibrated trust) have been reframed below into universal/systems-design language — no therapy references, no jargon a general audience wouldn't recognize.

#### Functionality / Technical

- **"Appetite × Review Mode: two axes, one matrix"** — appetite = business constraint negotiated like a PM would; review mode = trust calibration like an EM/lead would decide. Together they simulate two conversations a real product team has before starting work.
- **The bidirectional product↔tech loop** — Tech Preview → Codebase Feature Recon → Alignment Check formalizes the PM↔Eng Lead negotiation. A coding assistant never negotiates feasibility; it just implements.
- **Anatomy of a self-contained skill** — skills as portable "job functions," not code snippets. Each skill represents a role-competency, so it survives being dropped into different harnesses.
- **Fallbacks as first-class citizens** — a resilient team routes around a blocked dependency instead of stopping. Documented fallbacks mirror that behavior.
- **Pulse: automation with selective HITL** — the `[human-in-the-loop]` pattern is delegation, not blanket automation — the same judgment a manager uses to decide what to rubber-stamp vs. personally review.

#### Strategy / Motivation

- **"Measure three times, cut once" applied to AI** — the real failure of "vibe coding" isn't code quality, it's the *absence of roles*: no one doing discovery, no one doing critique, no one doing QA.
- **From PM to tooling-for-PMs-with-AI** — your own trajectory leading product teams becoming the org chart the agents follow. You didn't teach the AI to code better — you taught it to organize like the teams you led.
- **The "80% problem"** — Osmani's point (AI nails the happy path, skips edge cases/observability/security) is what happens when there's no QA function, no security reviewer, no one asking "what about edge cases." Stelow's adversarial reviewers fill those missing roles.
- **Against "estimation theater"** — appetite-as-constraint only makes sense if you assume a *team* being managed, not a tool being prompted.

#### Design Philosophy

- **Radical transparency about limitations** — a team ships with known risks documented (status report, risk log); a tool just ships. The limitations table reads like a team's honest status update.
- **Parallelism for research, not for code** — multiple people can research/review in parallel, but only one edits a given file at a time. This encodes team concurrency norms, not just a technical constraint.
- **Grounded in evidence, not gut feeling** — the evidence table functions like a shared decision log — the kind of institutional memory a strong team keeps.
- **Context as a scarce resource** — "context rot" reframed: an agent without team structure slowly drifts from its role, the same way an unmanaged team drifts from its brief without check-ins. Gates and replans are the team's alignment rituals.

#### Skills / Applied Knowledge

- **The 8 product domain libraries** (Pricing, Trust, Ads, Marketplace...) — tacit knowledge a domain-expert PM carries, made explicit and callable. A coding assistant has no use for a Trust & Safety library — a *product team* does.
- **JTBD, Opportunity Mapping, Evolutionary Principles as executable skills** — these are strategist deliverables, not engineering ones. Strongest evidence that agents occupy product roles, not just execution roles.
- **Coding standards as a separate, isolated skill** — deliberately demoting "how to write code" to one skill among many is the thesis, structurally expressed: coding is one function on the team, not the team's purpose.

#### Universal Principles (reframed, no therapy language)

- **Ask before you build** — decisions made without first mapping context and existing constraints tend to fail; the discovery/alignment loop exists to prevent solving the wrong problem well.
- **Insiders can't self-review** — anyone too close to their own work develops blind spots; a second party with a fresh, uninvolved perspective catches what the original author structurally cannot. This is why Stelow's reviewers use fresh context and never see each other's notes — same principle behind independent code review or a second pair of eyes in any craft.
- **Trust is calibrated, not binary** — mature systems (and mature managers) don't choose between "review everything" and "review nothing" — they decide, deliberately, where oversight is worth the friction and where it isn't.
- **Distance between signals is information** — separating "what happened" from "what it means" (or, in Stelow's case, separating discovery from execution) preserves information that gets lost when both are collapsed into one step.

### Potential Audiences

- **AI/ML engineers & agent builders** — care about: architecture decisions, harness-agnostic design, context management, fallback design, evidence-grounded feature choices.
- **Product managers and UX designers exploring AI tooling** — care about: appetite/scoping, JTBD & opportunity mapping as skills, why "no roles" is why AI output feels shallow.
- **Engineering managers / tech leads** — care about: tech alignment loop, review-mode/trust calibration, adversarial review design, gates as risk management.
- **Indie hackers / solo founders using AI to build products** — care about: getting team-like rigor without a team, avoiding the "80% problem," practical setup and ROI.
- **AI skeptics / critics of "vibe coding"** — care about: the manifesto angle, transparency about limitations, evidence-over-hype framing.
- **General tech/startup audience (LinkedIn-broad)** — care about: the core thesis in one visual (assistant flow vs. team flow), relatable framing like "your AI has no team around it."
- **Researchers / agent-design enthusiasts** — care about: the evidence table, papers referenced (CAID, Cat, ReflexGrad), design rationale over marketing claims.

### Possible Formats

- Short technical thread (Twitter/X) — pairs well with: AI/ML engineers, agent-design enthusiasts
- Long-form blog post ("Your AI isn't slow because it can't code") — pairs well with: general tech audience, AI skeptics
- Practical case study / how-to — pairs well with: indie hackers, PMs exploring AI tooling
- Visual before/after diagram (assistant flow vs. team flow) — pairs well with: LinkedIn-broad, EMs, PMs
- Deep-dive technical writeup on one architecture decision — pairs well with: engineers, researchers
