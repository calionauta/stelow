// Stelow docs site builder — zero dependencies (node stdlib only).
//
// Inputs:  docs/**/*.md listed in MANIFEST below (explicit list = stable slugs).
// Outputs: site/docs/<slug>/index.html, site/docs/index.html, site/llms.txt,
//          site/llms-full.txt, site/sitemap.xml.
//
// Refresh procedure (same rule as docs/cli.md): to add a page, append one
// MANIFEST row with a one-line description, then run `npm run gen:site`.
// Slugs are stable URLs — never rename one without a redirect note.
//
// Usage: node site/build.mjs [--check]
//   --check verifies every manifest file exists and every internal .md link
//   resolves, without writing output. CI runs the build; reviewers run --check.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = join(ROOT, "docs");
const OUT = join(ROOT, "site");
const BASE = "https://calionauta.github.io/stelow";

// emitting page context for link rewriting (set per page in build())
let CUR_SLUG = "";

// slug, source file (under docs/), one-line description (also feeds llms.txt)
const MANIFEST = [
  { group: "Get started", slug: "overview", file: "overview.md",
    desc: "What Stelow is, the two run paths, and pre-1.0 status." },
  { group: "Get started", slug: "getting-started", file: "getting-started.md",
    desc: "Path A (bb + plugin) and Path B (skills-only) setup with checks." },
  { group: "Core", slug: "architecture", file: "architecture.md",
    desc: "Skills + scripts/stelow layout, 18-stage state machine, data flow." },
  { group: "Core", slug: "workflow", file: "workflow.md",
    desc: "Run knobs x Review Mode, phases, gates and approval receipts." },
  { group: "Core", slug: "scopes-tasks-records", file: "scopes-tasks-records.md",
    desc: "Three-layer execution model and sequential-by-default dispatch." },
  { group: "Core", slug: "cli", file: "cli.md",
    desc: "scripts/stelow subcommands, exit codes, and /sw-* mapping." },
  { group: "Core", slug: "skills", file: "skills.md",
    desc: "Inventory of the 32 skills: 17 workflow + 15 product." },
  { group: "In bb (plugin)", slug: "plugin/what-plugin-adds", file: "plugin/what-plugin-adds.md",
    desc: "Core vs plugin table and guarantees the plugin never breaks." },
  { group: "In bb (plugin)", slug: "plugin/install-bb", file: "plugin/install-bb.md",
    desc: "Install and update the plugin on bb." },
  { group: "In bb (plugin)", slug: "plugin/board-and-inbox", file: "plugin/board-and-inbox.md",
    desc: "Tracks, bucket, honest badge, and card behavior." },
  { group: "In bb (plugin)", slug: "plugin/automation-rules", file: "plugin/automation-rules.md",
    desc: "Label watchers, backlog guard, and kill switch." },
  { group: "In bb (plugin)", slug: "plugin/github-issues", file: "plugin/github-issues.md",
    desc: "Issue import, trust model, mirrors, and write-back." },
  { group: "In bb (plugin)", slug: "plugin/agent-presets", file: "plugin/agent-presets.md",
    desc: "Provider/model/reasoning/permission profiles per card." },
  { group: "In bb (plugin)", slug: "plugin/native-workflows", file: "plugin/native-workflows.md",
    desc: "Durable Workflows backend and what stays sequential." },
  { group: "In bb (plugin)", slug: "plugin/decision-routing", file: "plugin/decision-routing.md",
    desc: "Deterministic-first policy and the Decision API." },
  { group: "In bb (plugin)", slug: "plugin/scope-contracts", file: "plugin/scope-contracts.md",
    desc: "Scope ownership, decision records, challenges, human boundaries." },
  { group: "In bb (plugin)", slug: "plugin/team-playbook", file: "plugin/team-playbook.md",
    desc: "Experimental one-bb-per-teammate playbook over GitHub." },
  { group: "Operate", slug: "faq", file: "faq.md",
    desc: "Which path, who decides, safety, state, stability." },
  { group: "Operate", slug: "status", file: "status.md",
    desc: "Pre-1.0 status, honest limitations, experimental surfaces." },
  { group: "Operate", slug: "evidence", file: "evidence.md",
    desc: "Evidence base and known limitations register." },
  { group: "Operate", slug: "contributing", file: "contributing.md",
    desc: "Human summary of the repo conventions for contributors." },
];

