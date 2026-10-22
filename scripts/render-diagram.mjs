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
 * every downstream stage reads the JSON, not the HTML.
 *
 * This script renders. It does not decide whether the map is valid — the rules
 * live in `scripts/stelow check breadboard`, the one artifact every execution
 * environment has, and the same verdict `advance` enforces at the transition.
 * A view and the gate must never disagree about whether a map is valid.
 *
 * What the verdict means here:
 *
 *   Error (a wire to an id nobody declares, a duplicate id, a contract
 *   violation). Drawing it would draw a hole as if it were a decision, so the
 *   views are refused and the run exits non-zero. The map still stands; it
 *   just needs fixing.
 *
 *   Gap (a display with no source, a store nothing reads). That is a
 *   judgement the writer has to make, so the views are written and the gaps
 *   are printed inside them — the reader learns what the map does not know.
 *
 * Degradation, in order:
 *   1. no renderer available → the map stands, no HTML, exit 0
 *   2. renderer available, render fails → the map stands, exit 0 with a note
 *   3. `--emit-mermaid` / `--emit-markdown` → write the reading views next
 *      to the JSON, for hosts that render diagrams themselves and for the
 *      visual review gate, which reviews markdown
 *
 * Flags:
 *   --input <path>       the breadboard JSON (required)
 *   --out <path>         the HTML output (optional; skipped without it)
 *   --emit-mermaid       also write <input-basename>.mmd
 *   --emit-markdown      also write <input-basename>.md (the affordance tables)
 *   --with-diagram       include the Mermaid source in the markdown
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { toMermaid } from "./breadboard-mermaid.mjs";
import { toMarkdown, toMarkdownWithDiagram } from "./breadboard-markdown.mjs";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));

