# kanban-stelow

Muxy extension scaffolded from a starter kit. This is an npm + Vite project.

## Layout

- `package.json` — npm manifest. Identity (`name`, `version`) is at the
  top level; all Muxy fields live under the `muxy` key. A `build` script
  (Vite) is required.
- `vite.config.js` — builds to `dist/`, the directory Muxy installs.
- `panel/` + `src/` — your source. The kit ships a working panel, a topbar
  item, and a command; edit them or add your own.

Add a `"background"` script (e.g. `background.js`) under the `muxy` key
only if the extension needs to receive pushed workspace events or run
shell commands in the background. Muxy runs it as a long-lived process
that subscribes to events with `muxy.events.subscribe` and runs commands
with `muxy.exec`. Command, topbar, status bar, tab, and runScript
extensions need no background script.

## Building & editing

Install deps with `npm install`, then `npm run build` to produce
`dist/`. After rebuilding, click "Reload" in the Muxy Extensions modal to
pick up the changes. (`npm run dev` runs Vite's dev server for fast
iteration.)

## Skill

Coding agents in this directory should consult the `muxy-extension`
skill in `.claude/skills/` or `.agents/skills/` before generating
manifest or runtime changes.