const CSS = `*{box-sizing:border-box}body{margin:0;font:16px/1.65 system-ui,-apple-system,sans-serif;color:#1a1a1a;background:#fff}.wrap{display:flex;max-width:1080px;margin:0 auto}nav.side{width:250px;flex-shrink:0;padding:32px 24px;border-right:1px solid #e5e5e5;position:sticky;top:0;align-self:flex-start;max-height:100vh;overflow:auto}nav.side .home{display:block;font-weight:700;margin-bottom:16px;color:#1a1a1a;text-decoration:none}nav.side h4{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#666;margin:16px 0 4px}nav.side a{display:block;padding:3px 0;color:#333;text-decoration:none;font-size:14px}nav.side a.cur{font-weight:700}nav.side a:hover{text-decoration:underline}main{flex:1;min-width:0;padding:32px 40px;max-width:760px}main h1{font-size:30px;line-height:1.25;margin:0 0 16px}main h2{font-size:22px;margin:32px 0 8px;border-bottom:1px solid #eee;padding-bottom:6px}main h3{font-size:17px;margin:24px 0 8px}main p,main li{color:#222}main a{color:#0b5fff}main code{font:13px ui-monospace,monospace;background:#f4f4f5;padding:2px 5px;border-radius:4px}main pre{background:#111;color:#eee;padding:14px 16px;border-radius:8px;overflow:auto}main pre code{background:none;padding:0;color:inherit}main table{border-collapse:collapse;width:100%;margin:16px 0;font-size:14px}main th,main td{border:1px solid #ddd;padding:8px 10px;text-align:left;vertical-align:top}main th{background:#f7f7f8}main blockquote{border-left:3px solid #0b5fff;margin:16px 0;padding:4px 16px;background:#f5f8ff}main hr{border:none;border-top:1px solid #e5e5e5;margin:32px 0}.prevnext{display:flex;justify-content:space-between;margin-top:40px;padding-top:16px;border-top:1px solid #eee;font-size:14px}@media(max-width:760px){nav.side{display:none}main{padding:24px 20px}}`;

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// GitHub-compatible heading slug: lowercase, strip markdown links/backticks,
// drop anything that is not a word char/space/hyphen, spaces -> hyphens.
function slugify(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // keep link text, drop the URL
    .replace(/`/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function inline(s, pageDir) {
  // images first (none in use, but supported)
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => `<img alt="${esc(alt)}" src="${esc(rewrite(src, pageDir))}">`);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => {
    if (/^(https?:|mailto:|#)/.test(href)) return `<a href="${esc(href)}">${esc(text)}</a>`;
    return `<a href="${esc(rewrite(href, pageDir))}">${esc(text)}</a>`;
  });
  s = s.replace(/`([^`]+)`/g, (_, code) => `<code>${esc(code)}</code>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|\W)\*([^*\n]+)\*/g, "$1<em>$2</em>");
  return s;
}

// .md links become directory URLs relative to the emitting page when the
// target is a manifest page; anything else (repo files outside site nav)
// links to the GitHub blob so it never 404s.
function rewrite(href, pageDir) {
  const hashIdx = href.indexOf("#");
  const hash = hashIdx >= 0 ? href.slice(hashIdx) : "";
  const path = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
  if (!path.endsWith(".md")) return href;
  const abs = resolve(DOCS, pageDir, path);
  const relToDocs = relative(DOCS, abs).split(sep).join("/");
  const hit = MANIFEST.find((p) => p.file === relToDocs);
  if (hit) return rel(CUR_SLUG, hit.slug) + hash;
  // A path that escapes docs/ points at a repo file outside the docs tree.
  // Resolve it against the repo ROOT, never docs/ — otherwise the URL keeps a
  // literal `..` segment (blob/main/docs/../HOSTING.md), which GitHub only
  // tolerates by accident and which 404s whenever the prefix is absent.
  const relToRoot = relative(ROOT, abs).split(sep).join("/");
  return `https://github.com/calionauta/stelow/blob/main/${relToRoot}${hash}`;
}

function renderBody(md, pageDir) {
  const lines = md.split("\n");
  const out = [];
  let i = 0;
  const flushPara = (buf) => {
    if (buf.length) { out.push(`<p>${inline(buf.join(" "), pageDir)}</p>`); buf.length = 0; }
  };
  let para = [];
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      flushPara(para);
      const fence = [line];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { fence.push(lines[i]); i++; }
      i++; // closing fence
      const code = fence.slice(1).join("\n");
      out.push(`<pre><code>${esc(code.replace(/^\n/, ""))}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      flushPara(para);
      const id = slugify(h[2]);
      // Generator does not dedupe: duplicate heading text on one page would emit duplicate ids.
      out.push(
        `<h${h[1].length}${id ? ` id="${esc(id)}"` : ""}>${inline(h[2], pageDir)}</h${h[1].length}>`,
      );
      i++;
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      flushPara(para);
      out.push("<hr>");
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      flushPara(para);
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { quote.push(lines[i].replace(/^>\s?/, "")); i++; }
      out.push(`<blockquote>${inline(quote.join(" "), pageDir)}</blockquote>`);
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      flushPara(para);
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ""), pageDir)}</li>`);
        i++;
      }
      out.push(ordered ? `<ol>${items.join("")}</ol>` : `<ul>${items.join("")}</ul>`);
      continue;
    }
    if (/^\|.*\|$/.test(line.trim())) {
      flushPara(para);
      const rows = [];
      while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) { rows.push(lines[i].trim()); i++; }
      const cells = (r) => r.split("|").slice(1, -1).map((c) => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(1).filter((r) => !/^[\s|:|-]+$/.test(r));
      out.push(`<table><thead><tr>${head.map((c) => `<th>${inline(c, pageDir)}</th>`).join("")}</tr></thead><tbody>${
        body.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c, pageDir)}</td>`).join("")}</tr>`).join("")
      }</tbody></table>`);
      continue;
    }
    if (/^\s*$/.test(line)) {
      flushPara(para);
      i++;
      continue;
    }
    para.push(line.trim());
    i++;
  }
  flushPara(para);
  return out.join("\n");
}

