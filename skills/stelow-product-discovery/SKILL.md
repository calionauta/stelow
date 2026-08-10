---
name: stelow-product-discovery
description: >
  [stelow] Orchestrator for the short-cycle product learning method based on
  the e-book "Guide to Creating Products with Short Learning Cycles" by calionauta.
  Guides the user through 8 discovery stages and loads the appropriate standalone
  skill for each topic. Use this skill whenever the user asks about: idea validation,
  customer discovery, product experimentation, jobs to be done, pricing strategies,
  business models, marketing channels, early adopters, MVP, product-market fit,
  pre-sales, launch strategies, product innovation, product lifecycle, building
  customer trust, marketplace, open source as strategy, or any concept related to
  creating and validating digital products with low risk and fast learning.
  This is the orchestrator — load the referenced standalone skill for full depth.
metadata:
  frequency: monthly
  category: product
  context-cost: low
  author: calionauta
  author-url: https://github.com/calionauta
---

# Product with Short Learning Cycles

This guide is a method to replace speculation with evidence, step by step.
**Core principle**: experiment before building. Reduce uncertainty with small, fast, and cheap experiments.

> "Life is too short to build something that nobody wants." — Ash Maurya

## Method Structure

The process has **8 stages** (not necessarily linear):
1. Find and understand the audience
2. Define the market
3. Define and prioritize solutions
4. Develop and evaluate the offer
5. Assess commitment
6. Discover the process
7. Evolve to a viable business
8. The pulse of the system: signals in tension

**→ Load the appropriate standalone skill for each topic (pointers below):**

| Topic | Skill |
|-------|-------|
| Experimentation (6 principles) | `stelow-product-experimentation` |
| Audience + Market (SEDIF, interviews, segments, GPN) | `stelow-product-audience-market` |
| Solutions (9 components, risk matrix) | `stelow-product-solutions-prioritization` |
| Launch Validation (offer, pioneer program, pre-sale, waitlist) | `stelow-product-launch-validation` |
| Manual Process (concierge, wizard of oz, high-risk systems) | `stelow-product-manual-process` |
| Viable Business (stepping stones, metrics) | `stelow-product-evolutionary-principles` |
| Product Health (signals in tension) | `stelow-product-health` |
| Business Models (cost reduction, revenue generation) | `stelow-product-business-models` |
| Pricing (exchange base, consumption, perception) | `stelow-product-pricing` |
| Open Source (business strategy) | `stelow-product-open-source` |
| Trust + Guarantees (10 pillars, trust pact, guarantees) | `stelow-product-trust-building` |
| Testimonials (First 5, BAB, collection system) | `stelow-product-testimonials` |
| Promoters (referrals, affiliates, marketplace) | `stelow-product-promoters` |
| Promotions (MAGIC, bonuses, 4 launch strategies) | `stelow-product-promotions` |
| Ads (awareness stages, channels, methods) | `stelow-product-ads` |
| Innovation Strategies (differentiated, dominant, disruptive) | `stelow-product-innovation-strategies` |

## Interaction Tool Guidelines

**IMPORTANT**: When the user needs to choose between predefined options, ALWAYS use the `question` tool (if available) with enumerated format:
- Options with short `label` and `description`
- Examples: topic selection, next steps, etc.

When `question` tool is not available, use enumerated text in chat (A/B/C/D or 1/2/3).

**Note for this skill**: This is primarily a reference/exploratory skill. If the user wants to explore a specific concept, you may ask clarifying questions to understand context before recommending which references to read or which stage to focus on.

---

## Rules for Using This Skill

1. **Never omit details** — the e-book is already concise; every detail matters.
2. **Use concrete examples** from the method when explaining concepts.
3. **Reference specific tools and tactics** mentioned in the method.
4. **Preserve the order and logic** of stages when guiding the user.
5. **Combine stages** when context demands (e.g., stages 4 and 5 often go together).

---

## Attribution

This skill is based on the e-book **"Guia para criar produtos com aprendizado em ciclos curtos"** (Guide to Creating Products with Short Learning Cycles) by **calionauta**.

**Author**: calionauta  
**Substack**: [Practical Guide to Validate Ideas](https://calionauta.substack.com/p/roteiro-pratico-para-validar-ideias)  
**GitHub**: [@calionauta](https://github.com/calionauta)

This skill was translated and adapted by permission and attribution to the original author.

---

**Original Repository**: [github.com/calionauta/my-opencode-config](https://github.com/calionauta/my-opencode-config)

---

## Extended Deep-Dives (Optional)

For specialized analysis, these standalone skills are available at [github.com/calionauta/agent-sync-public](https://github.com/calionauta/agent-sync-public/tree/main/skills):

| Skill | Description | Lines |
|-------|-----------|--------|
| `stelow-product-promoters` | Promoters, referrals, affiliates, marketplace dynamics | ~300 |
| `stelow-product-health` | Product health monitoring via signals in tension | ~100 |
| `stelow-product-pricing` | Pricing strategy: Exchange Base, Consumption Control, Interest Alignment, Trust Pact | ~100 |
| `stelow-product-open-source` | OSS as business strategy: Proprietary Problem, Org Structures, Competition Protection | ~60 |
| `stelow-product-trust-building` | 10 pillars of trust, guarantees, perception, commitment | ~60 |
| `stelow-product-promotions` | MAGIC framework, 4 launch strategies, bonuses | ~60 |
| `stelow-product-business-models` | Cost reduction & revenue generation models | ~80 |
| `stelow-product-testimonials` | Testimonial strategies: First 5 / Work for Free, BAB storytelling, timing & asymmetry, perfect fit, collection system | ~200 |
| `stelow-product-ads` | 5 awareness stages, ad categories, channels & methods | ~120 |
| `stelow-product-experimentation` | 4 criteria + 6 principles for reliable experimentation | ~100 |
| `stelow-product-audience-market` | SEDIF model, interviews, JTBD market definition, segments, GPN story | ~120 |
| `stelow-product-solutions-prioritization` | 9 components for desirable solutions + impact/risk matrix | ~150 |
| `stelow-product-launch-validation` | Offer development, pioneer program, pre-sale, waitlist, fake door | ~150 |
| `stelow-product-manual-process` | Concierge, Wizard of Oz, high-risk systems framework | ~120 |
| `stelow-product-evolutionary-principles` | Evolutionary thinking, stepping stones, metrics, first version approaches | ~450 |
| `stelow-product-innovation-strategies` | Differentiated, Dominant, Sustaining, Discreet, Disruptive | ~80 |

**Install (if you don't have it yet):**
...
**Note:** These are optional enhancements. The core method's 8 stages are described above; each topic has a dedicated standalone skill for full depth.
