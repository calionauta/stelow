// SCOPE:feature - Behavioral proof: every page has a markdown copy an agent can
// fetch, and the copy is not a second, quietly different rendering of the page.
//
// WHY THIS EXISTS. The site's only agent surface used to be llms-full.txt: one
// 1 MB blob whose `Source:` lines named repo-relative paths, so a reader that
// followed one asked the SITE for `docs/overview.md` and got a 404. The fix is a
// per-page .md mirror at the site root. A mirror rots in ways a page does not: a
// link can point at a file the build never emitted, an image can keep a
// post-rewrite URL, two H1s can appear, or the parser can glue three list items
// onto one line. Each of those breaks an agent silently, so each is asserted.
//
// Run: node src/markdown-mirror.test.mjs [project-root]
// No browser and no playwright: this is a build-artifact contract.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(process.argv[2] || process.cwd());
const SITE = join(ROOT, "site");
const failures = [];
const bad = (m) => failures.push(m);

// The manifest is the build's own input; reading the config keeps this test
// free of a second page list to drift from it.
const cfg = (await import(pathToFileURL(join(SITE, "docsite.config.mjs")).href)).default;
const pages = cfg.manifest.map((p) => ({ slug: p.slug, file: p.file, desc: p.desc }));

for (const p of pages) {
  // Copies sit beside their page URL: site/docs/<slug>.md.
  const copy = join(SITE, "docs", `${p.slug}.md`);
  if (!existsSync(copy)) { bad(`${p.slug}.md was not emitted`); continue; }
  const md = readFileSync(copy, "utf8");
  if (!md.startsWith("# ")) bad(`${p.slug}.md does not open with its title`);
  // Count H1s OUTSIDE fenced blocks: a shell snippet whose comment starts with
  // `# ` is not a second title, and three real pages proved it.
  const prose = md.split(/^\s*```/m).filter((_, i) => i % 2 === 0).join("\n");
  if ((prose.match(/^# /gm) || []).length !== 1) bad(`${p.slug}.md has more than one H1`);
  if (!md.includes("<!-- page: http")) bad(`${p.slug}.md lost its page URL breadcrumb`);
  // An image URL emitted as a file name is a broken image in every copy: that is
  // the exact bug the rewrite guard in build.mjs exists for.
  if (/!\[[^\]]*\]\((?!https?:|\/)[^)]*\.(png|jpe?g|gif|webp|svg)\)/i.test(md)) {
    bad(`${p.slug}.md has an image with a relative (rewritten) URL`);
  }
  // A link to a sibling must name a file the build emitted.
  for (const m of md.matchAll(/\]\((?!https?:|#|mailto:)([^)#]+\.md)(#[^)]*)?\)/g)) {
    // Copies live at docs/<slug>.md, so a sibling target is relative to THAT
    // directory, not to the site root: a nested slug walks back its own depth.
    if (!existsSync(resolve(dirname(copy), m[1]))) {
      bad(`${p.slug}.md links ${m[1]}, which was not emitted`);
    }
  }
  // A list collapsed onto one line is a rendering bug, not a style choice: the
  // items are adjacent in the rendered HTML and the parser has to split them,
  // which leaves the second item's dash glued to the first item's last word.
  // The signature is a sentence end immediately followed by a marker (`run.- `).
  // `--` inside a code span is not one, which is why this is not `\S- `.
  if (/\.- \S/.test(prose)) bad(`${p.slug}.md glued several list items onto one line`);
  // A blank line inside a table ends it: the rows after it render as text.
  const tableRun = prose.split("\n");
  for (let i = 1; i < tableRun.length - 1; i++) {
    const gap = tableRun[i].trim() === "";
    if (gap && /^\| /.test(tableRun[i - 1]) && /^\| /.test(tableRun[i + 1])) {
      bad(`${p.slug}.md breaks a table with a blank line (line ${i + 1})`);
      break;
    }
  }

  // The HTML page: the metadata a shared link needs, and the link to the copy.
  const html = readFileSync(join(SITE, "docs", p.slug, "index.html"), "utf8");
  for (const needle of ['rel="canonical"', 'property="og:title"', 'property="og:url"', 'name="twitter:card"']) {
    if (!html.includes(needle)) bad(`docs/${p.slug}/index.html is missing ${needle}`);
  }
  if (!new RegExp(`rel="canonical" href="[^"]*/${p.slug}/"`).test(html)) {
    bad(`docs/${p.slug}/index.html canonical does not name the page`);
  }
  if (p.desc && !html.includes(p.desc)) bad(`docs/${p.slug}/index.html dropped the manifest description`);
  if (!html.includes("view markdown")) bad(`docs/${p.slug}/index.html has no link to its markdown copy`);
}

// A build output the contract reads. Missing means the test ran before the
// build, which is a wiring mistake in the caller, not a doc bug: say so once
// instead of dying inside readFileSync with a stack trace.
const built = (rel) => {
  const path = join(SITE, rel);
  if (!existsSync(path)) {
    console.error(`markdown-mirror.test: site/${rel} does not exist — run \`node site/build.mjs\` first (this test reads the BUILD OUTPUT, not the sources).`);
    process.exit(2);
  }
  return readFileSync(path, "utf8");
};

// llms-full.txt used to name repo-relative paths; that is the 404 this all
// exists to remove. It also has to name every page exactly once.
const full = built("llms-full.txt");
if (/Source: docs\//.test(full)) bad("llms-full.txt still names repo-relative paths");
const sources = (full.match(/^Source: https:/gm) || []).length;
if (sources !== pages.length) bad(`llms-full.txt names ${sources} source(s) for ${pages.length} page(s)`);

// llms.txt is the map an agent reads first: it must point at the copies.
const llms = built("llms.txt");
for (const p of pages) if (!llms.includes(`/${p.slug}.md`)) bad(`llms.txt does not point at ${p.slug}.md`);

// The sitemap is where a search engine finds the copies.
const sitemap = built("sitemap.xml");
// The path is docs/<slug>.md, the same one the copy is written to: asserting a
  // bare /<slug>.md here is what let the sitemap advertise a 404 for 79 pages
  // while this test stayed green.
  for (const p of pages) {
    const want = `/docs/${p.slug}.md<`;
    if (!sitemap.includes(want)) bad(`sitemap.xml omits ${want.slice(1, -1)}`);
  }

if (failures.length) {
  console.error(`\n${failures.length} markdown-mirror failure(s):`);
  for (const f of failures.slice(0, 30)) console.error("  " + f);
  if (failures.length > 30) console.error(`  ... and ${failures.length - 30} more`);
  process.exit(1);
}
console.log(`markdown mirror ok: ${pages.length} copies, each with one title, live links, page metadata, an llms.txt entry and a sitemap entry`);
