---
name: cali-product-code-standards
description: >
  [Cali] Product-domain coding standards. Extends cali-coding-standards with
  Datastar-specific rules (backend source of truth, SSE-first, HATEOAS, LoB).
  Use when generating code within a product planning context — provides the
  detailed framework philosophy that generic coding standards summarize.
metadata:
  frequency: weekly
  category: product
  context-cost: low
---

# Product Code Standards

> **Prerequisite:** This skill builds on `cali-coding-standards` — read it first
> for universal principles (KISS, DRY, Fail Fast, YAGNI, file/function limits, etc.).
> This skill adds the **product-domain depth** for Datastar frontend architecture.

## Overview

When generating code as part of a product plan, follow the universal principles
from `cali-coding-standards` **plus** the Datastar-specific detail below. The
combination ensures code is both conventionally correct and aligned with the
stack's design philosophy.

---

## Datastar Framework Principles (detailed)

When the project uses **Datastar** (detected by Datastar import, use of
`data-*` attributes, or Go + Templ + Datastar), follow the framework principles
defined by its creator at [data-star.dev/guide](https://data-star.dev/guide)
and [data-star.dev/essays/why_another_framework](https://data-star.dev/essays/why_another_framework).

### 1. Backend is the source of truth for state

- Domain state lives in the backend, never in signals or stores on the frontend
- Frontend signals are only for ephemeral UI (toggle open/close, local validation, animation)
- Every business decision is validated on the server — the frontend does not trust itself

### 2. SSE-first as communication mechanism

- Use `datastar-patch-elements` via SSE for backend updates
- SSE is simpler than WebSockets, has automatic browser reconnection, and is more efficient than polling
- WebSockets only when there is real need for bidirectional communication (chat, collaboration)

### 3. HATEOAS as architectural principle

- The backend determines which actions the user can take — links and forms are discovered via hypertext
- Actions trigger requests, backend responds with HTML, Datastar morphs into DOM
- Frontend is a dumb reactive terminal — minimum possible logic on the client

### 4. Locality of Behavior (LoB) for Datastar frontend

- Behavior (`data-*` attributes) in the SAME HTML component that uses it
- Zero custom JavaScript: use Datastar native attributes (`@get`, `@post`, `data-on`, `data-bind`, `data-signal`, etc.)
- Inline JS only when Datastar does not offer native behavior

---

## When to Use

| Context | Use |
|---|---|
| Generic code review / any language | `cali-coding-standards` |
| Generating code during product planning | This skill **first**, then `cali-coding-standards` |
| Go + Datastar project code generation | This skill **+** `cali-coding-go-stack` |
| Checking if generated code follows principles | Reference stack context → use the right skill |

---

## Relationship with Other Skills / References

| Skill / Reference | Relationship |
|---|---|
| `cali-coding-standards` | Parent — universal principles (11 rules, Go overrides, CI) |
| `cali-coding-go-stack` | Go + Datastar stack (Templ, DaisyUI, Tailwind, NATS) |
