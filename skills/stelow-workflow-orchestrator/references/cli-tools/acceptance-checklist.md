# Acceptance Checklist (checklist.design)

> **Purpose:** Fetch curated UI/UX checklists from https://www.checklist.design to
> use as **candidate acceptance criteria** during product shaping, and (optionally)
> re-validate the shipped UI against the retained criteria during verification.
> The LLM decides which items are worth keeping for the project's scope, product
> type, appetite, and review mode. Name is by purpose — the source is checklist.design.

## How to invoke

The site exposes deterministic JSON endpoints (no browser, no auth, no API key).
These are the same endpoints the site itself consumes.

### Universal fallback (any agent — recommended)

**1. Catalog** — all checklists grouped by category:

```bash
curl -fsSL https://www.checklist.design/api/checklists/grouped
```

**2. Detail** — items for one checklist:

```bash
curl -fsSL "https://www.checklist.design/api/checklists/by-slug?slug={slug}&category={category}"
```

**3. Filter catalog with jq** — pick candidate checklists for the context:

```bash
curl -fsSL https://www.checklist.design/api/checklists/grouped \
  | jq -r '.grouped[] | "\(.name)\t\(.slug)\t\(.checklists|length)"'
```

**4. Convert items to candidate ACs** — each item becomes one checkbox:

```markdown
- [ ] **{title}** — {description}
      Suggestion: {suggestion}
```

### No-shell fallback

If the agent has no shell access, read the same URLs with the agent's native
URL/webfetch reader tool (e.g. `read`/`webfetch` on `https://www.checklist.design/api/...`).
The endpoints return `application/json`.

## Category mapping (decision aid)

| checklist.design | Apply when |
|------------------|-----------|
| `website` | Marketing/landing pages, CMS-driven site |
| `web-app` | Product has a logged-in app surface |
| `design-system` | Reusable components/tokens are in scope |
| `mobile` | Native mobile experience in scope |
| `flows` | A specific user flow (signup, payment, reset, etc.) |

The catalog has no free-text search endpoint. **The LLM is the semantic search layer**:
match context → checklist by meaning over `name`, `slug`, and `description` — never by
exact keyword only. A flow "recover a lost account" maps to `flows/resetting-password`,
"log the user in" to `web-app/login` (and `mobile/login`), "show nothing yet" to
`web-app/empty-state`. Use the intent table below as a start, then confirm against the
catalog descriptions.

| Intent (semantic) | Likely category(s) | Likely checklist(s) — confirm slug in catalog |
|-------------------|--------------------|-----------------------------------------------|
| Account lifecycle (signup, login, logout, 2FA, password reset, delete) | `web-app`, `mobile`, `flows` | `login`, `sign-up`, `2-factor-authentication`, `resetting-password`, `deleting-account`, `verifying-account` |
| Money (pricing, billing, payment, cart, paywall, promo) | `website`, `web-app`, `mobile` | `pricing`, `billing`, `cart`, `checkout`, `making-a-payment`, `entering-promo-code`, `paywall` |
| Empty / initial state, no data | `web-app` | `empty-state`, `onboarding`, `multi-step-form` |
| Settings & control (preferences, notifications, user management) | `web-app`, `mobile` | `settings`, `notification-settings`, `user-management`, `in-app-notifications` |
| Content & communication (feed, comments, chat, help, blog) | `web-app`, `website` | `feed`, `comments`, `chat`, `help-center`, `blog-post`, `blog` |
| Reusable UI piece | `design-system` | `input-field`, `button`, `modal`, `toast`, `tooltip`, `dropdown-menu`, `date-picker`, etc. |
| Data entry & validation | `flows`, `web-app` | `submitting-a-form`, `showing-input-error`, `multi-step-form` |
| Delete / destructive / irreversible | `website`, `web-app`, `mobile` | `deleting-account`, `canceling-subscription` |

**Slug rule:** `by-slug` requires an exact slug — the table above is a hint, not a
guarantee. **Never invent a slug; always copy it verbatim from the catalog output.**
If a hinted slug is absent from the catalog, fall back to the closest semantic match
present in the catalog.

## Decision rules (LLM)

1. Select **1-3 checklists** most relevant to the shaped context (product_type,
   platform, core flow, IN scope).
2. Keep only items that map to a flow/screen/component in scope.
3. Depth by **appetite**:
   - `Lean` → ≤5 items (critical path only)
   - `Core` → ~8-12 items
   - `Complete` → all applicable items
4. Rewrite each kept item as a **verifiable AC** (Given/When/Then or checkable);
   merge description + suggestion; dedup against already-generated ACs.
5. Record the source in the spec appendix:
   `[source: checklist.design · {category}/{slug}]`.
6. Skip entirely when no checklist is relevant (API-only, no UI, service product).

## Failure modes

- **Network blocked / endpoint down** → skip gracefully. Shaping proceeds with the
  generated ACs only; never block a gate on an external source.
- **Catalog fine, detail 404** → checklist renamed/removed; fall back to another
  candidate or skip.
- **Response shape changes** → treat as unavailable (degrade), do not hard-fail.
- **Too slow / heavy** → use `jq` truncation or fetch only the detail for the
  selected checklists; never dump the full catalog into the plan.