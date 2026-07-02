// "Alive" layer — progressive enhancement over the static map.
// Phase 1: CRT terminal boot + live Solana chain pulse (read-only).
// Adds nothing the 2D site depends on; degrades silently.
(function () {
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- CRT terminal boot ----------
  function boot() {
    var ov = document.getElementById("boot-overlay");
    if (!ov) return;
    var done = function () { if (ov.parentNode) ov.parentNode.removeChild(ov); };
    if (reduce || sessionStorage.getItem("shm-booted")) { done(); return; }
    try { sessionStorage.setItem("shm-booted", "1"); } catch (e) {}
    var log = ov.querySelector(".boot-log");
    var lines = [
      "> SOLANA HISTORY MAP",
      "> initializing atlas ...",
      "> loading 22 landmarks ... OK",
      "> linking mainnet ... online",
      "> decrypting sectors ..."
    ];
    var i = 0, killed = false;
    function end() { if (killed) return; killed = true; ov.classList.add("boot-done"); setTimeout(done, 650); }
    function nextLine() {
      if (killed) return;
      if (i >= lines.length) { setTimeout(end, 360); return; }
      var el = document.createElement("div"); el.className = "boot-line"; log.appendChild(el);
      var text = lines[i++], j = 0;
      (function ch() {
        if (killed) return;
        if (j <= text.length) { el.textContent = text.slice(0, j) + (j < text.length ? "█" : ""); j++; setTimeout(ch, 16); }
        else { el.textContent = text; setTimeout(nextLine, 80); }
      })();
    }
    function skip() { end(); }
    ov.addEventListener("click", skip);
    document.addEventListener("keydown", skip, { once: true });
    nextLine();
  }

  // ---------- live Solana chain pulse (read-only) ----------
  // Same-origin cached proxy (Cloudflare Pages Function at /api/chain) — hides upstream RPC,
  // whitelists methods, edge-caches. Falls back silently to hidden if unreachable (e.g. local).
  var RPC = "/api/chain";
  var el = document.getElementById("chain-pulse");
  var slot = 0, tps = 0, epoch = 0, pct = 0, tick = null;

  function rpc(method, params) {
    return fetch(RPC, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: method, params: params || [] })
    }).then(function (r) { return r.json(); }).then(function (j) { if (j.error) throw new Error(j.error.message); return j.result; });
  }
  function kfmt(n) { return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(Math.round(n)); }
  function paint() {
    if (!el) return;
    el.innerHTML = '<span class="cp-dot" aria-hidden="true"></span><span class="cp-text">LIVE · slot ' +
      slot.toLocaleString() + " · ~" + kfmt(tps) + " TPS · epoch " + epoch + " (" + pct + "%)</span>";
    el.hidden = false;
  }
  function sync() {
    Promise.all([rpc("getEpochInfo"), rpc("getRecentPerformanceSamples", [1])]).then(function (o) {
      var ei = o[0], s = o[1] && o[1][0];
      if (!ei || ei.absoluteSlot == null) throw new Error("no epoch info");
      slot = ei.absoluteSlot; epoch = ei.epoch;
      pct = ei.slotsInEpoch ? Math.round(ei.slotIndex / ei.slotsInEpoch * 100) : 0;
      if (s && s.samplePeriodSecs) tps = (s.numTransactions || 0) / s.samplePeriodSecs;
      paint();
      if (tick) clearInterval(tick);
      tick = setInterval(function () { slot += 1; paint(); }, 420); // ~one slot client-side between polls
    }).catch(function () { if (el) el.hidden = true; });
  }

  // ---------- ambient deep-space sky (canvas2D, no CDN, capability-gated) ----------
  function sky() {
    if (reduce) return;
    if (navigator.deviceMemory && navigator.deviceMemory < 4) return;
    if (navigator.connection && navigator.connection.saveData) return;
    var cv = document.createElement("canvas");
    cv.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;z-index:-1;pointer-events:none";
    cv.setAttribute("aria-hidden", "true");
    document.body.appendChild(cv);
    var ms = document.querySelector(".map-stage"); if (ms) ms.style.background = "transparent";
    var ctx = cv.getContext("2d"); if (!ctx) { cv.remove(); return; }
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5), W = 1, H = 1;
    function resize() { W = cv.width = Math.floor(innerWidth * dpr); H = cv.height = Math.floor(innerHeight * dpr); }
    window.addEventListener("resize", resize); resize();
    var stars = [], blobs = [], cols = [[40, 220, 150], [50, 170, 235], [130, 70, 210]];
    for (var i = 0; i < 150; i++) stars.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.3, tw: Math.random() * 6.28, sp: Math.random() * 0.5 + 0.15 });
    for (var k = 0; k < 3; k++) blobs.push({ x: Math.random(), y: Math.random(), r: 0.32 + Math.random() * 0.22, c: cols[k], dx: (Math.random() - 0.5) * 0.00004, dy: (Math.random() - 0.5) * 0.00004, ph: Math.random() * 6.28 });
    function loop(t) {
      requestAnimationFrame(loop);
      if (document.hidden || document.body.getAttribute("data-fx") === "off") return;
      ctx.fillStyle = "#05070b"; ctx.fillRect(0, 0, W, H);
      for (var j = 0; j < blobs.length; j++) {
        var b = blobs[j]; b.x += b.dx; b.y += b.dy; if (b.x < 0 || b.x > 1) b.dx *= -1; if (b.y < 0 || b.y > 1) b.dy *= -1;
        var cx = b.x * W, cy = b.y * H, rr = b.r * Math.max(W, H) * (0.9 + 0.1 * Math.sin(t * 0.0002 + b.ph));
        var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
        g.addColorStop(0, "rgba(" + b.c[0] + "," + b.c[1] + "," + b.c[2] + ",0.10)");
        g.addColorStop(1, "rgba(" + b.c[0] + "," + b.c[1] + "," + b.c[2] + ",0)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      for (var s = 0; s < stars.length; s++) {
        var st = stars[s], a = 0.35 + 0.55 * Math.abs(Math.sin(t * 0.001 * st.sp + st.tw));
        ctx.beginPath(); ctx.arc(st.x * W, st.y * H, st.r * dpr, 0, 6.28); ctx.fillStyle = "rgba(200,240,255," + a.toFixed(2) + ")"; ctx.fill();
      }
      var vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(2,3,6,0.7)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
    requestAnimationFrame(loop);
  }

  function init() { boot(); sky(); if (el) { sync(); setInterval(sync, 45000); } }
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