export const USAGE = `render-diagram — turn a breadboard map into a diagram

Usage:
  node scripts/render-diagram.mjs breadboard --input <file.json> [options]

Options:
  --out <file.html>     write the self-contained HTML view
  --emit-mermaid        also write <input-basename>.mmd
  --emit-markdown       also write <input-basename>.md (tables + optional diagram)
  --with-diagram        include the Mermaid source in the markdown

Exit codes:
  0  views written (gaps may still be reported inside them)
  1  the map has errors, so no view was written
  2  usage error

Validate the map with:  stelow check breadboard <map.json> [--strict]
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
  const options = {
    command: null,
    input: null,
    out: null,
    emitMermaid: false,
    emitMarkdown: false,
    withDiagram: false,
    errors: [],
  };
  const rest = [];

  // A flag that takes a value must HAVE one. `--input` at the end of the
  // line used to leave `input` undefined and the run reported "--input is
  // required" — true, but it hid the actual mistake.
  const takeValue = (flag, at) => {
    const value = argv[at + 1];
    if (value === undefined || value.startsWith("--")) {
      options.errors.push(`${flag} needs a value`);
      return { value: null, consumed: 0 };
    }
    return { value, consumed: 1 };
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--input" || token === "--out") {
      const taken = takeValue(token, index);
      if (token === "--input") options.input = taken.value;
      else options.out = taken.value;
      index += taken.consumed;
    } else if (token === "--emit-mermaid") options.emitMermaid = true;
    else if (token === "--emit-markdown") options.emitMarkdown = true;
    else if (token === "--with-diagram") options.withDiagram = true;
    else if (token === "--help" || token === "-h") options.help = true;
    // An unknown flag must fail. `--emmit-markdown` used to be ignored in
    // silence: the run exited 0 and wrote nothing, which reads exactly like
    // a successful run that had nothing to write.
    else if (token.startsWith("-")) options.errors.push(`unknown option ${token}`);
    else rest.push(token);
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
    "--pele-muted": "#61616b",
    "--pele-line": "#1f1f1f",
    "--pele-surface": "#ffffff",
    "--pele-surface-alt": "#ececf1",
    "--pele-border": "#8a8a94",
    "--pele-accent": "#3f5fbf",
  },
  dark: {
    "--pele-bg": "#16161a",
    "--pele-fg": "#e8e8ea",
    "--pele-muted": "#a0a0a8",
    "--pele-line": "#e8e8ea",
    "--pele-surface": "#1f1f26",
    "--pele-surface-alt": "#2c2c36",
    "--pele-border": "#5a5a68",
    "--pele-accent": "#8ab0ff",
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
 * A key to the visual language, drawn with the same shapes the diagram uses.
 *
 * The picture is the reason this file exists, so the picture has to be
 * readable without the JSON open. Shapes are the key: they survive a
 * monochrome print and a host that ignores colour.
 */
function readingKey() {
  return `  <section class="key" aria-label="How to read the diagram">
    <h2>How to read it</h2>
    <ul>
      <li>
        <svg viewBox="0 0 48 20" aria-hidden="true" class="shape"><rect x="2" y="2" width="44" height="16" rx="3"/></svg>
        <span><strong>UI</strong> — something the user acts on or reads</span>
      </li>
      <li>
        <svg viewBox="0 0 48 20" aria-hidden="true" class="shape"><rect x="2" y="2" width="44" height="16" rx="3"/><path d="M9 2v16M39 2v16"/></svg>
        <span><strong>Code</strong> — a function or mechanism you can point at</span>
      </li>
      <li>
        <svg viewBox="0 0 48 20" aria-hidden="true" class="shape"><path d="M2 4a22 4 0 0 1 44 0v12a22 4 0 0 1-44 0z"/><path d="M2 4a22 4 0 0 0 44 0"/></svg>
        <span><strong>Store</strong> — state that is written and read</span>
      </li>
      <li>
        <svg viewBox="0 0 48 20" aria-hidden="true" class="shape"><rect x="2" y="2" width="44" height="16" rx="3" class="place"/></svg>
        <span><strong>Place</strong> — a bounded context; while you are in it, the rest is out of reach</span>
      </li>
      <li>
        <svg viewBox="0 0 48 20" aria-hidden="true" class="shape"><path d="M4 10h36" class="line"/><path d="M34 5l6 5-6 5" class="line"/></svg>
        <span><strong>Solid</strong> — control flow: what this triggers</span>
      </li>
      <li>
        <svg viewBox="0 0 48 20" aria-hidden="true" class="shape"><path d="M4 10h36" class="dashed"/><path d="M34 5l6 5-6 5" class="dashed"/></svg>
        <span><strong>Dashed</strong> — data flow: where output goes</span>
      </li>
    </ul>
  </section>`;
}

/**
 * What the executable checks found. Written into the artifact on purpose: a
 * view that hides the map's own gaps reads as certainty the map never had.
 */
function gapsSection(problems) {
  if (problems.length === 0) return "";
  const rows = problems
    .map(
      (problem) =>
        `      <tr><td class="id">${escapeHtml(problem.id)}</td><td>${escapeHtml(problem.check)}</td><td>${escapeHtml(problem.reason)}</td></tr>`,
    )
    .join("\n");
  return `  <section class="gaps" aria-label="Gaps the checks flag">
    <h2>What the checks flag (${problems.length})</h2>
    <p>Mechanical findings, not a design verdict. Each one is a place to look before this map is built.</p>
    <table>
      <thead><tr><th>#</th><th>Check</th><th>Why</th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>
  </section>`;
}

/**
 * The map as a table, under the diagram.
 *
 * The picture is for the shape; the table is for the detail. A reader who
 * needs to know what wires to what reads the table — a reader who needs to
 * feel the shape reads the picture. Both are here because the artifact is
 * meant to be read by people AND by agents.
 */
function affordanceTable(affordances) {
  if (affordances.length === 0) return "";
  const rows = affordances
    .map(
      (item) =>
        `      <tr><td class="id">${escapeHtml(item.id)}</td>` +
        `<td><span class="kind" data-kind="${escapeHtml(item.kind)}">${escapeHtml(
          item.kind === "ui" ? "UI" : item.kind === "code" ? "Code" : "Store",
        )}</span></td>` +
        `<td>${escapeHtml(item.name)}</td>` +
        `<td class="id">${escapeHtml(item.control ?? "—")}</td>` +
        `<td class="id">${escapeHtml(item.place)}</td>` +
        `<td class="id">${escapeHtml((item.wiresOut ?? []).join(", ") || "—")}</td>` +
        `<td class="id">${escapeHtml((item.returnsTo ?? []).join(", ") || "—")}</td></tr>`,
    )
    .join("\n");
  return `  <details open>
    <summary>Affordances (${affordances.length})</summary>
    <table>
      <thead>
        <tr><th>#</th><th>Kind</th><th>Affordance</th><th>Control</th><th>Place</th><th>Wires out</th><th>Returns to</th></tr>
      </thead>
      <tbody>
