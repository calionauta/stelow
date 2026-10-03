# Install on bb

Requirements: bb desktop ≥ 0.43 and a normal bb project backed by a local
workspace source (the singleton bb personal project has none, so the board
asks you to select or create a normal project). The plugin vendors all 30
Stelow skills — no separate skills step is needed.

## From the marketplace (normal path)

In bb: Extensions → Plugins → install **Stelow**. Or from a shell:

```bash
bb plugin install stelow
bb plugin list   # stelow should show as running
```

When a compatible update exists, the About tab offers it behind an explicit
confirm; bb applies the released bundle.

## From git (pinned version)

Use a released tag — check the
[releases page](https://github.com/calionauta/bb-plugin-stelow/releases)
for the latest and substitute it below:

```bash
bb plugin install "git:https://github.com/calionauta/bb-plugin-stelow.git@<tag>" --yes
```

Third-party plugins are full-trust server code: install only sources you
trust. `bb skill list` confirms the vendored skills after install.

## For plugin development (clone + hot-reload)

```bash
git clone https://github.com/calionauta/bb-plugin-stelow.git
cd bb-plugin-stelow
npm install
bb plugin build
bb plugin install . --yes
```

After every change: `npm run build:reload` (rebuilds `dist/` and reloads the
plugin in the running bb without killing threads). Never restart the host
daemon as a deploy step — it terminates every running thread.

## Update behavior

bb checks whether the installed plugin has a compatible update without
changing a running workflow. The About tab shows the verdict and applies the
update only on confirmation. Local path installs update via checkout pull +
rebuild + reload instead.
