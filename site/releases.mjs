// releases.mjs — CHANGELOG.md → /releases/ article pages. Zero deps (node stdlib).
//
// Canonical: agent-sync-public skills/local/cali-ops-changelog-site/scripts/releases.mjs
// Vendored copies in consumer repos must stay byte-identical; wiring lives in
// each repo's site/build.mjs. Pattern: skill cali-ops-changelog-site.
//
// URL scheme: site/releases/index.html (/releases/) + site/releases/<v>.html.
// File pages (not dir URLs) so nav needs no per-depth helper: home is "../",
// index is "./", prev/next are "./<v>.html" from every version page.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// Split markdown into {header, body} on ## section headings.
export function splitSections(md) {
  const sections = [];
  let header = null;
  let body = [];
  for (const line of md.split("\n")) {
    const h = line.match(/^##\s+(.*)/);
    if (h) {
      if (header !== null) sections.push({ header, body: body.join("\n").trim() });
      header = h[1].trim();
      body = [];
    } else if (header !== null) {
      body.push(line);
    }
  }
  if (header !== null) sections.push({ header, body: body.join("\n").trim() });
  return sections;
}

// Header shapes, all handled:
//   [0.36.4] - 2026-10-06            (gogogo / stelow core)
//   [0.78.1](https://.../compare/...) (2026-10-07)   (release-please)
//   [0.33.0] - 2026-10-04 · [0.32.0] - 2026-10-04    (shared section)
//   [Unreleased]                       (no date, no tag link)
export function parseRelease(header) {
  const versions = [...header.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1].trim());
  const dm = header.match(/(\d{4}-\d{2}-\d{2})/);
  return { versions, date: dm ? dm[1] : "" };
}

export function releaseSlug(version) {
  return /^unreleased$/i.test(version) ? "unreleased" : version;
}

// First renderable paragraph, flattened, capped — the index lede.
export function lede(body, max = 200) {
  const para =
    body
      .split(/\n\s*\n/)
      .map((s) => s.trim())
      .find((s) => s && !/^#{1,4}\s/.test(s) && !/^\|/.test(s) && !/^([-*]|\d+\.)\s/.test(s) && !/^>/.test(s)) || "";
  const flat = para
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return flat.length > max ? flat.slice(0, max - 1).trimEnd() + "…" : flat;
}

// SOURCES: [{ file (repo-root-relative), origin (string|null), repo, tagPrefix }]
// File order per source is kept (changelogs are newest-first); sources concatenate.
export function loadReleases(ROOT, SOURCES) {
  const entries = [];
  const seen = new Set();
  for (const src of SOURCES) {
    const abs = join(ROOT, src.file);
    if (!existsSync(abs)) {
      console.error(`releases: missing source file: ${src.file}`);
      process.exit(1);
    }
    for (const { header, body } of splitSections(readFileSync(abs, "utf8"))) {
      const { versions, date } = parseRelease(header);
      if (!versions.length) {
        console.error(`releases: unparseable section header in ${src.file}: ${header}`);
        process.exit(1);
      }
      const version = versions[0];
      let slug = releaseSlug(version);
      if (seen.has(slug)) {
        // Genuine cross-repo collision (independent version lines sharing a
        // number): disambiguate with the origin, never silently drop one.
        // Deterministic: first source keeps the bare slug.
        slug = `${src.origin || "x"}-${slug}`;
        console.error(`releases: slug collision on ${version}, using ${slug}`);
      }
      if (seen.has(slug)) {
        console.error(`releases: duplicate slug even after origin prefix: ${slug}`);
        process.exit(1);
      }
      seen.add(slug);
      entries.push({
        slug,
        version,
        versions,
        date: date || "unreleased",
        title: header,
        body,
        origin: src.origin || "",
        repo: src.repo,
        tagPrefix: src.tagPrefix || "v",
      });
    }
  }
  if (!entries.length) {
    console.error("releases: no sections found");
    process.exit(1);
  }
  return entries;
}

// Parse-only gate for check(): fails loudly, writes nothing.
export function checkReleases(ROOT, SOURCES) {
  const entries = loadReleases(ROOT, SOURCES);
  console.log(`releases ok: ${entries.length} sections from ${SOURCES.length} source(s)`);
}

// Relative .md links inside entries resolve against the repo root on GitHub
// (CHANGELOG.md lives there) — rewrite them to blob URLs before rendering so
// the host builder never misfires its docs-tree link logic on them.
function rootBlobLinks(body, repo) {
  return body.replace(
    /\[([^\]]+)\]\((?!https?:|mailto:|#)([^)]+)\)/g,
    (_, text, href) => `[${text}](https://github.com/${repo}/blob/master/${href.replace(/^\.\//, "")})`,
  );
}

export function tagUrl(e) {
  if (e.date === "unreleased") return "";
  return `https://github.com/${e.repo}/releases/tag/${e.tagPrefix}${e.version}`;
}

// h: { esc, renderBody, pageShell }. Emits index + one file per version.
// Returns repo-root-relative sitemap paths.
export function buildReleases({ ROOT, OUT, NAME, SOURCES, h }) {
  const entries = loadReleases(ROOT, SOURCES);
  const originTag = (e) => (e.origin ? ` <small>· ${h.esc(e.origin)}</small>` : "");
  const alsoTag = (e) =>
    e.versions.length > 1 ? ` <small>(also ${e.versions.slice(1).map((v) => h.esc(v)).join(", ")})</small>` : "";

  // index
  const rows = entries
    .map(
      (e) =>
        `<li><a href="./${e.slug}.html">${h.esc(e.version)}</a>${originTag(e)} <small>${h.esc(e.date)}</small>${alsoTag(e)}${lede(e.body) ? ` — ${h.esc(lede(e.body))}` : ""}</li>`,
    )
    .join("\n");
  const idxNav = `<a class="home" href="../">← ${h.esc(NAME)}</a><h4>Releases</h4><a class="cur" href="./">All releases</a>`;
  mkdirSync(join(OUT, "releases"), { recursive: true });
  writeFileSync(
    join(OUT, "releases", "index.html"),
    h.pageShell(`Releases`, "", `<h1>Releases</h1>\n<ul>\n${rows}\n</ul>`, `<a href="../">← ${h.esc(NAME)} home</a>`, idxNav),
  );

  // one file per version, newest-first prev/next
  entries.forEach((e, i) => {
    const tag = tagUrl(e);
    const newer = entries[i - 1];
    const older = entries[i + 1];
    const nav =
      `<a class="home" href="../">← ${h.esc(NAME)}</a>` +
      `<h4>Releases</h4><a href="./">All releases</a>`;
    const prevNext =
      `${newer ? `<a href="./${newer.slug}.html">← ${h.esc(newer.version)}</a>` : "<span></span>"}` +
      `${older ? `<a href="./${older.slug}.html">${h.esc(older.version)} →</a>` : "<span></span>"}`;
    const body =
      `<h1>${h.esc(e.version)}${originTag(e)} <small>${h.esc(e.date)}</small></h1>\n` +
      (tag ? `<p><a href="${tag}">release ${h.esc(e.version)} on GitHub →</a></p>\n` : "") +
      h.renderBody(rootBlobLinks(e.body, e.repo), "@releases/");
    writeFileSync(join(OUT, "releases", `${e.slug}.html`), h.pageShell(e.version, "", body, prevNext, nav));
  });

  console.log(`releases: index + ${entries.length} version page(s)`);
  return ["releases/", ...entries.map((e) => `releases/${e.slug}.html`)];
}