function titleOf(md, fallback) {
  const m = md.match(/^#\s+(.*)/m);
  return m ? m[1].trim() : fallback;
}

function sidebar(cur) {
  let html = `<a class="home" href="${up(cur)}">← stelow</a>`;
  let group = "";
  for (const p of MANIFEST) {
    if (p.group !== group) { group = p.group; html += `<h4>${esc(group)}</h4>`; }
    const cls = p.slug === cur ? ` class="cur"` : "";
    html += `<a${cls} href="${rel(cur, p.slug)}">${esc(p.title)}</a>`;
  }
  return html;
}

// relative URL from the page at fromSlug to the page at toSlug (both dir URLs).
// fromSlug segments ARE the directory (page lives at docs/<slug>/index.html).
function rel(fromSlug, toSlug) {
  const fromDir = fromSlug.split("/");
  const to = toSlug.split("/");
  while (fromDir.length && to.length && fromDir[0] === to[0]) { fromDir.shift(); to.shift(); }
  if (!to.length) return "./";
  return "../".repeat(fromDir.length) + to.join("/") + "/";
}

// relative URL from the page at slug back to the site root
function up(slug) {
  return "../".repeat(slug.split("/").length + 1);
}

function pageShell(title, cur, body, prevNext, navOverride) {
  const nav = navOverride !== undefined ? navOverride : sidebar(cur);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — stelow docs</title>
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
<nav class="side">${nav}</nav>
<main>
${body}
<div class="prevnext">${prevNext}</div>
</main>
</div>
</body>
</html>`;
}

// Valid heading anchors per markdown file, slugified with the same slugify()
// used for rendering so the two can never disagree. Built lazily and cached;
// missing or unreadable files yield an empty set.
const anchorCache = new Map();
function anchorsFor(abs) {
  if (!anchorCache.has(abs)) {
    const ids = new Set();
    try {
      const src = readFileSync(abs, "utf8");
      for (const line of src.split("\n")) {
        const h = /^(#{1,4})\s+(.*)$/.exec(line);
        if (h) ids.add(slugify(h[2]));
      }
    } catch { /* missing/unreadable: leave empty */ }
    anchorCache.set(abs, ids);
  }
  return anchorCache.get(abs);
}

function check() {
  let failed = 0;
  for (const p of MANIFEST) {
    const path = join(DOCS, p.file);
    if (!existsSync(path)) { console.error(`missing manifest file: ${p.file}`); failed++; }
  }
  for (const p of MANIFEST) {
    const md = readFileSync(join(DOCS, p.file), "utf8");
    const pageDir = dirname(p.file) === "." ? "" : dirname(p.file);
    const curAbs = join(DOCS, p.file);
    for (const m of md.matchAll(/\]\(([^)#]*)(#[^)]*)?\)/g)) {
      const target = m[1];
      const frag = m[2] ? m[2].slice(1) : "";
      if (/^(https?:|mailto:)/.test(target)) continue;
      if (!target && !frag) continue;
      const abs = target === "" ? curAbs : resolve(DOCS, pageDir, target);
      if (!existsSync(abs)) { console.error(`broken link in ${p.file}: ${target}`); failed++; continue; }
      if (!frag) continue;
      if (!abs.endsWith(".md")) continue;
      const ids = anchorsFor(abs);
      if (!ids.has(frag)) { console.error(`missing anchor in ${p.file}: ${target}#${frag}`); failed++; }
    }
  }
  if (failed) { console.error(`${failed} check failure(s)`); process.exit(1); }
  checkSkillTaxonomy();
  console.log(`check ok: ${MANIFEST.length} pages, all links resolve`);
}