${rows}
      </tbody>
    </table>
  </details>`;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The HTML shell.
 *
 * It carries the diagram as inline SVG and follows the reader's color
 * scheme. No external request: the file works offline, which is the point
 * of a durable artifact.
 *
 * The zoom follows the convention every diagram tool uses, and the one pele
 * documents: the plain wheel SCROLLS the page, and Ctrl/⌘+wheel zooms at the
 * pointer. Seizing the plain wheel is the usual mistake — it makes the
 * page impossible to scroll past a tall diagram.
 */
function htmlDocument(svg, title, subtitle, mermaidSource, affordances = [], problems = []) {
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
    --page-muted: #61616b;
    --page-surface: #ffffff;
    --page-border: #e2e2e8;
    --page-accent: #3f5fbf;
    --page-warn: #8a5a00;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --page-bg: #101014;
      --page-fg: #e8e8ea;
      --page-muted: #a0a0a8;
      --page-surface: #1a1a20;
      --page-border: #2c2c36;
      --page-accent: #8ab0ff;
      --page-warn: #e5b567;
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
  h1 { font-size: 1.35rem; margin: 0 0 .25rem; letter-spacing: -0.01em; }
  h2 { font-size: .95rem; margin: 0 0 .5rem; text-transform: uppercase; letter-spacing: .06em; color: var(--page-muted); }
  p.subtitle { margin: 0 0 1.5rem; color: var(--page-muted); }

  .diagram-wrap { position: relative; }
  .diagram {
    position: relative;
    background: var(--page-surface);
    border: 1px solid var(--page-border);
    border-radius: 12px;
    padding: 1.25rem;
    overflow: auto;
    min-height: 12rem;
  }
  .diagram:focus-visible { outline: 2px solid var(--page-accent); outline-offset: 2px; }
  /* The canvas is what gets transformed; keeping it a plain block leaves the
     zoom anchor measurable by offsetLeft/offsetTop, which a transform does
     not disturb. */
  .canvas { width: max-content; margin: 0 auto; transform-origin: 0 0; }
  .canvas svg { max-width: 100%; height: auto; display: block; }
  .diagram[data-zoomed="true"] { cursor: grab; }
  .diagram[data-zoomed="true"][data-dragging="true"] { cursor: grabbing; }

  .controls {
    position: absolute;
    right: .75rem;
    bottom: .75rem;
    z-index: 2;
    display: flex;
    gap: .25rem;
    padding: .25rem;
    background: color-mix(in srgb, var(--page-surface) 88%, transparent);
    border: 1px solid var(--page-border);
    border-radius: 8px;
    backdrop-filter: blur(6px);
  }
  .controls button {
    min-width: 2rem;
    height: 1.9rem;
    padding: 0 .4rem;
    border: 1px solid var(--page-border);
    border-radius: 6px;
    background: var(--page-surface);
    color: var(--page-fg);
    font: inherit;
    font-size: .85rem;
    line-height: 1;
    cursor: pointer;
  }
  .controls button:hover { border-color: var(--page-accent); color: var(--page-accent); }
  .controls button:focus-visible { outline: 2px solid var(--page-accent); outline-offset: 1px; }
  .controls .level {
    min-width: 3.2rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--page-muted);
    font-size: .78rem;
    font-variant-numeric: tabular-nums;
  }

  .hint { margin: .6rem 0 1.75rem; color: var(--page-muted); font-size: .82rem; }
  kbd {
    font: inherit;
    font-size: .78rem;
    border: 1px solid var(--page-border);
    border-bottom-width: 2px;
    border-radius: 4px;
    padding: 0 .3em;
    background: var(--page-surface);
  }

  .key ul { list-style: none; margin: 0 0 1.75rem; padding: 0; display: grid; gap: .45rem .5rem; grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr)); }
  .key li { display: flex; align-items: center; gap: .6rem; font-size: .86rem; color: var(--page-muted); }
  .key strong { color: var(--page-fg); font-weight: 600; }
  .key .shape { flex: none; width: 3rem; height: 1.25rem; }
  .key .shape rect, .key .shape path { fill: none; stroke: var(--page-fg); stroke-width: 1.5; }
  .key .shape rect.place { stroke: var(--page-muted); }
  .key .shape path.dashed { stroke-dasharray: 4 3; }

  .gaps { margin: 0 0 1.75rem; padding: .9rem 1rem; border: 1px solid var(--page-border); border-left: 3px solid var(--page-warn); border-radius: 8px; background: var(--page-surface); }
  .gaps p { margin: 0 0 .75rem; color: var(--page-muted); font-size: .86rem; }
  .gaps table td:first-child, .gaps table th:first-child { width: 4rem; }

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

  table { border-collapse: collapse; width: 100%; margin: .5rem 0 1.5rem; font-size: .88rem; }
  th, td { text-align: left; padding: .35rem .6rem; border-bottom: 1px solid var(--page-border); vertical-align: top; }
  th { color: var(--page-muted); font-weight: 600; white-space: nowrap; }
  td.id { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; white-space: nowrap; }
  .kind {
    display: inline-block;
    padding: 0 .35em;
    border-radius: 4px;
    font-size: .78em;
    letter-spacing: .02em;
    border: 1px solid var(--page-border);
    color: var(--page-muted);
  }
  .kind[data-kind="ui"] { color: #2c6e49; border-color: #2c6e4944; }
  .kind[data-kind="code"] { color: #7a4bbd; border-color: #7a4bbd44; }
  .kind[data-kind="store"] { color: #a06a12; border-color: #a06a1244; }
  @media (prefers-color-scheme: dark) {
    .kind[data-kind="ui"] { color: #7fd1a4; }
    .kind[data-kind="code"] { color: #c4a2f0; }
    .kind[data-kind="store"] { color: #e5b567; }
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
  <div class="diagram-wrap">
    <div class="diagram" id="diagram" tabindex="0" role="group" aria-label="${escapeHtml(title)}">
      <div class="canvas" id="canvas">
${svg}
      </div>
    </div>
    <div class="controls" role="group" aria-label="Diagram zoom">
      <button type="button" data-zoom="out" aria-label="Zoom out">&minus;</button>
      <span class="level" id="zoom-level" aria-live="off">100%</span>
      <button type="button" data-zoom="in" aria-label="Zoom in">+</button>
      <button type="button" data-zoom="reset" aria-label="Reset zoom">Reset</button>
    </div>
  </div>
  <p class="hint">
    Drag to pan. <kbd>Ctrl</kbd>/<kbd>&#8984;</kbd> + wheel zooms at the pointer;
    the plain wheel scrolls the page. <kbd>+</kbd>/<kbd>&minus;</kbd>/<kbd>0</kbd> and the arrow keys work too.
  </p>
${readingKey()}
${gapsSection(problems)}
${affordanceTable(affordances)}
  <details>
    <summary>Mermaid source</summary>
    <pre><code>${escapeHtml(mermaidSource)}</code></pre>
  </details>
</main>
<script type="module">
  // Zoom without a runtime dependency: the diagram is an SVG in the DOM, so
  // this is a few lines of transform math rather than a library.
  //
  // The plain wheel is NOT seized. It scrolls the page, because a reader who
  // cannot scroll past a tall diagram is stuck. Ctrl/Cmd + wheel zooms at
  // the pointer, which is the convention every diagram tool uses.
  //
  // Coordinates come from the canvas's LAYOUT box (offsetLeft/offsetTop).
  // getBoundingClientRect() would report the transformed box once zoomed,
  // which makes the anchor drift on the second zoom — the usual version of
  // this bug.
  const container = document.getElementById("diagram");
  const canvas = document.getElementById("canvas");
  const level = document.getElementById("zoom-level");
  if (canvas && container) {
    const MIN = 0.2;
    const MAX = 8;
    let scale = 1;
    let x = 0;
    let y = 0;
    let dragging = false;
    let startX = 0;
    let startY = 0;

    const apply = () => {
      canvas.style.transform = "translate(" + x + "px," + y + "px) scale(" + scale + ")";
      container.dataset.zoomed = scale > 1.01 ? "true" : "false";
      if (level) level.textContent = Math.round(scale * 100) + "%";
    };
    const clamp = (value) => Math.min(MAX, Math.max(MIN, value));
    // The pointer in the canvas's own layout coordinates: viewport → container
    // content box → canvas origin. Stable across zoom and scroll.
    const pointAt = (clientX, clientY) => {
      const rect = container.getBoundingClientRect();
      return {
        px: clientX - rect.left + container.scrollLeft - canvas.offsetLeft,
        py: clientY - rect.top + container.scrollTop - canvas.offsetTop,
      };
    };
    const zoomAt = (factor, clientX, clientY) => {
      const next = clamp(scale * factor);
      if (next === scale) return;
      const { px, py } = pointAt(clientX, clientY);
      // Keep the point under the pointer fixed while scaling:
      // screen = x + scale * p, so x' = px - (next / scale) * (px - x).
      const ratio = next / scale;
      x = px - (px - x) * ratio;
      y = py - (py - y) * ratio;
      scale = next;
      apply();
    };
    const centerZoom = (factor) => {
      const rect = container.getBoundingClientRect();
      zoomAt(factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
    };
    const reset = () => { scale = 1; x = 0; y = 0; apply(); };

    container.addEventListener("wheel", (event) => {
      if (!event.ctrlKey && !event.metaKey) return; // plain wheel scrolls the page
      event.preventDefault();
      zoomAt(event.deltaY < 0 ? 1.1 : 0.9, event.clientX, event.clientY);
    }, { passive: false });

    container.addEventListener("pointerdown", (event) => {
      if (scale <= 1.01) return;
      dragging = true;
      container.dataset.dragging = "true";
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
    const stop = () => { dragging = false; container.dataset.dragging = "false"; };
    container.addEventListener("pointerup", stop);
    container.addEventListener("pointercancel", stop);
    container.addEventListener("dblclick", reset);

    container.addEventListener("keydown", (event) => {
      const step = 20;
      if (event.key === "+" || event.key === "=") centerZoom(1.1);
      else if (event.key === "-") centerZoom(1 / 1.1);
      else if (event.key === "0") reset();
      else if (event.key === "ArrowLeft") { x -= step; apply(); }
      else if (event.key === "ArrowRight") { x += step; apply(); }
      else if (event.key === "ArrowUp") { y -= step; apply(); }
      else if (event.key === "ArrowDown") { y += step; apply(); }
      else return;
      event.preventDefault();
    });

    // The controls live in the wrapper, not inside the scrollable diagram —
    // an absolutely positioned child of a scrolling container scrolls away
    // with it, which buries the buttons under the diagram.
    const wrap = container.parentElement;
    for (const button of wrap ? wrap.querySelectorAll("[data-zoom]") : []) {
      button.addEventListener("click", () => {
        const action = button.dataset.zoom;
        if (action === "reset") { reset(); return; }
        centerZoom(action === "in" ? 1.2 : 1 / 1.2);
      });
    }
  }
</script>
</body>
</html>
`;
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

