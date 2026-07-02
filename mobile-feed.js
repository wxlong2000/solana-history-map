// Mobile-first record feed for the Solana History Map.
// Inert on desktop (>760px). Reuses window.SHM.select (=selectLandmark) + the
// .landmark-panel + the ▶ Play modal — no duplicated detail rendering.
(function () {
  "use strict";
  var mq = window.matchMedia("(max-width:760px)");
  var mounted = false, built = false, savedScroll = 0;
  var state = { cat: "all", sort: "timeline" };
  var CAT_ORDER = ["Infrastructure", "Outage", "Security", "Macro", "Airdrop", "Consumer", "Meme"];

  function SHM() { return window.SHM || null; }
  function landmarks() {
    var s = SHM();
    var arr = s && s.landmarks ? s.landmarks : (window.SOLANA_HISTORY_LANDMARKS || []).filter(function (l) { return l.status !== "archive"; });
    return arr.slice();
  }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function num(l) { return l.num != null ? l.num : 999; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function playable(l) { try { return (window.SHMSim && window.SHMSim.has(l.id)) || l.id === "wormhole"; } catch (e) { return false; } }
  function isExplored(id) {
    var s = SHM(); if (s && s.explored) return s.explored.has(id);
    try { return JSON.parse(localStorage.getItem("solana-history-explored:v1") || "[]").indexOf(id) >= 0; } catch (e) { return false; }
  }

  var feed, listEl, chipsEl, startEl, sortEl, progEl, navEl, fab;
  function grab() {
    feed = document.getElementById("mobile-feed");
    listEl = document.getElementById("feed-list");
    chipsEl = document.getElementById("feed-chips");
    startEl = document.getElementById("feed-startrow");
    sortEl = document.getElementById("feed-sort");
    progEl = document.getElementById("feed-progress");
    navEl = document.getElementById("feed-nav");
  }
  function ensureFab() {
    if (fab) return fab;
    fab = document.createElement("button");
    fab.id = "feed-fab"; fab.type = "button";
    fab.addEventListener("click", function () {
      setView(document.body.getAttribute("data-mobile-view") === "map" ? "feed" : "map");
    });
    document.body.appendChild(fab);
    return fab;
  }

  function metaBits(l) {
    return '<span class="fc-pill" data-cat="' + esc(l.category) + '">' + esc(l.category || "") + '</span>' +
      '<span class="fc-year">' + esc(l.year || (l.date || "").slice(0, 4)) + '</span>' +
      (l.status === "verified" ? '<span class="fc-sourced">SOURCED</span>' : '');
  }
  function cardHTML(l) {
    var cls = "feed-card" + (l.danger ? " is-danger" : "") + (l.featured ? " is-featured" : "") +
      (isExplored(l.id) ? " is-explored" : "") + (playable(l) ? " is-play" : "");
    return '<li><button class="' + cls + '" type="button" data-id="' + esc(l.id) + '" data-cat="' + esc(l.category) + '">' +
      '<span class="fc-num">' + pad2(num(l)) + '</span>' +
      '<span class="fc-body">' +
        '<span class="fc-title">' + esc(l.name) + '</span>' +
        '<span class="fc-meta">' + metaBits(l) + '</span>' +
        '<span class="fc-tldr">' + esc(l.tldr || "") + '</span>' +
      '</span>' +
      '<span class="fc-cue">' + (playable(l) ? '<span class="fc-play">▶</span>' : '') + '<span class="fc-chev">›</span></span>' +
    '</button></li>';
  }

  function filtered() {
    var arr = landmarks();
    if (state.cat !== "all") arr = arr.filter(function (l) { return l.category === state.cat; });
    return arr;
  }
  function renderList() {
    var arr = filtered();
    if (state.sort === "category") {
      var groups = {};
      arr.forEach(function (l) { (groups[l.category] = groups[l.category] || []).push(l); });
      var order = CAT_ORDER.concat(Object.keys(groups).filter(function (c) { return CAT_ORDER.indexOf(c) < 0; }));
      var html = "";
      order.forEach(function (cat) {
        var g = groups[cat]; if (!g || !g.length) return;
        g.sort(function (a, b) { return num(a) - num(b); });
        html += '<li class="feed-subhead" aria-hidden="true">' + esc(cat) + ' · ' + g.length + '</li>';
        g.forEach(function (l) { html += cardHTML(l); });
      });
      listEl.innerHTML = html;
    } else {
      arr.sort(function (a, b) { return num(a) - num(b); });
      listEl.innerHTML = arr.map(cardHTML).join("");
    }
    syncProgress();
  }
  function renderStart() {
    if (state.cat !== "all" || state.sort !== "timeline") { startEl.innerHTML = ""; return; }
    var feat = landmarks().filter(function (l) { return l.featured; }).sort(function (a, b) { return num(a) - num(b); });
    if (!feat.length) { startEl.innerHTML = ""; return; }
    startEl.innerHTML = '<div class="feed-startlbl">Start here — the defining moments</div><ul class="feed-startlist">' + feat.map(cardHTML).join("") + '</ul>';
  }
  function renderChips() {
    var arr = landmarks(), counts = {};
    arr.forEach(function (l) { counts[l.category] = (counts[l.category] || 0) + 1; });
    var cats = CAT_ORDER.filter(function (c) { return counts[c]; });
    var html = '<button class="fc-chip' + (state.cat === "all" ? " on" : "") + '" data-cat="all" role="tab" aria-selected="' + (state.cat === "all") + '" type="button">All · ' + arr.length + '</button>';
    cats.forEach(function (c) {
      html += '<button class="fc-chip' + (state.cat === c ? " on" : "") + '" data-cat="' + esc(c) + '" role="tab" aria-selected="' + (state.cat === c) + '" type="button">' + esc(c) + ' · ' + counts[c] + '</button>';
    });
    chipsEl.innerHTML = html;
  }
  function renderNav() {
    if (navEl.getAttribute("data-built")) return;
    var src = document.querySelector(".site-header .nav-links");
    navEl.innerHTML = (src ? src.innerHTML : "") + '<span class="feed-nav-lic">Source-cited public archive</span>';
    navEl.setAttribute("data-built", "1");
  }
  function syncProgress() {
    var arr = landmarks(), done = arr.filter(function (l) { return isExplored(l.id); }).length;
    if (progEl) progEl.textContent = pad2(done) + "/" + pad2(arr.length);
    var cur = window.__shmSelected ? window.__shmSelected.id : null;
    [].forEach.call(document.querySelectorAll(".feed-card"), function (c) {
      c.classList.toggle("is-explored", isExplored(c.dataset.id));
      c.classList.toggle("is-active", c.dataset.id === cur);
    });
  }
  function buildAll() { renderChips(); renderStart(); renderList(); renderNav(); built = true; }

  function setView(v) {
    document.body.setAttribute("data-mobile-view", v);
    if (fab) { fab.textContent = (v === "map") ? "☰ List" : "◵ Explore map"; fab.hidden = (v === "detail"); }
    if (v === "map") {
      var s = SHM();
      requestAnimationFrame(function () { try { if (s && s.refit) s.refit(); else window.dispatchEvent(new Event("resize")); } catch (e) {} });
    }
  }
  function injectBack() {
    var panel = document.querySelector(".landmark-panel"); if (!panel || panel.querySelector(".sheet-back")) return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "sheet-back"; b.innerHTML = "← Back to records";
    b.addEventListener("click", function () { try { history.back(); } catch (e) { backToFeed(); } });
    panel.insertBefore(b, panel.firstChild);
  }
  function openDetail(id) {
    var s = SHM(); if (!s) return;
    if (document.body.getAttribute("data-mobile-view") !== "detail") savedScroll = window.scrollY || document.documentElement.scrollTop || 0;
    s.select(id, { noCenter: true });
    injectBack();
    setView("detail");
    try { history.pushState({ shmSheet: 1 }, ""); } catch (e) {}
    var sheet = document.querySelector(".landmark-panel"); if (sheet) sheet.scrollTop = 0;
    syncProgress();
  }
  function backToFeed() {
    setView("feed");
    requestAnimationFrame(function () { window.scrollTo(0, savedScroll); });
  }

  function onListClick(e) {
    var card = e.target.closest ? e.target.closest(".feed-card") : null;
    if (card) openDetail(card.dataset.id);
  }
  function bind() {
    listEl.addEventListener("click", onListClick);
    startEl.addEventListener("click", onListClick);
    chipsEl.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".fc-chip") : null; if (!b) return;
      state.cat = b.getAttribute("data-cat"); renderChips(); renderStart(); renderList(); window.scrollTo(0, 0);
    });
    sortEl.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("button[data-sort]") : null; if (!b) return;
      state.sort = b.getAttribute("data-sort");
      [].forEach.call(sortEl.querySelectorAll("button"), function (x) { x.classList.toggle("on", x === b); });
      renderStart(); renderList();
    });
    window.addEventListener("popstate", function () {
      if (document.body.getAttribute("data-mobile-view") === "detail") backToFeed();
    });
    document.addEventListener("shm:select", function () { if (mounted) syncProgress(); });
    // OTD ribbon → on mobile open the record's sheet instead of a hash jump
    document.addEventListener("click", function (e) {
      if (!mounted) return;
      var a = e.target.closest ? e.target.closest("[data-otd]") : null; if (!a) return;
      var id = a.getAttribute("data-otd"); if (!id) return;
      e.preventDefault(); openDetail(id);
    }, true);
  }

  function mount() {
    if (mounted) return; grab(); if (!feed) return;
    mounted = true;
    document.body.classList.add("feed-active");
    feed.hidden = false;
    ensureFab(); fab.hidden = false;
    if (!built) { buildAll(); bind(); }
    setView("feed");
    var h = (location.hash || "").replace("#", "");
    if (h && landmarks().some(function (l) { return l.id === h; })) openDetail(h);
  }
  function unmount() {
    if (!mounted) return; mounted = false;
    document.body.classList.remove("feed-active");
    document.body.removeAttribute("data-mobile-view");
    if (feed) feed.hidden = true;
    if (fab) fab.hidden = true;
  }
  function apply() { if (mq.matches) mount(); else unmount(); }

  function init() {
    apply();
    if (mq.addEventListener) mq.addEventListener("change", apply);
    else if (mq.addListener) mq.addListener(apply);
  }
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