// The docs/skills.md domain-vs-method split is derived, never hand-maintained:
// domain skills = context-stage language-signal rows + one documented exception
// (paywall is consulted with no signal row). Any drift fails the build.
function checkSkillTaxonomy() {
  const PAYWALL_EXCEPTION = "stelow-product-paywall";
  const contextMd = readFileSync(join(ROOT, "skills/stelow-workflow-orchestrator/stages/context.md"), "utf8");
  const signaled = new Set([...contextMd.matchAll(/^\|.*`(stelow-product-[a-z-]+)`.*\|$/gm)].map((m) => m[1]));
  const skillsMd = readFileSync(join(DOCS, "skills.md"), "utf8");
  const rows = [...skillsMd.matchAll(/^\| `(stelow-product-[a-z-]+)` \| (domain|method) \|.*\|$/gm)];
  if (!rows.length) { console.error("skills.md product table not found"); process.exit(1); }
  const documented = new Map(rows.map((m) => [m[1], m[2]]));
  const expectedDomain = new Set([...signaled, PAYWALL_EXCEPTION]);
  const productDirs = new Set(
    readdirSync(join(ROOT, "skills")).filter((d) => d.startsWith("stelow-product-")),
  );
  const problems = [];
  for (const s of expectedDomain) {
    if (documented.get(s) !== "domain") problems.push(`${s} should be documented as domain`);
  }
  for (const [s, kind] of documented) {
    if (kind === "domain" && !expectedDomain.has(s)) problems.push(`${s} documented as domain but has no signal row or exception`);
    if (kind === "method" && expectedDomain.has(s)) problems.push(`${s} documented as method but is in the domain set`);
    if (!productDirs.has(s)) problems.push(`${s} documented but directory is missing`);
  }
  for (const d of productDirs) {
    if (!documented.has(d)) problems.push(`${d} exists but is not documented`);
  }
  if (problems.length) { console.error("skill taxonomy drift:\n- " + problems.join("\n- ")); process.exit(1); }
  console.log(`taxonomy ok: ${expectedDomain.size} domain + ${documented.size - expectedDomain.size} method = ${documented.size} product skills`);
}