/**
 * Ask the portable helper for the map's verdict.
 *
 * `scripts/stelow check breadboard` is the single implementation: the helper
 * is installed wherever a workflow runs, the `advance` guard calls it, and
 * this script reads the same answer. Two checkers would eventually disagree.
 */
function readVerdict(inputPath) {
  const helper = join(MODULE_DIR, "stelow");
  // `bash "$SELF"`, not "$SELF": hosts sync the helper as a 0644 file and run
  // it with `bash` (server/runtime/helper-script.ts). Executing it directly
  // fails on every host with "Permission denied", which turned a documented
  // degradation into a hard failure.
  const result = spawnSync("bash", [helper, "check", "breadboard", inputPath, "--json"], { encoding: "utf8" });
  if (result.error) throw new Error(`cannot run the checker at ${helper}: ${result.error.message}`);
  const stdout = (result.stdout ?? "").trim();
  if (!stdout) {
    throw new Error(`the checker returned no verdict for ${inputPath}: ${(result.stderr ?? "").trim() || "no output"}`);
  }
  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error(`the checker's verdict for ${inputPath} is not JSON: ${stdout.slice(0, 200)}`);
  }
}

/** Report each finding on stderr, one line, naming what it costs. */
function reportFindings(path, verdict) {
  for (const problem of verdict.contract ?? []) {
    process.stderr.write(`render-diagram: ${path}: contract — ${problem.path}: ${problem.message}\n`);
  }
  for (const problem of verdict.problems ?? []) {
    process.stderr.write(
      `render-diagram: ${path}: ${problem.severity} — ${problem.id} (${problem.name}): ${problem.check}: ${problem.reason}\n`,
    );
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(USAGE);
    return 0;
  }
  if (options.errors.length > 0) {
    for (const error of options.errors) process.stderr.write(`render-diagram: ${error}\n`);
    process.stderr.write(USAGE);
    return 2;
  }
  if (!options.command) {
    // Bare invocation prints usage; a run with flags but no command is a
    // mistake. Returning 0 either way would let a scripted run report success
    // without doing anything.
    if (options.input || options.out || options.emitMarkdown || options.emitMermaid) {
      process.stderr.write(`render-diagram: missing command (expected "breadboard")\n${USAGE}`);
      return 2;
    }
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
  // `--with-diagram` only means something for the markdown view. Silently
  // ignoring it leaves the caller believing a diagram is in the file.
  if (options.withDiagram && !options.emitMarkdown) {
    process.stderr.write(`render-diagram: --with-diagram needs --emit-markdown\n${USAGE}`);
    return 2;
  }

  const inputPath = resolve(options.input);
  const map = readMap(inputPath);
  assertRenderable(map, inputPath);

  const verdict = readVerdict(inputPath);
  const problems = verdict.problems ?? [];
  const errorCount = verdict.counts?.errors ?? 0;
  reportFindings(inputPath, verdict);

  // An error means the map contradicts itself or its contract. Every view is
  // a projection of the map, so a view of a broken map would present a hole
  // as a decision. The JSON stands; nothing else is written.
  if (errorCount > 0) {
    process.stderr.write(
      `render-diagram: ${errorCount} error(s) — refusing to draw a map that contradicts itself or its contract\n`,
    );
    return 1;
  }

  const mermaid = toMermaid(map);

  if (options.emitMermaid) {
    const mermaidPath = inputPath.replace(/\.json$/i, "") + ".mmd";
    writeFileSync(mermaidPath, mermaid, "utf8");
    process.stdout.write(`render-diagram: wrote ${mermaidPath}\n`);
  }

  if (options.emitMarkdown) {
    const markdownPath = inputPath.replace(/\.json$/i, "") + ".md";
    const body = options.withDiagram
      ? toMarkdownWithDiagram(map, mermaid, problems)
      : toMarkdown(map, problems);
    writeFileSync(markdownPath, body, "utf8");
    process.stdout.write(`render-diagram: wrote ${markdownPath}\n`);
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
  writeFileSync(
    outPath,
    htmlDocument(svg, title, subtitle, mermaid, map.affordances ?? [], problems),
    "utf8",
  );
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
