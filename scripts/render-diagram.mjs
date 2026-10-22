#!/usr/bin/env node
/**
 * Render a breadboard map into a diagram.
 *
 *   node scripts/render-diagram.mjs breadboard \
 *     --input .stelow/{date}/{dir}/interfaces/breadboard.json \
 *     --out   .stelow/{date}/{dir}/interfaces/breadboard.html
 *
 * The map is the source of truth; this produces a VIEW of it. It never
 * blocks the workflow: the JSON is written and valid before this runs, and
 * every downstream stage reads the JSON, not the HTML. If the renderer is
 * unavailable the HTML is simply not produced.
 *
 * Degradation, in order:
 *   1. no renderer available → the JSON stands, no HTML, exit 0
 *   2. renderer available, render fails → the JSON stands, exit 0 with a note
 *   3. `--emit-mermaid` → writes the Mermaid source next to the JSON for hosts
 *      that render diagrams themselves
 *
 * Flags:
 *   --input <path>       the breadboard JSON (required)
 *   --out <path>         the HTML output (optional; skipped without it)
 *   --emit-mermaid       also write <input-basename>.mmd
 *   --check              validate the map and report dangling wiring; write nothing
 *   --strict             exit non-zero when the map has dangling wiring
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { toMermaid, wiringReport } from "./breadboard-mermaid.mjs";

export const USAGE = `render-diagram — turn a breadboard map into a diagram

Usage:
  node scripts/render-diagram.mjs breadboard --input <file.json> [--out <file.html>] [--emit-mermaid] [--check] [--strict]
`;

/**
 * Read and parse a breadboard map.
 *
 * Exported so a caller can validate a map without running a render, and so a
 * malformed map fails with the FILE NAME in the message — a reader who finds
 * the map broken must be told which map, not that "something" was wrong.
 */
