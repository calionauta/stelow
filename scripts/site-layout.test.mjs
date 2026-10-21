// SCOPE:feature - Behavioral proof: the docs site never clips its content.
//
// Two reported bugs (issue #189). First: pages were "cut off" because
// `table{min-width:max-content}` refused to wrap any cell, so a cell holding a
// paragraph made the table ~15x its column and the last column was never on
// screen with the first. Second, after that fix: a phone still had to scroll
// each wide table horizontally, which hides the last column behind a gesture.
// The fix is table-shape by width: shrink and wrap on desktop, and below 820px
// stack each row into a labelled card so nothing scrolls sideways at all.
//
// This asserts the OUTCOME, not the CSS: it builds the same site CI publishes,
// loads every page in Chromium at nine widths, and measures what a reader would
// have seen. Against the pre-fix builder the desktop assertion fails on 20
// pages (features needs 15.5x its column); against a widened prose column the
// measure assertion fails; against the pre-stack builder the phone assertion
// fails on 16 pages.
//
// Run: node scripts/site-layout.test.mjs
// Needs: npm ci (playwright) + npx playwright install chromium.
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
// Project config is the only project-specific input: name, base URL, and the
// output directory. Everything else is measured from the built pages.
const CONFIG = (await import(pathToFileURL(join(ROOT, "site/docsite.config.mjs")).href)).default;
const SITE = join(ROOT, CONFIG.outDir || "site");
const PREFIX = new URL(CONFIG.base).pathname.replace(/\/$/, ""); // "" for a root site

// Widths a reader actually uses: the reporter's 380-400px phone band, a wider
// phone, a portrait tablet (nav collapses at 900), the reported 1103x850
// laptop, a small desktop, and two larges.
const VIEWPORTS = [380, 390, 400, 768, 1024, 1103, 1280, 1440, 1920];
// At or below this width a table stacks into labelled cards and must never
// scroll sideways. Above it a genuinely wide data table may scroll, but only a
// little: a table that needs a quarter of its box again is a layout bug, not
// data. The pre-fix site needed 1550%.
const STACK_BELOW = 820;
const FIT_VIEWPORT = 1440;
const MAX_SCROLL_RATIO = 0.25;
const MEASURE = { min: 560, max: 700 }; // prose line box, px (see --measure)
// The landing menu appears when the primary links are hidden; that breakpoint
// is a project choice (620 for a compact header, 900 when links vanish early).
const LANDING_MENU_BELOW = CONFIG.landingMenuBelow ?? 620;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function build() {
  const r = spawnSync(process.execPath, [join(ROOT, "site/build.mjs")], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (r.status !== 0) throw new Error("site/build.mjs failed");
}

// serve() answers from site/ only, on an ephemeral port. The builder emits
// directory URLs (/docs/features/), so a directory resolves to index.html.
function serve() {
  const server = createServer((req, res) => {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    let path = join(SITE, url);
    if (!resolve(path).startsWith(SITE)) {
      res.writeHead(403).end();
      return;
    }
    try {
      if (statSync(path).isDirectory()) path = join(path, "index.html");
      statSync(path);
    } catch {
      res.writeHead(404, { "content-type": "text/plain" }).end("not found");
      return;
    }
    res.writeHead(200, { "content-type": MIME[extname(path)] || "application/octet-stream" });
    createReadStream(path).pipe(res);
  });
  return new Promise((done) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      done({ server, base: `http://127.0.0.1:${port}` });
    });
  });
}

// Every published docs page, read from the sitemap the builder just wrote, so a
// page added to the MANIFEST is covered without touching this file. The landing
// page has its own hand-written stylesheet; it gets the overflow assertion only.
function pages() {
  const sitemap = readFileSync(join(SITE, "sitemap.xml"), "utf8");
  const docs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => new URL(m[1]).pathname.replace(PREFIX, ""))
    .filter((u) => /^\/docs\/.+\/$/.test(u))
    .sort();
  // A landing page is project-specific and optional; when it exists, its
  // navigation and command blocks are measured too.
  const hasLanding = existsSync(join(SITE, "index.html"));
  return [
    ...(hasLanding ? [{ path: "/", prose: false }] : []),
    { path: "/docs/", prose: false },
    ...docs.map((p) => ({ path: p, prose: true })),
  ];
}

// measurePage() runs in the page: returns whatever the assertions need in one trip.
function measurePage(page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    const wraps = [...document.querySelectorAll(".table-wrap")].map((w) => ({
      label: w.getAttribute("aria-label"),
      role: w.getAttribute("role"),
      tab: w.getAttribute("tabindex"),
      wrap: w.clientWidth,
      over: w.scrollWidth - w.clientWidth - 1,
      fadeRight: w.style.getPropertyValue("--fade-r"),
    }));
    const tables = [...document.querySelectorAll("table")].map((t) => ({
      wrapped: t.parentElement && t.parentElement.classList.contains("table-wrap"),
      firstCellScope: t.querySelector("th") ? t.querySelector("th").getAttribute("scope") : null,
      // A stacked cell prints its column name from this attribute; without it
      // the card has values and no labels.
      unlabelledCells: [...t.querySelectorAll("td")].filter((td) => !td.hasAttribute("data-label")).length,
    }));
    const visible = (el) => !!el && el.offsetParent !== null;
    const p = document.querySelector("main p");
    return {
      pageOver: de.scrollWidth - de.clientWidth,
      wraps,
      tables,
      proseWidth: p ? Math.round(p.getBoundingClientRect().width) : 0,
      // Navigation must exist on every viewport: the desktop sidebar, or the
      // mobile topbar menu when the sidebar is hidden.
      topbar: visible(document.querySelector(".topbar")),
      topbarMenu: !!document.querySelector(".topbar details summary"),
      sidebar: visible(document.querySelector("nav.side")),
      landingMenu: visible(document.querySelector(".mobile-menu")),
      // A command block that scrolls on a phone is a clipped command.
      preOver: Math.max(0, ...[...document.querySelectorAll("pre")].map((n) => n.scrollWidth - n.clientWidth - 1)),
    };
  });
}

