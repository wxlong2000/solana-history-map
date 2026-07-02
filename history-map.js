(function () {
  var ALL = Array.isArray(window.SOLANA_HISTORY_LANDMARKS) ? window.SOLANA_HISTORY_LANDMARKS : [];
  var LANDMARKS = ALL.filter(function (l) { return l.status !== "archive"; });
  var byId = new Map(LANDMARKS.map(function (l) { return [l.id, l]; }));
  var TOTAL = LANDMARKS.length;
  // Authoritative landmark -> map BUILDING number, reconciled from the owner's
  // final 定稿 list (building# = list#, where 13 is an empty slot so list#13+ map
  // to building#+1) AND cross-checked against the OLD site's app.js coordinates
  // (each old coord nearest-neighbours its building, all Δ<8% — internally exact).
  // Earlier LANDMARK-CONTENT-MAP.md asset hints were WRONG; this is the truth.
  // x/y = precise centroids of the orange numbers in 地图成图/图片标注.png.
  //   B1 raydium · B2 jup_port · B3 saga · B4 firedancer · B5 backpack
  //   B6 architects(Toly) · B7 ftx · B8 restart · B9 wormhole · B10 ore
  //   B11 pumpfun · B12 woof · B14 meow · B15 wen · B16 shark · B17 mew
  //   B18 myro · B19 gigachad · B20 jup_drop · B21 helium · B22 mango · B23 slope
  var MAP_POS = {
    raydium: { x: 57.0, y: 85.5 }, jup_port: { x: 63.5, y: 67.3 }, saga: { x: 43.0, y: 55.7 },
    firedancer: { x: 62.2, y: 44.0 }, backpack: { x: 90.7, y: 76.4 }, architects_echo: { x: 83.4, y: 12.5 },
    ftx_crater: { x: 50.4, y: 70.0 }, restart: { x: 22.2, y: 22.2 }, wormhole: { x: 87.5, y: 55.3 },
    ore: { x: 49.4, y: 37.0 }, pumpfun: { x: 75.3, y: 57.9 }, woof_city: { x: 89.5, y: 35.0 },
    meow_sanctuary: { x: 17.2, y: 73.6 }, wen_temple: { x: 9.9, y: 37.0 }, shark_bay: { x: 39.5, y: 80.8 },
    mew_forest: { x: 76.2, y: 39.2 }, myro: { x: 68.2, y: 22.9 }, gigachad: { x: 24.2, y: 44.2 },
    jup_drop: { x: 38.3, y: 15.1 }, helium: { x: 54.2, y: 15.0 }, mango: { x: 35.4, y: 34.8 },
    slope: { x: 29.4, y: 62.3 }
  };
  LANDMARKS.forEach(function (l) { var m = MAP_POS[l.id]; if (m) { l.x = m.x; l.y = m.y; } });
  // number landmarks by chronological order of the event (earliest = 01)
  var SORT_FIX = { restart: "2021-09", jup_port: "2021-10" };
  function timeKey(l) {
    // normalize to YYYY-MM-DD so ordering is day-accurate, not just month-accurate
    var d = String(SORT_FIX[l.id] || l.date || (l.year ? (l.year + "-06-15") : "9999-99-99"));
    var m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(d);
    return m ? (m[1] + "-" + (m[2] || "06") + "-" + (m[3] || "15")) : "9999-99-99";
  }
  LANDMARKS.slice().sort(function (a, b) { var ka = timeKey(a), kb = timeKey(b); return ka < kb ? -1 : (ka > kb ? 1 : (a.id < b.id ? -1 : 1)); }).forEach(function (l, i) { l.num = i + 1; });
  function markerNum(l, i) { return l.num != null ? l.num : (i + 1); }

  var stage = document.querySelector(".map-stage");
  var viewport = document.getElementById("map-viewport");
  var world = document.getElementById("map-world");
  var img = document.getElementById("atlas-map");
  var markerLayer = document.getElementById("marker-layer");
  var elStatus = document.getElementById("selected-status");
  var elTitle = document.getElementById("selected-title");
  var elMeta = document.getElementById("selected-meta");
  var elTldr = document.getElementById("selected-tldr");
  var elStory = document.getElementById("selected-story");
  var elSources = document.getElementById("selected-sources");
  var elAffil = document.getElementById("selected-affiliation");
  var elProgressNum = document.getElementById("progress-readout");
  var elProgressFill = document.getElementById("progress-fill");
  var otd = document.getElementById("otd-ribbon");
  var btnRead = document.getElementById("btn-read");
  var btnShare = document.getElementById("btn-share");
  var btnRandom = document.getElementById("btn-random");
  var fxToggle = document.getElementById("fx-toggle");
  var hint = document.getElementById("map-hint");

  var STORE_KEY = "solana-history-explored:v1";
  var FX_KEY = "solana-history-fx:v1";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function loadExplored() {
    try { var raw = localStorage.getItem(STORE_KEY); var arr = raw ? JSON.parse(raw) : []; return new Set(Array.isArray(arr) ? arr : []); }
    catch (e) { return new Set(); }
  }
  var explored = loadExplored();
  function saveExplored() { try { localStorage.setItem(STORE_KEY, JSON.stringify(Array.from(explored))); } catch (e) {} }

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function tagFor(l) {
    // always show the real name — the names are the hook, and the generic
    // "LANDMARK · CATEGORY · YEAR" chip read as repetitive on every node.
    return l.name;
  }
  function metaLine(l) {
    var bits = [];
    if (l.year) bits.push(l.year);
    if (l.category) bits.push(l.category.toUpperCase());
    if (l.status === "verified") bits.push("SOURCED");
    return bits.join("  ·  ");
  }

  function renderMarkers() {
    if (!markerLayer) return;
    markerLayer.innerHTML = LANDMARKS.map(function (l, i) {
      var cls = "map-marker" + (explored.has(l.id) ? " is-explored" : "");
      return '<button class="' + cls + '" style="--x:' + l.x + '%; --y:' + l.y + '%;" type="button" data-id="' + esc(l.id) + '" aria-label="' + esc(l.name) + '">' +
        '<span class="marker-num">' + pad2(markerNum(l, i)) + '</span>' +
        '<span class="marker-tag">' + esc(tagFor(l)) + '</span>' +
        '</button>';
    }).join("");
  }
  function updateMarkerStates() {
    if (!markerLayer) return;
    markerLayer.querySelectorAll(".map-marker").forEach(function (n) {
      var l = byId.get(n.dataset.id); if (!l) return;
      n.classList.toggle("is-explored", explored.has(l.id));
      var tag = n.querySelector(".marker-tag"); if (tag) tag.textContent = tagFor(l);
    });
  }
  function updateProgress() {
    var n = 0; explored.forEach(function (id) { if (byId.has(id)) n++; });
    if (elProgressNum) elProgressNum.textContent = pad2(n) + " / " + pad2(TOTAL) + " RECORDS VIEWED";
    if (elProgressFill) elProgressFill.style.width = (TOTAL ? (n / TOTAL * 100) : 0) + "%";
  }
  function storySection(label, text) {
    if (!text) return "";
    return '<section><h4>' + esc(label) + '</h4><p>' + esc(text) + '</p></section>';
  }
  function storyPath(l) { return "./landmarks/" + encodeURIComponent(l.id) + ".html"; }
  function renderSources(l) {
    if (!elSources) return;
    var src = Array.isArray(l.sources) ? l.sources : [];
    if (!src.length) { elSources.innerHTML = '<span class="story-empty">Source verification pending.</span>'; return; }
    elSources.innerHTML = src.map(function (s) {
      return '<div class="source-line"><span class="src-tag">VERIFIED //</span><a href="' + esc(s.url || "#") + '" target="_blank" rel="noopener">' + esc(s.label || "Source") + '</a></div>';
    }).join("");
  }

  var current = null;
  function selectLandmark(id, opts) {
    opts = opts || {};
    var l = byId.get(id) || LANDMARKS[0];
    if (!l) return;
    current = l;
    try { window.__shmSelected = l; document.dispatchEvent(new CustomEvent("shm:select", { detail: l })); } catch (e) {}

    if (elStatus) elStatus.textContent = "Record // " + (l.category || "").toUpperCase();
    if (elTitle) {
      elTitle.textContent = l.name;
      elTitle.setAttribute("data-text", l.name);
      elTitle.classList.remove("is-updated"); void elTitle.offsetWidth; elTitle.classList.add("is-updated");
      setTimeout(function () { elTitle.classList.remove("is-updated"); }, 280);
    }
    if (elMeta) elMeta.textContent = metaLine(l);
    if (elTldr) elTldr.textContent = l.tldr || "";
    if (elStory) elStory.innerHTML =
      storySection("Why Solana remembers it", l.whyItMatters) +
      storySection("Map interpretation", l.onMap);
    renderSources(l);
    if (elAffil) elAffil.textContent = l.affiliationNote || "";
    if (btnRead) btnRead.href = storyPath(l);

    if (!explored.has(l.id)) { explored.add(l.id); saveExplored(); updateProgress(); }
    updateMarkerStates();
    if (markerLayer) markerLayer.querySelectorAll(".map-marker").forEach(function (n) {
      n.classList.toggle("is-active", n.dataset.id === l.id);
    });
    if (mapReady && !opts.noCenter) centerOn(l, true);
    [elStory, elTldr].forEach(function (n) { if (n) { n.classList.remove("reveal"); void n.offsetWidth; n.classList.add("reveal"); } });
    if (!opts.noHash && location.hash !== "#" + l.id) {
      try { history.replaceState(null, "", "#" + l.id); } catch (e) {}
    }
  }

  // ---------- pan / zoom ----------
  var scale = 1, tx = 0, ty = 0, minScale = 0.1, maxScale = 4, mapReady = false;
  function imgDims() {
    var w = img && img.naturalWidth ? img.naturalWidth : 2048;
    var h = img && img.naturalHeight ? img.naturalHeight : 1148;
    return { w: w, h: h };
  }
  function stageSize() {
    var w = stage.clientWidth || stage.getBoundingClientRect().width || window.innerWidth || 1200;
    var h = stage.clientHeight || stage.getBoundingClientRect().height || (window.innerHeight ? window.innerHeight - 120 : 0) || 700;
    return { w: Math.max(w, 240), h: Math.max(h, 240) };
  }
  function recalcBounds() {
    var s = stageSize(), d = imgDims();
    var cover = Math.max(s.w / d.w, s.h / d.h);
    var contain = Math.min(s.w / d.w, s.h / d.h);
    // never let the map shrink below cover — that is what produced black gutters
    minScale = cover; maxScale = cover * 4.5;
    return { sw: s.w, sh: s.h, d: d, cover: cover, contain: contain };
  }
  function panelInset() {
    // when a landmark panel is docked at the bottom, treat that strip as reserved:
    // let the map pan up into it so the selected marker is never hidden behind it.
    if (!current) return 0;
    var panel = document.querySelector(".landmark-panel");
    if (!panel) return 0;
    var pr = panel.getBoundingClientRect();
    if (pr.height < 8) return 0;
    var stg = stage.getBoundingClientRect();
    var occl = stg.bottom - pr.top;
    if (occl <= 0) return 0;
    return Math.min(stg.height * 0.55, occl + 8);
  }
  function clampAxis(t, view, size, botInset) {
    // strict cover clamp: the map edge can never enter the viewport (no black gutters)…
    if (size <= view) return (view - size) / 2; // smaller than view => center (safety)
    // …except an optional bottom inset: extra upward room whose gutter sits behind the docked panel.
    return Math.min(0, Math.max(view - size - (botInset || 0), t));
  }
  function clamp() {
    var s = stageSize(), d = imgDims();
    tx = clampAxis(tx, s.w, d.w * scale, 0);
    ty = clampAxis(ty, s.h, d.h * scale, panelInset());
  }
  function apply(animate) {
    if (animate && !reduceMotion) { world.style.transition = "transform .45s ease"; setTimeout(function () { world.style.transition = ""; }, 480); }
    world.style.transform = "translate(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px) scale(" + scale.toFixed(4) + ")";
    world.style.setProperty("--inv", (1 / scale).toFixed(4));
  }
  function fit() {
    // default: cover — fills the stage, looks fullest
    var b = recalcBounds();
    scale = b.cover;
    tx = (b.sw - b.d.w * scale) / 2;
    ty = (b.sh - b.d.h * scale) / 2;
    clamp(); apply();
  }
  function fitAll() {
    // whole map visible incl. corners (cat mountain / dog factory) — letterboxed
    var b = recalcBounds(), d = b.d;
    var contain = Math.min(b.sw / d.w, b.sh / d.h);
    scale = contain;
    tx = (b.sw - d.w * scale) / 2;
    ty = (b.sh - d.h * scale) / 2;
    clamp(); apply(true);
  }
  function centerOn(l, zoomIn) {
    // NOTE: no auto-zoom on select (felt jarring). Keep the current scale; only pan
    // gently so the marker isn't hidden behind the docked panel. (zoomIn kept for API.)
    var b = recalcBounds(), d = b.d, inset = panelInset();
    tx = b.sw / 2 - (l.x / 100) * d.w * scale;
    ty = (b.sh - inset) / 2 - (l.y / 100) * d.h * scale; // center in the area ABOVE the docked panel
    clamp(); apply(true);
  }
  function zoomAround(mx, my, factor) {
    recalcBounds();
    var ns = Math.min(maxScale, Math.max(minScale, scale * factor));
    var k = ns / scale;
    tx = mx - (mx - tx) * k; ty = my - (my - ty) * k; scale = ns;
    clamp(); apply();
  }

  var pointers = new Map();
  var dragging = false, moved = false, sx = 0, sy = 0, stx = 0, sty = 0, suppressClick = false, tapTargetId = "";
  var pinchDist = 0, pinchScale = 1;
  function stagePoint(e) { var r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function hideHint() { if (hint && !hint.classList.contains("hide")) hint.classList.add("hide"); }

  function onDown(e) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    var marker = e.target && e.target.closest ? e.target.closest(".map-marker") : null;
    tapTargetId = marker ? marker.dataset.id : "";
    try { viewport.setPointerCapture(e.pointerId); } catch (_) {}
    suppressClick = false;
    if (pointers.size === 1) {
      dragging = true; moved = false; sx = e.clientX; sy = e.clientY; stx = tx; sty = ty;
    } else if (pointers.size === 2) {
      dragging = false; var p = twoPoints(); pinchDist = p.dist; pinchScale = scale;
    }
  }
  function onMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size >= 2) {
      var p = twoPoints(); if (!pinchDist) { pinchDist = p.dist; pinchScale = scale; return; }
      recalcBounds();
      var ns = Math.min(maxScale, Math.max(minScale, pinchScale * (p.dist / pinchDist)));
      var k = ns / scale; tx = p.mx - (p.mx - tx) * k; ty = p.my - (p.my - ty) * k; scale = ns;
      clamp(); apply(); hideHint();
    } else if (dragging) {
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 8) { moved = true; viewport.classList.add("is-dragging"); hideHint(); }
      tx = stx + dx; ty = sty + dy; clamp(); apply();
    }
  }
  function onUp(e) {
    var dx0 = Math.abs(e.clientX - sx), dy0 = Math.abs(e.clientY - sy);
    pointers.delete(e.pointerId);
    if (tapTargetId && !moved && dx0 + dy0 <= 12) {
      selectLandmark(tapTargetId);
      suppressClick = true;
      setTimeout(function () { suppressClick = false; }, 120);
    } else if (dragging && moved) {
      suppressClick = true;
      setTimeout(function () { suppressClick = false; }, 180);
    }
    if (pointers.size === 0) tapTargetId = "";
    if (pointers.size < 2) pinchDist = 0;
    if (pointers.size === 1) {
      var it = pointers.entries().next().value; dragging = true; moved = false;
      sx = it[1].x; sy = it[1].y; stx = tx; sty = ty;
    } else if (pointers.size === 0) {
      dragging = false; viewport.classList.remove("is-dragging");
    }
  }
  function twoPoints() {
    var a = Array.from(pointers.values()); var r = stage.getBoundingClientRect();
    var dx = a[0].x - a[1].x, dy = a[0].y - a[1].y;
    return { dist: Math.hypot(dx, dy), mx: (a[0].x + a[1].x) / 2 - r.left, my: (a[0].y + a[1].y) / 2 - r.top };
  }

  function onWheel(e) {
    e.preventDefault();
    if (e.ctrlKey) { // pinch-to-zoom (Mac trackpad pinch arrives as ctrl+wheel)
      var p = stagePoint(e); zoomAround(p.x, p.y, Math.exp(-e.deltaY * 0.02));
    } else { // two-finger swipe / scroll = pan the map (no key held = move, not zoom)
      tx -= e.deltaX; ty -= e.deltaY; clamp(); apply();
    }
    hideHint();
  }
  function onDblClick(e) { var p = stagePoint(e); zoomAround(p.x, p.y, 1.6); }

  function setupMap() {
    if (!viewport || !world) return;
    viewport.addEventListener("pointerdown", onDown);
    viewport.addEventListener("pointermove", onMove);
    viewport.addEventListener("pointerup", onUp);
    viewport.addEventListener("pointercancel", onUp);
    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("dblclick", onDblClick);
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { fit(); }, 150); });
  }

  // ---------- on this day / share / random ----------
  function pickOnThisDay() {
    var now = new Date(); var mm = pad2(now.getMonth() + 1);
    var matches = LANDMARKS.filter(function (l) { return l.date && l.date.slice(5, 7) === mm; });
    if (matches.length) return { l: matches[0], anniversary: true };
    var start = new Date(now.getFullYear(), 0, 0);
    var doy = Math.floor((now - start) / 86400000);
    return { l: LANDMARKS[doy % LANDMARKS.length], anniversary: false };
  }
  function renderOnThisDay() {
    if (!otd) return;
    var pick = pickOnThisDay(); var l = pick.l; if (!l) return;
    var lead = pick.anniversary ? ("On this day" + (l.year ? ", " + l.year : "")) : "Featured record";
    otd.innerHTML = '<span class="otd-label">' + esc(lead) + '</span>' +
      '<span class="otd-text">' + esc(l.tldr || l.name) +
      ' <a href="#' + esc(l.id) + '" data-otd="' + esc(l.id) + '">' + esc(l.name) + ' →</a></span>';
  }
  function shareCurrent() {
    if (!current) return;
    if (window.SHMShareCard && window.SHMShareCard.open) { window.SHMShareCard.open(current); return; }
    var url = location.origin + location.pathname + "#" + current.id;
    var text = "Archive record: " + current.name + ". " + (current.tldr || "") + " — Solana History Map";
    if (navigator.share) { navigator.share({ title: current.name, text: text, url: url }).catch(function () {}); return; }
    window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(url), "_blank", "noopener");
  }
  function randomSector() {
    var pool = LANDMARKS.filter(function (l) { return !explored.has(l.id); });
    if (!pool.length) pool = LANDMARKS;
    selectLandmark(pool[Math.floor(Math.random() * pool.length)].id);
  }

  function applyFx() {
    var off = false; try { off = localStorage.getItem(FX_KEY) === "off"; } catch (e) {}
    document.body.setAttribute("data-fx", off ? "off" : "on");
    if (fxToggle) { var lbl = fxToggle.querySelector(".fx-label"); if (lbl) lbl.textContent = off ? "Atmosphere off" : "Atmosphere on"; }
  }
  function toggleFx() {
    var nowOn = document.body.getAttribute("data-fx") !== "off";
    try { localStorage.setItem(FX_KEY, nowOn ? "off" : "on"); } catch (e) {}
    applyFx();
  }

  function bind() {
    document.addEventListener("click", function (e) {
      var m = e.target.closest(".map-marker");
      if (m) { selectLandmark(m.dataset.id); return; }
      var otdLink = e.target.closest("[data-otd]");
      if (otdLink) { e.preventDefault(); selectLandmark(otdLink.dataset.otd); return; }
    });
    if (btnShare) btnShare.addEventListener("click", shareCurrent);
    if (btnRandom) btnRandom.addEventListener("click", randomSector);
    if (fxToggle) fxToggle.addEventListener("click", toggleFx);
    window.addEventListener("hashchange", function () {
      var id = location.hash ? location.hash.slice(1) : "";
      if (id && byId.has(id) && (!current || current.id !== id)) selectLandmark(id, { noHash: true });
    });
  }

  function initialSelect() {
    var hashId = location.hash ? location.hash.slice(1) : "";
    if (hashId && byId.has(hashId)) selectLandmark(hashId, { noHash: true });
    else selectLandmark("wormhole", { noHash: true });
  }
  function onMapReady() {
    if (mapReady) return; mapReady = true;
    setupMap();
    requestAnimationFrame(function () {
      fit();
      if (!current) initialSelect();
    });
  }

  // init
  applyFx();
  renderMarkers();
  updateProgress();
  renderOnThisDay();
  bind();
  initialSelect();
  if (img && img.complete && img.naturalWidth) onMapReady();
  else if (img) { img.addEventListener("load", onMapReady); fit(); }
  else onMapReady();

  // exported for mobile-feed.js (inert on desktop) — additive, no existing call sites change
  window.SHM = { select: selectLandmark, refit: fit, fitAll: fitAll, byId: byId, landmarks: LANDMARKS, explored: explored };
})();