function build() {
  check();
  for (const p of MANIFEST) {
    CUR_SLUG = p.slug;
    p.md = readFileSync(join(DOCS, p.file), "utf8");
    p.title = titleOf(p.md, p.slug);
  }
  // docs pages
  MANIFEST.forEach((p, idx) => {
    CUR_SLUG = p.slug;
    const pageDir = dirname(p.file) === "." ? "" : dirname(p.file);
    const prev = MANIFEST[idx - 1];
    const next = MANIFEST[idx + 1];
    const nav = `${prev ? `<a href="${rel(p.slug, prev.slug)}">← ${esc(prev.title)}</a>` : "<span></span>"}${next ? `<a href="${rel(p.slug, next.slug)}">${esc(next.title)} →</a>` : "<span></span>"}`;
    const body = renderBody(p.md, pageDir);
    const dir = join(OUT, "docs", p.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), pageShell(p.title, p.slug, body, nav));
  });
  // docs index
  let groups = "";
  let group = "";
  for (const p of MANIFEST) {
    if (p.group !== group) { group = p.group; groups += `<h2>${esc(group)}</h2>\n<ul>`; }
    groups += `<li><a href="./${p.slug}/">${esc(p.title)}</a> — ${esc(p.desc)}</li>`;
  }
  groups += "</ul>".repeat(new Set(MANIFEST.map((p) => p.group)).size);
  let idxNav = `<a class="home" href="../">← stelow</a>`;
  let idxGroup = "";
  for (const p of MANIFEST) {
    if (p.group !== idxGroup) { idxGroup = p.group; idxNav += `<h4>${esc(p.group)}</h4>`; }
    idxNav += `<a href="./${p.slug}/">${esc(p.title)}</a>`;
  }
  mkdirSync(join(OUT, "docs"), { recursive: true });
  writeFileSync(join(OUT, "docs", "index.html"),
    pageShell("Docs", "", `<h1>Stelow docs</h1>\n${groups}`, `<a href="../">← stelow home</a>`, idxNav));
  // llms.txt (stable map: one line per page)
  const llms = `# Stelow docs\n\n> Stelow brings product methodology to AI coding agents. Full map below; complete texts in llms-full.txt.\n\n` +
    MANIFEST.map((p) => `## ${p.title}\n${p.desc}\n${BASE}/docs/${p.slug}/\n`).join("\n");
  writeFileSync(join(OUT, "llms.txt"), llms);
  // llms-full.txt (concatenated sources)
  const full = MANIFEST.map((p) => `# ${p.title}\n\nSource: docs/${p.file} — ${BASE}/docs/${p.slug}/\n\n${p.md.trim()}\n`).join("\n---\n\n");
  writeFileSync(join(OUT, "llms-full.txt"), `# Stelow docs (full)\n\n${full}`);
  // sitemap
  const urls = ["", "docs/", ...MANIFEST.map((p) => `docs/${p.slug}/`)];
  writeFileSync(join(OUT, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${BASE}/${u}</loc></url>`).join("\n") + `\n</urlset>\n`);
  console.log(`built ${MANIFEST.length} pages + index + llms.txt + llms-full.txt + sitemap.xml`);
}

if (process.argv.includes("--check")) check();
else build();
