---
name: stelow-product-manual-process
description: >-
  Discover the valuable manual process before productizing. Covers Concierge,
  Wizard of Oz (Flintstoning), Repackaging, and Solution Integration approaches.
  Includes a complete framework for high-risk systems — complicated vs. complex
  systems, modular development, integration testing, and simulation in controlled
  environments.
metadata:
  frequency: rare
  category: research
  context-cost: low
  author: calionauta
  author-url: https://github.com/calionauta
disable-model-invocation: true
---

# Process: Discover the Manual Process

**Objective**: test execution and usability risk — can you actually deliver the solution? Instead of jumping to complete development, experiment with a **valuable manual process** first.

**Skip this stage only if**: (1) you already have sufficient personal knowledge of the process, or (2) you have a strong assumption with resources to automate or produce a new simplified solution in the same time it would take to discover the process. **In general, carry out this stage.**

> Don't underestimate the real world: you'll probably spend more time and money developing if you skip this stage without agreed limits.

---

## What to Do

Systematize manual or outsourced solutions that let you learn the complete process people will use and how it will fit into their context. **Systematize the process before productizing.**

> Sahil Lavingia: *"As you complete the first cycle with clients, document every part of the process so that with each subsequent client, you have a guide. This document will be the true MVP of your business — not the minimum viable product we're all trying to build and launch. I'm talking about the valuable manual process that precedes it and will be the foundation for the business you're trying to build. Methodically."*

---

## Approaches

### Personal Assistant (Concierge)
Do it together with the client, live if possible. Identify and deliver the best solution for them, then collect feedback.

### Artisanal Backstage (Flintstoning or Wizard of Oz)
Offer a solution that looks automated to the person, but you do it manually backstage. Identify bottlenecks and risks before investing in automation.

### Repackaging
Use another company's product or service with your own packaging. Identify what already solves the problem well and where the gaps are.

### Solution Integration
Offer an integration of several existing solutions, especially digital ones. Tools: Windmill.dev, N8N, ActivePieces, Zapier, Make.com.

---

## What to Observe (Signals)

Evaluate if the process can be repeated with more people while maintaining quality and depending less on your specific performance. Could other people follow the same process? Could you automate it by integrating solutions?

---

## ⚠️ High-Risk and Consequence Systems

This section applies to solutions requiring extra rigor before evolving to a viable business.

### Complicated vs. Complex Systems

**Complicated system** (like an airplane engine): components and rules with linear, predictable interactions. Risk lies in quality of execution.
- *Examples*: medical equipment software, financial transaction systems, platforms with sensitive data, autonomous vehicle control.

**Complex system** (like an ecosystem): interconnected components with emergent, often unpredictable behavior. Risk emerges from unanticipated interactions.
- *Examples*: social networks, recommendation algorithms creating filter bubbles, AI models that learn and adapt continuously.

For these cases, jumping from manual process to viable business is not just risky — **it can be irresponsible**.

### What to Do

**1. Modular Development and Contained Experimentation**
Each module goes through its own validation cycle (audience → market → solutions → offer → commitment → process, on a smaller scale) before being integrated.

**2. Integration and System Testing**
Connect validated modules and test the connections between them:
- **Complicated systems**: focus on compliance verification, absence of failures, and regulatory adherence.
- **Complex systems**: focus on detecting emergent behaviors, vulnerabilities, and unintended consequences. Validate containment and control mechanisms.

**Process**: start by integrating two modules, test exhaustively, then add a third, and so on. Document how each new component affects the system as a whole.

**3. Simulation in a Controlled Environment (Staging/Sandbox)**
Before any public or production exposure, the integrated system must run in a simulation that mirrors real conditions. Purpose: observe behavior over time, stress-test, and allow a restricted group to interact in a safe environment.

**Signals to observe**: stability, resilience (how the system recovers from failures), and absence of damage or negative consequences.

Only after this rigorous process is it possible to advance safely to the viable business stage.

---

## Related Skills

- `stelow-product-experimentation` — 6 principles for fast, cheap learning cycles
- `stelow-product-launch-validation` — Pre-sale and commitment testing
- `stelow-product-discovery` — Complete short-cycle product learning method
