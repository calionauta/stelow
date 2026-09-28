# UI design research — real references before writing UI

> One shared contract for every step that needs a real visual reference:
> Interface Alternatives, Interface Contrast, and UX Critique.
> Strategies reference this file instead of duplicating reference instructions.

The gap this fills is narrow and specific. The archetypes in
`../../../stelow-workflow-interface-alternatives/references/archetypes.md` are
**interaction philosophies** (conventional, paradigm shift, radical
simplicity, expert-first). They say what the interaction should feel like. They
say nothing about how a real page for that archetype is laid out. Without a
reference, the model reconstructs one from memory — which is precisely where AI
slop comes from.

A design-reference MCP replaces the reconstruction with a shipped artifact.

## Layers (in order)

1. **Own judgement first.** A design decision is not a search result. State
   the direction — archetype, constraint, audience — before asking a catalogue
   for examples, or the answer will drive the decision instead of informing it.
2. **Reference exemplar (Inspo MCP).** For a named macrostructure, get real
   exemplars: layout, traced palette, type ramp, and copy-pasteable reference
   JSX. Availability check: `npx -y inspo-mcp install --dry-run` shows the plan
   without writing. Vector search needs a Together AI key; **lexical search
   works without one**, so a keyless host still gets exemplars. It installs
   itself across agent CLIs.
3. **Rendered evidence (harness-native browser).** For what source code cannot
   show: actual rendered colors, interaction states, runtime-only behaviour.
   Reached via `agent_browser.md`; the reference catalogue cannot stand in for
   it, because it holds no live-page tool.
4. **Harness-native web search.** When the MCP is unreachable, search the open
   web directly. Slower and noisier, but always available.
5. **Coverage record.** State which layers actually produced evidence, and what
   could not be verified. A missing connector is partial coverage — never proof
   of absence.
6. **No fabrication.** Never invent a reference, a palette value, or a capture.
   If no reference was retrieved, say the proposal rests on the archetype
   library alone.

## Which step uses which

| Step | Uses | Why |
|------|------|-----|
| **Interface Alternatives** | Inspo exemplars + reference JSX | Replaces remembered layout with a shipped one. The primary consumer. |
| **UX Critique** | The harness-native browser | Rendered evidence comes from rendering the page, not from a gallery. |
| **Interface Contrast** | Provenance naming only | See the constraint below. |

## Inspo is an archive, not a live-page inspector

Worth being precise, because it decides what this reference can and cannot be
asked for. Every Inspo tool answers *what does a real page for this
macrostructure look like*. **None of them captures or analyses a URL you hand
it** — no screenshot, no section map, no motion fingerprint. Those were checked
against the server's tool source, not its README.

So Inspo fully covers Interface Alternatives, which is the job it was added for,
and contributes **nothing** to UX Critique. For UX Critique the browser is the
tool; there is no catalogue substitute, and a critique that cannot render the
page marks those dimensions unverified rather than inferring them.

## Hard constraints

**Interface Contrast takes references as provenance, never as options.** That
skill exists to preserve the decision-maker's first reaction and to stop agent
preference from becoming product approval. Generating fresh options from a
gallery at that step destroys exactly the property it protects. Reference a site
as evidence for an option the human or Shape already named; do not add options.

**A reference is never a decision.** Gallery output is one input to a decision
the agent must still justify against the fixed constraints, the criteria, and
the accepted sacrifice. Prefer a reference that fits the stated direction over a
more impressive one.

**Appetite still gates depth.** Lean explores one suggested interface and spends
no reference calls. Core and Complete may spend them.

**Never the only source, never a gate.** A stage never blocks on a catalogue.
Every step below the MCP layers has a documented built-in path.

**Budget the calls.** `recommend(brief)` and multi-result searches return large
payloads. Ask for a small number of exemplars, and prefer a design-system or
structure query over a broad moodboard.

## Optional install

Stelow never installs it. The host's dependency panel lists it, shows exactly
which agent CLIs on this host can reach it, and registers on request only.

```bash
# Source: https://github.com/Nutlope/inspo
npx -y inspo-mcp install              # add --dry-run to preview
```

## Registration is per agent CLI, not global

The installer writes the agent-CLI configs that exist **at the moment it
runs**. Installing a new agent CLI later leaves it working but without the
reference — a gap that is invisible from inside a worker turn.

So: if a reference lookup unexpectedly finds nothing, check the host's
dependency panel before concluding the catalogue is empty. It re-reads every
open and names the exact CLIs the host can run but that do not name the server.
Re-running the installer registers it for all of them; then restart those CLIs.

`pi` reaches MCP servers through the `pi-mcp-adapter` extension, reading
`~/.pi/agent/mcp.json`. Without that extension its config entries are inert.
(Some third-party READMEs claim pi has no MCP support at all — that is wrong,
and it was wrong here too until it was checked against a real host.)
