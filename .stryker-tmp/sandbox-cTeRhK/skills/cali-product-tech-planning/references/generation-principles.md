# Tech Planning — Generation Principles

When generating code, plans, architecture, or any final product output, follow these principles in priority order.

---

## Code Design Principles (apply to ALL generated code)

### 1. KISS — simplest solution that works correctly
- No function > 50 lines (if needed, extract sub-functions)
- No file > 400 lines (if needed, split into modules)
- Cyclomatic complexity per function < 10
- Avoid deep nesting (max 3 indentation levels)

### 2. DRY — eliminate duplication
- Logic duplication = extract shared function
- Configuration duplication = centralize in constant/var
- Template duplication = create partial/component
- Duplication > 5% of file is a warning sign

### 3. Convention over Configuration
- Sensible defaults, standardized names, predictable directory structure
- Explicit configuration only when deviating from convention

### 4. Progressive Disclosure
- Simple by default, complexity behind toggles
- Essentials first, advanced later

### 5. Polymorphism when useful
- Interfaces for extensibility only when it adds real value
- Prefer concrete types over premature abstractions

---

## Frontend Architecture Principles

### 6. Datastar: framework principles

When the project uses **Datastar** (detected by Datastar import, use of `data-*` attributes, or Go + Templ + Datastar), follow the framework principles defined by its creator:

#### 6a. Backend is the source of truth for state
- Domain state lives in the backend, never in signals or stores on the frontend
- Frontend signals are only for ephemeral UI (toggle open/close, local validation, animation)
- Every business decision is validated on the server — the frontend does not trust itself

#### 6b. SSE-first as communication mechanism
- Use `datastar-patch-elements` via SSE for backend updates
- SSE is simpler than WebSockets, has automatic browser reconnection, and is more efficient than polling
- WebSockets only when there is real need for bidirectional communication (chat, collaboration)

#### 6c. HATEOAS as architectural principle
- The backend determines which actions the user can take — links and forms are discovered via hypertext
- Actions trigger requests, backend responds with HTML, Datastar morphs into DOM
- Frontend is a dumb reactive terminal — minimum possible logic on the client

#### 6d. Locality of Behavior (LoB) for Datastar frontend
- Behavior (`data-*` attributes) in the SAME HTML component that uses it
- Zero custom JavaScript: use Datastar native attributes (`@get`, `@post`, `data-on`, `data-bind`, `data-signal`, etc.)
- Inline JS only when Datastar does not offer native behavior

Reference: [data-star.dev/guide](https://data-star.dev/guide) | [data-star.dev/essays/why_another_framework](https://data-star.dev/essays/why_another_framework)

### 7. Separation of Concerns (SoC)

Applies to **ALL code that is NOT Datastar frontend**, including:
- **Backend of Datastar projects** (Go handlers, services, repositories, database)
- **Non-Datastar projects** (React, Vue, Svelte, Angular, plain HTML + JS)
- **APIs, business logic, data layer** — regardless of frontend framework

- **Separate responsibilities:** template, logic, data, and style in distinct layers
- **Component/layer does one thing:** handler should not call database directly; service should not render HTML
- **Business logic outside template:** extract to services, repositories, helpers
- **Not every function needs to be in the component:** reusable code lives in separate modules

### 8. Tie-breaker rule

| Context | Principle |
|---|---|
| **Datastar** frontend (`data-*` attributes) | ✅ **LoB** — behavior in the HTML that uses it |
| Datastar project backend (Go, handlers, services) | ✅ **SoC** — separation into layers |
| **Non-Datastar** project (React, Vue, etc.) | ✅ **SoC** — everything in separate layers |
| Mix Datastar + other framework | ⚠️ LoB on Datastar frontend, SoC on rest |
| Unsure | **SoC** is the safe default |

---

## When in doubt

Simplest, most conventional path. If LoB and SoC conflict, the framework context decides.
