// search.mjs — build-time index and page hooks for the docs search.
//
// The engine stays install-free: MiniSearch is a single vendored UMD file
// (MIT, see src/vendor/MINISEARCH-LICENSE.txt). The browser loads that file
// and search.js; the build only uses MiniSearch to serialize the index.
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

// Upstream keeps the vendor file in src/vendor/; a vendored consumer keeps it
// in site/search/. Both layouts resolve here, so search.mjs is byte-identical.
const minisearchPath = [
  join(here, "vendor", "minisearch.js"),
  join(here, "search", "minisearch.js"),
].find(existsSync);
if (!minisearchPath) throw new Error("search: minisearch.js not found");
const MiniSearch = require(minisearchPath);

export const SEARCH_FIELDS = ["title", "headings", "text"];
export const SEARCH_STORE_FIELDS = ["title", "group", "path", "excerpt"];
export const SEARCH_ID_FIELD = "id";

function titleOf(md, fallback) {
  const m = md.match(/^#\s+(.*)/m);
  return m ? m[1].trim() : fallback;
}

function plain(md) {
  return md
    .replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, "")
    .replace(/```[^\n]*\n([\s\S]*?)```/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function headingsOf(md) {
  return [...md.matchAll(/^#{1,6}\s+(.*)$/gm)]
    .map((m) => m[1].replace(/`/g, "").replace(/[*_~]/g, "").trim())
    .join(" ");
}

export function buildSearchIndex({ OUT, DOCS, MANIFEST }) {
  const documents = MANIFEST.map((p) => {
    const md = readFileSync(join(DOCS, p.file), "utf8");
    const text = plain(md);
    return {
      id: p.slug,
      title: p.title || titleOf(md, p.slug),
      group: p.group,
      path: `docs/${p.slug}/`,
      headings: headingsOf(md),
      text,
      excerpt: text.slice(0, 180),
    };
  });
  const index = new MiniSearch({
    fields: SEARCH_FIELDS,
    storeFields: SEARCH_STORE_FIELDS,
    idField: SEARCH_ID_FIELD,
  });
  index.addAll(documents);
  mkdirSync(join(OUT, "search"), { recursive: true });
  writeFileSync(join(OUT, "search", "index.json"), JSON.stringify(index.toJSON()));
  return documents.length;
}

export function searchButton(root) {
  return `<button class="search-open" type="button" data-search-open data-root="${root}" aria-label="Search docs"><span>Search</span><kbd>/</kbd></button>`;
}

export function searchAssets(root) {
  return `<script src="${root}search/minisearch.js" defer></script>\n<script src="${root}search/search.js" defer></script>`;
}

export const SEARCH_CSS = `
.search-open{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;margin:0 0 18px;padding:8px 10px;border:1px solid #ddd;border-radius:8px;background:#fff;color:#555;font:inherit;font-size:13px;cursor:pointer}
.search-open:hover{border-color:#999;color:#111}
.search-open kbd{font:11px ui-monospace,monospace;border:1px solid #ddd;border-radius:4px;padding:1px 5px;background:#f7f7f8;color:#666}
.topbar-actions{display:flex;align-items:center;gap:8px}
.topbar .search-open{width:auto;margin:0;padding:6px 9px}
.topbar .search-open span{display:none}
.search-dialog{width:min(620px,92vw);max-height:min(70vh,640px);padding:0;border:1px solid #ddd;border-radius:12px;box-shadow:0 24px 80px rgba(0,0,0,.25);background:#fff;color:#1a1a1a}
.search-dialog::backdrop{background:rgba(0,0,0,.35)}
.search-form{display:flex;gap:8px;align-items:center;padding:12px;border-bottom:1px solid #eee}
.search-form input{flex:1;min-width:0;border:0;outline:0;font:16px/1.4 system-ui,-apple-system,sans-serif;background:transparent;color:#111}
.search-close{border:1px solid #ddd;border-radius:6px;background:#fff;color:#666;font:12px ui-monospace,monospace;padding:4px 7px;cursor:pointer}
.search-status{margin:0;padding:10px 14px;color:#666;font-size:13px}
.search-results{list-style:none;margin:0;padding:0 8px 10px;max-height:52vh;overflow:auto}
.search-results li{margin:0}
.search-results a{display:block;padding:10px 8px;border-radius:8px;text-decoration:none;color:inherit}
.search-results a:hover,.search-results li[aria-selected="true"] a{background:#f3f6ff}
.search-results strong{display:block;font-size:14px;color:#111}
.search-results .search-group{display:block;margin-top:2px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#888}
.search-results p{margin:4px 0 0;font-size:13px;line-height:1.45;color:#444}
@media(max-width:900px){
  .search-dialog{width:calc(100vw - 24px);max-height:80vh}
  .search-results{max-height:60vh}
}
`;