const failures = [];
const fail = (msg) => failures.push(msg);

build();
const { server, base } = await serve();
const browser = await chromium.launch();
const list = pages();

try {
  for (const vw of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vw, height: 900 } });
    let checked = 0;
    for (const { path, prose } of list) {
      await page.goto(base + path, { waitUntil: "load" });
      const r = await measurePage(page);
      const where = `${path} @ ${vw}px`;
      checked++;
      if (r.pageOver > 1) fail(`${where}: page scrolls horizontally by ${r.pageOver}px`);
      for (const w of r.wraps) {
        if (vw <= STACK_BELOW && w.over > 0) {
          fail(`${where}: table "${w.label}" scrolls ${w.over}px on a ${vw}px screen; a stacked card must never scroll sideways`);
        } else if (vw >= FIT_VIEWPORT && w.over > 0) {
          fail(`${where}: table "${w.label}" needs ${w.over}px more than its ${w.wrap}px column`);
        } else if (vw >= 1024 && w.over > w.wrap * MAX_SCROLL_RATIO) {
          fail(`${where}: table "${w.label}" scrolls ${Math.round((w.over / w.wrap) * 100)}% (max ${MAX_SCROLL_RATIO * 100}%)`);
        }
        // A scroll box with no affordance is the reported bug: content is
        // clipped and nothing says there is more.
        if (w.over > 0 && w.fadeRight !== "0.28") {
          fail(`${where}: table "${w.label}" scrolls but shows no right-edge fade`);
        }
      }
      // Navigation: the sidebar above the mobile breakpoint, the topbar menu
      // below it. Never neither, which is what the reporter saw on a phone.
      if (path.startsWith("/docs/")) {
        if (vw <= 900 && !(r.topbar && r.topbarMenu)) fail(`${where}: no mobile docs menu (topbar=${r.topbar}, summary=${r.topbarMenu})`);
        if (vw <= 900 && r.sidebar) fail(`${where}: desktop sidebar still visible below 900px`);
        if (vw === 1440 && r.topbar) fail(`${where}: mobile topbar visible at 1440px`);
        if (vw === 1440 && !r.sidebar) fail(`${where}: desktop sidebar missing at 1440px`);
      }
      if (path === "/") {
        if (vw <= LANDING_MENU_BELOW && !r.landingMenu) fail(`${where}: no landing menu at ${vw}px`);
        if (vw > LANDING_MENU_BELOW && r.landingMenu) fail(`${where}: landing menu still shown at ${vw}px`);
        if (vw <= 900 && r.preOver > 0) fail(`${where}: a command block scrolls ${r.preOver}px instead of wrapping`);
      }
      // Structure once per page is enough; the attributes come from the builder.
      if (vw === 1440) {
        for (const w of r.wraps) {
          if (w.role !== "region") fail(`${where}: table is not a labelled region (role=${w.role})`);
          if (w.over > 0 && w.tab !== "0") fail(`${where}: scrollable table region is not keyboard reachable (tabindex=${w.tab})`);
          if (w.over <= 0 && w.tab !== null) fail(`${where}: table that fits keeps a dead tab stop (tabindex=${w.tab})`);
          if (!w.label || !w.label.trim()) fail(`${where}: table region has no aria-label`);
        }
        for (const t of r.tables) {
          if (!t.wrapped) fail(`${where}: a table is outside a .table-wrap scroll box`);
          if (t.firstCellScope !== "col") fail(`${where}: a table header has no scope="col"`);
          if (t.unlabelledCells > 0) fail(`${where}: ${t.unlabelledCells} table cell(s) have no data-label for the stacked layout`);
        }
        if (prose && r.proseWidth > 0) {
          if (r.proseWidth < MEASURE.min || r.proseWidth > MEASURE.max) {
            fail(`${where}: prose line box is ${r.proseWidth}px, outside ${MEASURE.min}-${MEASURE.max}px (widening the column to fit tables costs every page's readability)`);
          }
        }
      }
    }
    console.log(`  ${vw}px: ${checked} page(s) measured`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error(`\n❌ ${failures.length} layout failure(s):`);
  for (const f of failures.slice(0, 40)) console.error("   " + f);
  if (failures.length > 40) console.error(`   ... and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`✓ docs site layout: ${list.length} pages × ${VIEWPORTS.length} viewports, no clipping, prose ${MEASURE.min}-${MEASURE.max}px, every table region labelled and keyboard reachable`);