export function readMap(path) {
  const raw = readFileSync(path, "utf8");
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${path} is not valid JSON: ${error.message}`);
  }
}

function parseArgs(argv) {
  const options = { command: null, input: null, out: null, emitMermaid: false, check: false, strict: false };
  const rest = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--input") options.input = argv[++index];
    else if (token === "--out") options.out = argv[++index];
    else if (token === "--emit-mermaid") options.emitMermaid = true;
    else if (token === "--check") options.check = true;
    else if (token === "--strict") options.strict = true;
    else if (token === "--help" || token === "-h") options.help = true;
    else if (!token.startsWith("-")) rest.push(token);
  }
  options.command = rest[0] ?? null;
  return options;
}

/**
 * Load the renderer lazily. A missing renderer is a normal outcome — the
 * workflow does not require it — so it must not throw at import time.
 */
async function loadRenderer() {
  try {
    const module = await import("pele");
    return typeof module.render === "function" ? module : null;
  } catch {
    return null;
  }
}

const THEMES = {
  light: {
    "--pele-bg": "#ffffff",
    "--pele-fg": "#1f1f1f",
    "--pele-muted": "#6e6e6e",
    "--pele-line": "#1f1f1f",
    "--pele-surface": "#f3f3f3",
    "--pele-surface-alt": "#e6e6e6",
    "--pele-border": "#8a8a8a",
    "--pele-accent": "#5b7bd5",
  },
  dark: {
    "--pele-bg": "#16161a",
    "--pele-fg": "#e8e8ea",
    "--pele-muted": "#9a9aa0",
    "--pele-line": "#e8e8ea",
    "--pele-surface": "#22222a",
    "--pele-surface-alt": "#2c2c36",
    "--pele-border": "#4a4a56",
    "--pele-accent": "#7aa2f7",
  },
};

function themeBlock(theme) {
  const variables = THEMES[theme] ?? THEMES.light;
  const declarations = Object.entries(variables)
    .map(([name, value]) => `      ${name}: ${value};`)
    .join("\n");
  return `    .pele {\n${declarations}\n    }`;
}

/**
 * The HTML shell. It carries the diagram as inline SVG, enables zoom, and
 * follows the reader's color scheme. No external request: the file works
 * offline, which is the point of a durable artifact.
 */
function htmlDocument(svg, title, subtitle, mermaidSource) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root {
    color-scheme: light dark;
    --page-bg: #fbfbfd;
    --page-fg: #1f1f1f;
    --page-muted: #6e6e6e;
    --page-surface: #ffffff;
    --page-border: #e2e2e8;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --page-bg: #101014;
      --page-fg: #e8e8ea;
      --page-muted: #9a9aa0;
      --page-surface: #1a1a20;
      --page-border: #2c2c36;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 2rem 1.25rem 3rem;
    background: var(--page-bg);
    color: var(--page-fg);
    font: 15px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  main { max-width: 1100px; margin: 0 auto; }
  h1 { font-size: 1.35rem; margin: 0 0 .25rem; }
  p.subtitle { margin: 0 0 1.5rem; color: var(--page-muted); }
  .diagram {
    background: var(--page-surface);
    border: 1px solid var(--page-border);
    border-radius: 10px;
    padding: 1.25rem;
    overflow: auto;
  }
  .diagram svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }
  details { margin-top: 1.5rem; }
  summary { cursor: pointer; color: var(--page-muted); font-size: .9rem; }
  pre {
    background: var(--page-surface);
    border: 1px solid var(--page-border);
    border-radius: 8px;
    padding: 1rem;
    overflow: auto;
    font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .pele { --pele-font: system-ui, -apple-system, "Segoe UI", sans-serif; }
${themeBlock("light")}
  @media (prefers-color-scheme: dark) {
${themeBlock("dark")}
  }
</style>
</head>
<body>
<main>
  <h1>${escapeHtml(title)}</h1>
  <p class="subtitle">${escapeHtml(subtitle)}</p>
  <div class="diagram" id="diagram">${svg}</div>
  <details>
    <summary>Mermaid source</summary>
    <pre><code>${escapeHtml(mermaidSource)}</code></pre>
  </details>
</main>
<script type="module">
  // Zoom without a runtime dependency: drag to pan, wheel to zoom, plus
  // keyboard control. The diagram is an SVG in the DOM, so this is a few
  // lines of transform math rather than a library.
  const container = document.getElementById("diagram");
  const svg = container && container.querySelector("svg");
  if (svg) {
    let scale = 1;
    let x = 0;
    let y = 0;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    const apply = () => {
      svg.style.transformOrigin = "0 0";
      svg.style.transform = "translate(" + x + "px," + y + "px) scale(" + scale + ")";
    };
    container.addEventListener("wheel", (event) => {
      event.preventDefault();
      const next = scale * (event.deltaY < 0 ? 1.1 : 0.9);
      scale = Math.min(8, Math.max(0.2, next));
      apply();
    }, { passive: false });
    container.addEventListener("pointerdown", (event) => {
      dragging = true;
      startX = event.clientX - x;
      startY = event.clientY - y;
      container.setPointerCapture(event.pointerId);
    });
    container.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      x = event.clientX - startX;
      y = event.clientY - startY;
      apply();
    });
    const stop = () => { dragging = false; };
    container.addEventListener("pointerup", stop);
    container.addEventListener("pointercancel", stop);
    container.addEventListener("dblclick", () => { scale = 1; x = 0; y = 0; apply(); });
    container.tabIndex = 0;
    container.addEventListener("keydown", (event) => {
      if (event.key === "+" || event.key === "=") { scale = Math.min(8, scale * 1.1); apply(); }
      else if (event.key === "-") { scale = Math.max(0.2, scale / 1.1); apply(); }
      else if (event.key === "0") { scale = 1; x = 0; y = 0; apply(); }
      else if (event.key === "ArrowLeft") { x -= 20; apply(); }
      else if (event.key === "ArrowRight") { x += 20; apply(); }
      else if (event.key === "ArrowUp") { y -= 20; apply(); }
      else if (event.key === "ArrowDown") { y += 20; apply(); }
      else return;
      event.preventDefault();
    });
  }
</script>
</body>
</html>
`;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * A map with nothing in it is not a diagram — it is a missing map. Rendering
 * it would produce a blank page that reads as "the interface has no places",
 * which is a claim the map never made.
 */
export function assertRenderable(map, path) {
  const places = Array.isArray(map?.places) ? map.places : [];
  const affordances = Array.isArray(map?.affordances) ? map.affordances : [];
  if (places.length === 0 && affordances.length === 0) {
    throw new Error(`${path} declares no places and no affordances — there is nothing to draw`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.command) {
    process.stdout.write(USAGE);
    return 0;
  }
  if (options.command !== "breadboard") {
    process.stderr.write(`render-diagram: unknown command "${options.command}"\n${USAGE}`);
    return 2;
  }
  if (!options.input) {
    process.stderr.write(`render-diagram: --input is required\n${USAGE}`);
    return 2;
  }

  const inputPath = resolve(options.input);
  const map = readMap(inputPath);
  assertRenderable(map, inputPath);
  const report = wiringReport(map);

  if (report.dangling.length > 0) {
    process.stderr.write(
      `render-diagram: dangling wiring (${report.dangling.join(", ")}) — a wire points at an id the map never declares\n`,
    );
    if (options.strict) return 1;
  }

  if (options.check) {
    process.stdout.write(
      `render-diagram: ${report.known.size} id(s), ${report.referenced.size} referenced, ${report.dangling.length} dangling\n`,
    );
    return report.dangling.length > 0 && options.strict ? 1 : 0;
  }

  const mermaid = toMermaid(map);

  if (options.emitMermaid) {
    const mermaidPath = inputPath.replace(/\.json$/i, "") + ".mmd";
    writeFileSync(mermaidPath, mermaid, "utf8");
    process.stdout.write(`render-diagram: wrote ${mermaidPath}\n`);
  }

  if (!options.out) {
    process.stdout.write("render-diagram: no --out given; nothing else to write\n");
    return 0;
  }

  const renderer = await loadRenderer();
  if (!renderer) {
    // Not an error: the map is the artifact, the diagram is a convenience.
    process.stdout.write(
      "render-diagram: no renderer available (install the 'pele' package); the map stands unchanged\n",
    );
    return 0;
  }

  let svg;
  try {
    const result = renderer.render(mermaid);
    svg = result?.svg;
  } catch (error) {
    process.stdout.write(
      `render-diagram: render failed (${error.message}); the map stands unchanged\n`,
    );
    return 0;
  }
  if (!svg) {
    process.stdout.write("render-diagram: renderer returned no SVG; the map stands unchanged\n");
    return 0;
  }

  const title = `Interface breadboard — ${map.interfaceId ?? "interface"}`;
  const subtitle = map.selectedBy
    ? `Selected by ${map.selectedBy}. The map is the source of truth; this diagram is a view of it.`
    : "The map is the source of truth; this diagram is a view of it.";

  const outPath = resolve(options.out);
  writeFileSync(outPath, htmlDocument(svg, title, subtitle, mermaid), "utf8");
  process.stdout.write(`render-diagram: wrote ${outPath}\n`);
  return 0;
}

// Run only when invoked directly, so a test can import the helpers above
// without the CLI taking over the process.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      process.stderr.write(`render-diagram: ${error.message}\n`);
      process.exit(1);
    });
}
