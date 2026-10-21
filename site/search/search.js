// search.js — the browser side of the docs search. MiniSearch is loaded by
// minisearch.js as a UMD global; this file only needs the serialized index.
(function () {
  "use strict";
  var buttons = Array.prototype.slice.call(document.querySelectorAll("[data-search-open]"));
  if (!buttons.length) return;
  var root = buttons[0].getAttribute("data-root") || "";
  var dialog = document.createElement("dialog");
  dialog.className = "search-dialog";
  dialog.setAttribute("aria-label", "Search docs");
  dialog.innerHTML =
    '<div class="search-form">' +
    '<input type="search" class="search-input" placeholder="Search docs" autocomplete="off" spellcheck="false" aria-label="Search docs" aria-controls="docs-search-results" aria-autocomplete="list">' +
    '<button type="button" class="search-close" aria-label="Close search">Esc</button>' +
    "</div>" +
    '<p class="search-status" aria-live="polite">Type to search.</p>' +
    '<ul class="search-results" id="docs-search-results" role="listbox" aria-label="Search results"></ul>';
  document.body.appendChild(dialog);

  var input = dialog.querySelector(".search-input");
  var status = dialog.querySelector(".search-status");
  var list = dialog.querySelector(".search-results");
  var close = dialog.querySelector(".search-close");
  var searcher = null;
  var loading = null;
  var active = -1;
  var timer = 0;

  function load() {
    if (searcher) return Promise.resolve(searcher);
    if (loading) return loading;
    loading = fetch(root + "search/index.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("search index " + res.status);
        return res.text();
      })
      .then(function (json) {
        if (!window.MiniSearch) throw new Error("minisearch.js missing");
        searcher = window.MiniSearch.loadJSON(json, {
          fields: ["title", "headings", "text"],
          storeFields: ["title", "group", "path", "excerpt"],
          idField: "id",
        });
        return searcher;
      })
      .catch(function (err) {
        status.textContent = "Search is unavailable: " + err.message;
        throw err;
      });
    return loading;
  }

  function clearResults() {
    list.textContent = "";
    active = -1;
    input.removeAttribute("aria-activedescendant");
  }

  function setActive(next) {
    var items = list.querySelectorAll("li");
    if (!items.length) return;
    active = (next + items.length) % items.length;
    for (var i = 0; i < items.length; i++) {
      items[i].setAttribute("aria-selected", i === active ? "true" : "false");
    }
    var item = items[active];
    input.setAttribute("aria-activedescendant", item.id);
    item.scrollIntoView({ block: "nearest" });
  }

  function render(results) {
    clearResults();
    if (!results.length) {
      status.textContent = "No results.";
      return;
    }
    status.textContent = results.length + (results.length === 1 ? " result" : " results");
    results.slice(0, 12).forEach(function (r, i) {
      var li = document.createElement("li");
      li.id = "docs-search-result-" + i;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", "false");
      var a = document.createElement("a");
      a.href = root + r.path;
      var title = document.createElement("strong");
      title.textContent = r.title || r.path;
      var group = document.createElement("span");
      group.className = "search-group";
      group.textContent = r.group || "";
      a.appendChild(title);
      a.appendChild(group);
      if (r.excerpt) {
        var p = document.createElement("p");
        p.textContent = r.excerpt;
        a.appendChild(p);
      }
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  function run() {
    var query = input.value.trim();
    if (!query) {
      clearResults();
      status.textContent = "Type to search.";
      return;
    }
    load()
      .then(function (s) {
        var results = s.search(query, {
          prefix: true,
          fuzzy: 0.3,
          boost: { title: 3, headings: 2 },
          combineWith: "OR",
        });
        render(results);
      })
      .catch(function () { /* status already explains */ });
  }

  function open() {
    if (!dialog.open) dialog.showModal();
    input.focus();
    load().catch(function () { /* status already explains */ });
  }

  buttons.forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.preventDefault();
      open();
    });
  });
  close.addEventListener("click", function () { dialog.close(); });
  dialog.addEventListener("click", function (e) {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", function () {
    if (buttons[0]) buttons[0].focus();
  });
  input.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(run, 80);
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(active + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(active - 1);
    } else if (e.key === "Enter" && active >= 0) {
      var link = list.querySelectorAll("li")[active].querySelector("a");
      if (link) {
        e.preventDefault();
        link.click();
      }
    }
  });
  document.addEventListener("keydown", function (e) {
    var target = e.target;
    var typing = target && (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable
    );
    if (typing) return;
    if ((e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
      e.preventDefault();
      open();
    }
  });
})();
