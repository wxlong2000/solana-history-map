// Reusable playable-simulation engine + sim registry.
// Tier "playable sim": the user physically operates the mechanism and hits an "oh, THAT is how it
// works/broke" moment. Engine reuses the existing .breach-* modal styling. Coexists with
// wormhole-breach.js (that handles #btn-breach for wormhole; this handles #btn-sim for its registry).
// Every line of on-screen copy is reconciled with adversarially fact-checked research (see
// 新猫狗大战/_sim-blueprints + workflow audits).
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SIMS = {};
  function register(id, def) { SIMS[id] = def; }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function short(hex) { return hex.slice(0, 10) + "…" + hex.slice(-6); }
  async function sha256hex(str) {
    var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }

  // ---------- shared widget kit (used by the sims) ----------
  function panels(stage) {
    stage.innerHTML = '<div class="sim-main"></div><div class="sim-closing"></div>';
    var m = stage.querySelector(".sim-main"), c = stage.querySelector(".sim-closing");
    c.style.display = "none";
    return { main: m, closing: c, show: function (showMain) { m.style.display = showMain ? "" : "none"; c.style.display = showMain ? "none" : "flex"; } };
  }
  var UI = {
    meter: function (label) {
      var w = el("div", "sim-meter");
      w.innerHTML = '<div class="sm-top"><span class="sm-label">' + label + '</span><span class="sm-val">—</span></div><div class="sm-track"><i class="sm-fill"></i></div>';
      var fill = w.querySelector(".sm-fill"), val = w.querySelector(".sm-val");
      return { el: w, set: function (pct, txt, state) { fill.style.width = Math.max(0, Math.min(100, pct)) + "%"; if (txt != null) val.textContent = txt; w.setAttribute("data-state", state || ""); } };
    },
    slider: function (label, min, max, step, onInput) {
      var w = el("div", "sim-slider");
      w.innerHTML = '<div class="ss-top"><span class="ss-label">' + label + '</span><span class="ss-val"></span></div><input type="range" min="' + min + '" max="' + max + '" step="' + (step || 1) + '" value="' + min + '" aria-label="' + label + '">';
      var inp = w.querySelector("input"), val = w.querySelector(".ss-val");
      inp.addEventListener("input", function () { onInput(Number(inp.value)); });
      return { el: w, input: inp, set: function (v) { inp.value = v; onInput(Number(v)); }, setVal: function (t) { val.textContent = t; }, value: function () { return Number(inp.value); } };
    },
    toggle: function (label, onChange) {
      var w = el("label", "sim-toggle");
      w.innerHTML = '<input type="checkbox"><span class="st-track"></span><span class="st-lab">' + label + '</span>';
      var cb = w.querySelector("input");
      cb.addEventListener("change", function () { onChange(cb.checked); });
      return { el: w, input: cb, set: function (on) { cb.checked = on; }, checked: function () { return cb.checked; } };
    },
    stat: function (label) {
      var w = el("div", "sim-stat");
      w.innerHTML = '<span class="ss2-label">' + label + '</span><span class="ss2-val">—</span>';
      var val = w.querySelector(".ss2-val");
      return { el: w, set: function (t, state) { val.textContent = t; w.setAttribute("data-state", state || ""); } };
    }
  };

  // ---------- engine ----------
  var modal = null, els = {}, cur = null, ctx = null, step = 0, lastFocused = null;
  function build() {
    if (modal) return;
    modal = el("div", "breach-modal sim-modal");
    modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true"); modal.setAttribute("aria-labelledby", "sim-head");
    modal.innerHTML =
      '<div class="breach-backdrop" data-close></div>' +
      '<div class="breach-dialog" role="document">' +
        '<div class="breach-top"><div class="breach-rail" aria-hidden="true"></div><span class="breach-count" id="sim-count"></span><button class="breach-x" data-close type="button" aria-label="Close interactive">✕</button></div>' +
        '<div class="breach-headwrap"><h2 class="breach-head" id="sim-head" tabindex="-1"></h2><p class="breach-body sim-body"></p></div>' +
        '<div class="breach-stage sim-stage"></div>' +
        '<p class="breach-say" aria-live="polite"></p>' +
        '<div class="breach-foot"><p class="breach-hint"></p><div class="breach-nav"><button class="btn-hud breach-prev" type="button">← Prev</button><button class="btn-hud breach-next primary" type="button">Next →</button></div></div>' +
        '<p class="breach-live shm-vh" aria-live="polite"></p>' +
      '</div>';
    document.body.appendChild(modal);
    els.rail = modal.querySelector(".breach-rail"); els.count = modal.querySelector(".breach-count");
    els.stage = modal.querySelector(".sim-stage"); els.head = modal.querySelector(".breach-head"); els.body = modal.querySelector(".sim-body");
    els.hint = modal.querySelector(".breach-hint"); els.prev = modal.querySelector(".breach-prev"); els.next = modal.querySelector(".breach-next"); els.live = modal.querySelector(".breach-live"); els.say = modal.querySelector(".breach-say");
    modal.addEventListener("click", function (e) { if (e.target.hasAttribute && e.target.hasAttribute("data-close")) close(); });
    els.prev.addEventListener("click", function () { go(step - 1); });
    els.next.addEventListener("click", function () { if (step >= cur.steps.length - 1) close(); else go(step + 1); });
    document.addEventListener("keydown", onKey);
  }
  function onKey(e) {
    if (!modal || !modal.classList.contains("open")) return;
    if (e.key === "Escape") return close();
    if (e.key === "ArrowRight" && step < cur.steps.length - 1) go(step + 1);
    else if (e.key === "ArrowLeft" && step > 0) go(step - 1);
    else if (e.key === "Tab") trap(e);
  }
  function trap(e) {
    var f = Array.prototype.filter.call(modal.querySelectorAll('button,a[href],input,[tabindex]:not([tabindex="-1"])'), function (n) { return n.offsetParent !== null && !n.disabled; });
    if (!f.length) return; var a = f[0], b = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
    else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
  }
  // speak() mirrors to a VISIBLE status line (els.say) as well as the aria-live region,
  // so the sighted user sees the action/aha narration — not just screen readers.
  function speak(m) { if (els.say) els.say.textContent = m || ""; if (els.live) els.live.textContent = m; }
  function go(i) {
    i = Math.max(0, Math.min(cur.steps.length - 1, i)); step = i;
    var s = cur.steps[i];
    if (els.say) els.say.textContent = ""; // fresh status per step (don't carry the last beat's line)
    els.head.innerHTML = s.head; els.body.innerHTML = s.body; els.hint.innerHTML = s.hint || "";
    els.count.textContent = "STEP " + (i + 1) + " / " + cur.steps.length;
    var segs = els.rail.querySelectorAll(".rail-seg");
    for (var k = 0; k < segs.length; k++) segs[k].className = "rail-seg" + (k < i ? " done" : k === i ? " active" : "");
    els.prev.disabled = (i === 0); els.next.textContent = (i === cur.steps.length - 1) ? "Close" : "Next →";
    if (s.enter) s.enter(ctx);
    if (els.live) els.live.textContent = "Step " + (i + 1) + " of " + cur.steps.length + ": " + els.head.textContent; // a11y only
    try { els.head.focus({ preventScroll: false }); } catch (e) {}
  }
  function open(id) {
    cur = SIMS[id]; if (!cur) return;
    build();
    ctx = { state: {}, accent: cur.accent || "#14f195", reduce: reduce, speak: speak, stage: null, sim: cur, el: el, sha256hex: sha256hex, short: short, refreshNav: function () {} };
    modal.style.setProperty("--sim-accent", ctx.accent);
    var rh = ""; for (var i = 0; i < cur.steps.length; i++) rh += '<i class="rail-seg"></i>'; els.rail.innerHTML = rh;
    els.stage.innerHTML = ""; ctx.stage = els.stage;
    lastFocused = document.activeElement;
    document.body.classList.add("breach-lock");
    modal.classList.add("open"); step = 0;
    if (cur.mount) cur.mount(els.stage, ctx);
    go(0);
  }
  function close() { if (!modal) return; if (cur && cur.unmount) { try { cur.unmount(ctx); } catch (e) {} } modal.classList.remove("open"); document.body.classList.remove("breach-lock"); if (lastFocused && lastFocused.focus) { try { lastFocused.focus(); } catch (e) {} } }

  // entry button (coexists with wormhole-breach's #btn-breach)
  var lastRec = null;
  function inject() {
    var actions = document.querySelector(".panel-actions"); if (!actions || document.getElementById("btn-sim")) return;
    var b = el("button", "btn-hud btn-breach"); b.id = "btn-sim"; b.type = "button"; b.hidden = true;
    b.setAttribute("aria-label", "Play interactive walkthrough");
    b.innerHTML = "▶ Play: walk it through";
    b.addEventListener("click", function () { if (lastRec && SIMS[lastRec.id]) open(lastRec.id); });
    actions.insertBefore(b, actions.firstChild);
  }
  function onSelect(e) { lastRec = e && e.detail ? e.detail : null; inject(); var b = document.getElementById("btn-sim"); if (b) b.hidden = !(lastRec && SIMS[lastRec.id]); }
  function initEngine() { document.addEventListener("shm:select", onSelect); inject(); if (window.__shmSelected) onSelect({ detail: window.__shmSelected }); }
  if (document.readyState !== "loading") initEngine(); else document.addEventListener("DOMContentLoaded", initEngine);
  window.SHMSim = { register: register, open: open, has: function (id) { return !!SIMS[id]; } };

  function sourcesFor(id, extra) {
    var L = window.SOLANA_HISTORY_LANDMARKS || [], rec = null;
    for (var i = 0; i < L.length; i++) if (L[i].id === id) rec = L[i];
    var seen = {}, items = [];
    (rec && rec.sources ? rec.sources : []).concat(extra || []).forEach(function (s) {
      if (!s || !s.url || seen[s.url]) return; seen[s.url] = 1;
      items.push('<li><a href="' + s.url + '" target="_blank" rel="noopener">' + s.label + '</a></li>');
    });
    return '<details class="sim-sources" open><summary>Sources</summary><ul>' + items.join("") + '</ul></details>';
  }

  // ================= SIM: architects_echo — Proof of History =================
  register("architects_echo", {
    accent: "#14f195",
    mount: function (stage, ctx) {
      var st = ctx.state;
      st.gen = "PoH-genesis";
      st.recorded = [];          // [{n,hex,ev}]
      st.eventAt = null;
      st.tampered = false;
      st.busy = false;
      stage.innerHTML =
        '<div class="poh-main">' +
          '<div class="poh-clockrow"><span class="poh-clocklabel">CLOCK · hash count</span><span class="poh-count">0</span>' +
            '<span class="poh-status"></span></div>' +
          '<div class="poh-ledger" aria-live="off"></div>' +
          '<div class="poh-lanes" hidden></div>' +
          '<div class="poh-controls">' +
            '<button class="btn-hud poh-tick primary-soft" type="button">TICK ▸ hash</button>' +
            '<button class="btn-hud poh-skip" type="button" disabled>SKIP +100</button>' +
            '<button class="btn-hud poh-event" type="button">⬇ drop event (tx: alice→bob)</button>' +
            '<button class="btn-hud poh-verify" type="button">✓ VERIFY</button>' +
            '<label class="poh-tamper"><input type="checkbox" class="poh-tamper-cb"> TAMPER</label>' +
          '</div>' +
        '</div>' +
        '<div class="poh-closing" hidden></div>';
      st.elMain = stage.querySelector(".poh-main");
      st.elClosing = stage.querySelector(".poh-closing");
      st.elCount = stage.querySelector(".poh-count");
      st.elLedger = stage.querySelector(".poh-ledger"); st.elLanes = stage.querySelector(".poh-lanes");
      st.elStatus = stage.querySelector(".poh-status");
      st.bTick = stage.querySelector(".poh-tick");
      st.bSkip = stage.querySelector(".poh-skip");
      st.bEvent = stage.querySelector(".poh-event");
      st.bVerify = stage.querySelector(".poh-verify");
      st.cbTamper = stage.querySelector(".poh-tamper-cb");

      function render() {
        var rows = st.recorded.slice(-7);
        st.elLedger.innerHTML = rows.map(function (r) {
          var cls = "poh-row" + (r.ev ? " ev" : "") + (r.bad ? " bad" : "") + (r.ok ? " ok" : "");
          return '<div class="' + cls + '"><span class="poh-n">' + String(r.n).padStart(3, "0") + '</span>' +
            '<span class="poh-hex">' + (r.bad && r.shadow ? '<span class="poh-old">' + ctx.short(r.hex) + '</span><span class="poh-arr">→</span><span class="poh-new">' + ctx.short(r.shadow) + '</span>' : ctx.short(r.hex)) + '</span>' +
            (r.ev ? '<span class="poh-tag">◆ event</span>' : '') +
            (r.bad ? '<span class="poh-x">✗ broken</span>' : (r.ok ? '<span class="poh-ok">✓</span>' : '')) + '</div>';
        }).join("");
        st.elCount.textContent = st.recorded.length;
      }
      st.render = render;
      function setStatus(t, kind) { st.elStatus.textContent = t || ""; st.elStatus.className = "poh-status" + (kind ? " " + kind : ""); }
      st.setStatus = setStatus;

      async function tick(withEvent) {
        if (st.busy) return; st.busy = true;
        var last = st.recorded.length ? st.recorded[st.recorded.length - 1].hex : st.gen;
        var n = st.recorded.length;
        var input = withEvent ? (last + "|tx:alice→bob") : last;
        var hex = await ctx.sha256hex(input);
        st.recorded.push({ n: n, hex: hex, ev: !!withEvent });
        if (withEvent) { st.eventAt = n; st.bEvent.disabled = true; setStatus("event wedged at count " + n, "ok"); }
        render(); st.busy = false;
        ctx.speak("Hash count " + st.recorded.length + (withEvent ? ", event stamped" : ""));
      }
      st.bTick.addEventListener("click", function () { tick(false); });
      st.bEvent.addEventListener("click", async function () { if (st.eventAt != null) return; await tick(true); await tick(false); await tick(false); });
      st.bSkip.addEventListener("click", function () { setStatus("can’t skip — the clock only advances by real, sequential hashes", "warn"); });
      st.bVerify.addEventListener("click", function () {
        if (st.tampered) { setStatus("can’t verify a tampered record — re-check fails from the moved event onward", "warn"); return; }
        if (st.busy) return; if (!st.recorded.length) { setStatus("tick a few hashes first", "warn"); return; }
        st.busy = true;
        st.elLanes.hidden = false;
        st.elLanes.innerHTML = '<div class="poh-laneslabel">re-checking in parallel · 4 lanes at once</div><div class="poh-lanerow"><div class="poh-lane"><i></i></div><div class="poh-lane"><i></i></div><div class="poh-lane"><i></i></div><div class="poh-lane"><i></i></div></div>';
        var fills = st.elLanes.querySelectorAll(".poh-lane i"), p = 0;
        var iv = setInterval(function () {
          p += 14;
          for (var i = 0; i < fills.length; i++) fills[i].style.width = Math.max(0, Math.min(100, p - i * 4)) + "%";
          if (p >= 112) { clearInterval(iv);
            for (var k = 0; k < fills.length; k++) fills[k].style.width = "100%";
            st.recorded.forEach(function (r) { r.ok = true; }); render();
            setStatus("re-verified ✓ — all 4 lanes at once. But verifying costs ~as much work as generating — which is why PoH-as-a-strict-VDF is debated.", "ok");
            st.busy = false;
          }
        }, 70);
      });
      st.cbTamper.addEventListener("change", async function (e) {
        if (st.eventAt == null) { e.target.checked = false; setStatus("drop the event first, then try to move it", "warn"); return; }
        st.tampered = e.target.checked;
        if (!st.tampered) { st.recorded.forEach(function (r) { delete r.bad; delete r.shadow; }); render(); setStatus("restored", ""); return; }
        // recompute a shadow chain from eventAt with the event shifted one tick later
        var idx = -1; for (var i = 0; i < st.recorded.length; i++) if (st.recorded[i].n === st.eventAt) { idx = i; break; }
        if (idx < 0) return;
        var prev = idx > 0 ? st.recorded[idx - 1].hex : st.gen;
        var broke = 0;
        for (var j = idx; j < st.recorded.length; j++) {
          var moveHere = (j === idx + 1); // event now lands one tick later
          var input = moveHere ? (prev + "|tx:alice→bob") : prev;
          var sh = await ctx.sha256hex(input);
          st.recorded[j].shadow = sh; st.recorded[j].bad = true; broke++;
          prev = sh;
        }
        render();
        setStatus("tamper detected — moving the event rewrote " + broke + " hash" + (broke === 1 ? "" : "es") + " from the event onward; the forgery is self-evident on re-check", "bad");
      });
    },
    steps: [
      {
        head: "Crank the clock",
        body: "Proof of History is a clock built from a single chain of SHA-256 hashes — each hash is the input to the next, so it can only be built <strong>one hash at a time, in order</strong>. The count of hashes <em>is</em> the clock: Solana frames this sequential hashing as a verifiable delay.",
        hint: "Tap <strong>TICK</strong> a few times — each hash derives from the last, and the COUNT climbs.",
        enter: function (ctx) { var s = ctx.state; show(s, true); only(s, [s.bTick]); s.setStatus("", ""); }
      },
      {
        head: "You can’t skip ahead",
        body: "Because each hash needs the one before it, there’s no shortcut: to be at count N you must have actually performed N hashes in sequence. That forced, non-parallelizable work is what makes the count trustworthy as elapsed time — <strong>no node had to message anyone to agree on it</strong>.",
        hint: "Try <strong>SKIP +100</strong> — it refuses. Only real ticks move the clock.",
        enter: function (ctx) { var s = ctx.state; show(s, true); only(s, [s.bTick, s.bSkip]); s.bSkip.disabled = false; }
      },
      {
        head: "Stamp an event into the stream",
        body: "Now mix in an event — its data is folded into the next hash, wedging it at a fixed position in the count. Per Solana’s docs, anything hashed into the proof <em>must have existed before that proof was generated</em>.",
        hint: "Tap <strong>⬇ drop event</strong> — it gets baked into the next tick.",
        enter: function (ctx) { var s = ctx.state; show(s, true); only(s, [s.bTick, s.bEvent]); }
      },
      {
        head: "Try to cheat the timestamp",
        body: "An event’s time isn’t a label someone wrote down — it’s its <strong>position in the hash count</strong>. Move it, and you must rewrite every hash after it. (This is a property of the hash chain itself, not a real Solana exploit — it makes tampering <strong>detectable on re-check</strong>, not impossible.)",
        hint: "Flip <strong>TAMPER</strong> — try to shove the event one tick later.",
        enter: function (ctx) { var s = ctx.state; show(s, true); only(s, [s.bTick, s.cbTamper]); if (s.eventAt == null) s.setStatus("(tip: go back and drop the event first)", "warn"); }
      },
      {
        head: "Anyone can re-verify — in parallel",
        body: "Re-checking the record is the part that <strong>can</strong> be parallelized — split the chain into segments and verify them at once (Solana cites a ~4,000-core GPU). Note verification is roughly <em>as much work</em> as generation, which is why cryptographers (the VDF was defined by Boneh, Bonneau, Bünz &amp; Fisch; critics include Victor Shoup) debate whether PoH is a <em>strict</em> VDF.",
        hint: "Hit <strong>✓ VERIFY</strong> — the whole record re-checks and locks green.",
        enter: function (ctx) { var s = ctx.state; show(s, true); s.elLanes.hidden = true; if (s.tampered) { s.cbTamper.checked = false; s.tampered = false; s.recorded.forEach(function (r) { delete r.bad; delete r.shadow; }); s.render(); } only(s, [s.bTick, s.bVerify]); }
      },
      {
        head: "A clock — before consensus",
        body: "That’s Proof of History: a trustless, verifiable ordering of events stamped into the ledger <strong>before</strong> consensus — it feeds Solana’s Tower BFT (proof-of-stake) consensus, it isn’t consensus itself. Anatoly Yakovenko described it in a Nov 2017 whitepaper; Mainnet Beta (still officially “beta”) launched March 16, 2020.",
        hint: "Open the sources, or replay from step 1.",
        enter: function (ctx) {
          var s = ctx.state; show(s, false);
          s.elClosing.innerHTML =
            '<p class="sim-closing-lead">A clock you can <strong>prove</strong>, not announce — and the engine that lets Solana order and pipeline work without nodes constantly messaging about time. <span class="sim-muted">Block time (~400–800ms) and core counts cited here are current-implementation figures, not protocol constants.</span></p>' +
            sourcesFor("architects_echo", [{ label: "Anza docs — PoH / synchronization", url: "https://docs.anza.xyz/consensus/synchronization" }]) +
            '<p class="sim-note">Historical/technical reference. PoH is a clock primitive, not consensus, and the “VDF” label is academically debated.</p>';
        }
      }
    ]
  });

  function show(s, main) { s.elMain.style.display = main ? "flex" : "none"; s.elClosing.style.display = main ? "none" : "flex"; }
  function only(s, enabled) {
    [s.bTick, s.bSkip, s.bEvent, s.bVerify, s.cbTamper].forEach(function (c) {
      if (!c) return;
      var on = enabled.indexOf(c) >= 0;
      if (c === s.cbTamper) { c.disabled = !on; c.closest(".poh-tamper").style.opacity = on ? "1" : ".4"; }
      else { c.style.display = on ? "" : "none"; }
    });
    // keep already-used one-shots disabled
    if (s.bEvent && s.eventAt != null) s.bEvent.disabled = true;
  }

  // ================= SIM: slope — Leak Ruins (Slope wallet seed leak) =================
  register("slope", {
    accent: "#ff5066",
    mount: function (stage, ctx) {
      var st = ctx.state, P = panels(stage); st.P = P;
      st.gen = false; st.imported = false; st.expanded = false; st.scrubbed = false; st.drained = false;
      var WORDS = "orbit ladder pony velvet cabin echo north ribbon glass tiger amber unit".split(" ");
      P.main.innerHTML =
        '<div class="slope-grid">' +
          '<div class="slope-col"><div class="slope-h">📱 Slope wallet <span class="muted">· mock</span></div>' +
            '<div class="seed-box muted">tap “Generate” — a 12-word secret recovery phrase is created</div>' +
            '<div class="bal-box" hidden>balance <b>142 SOL</b></div>' +
            '<div class="row"><button class="btn-hud b-gen" type="button">Generate seed phrase</button><button class="btn-hud b-imp" type="button" disabled>Import wallet</button></div>' +
          '</div>' +
          '<div class="slope-col"><div class="slope-h">🖥 Monitoring Console <span class="muted">· Sentry (Slope self-hosted)</span></div>' +
            '<div class="log-box"><span class="muted">— idle —</span></div>' +
            '<div class="scrub-slot"></div>' +
          '</div>' +
        '</div>' +
        '<div class="atk-bar"><button class="btn-hud b-drain" type="button">☠ Read log → derive key → Drain</button><span class="atk-stamp"></span></div>';
      st.seedBox = P.main.querySelector(".seed-box");
      st.balBox = P.main.querySelector(".bal-box");
      st.bGen = P.main.querySelector(".b-gen");
      st.bImp = P.main.querySelector(".b-imp");
      st.logBox = P.main.querySelector(".log-box");
      st.atkBar = P.main.querySelector(".atk-bar");
      st.bDrain = P.main.querySelector(".b-drain");
      st.stamp = P.main.querySelector(".atk-stamp");
      st.scrub = UI.toggle("Scrub sensitive data (Slope shipped this OFF)", function (on) { st.scrubbed = on; renderLog(); });
      P.main.querySelector(".scrub-slot").appendChild(st.scrub.el);

      function renderLog() {
        if (!st.imported) { st.logBox.innerHTML = '<span class="muted">— idle · waiting for an app event —</span>'; return; }
        var seedHtml = st.scrubbed ? '<span class="filt">[Filtered]</span>' : '<span class="leak">' + WORDS.join(" ") + '</span>';
        var payload = st.expanded
          ? '<div class="log-payload"><div class="lp-row">event: <b>onboarding</b></div><div class="lp-row">app: <b>slope-mobile</b></div><div class="lp-row">seed_phrase: ' + seedHtml + '</div><div class="lp-note">🔒 TLS protected the trip — not the contents</div></div>'
          : '';
        st.logBox.innerHTML = '<button class="log-evt' + (st.expanded ? " open" : "") + '" type="button"><span class="evt-dot"></span>event captured · slope-mobile · onboarding<span class="evt-exp">' + (st.expanded ? " ▾" : " ▸ expand") + '</span></button>' + payload;
        st.logBox.querySelector(".log-evt").addEventListener("click", function () { st.expanded = !st.expanded; renderLog(); });
      }
      st.renderLog = renderLog;

      st.bGen.addEventListener("click", function () {
        st.gen = true; st.seedBox.classList.remove("muted");
        st.seedBox.innerHTML = WORDS.map(function (w, i) { return '<span class="sw"><i>' + (i + 1) + '</i>' + w + '</span>'; }).join("");
        st.bImp.disabled = false; ctx.speak("12-word seed phrase generated");
      });
      st.bImp.addEventListener("click", function () {
        if (!st.gen) { ctx.speak("generate a seed first"); return; }
        st.imported = true; st.balBox.hidden = false; renderLog();
        ctx.speak("Wallet imported — a telemetry event was captured by the monitoring console");
      });
      st.bDrain.addEventListener("click", function () {
        if (st.drained) return;
        if (!st.imported) { ctx.speak("import the wallet first"); return; }
        if (st.scrubbed) {
          st.stamp.innerHTML = '<span class="ok">✓ nothing to steal</span> — the seed was scrubbed from the log, so <b>this leak path is closed</b>. <span class="muted">(Turn scrub off to see what Slope actually shipped.)</span>';
          ctx.speak("Scrub was on — the seed wasn't in the log, so this leak path is closed");
          return;
        }
        st.drained = true; st.balBox.innerHTML = "balance <b>0 SOL</b>";
        st.stamp.innerHTML = '<span class="bad">real key → VALID signature</span> — the chain had no way to refuse · <span class="ok">Solana protocol: never compromised</span>';
        ctx.speak("Wallet drained with a valid signature; the Solana protocol was never compromised");
      });
    },
    steps: [
      {
        head: "Just a normal wallet",
        body: "This is the Slope mobile wallet. Like millions of onboardings, you tap to generate a 12-word secret recovery phrase. Nothing unusual — every wallet does this.",
        hint: "Tap <strong>Generate seed phrase</strong>.",
        enter: function (ctx) { var s = ctx.state; s.P.show(true); s.scrub.el.style.display = "none"; s.atkBar.style.display = "none"; }
      },
      {
        head: "Finish onboarding",
        body: "Import the wallet to start using it — the most ordinary action there is. You did nothing wrong. Keep an eye on the <strong>monitoring console</strong> on the right.",
        hint: "Tap <strong>Import wallet</strong>.",
        enter: function (ctx) { var s = ctx.state; s.P.show(true); s.scrub.el.style.display = "none"; s.atkBar.style.display = "none"; }
      },
      {
        head: "Open the log it just sent",
        body: "Slope’s app shipped a telemetry event to its self-hosted monitoring service (Sentry) over TLS. Expand the event — see what rode along inside it.",
        hint: "Click the <strong>captured event</strong> to expand it.",
        enter: function (ctx) { var s = ctx.state; s.P.show(true); s.scrub.el.style.display = "none"; s.atkBar.style.display = "none"; if (!s.imported) s.renderLog(); }
      },
      {
        head: "One flag that was never set",
        body: "Monitoring tools have a “scrub sensitive data” filter. Slope shipped with it <strong>off</strong>, so the seed sat in storage in plaintext. Flip it and watch the same event change. <span class=\"muted\">(This flag would have closed <em>this</em> leak path — not necessarily every drain; see the last step.)</span>",
        hint: "Toggle <strong>Scrub sensitive data</strong> on — watch the plaintext seed become [Filtered].",
        enter: function (ctx) { var s = ctx.state; s.P.show(true); s.scrub.el.style.display = "inline-flex"; s.atkBar.style.display = "none"; if (!s.expanded && s.imported) { s.expanded = true; s.renderLog(); } }
      },
      {
        head: "The attacker just reads it",
        body: "Anyone with access to that plaintext store can lift the seed, rebuild the private key, and sign — the chain accepts the drain as valid. But test the fix yourself: with <strong>Scrub ON</strong>, the attacker finds nothing in the log and <strong>this leak path closes</strong>. Turn it <strong>off</strong> — as Slope shipped — and the drain lands.",
        hint: "With <strong>Scrub ON</strong>, hit Drain (it finds nothing). Then turn scrub <strong>off</strong> and Drain again — it lands.",
        enter: function (ctx) { var s = ctx.state; s.P.show(true); s.scrub.el.style.display = "inline-flex"; s.atkBar.style.display = "flex"; if (s.imported) s.renderLog(); }
      },
      {
        head: "What actually broke — and what’s still disputed",
        body: "~9,231 wallets, ~$4.1M, over ~4 hours on Aug 2, 2022. Hardware wallets and seeds never imported into Slope were safe. The plaintext leak is the <strong>leading</strong> explanation — but Slope’s own forensics found only <strong>~15% (1,444 of 9,229)</strong> of drained wallets had keys on the leaked server, and called the link <em>not conclusive</em>.",
        hint: "Read the takeaway, then open the sources or replay.",
        enter: function (ctx) {
          var s = ctx.state; s.P.show(false);
          s.P.closing.innerHTML =
            '<p class="sim-closing-lead">The chain checked every signature — all valid. The keys were handed away <strong>off-chain</strong>, inside an app’s own logs. <span class="sim-muted">Certain: it was not a Solana protocol flaw, and hardware wallets were safe. Disputed: whether that one leak explains all ~9,231 drains — only ~15% were directly traced to the server, and Slope publicly contested the link.</span></p>' +
            '<div class="sim-figrow"><span class="sim-fig">~9,231<small>wallets</small></span><span class="sim-fig">~$4.1M<small>drained (others said $5M+)</small></span><span class="sim-fig">~15%<small>traced to the leak</small></span></div>' +
            sourcesFor("slope", [{ label: "OtterSec / Sentry — plaintext seed logging analysis", url: "https://blog.sentry.io/slope-wallet-solana-hack/" }]) +
            '<p class="sim-note">Historical security reference. Cause attribution is the leading hypothesis, not a settled finding; figures are approximate.</p>';
        }
      }
    ]
  });

  // ================= SIM: mango — Oracle Mirage (Mango Markets) =================
  register("mango", {
    accent: "#ff5066",
    mount: function (stage, ctx) {
      var st = ctx.state, P = panels(stage); st.P = P;
      var N = 483e6, ENTRY = 0.038, P0 = 0.038, PEAK = 0.91, TREASURY = 110e6, MAX = 450e6;
      st.crossed = false; st.drained = false;
      function usd(v) { var a = Math.abs(v); if (a >= 1e9) return "$" + (v / 1e9).toFixed(2) + "B"; if (a >= 1e6) return "$" + Math.round(v / 1e6) + "M"; if (a >= 1e3) return "$" + Math.round(v / 1e3) + "k"; if (a >= 1) return "$" + v.toFixed(0); return "$" + v.toFixed(3); }
      P.main.innerHTML =
        '<div class="mango-cards">' +
          '<div class="acct">ACCT A · <b>SHORT</b> 483M MNGO-PERP <span class="muted">@ $0.038</span></div>' +
          '<div class="acct">ACCT B · <b class="long">LONG</b> 483M MNGO-PERP <span class="muted">@ $0.038</span></div>' +
          '<div class="net-chip">net market exposure: <b>0</b> — you’re both sides <button class="btn-hud b-cross" type="button">Cross the trade</button></div>' +
        '</div>' +
        '<div class="mango-oracle"><span class="ss2-label">MNGO oracle price <span class="thin">· thin order book</span></span><div class="oracle-px">$0.040</div></div>' +
        '<div class="slider-slot"></div>' +
        '<div class="meters-slot"></div>' +
        '<div class="vault-slot"></div>' +
        '<div class="verdict-slot"></div>';
      st.cards = P.main.querySelector(".mango-cards");
      st.oraclePx = P.main.querySelector(".oracle-px");
      st.bCross = P.main.querySelector(".b-cross");
      st.slider = UI.slider("Spot-buy MNGO across the price-feed venues ($ spent)", 0, 4, 0.1, function (v) { onPump(v); });
      P.main.querySelector(".slider-slot").appendChild(st.slider.el);
      st.pnl = UI.meter("Unrealized PnL · your LONG"); st.borrow = UI.meter("Borrow power (counted as collateral)");
      var mwrap = P.main.querySelector(".meters-slot"); mwrap.appendChild(st.pnl.el); mwrap.appendChild(st.borrow.el);
      st.treas = UI.meter("Mango treasury · real depositor assets"); st.wallet = UI.meter("Your wallet");
      var vwrap = P.main.querySelector(".vault-slot"); vwrap.appendChild(st.treas.el); vwrap.appendChild(st.wallet.el);
      st.drainRow = el("div", "drain-row", '<button class="btn-hud b-drain" type="button" disabled>Borrow &amp; withdraw against the inflated collateral</button><span class="drain-banner"></span>');
      vwrap.appendChild(st.drainRow);
      st.bDrain = st.drainRow.querySelector(".b-drain"); st.drainBanner = st.drainRow.querySelector(".drain-banner");
      st.verdictWrap = P.main.querySelector(".verdict-slot");
      st.verdict = UI.toggle("Flip to the 2025 ruling", function (on) { renderVerdict(on); });
      st.verdictText = el("div", "verdict-text");
      st.verdictWrap.appendChild(st.verdict.el); st.verdictWrap.appendChild(st.verdictText);

      st.slots = { cards: st.cards, oracle: P.main.querySelector(".mango-oracle"), slider: P.main.querySelector(".slider-slot"), meters: mwrap, vault: vwrap, verdict: st.verdictWrap };
      st.mShow = function (names) { for (var k in st.slots) st.slots[k].style.display = names.indexOf(k) >= 0 ? "" : "none"; };

      function price(spendM) { return P0 + (spendM / 4) * (PEAK - P0); }
      function onPump(spendM) {
        var px = price(spendM);
        st.oraclePx.textContent = "$" + px.toFixed(2) + (spendM > 0 ? "  (+" + Math.round((px / P0 - 1) * 100) + "%)" : "");
        st.slider.setVal(usd(spendM * 1e6) + " spent");
        var pnl = N * (px - ENTRY), bp = pnl + 10e6;
        st.pnl.set(pnl / MAX * 100, usd(pnl), pnl > TREASURY ? "gold" : "");
        st.borrow.set(bp / MAX * 100, usd(bp), bp > TREASURY ? "gold" : "");
        st.treas.set(st.drained ? 0 : TREASURY / MAX * 100, st.drained ? "$0 · insolvent" : usd(TREASURY), st.drained ? "bad" : "");
        st.wallet.set(st.drained ? TREASURY / MAX * 100 : 0, st.drained ? usd(TREASURY) : "$0", st.drained ? "gold" : "");
        st.bDrain.disabled = !(bp > TREASURY) || st.drained;
      }
      st.onPump = onPump;
      st.bCross.addEventListener("click", function () { st.crossed = true; st.cards.classList.add("crossed"); st.bCross.disabled = true; st.bCross.textContent = "✓ position opened"; ctx.speak("Opened a 483 million MNGO perp long against yourself; net exposure zero"); });
      st.bDrain.addEventListener("click", function () {
        if (st.drained) return; st.drained = true;
        st.treas.set(0, "$0 · insolvent", "bad"); st.wallet.set(TREASURY / MAX * 100, usd(TREASURY), "gold");
        st.drainBanner.textContent = "over $100M withdrawn (≈$110M; ~$116M by some counts) · never repaid";
        st.bDrain.disabled = true; ctx.speak("Drained the treasury — over 100 million dollars, against value that only existed because you moved a slider");
      });
      function renderVerdict(on) {
        st.verdictText.innerHTML = on
          ? '<span class="vd vac">MAY 2025 · VACATED</span> A federal judge threw out all three convictions — <strong>improper venue</strong> and <strong>no material misrepresentation</strong> (Mango had no terms of service barring this; the contract priced collateral exactly as designed). <span class="muted">Prosecutors appealed to the 2nd Circuit (Jan 2026) — unresolved. The vacatur was on legal grounds, not a substantive finding of innocence.</span>'
          : '<span class="vd guilty">APR 2024 · GUILTY</span> A jury convicted on three counts: commodities fraud, commodities manipulation, and wire fraud.';
      }
      st.renderVerdict = renderVerdict;
      onPump(0); renderVerdict(false);
    },
    steps: [
      { head: "Open a perp position against yourself", body: "You control two Mango accounts, ~$5M each. Account A <strong>sells</strong> and Account B <strong>buys</strong> ~483M MNGO-PERP at 3.8¢ — so B holds a giant <strong>long</strong>, but your net market risk is zero (you’re both sides).", hint: "Tap <strong>Cross the trade</strong> to open the position.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.mShow(["cards"]); } },
      { head: "Pump the thin oracle", body: "Mango reads MNGO’s price from a few low-liquidity spot venues. Drag the slider to spend ~$4M buying MNGO across them — and watch how little it takes to move the whole feed.", hint: "Drag <strong>Spot-buy MNGO</strong> up to ~$4M.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.mShow(["cards", "oracle", "slider"]); } },
      { head: "Fake profit becomes collateral", body: "The pump (~<strong>2,300%</strong>, from ~$0.04 toward a ~$0.91 peak) turns your long’s <strong>unrealized</strong> profit into a fortune — and Mango counts that unrealized PnL as <strong>borrowing collateral</strong>. Your borrow power balloons past the entire treasury.", hint: "Keep the slider up — watch <strong>PnL</strong> and <strong>borrow power</strong> tower over the treasury.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.mShow(["cards", "oracle", "slider", "meters"]); if (s.slider.value() < 3.8) s.slider.set(4); } },
      { head: "Drain the treasury", body: "Borrow power now dwarfs everything real in the vault. Borrow against the invented value and withdraw real assets — USDC, SOL, BTC, mSOL, USDT — leaving Mango insolvent. <strong>No contract bug was used</strong>: the code calculated collateral exactly as designed, on a price you invented.", hint: "Press <strong>Borrow &amp; withdraw</strong>.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.mShow(["oracle", "meters", "vault"]); if (s.slider.value() < 3.8) s.slider.set(4); s.onPump(s.slider.value()); } },
      { head: "The deal, then the courtroom", body: "Weeks later, in a public Mango DAO vote, he returned ~$67M and kept ~$47M — calling it a legal, “highly profitable trading strategy.” The law has gone back and forth ever since.", hint: "Flip the toggle from the 2024 verdict to the 2025 ruling.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.mShow(["verdict"]); } },
      { head: "The contract did what it promised", body: "Oracle manipulation turns a thin price feed into free collateral — the attack that made “where does your price come from?” a first-order DeFi question.", hint: "Open the sources, or replay from step 1.", enter: function (ctx) {
          var s = ctx.state; s.P.show(false);
          s.P.closing.innerHTML =
            '<p class="sim-closing-lead">No code was hacked: the contract did exactly what it promised, on a price the attacker <strong>invented</strong> from a thin market. <span class="sim-muted">Not a Solana protocol flaw — an app-level oracle/collateral design choice. Loss was over $100M (≈$110M; ~$116M by some counts); ~$67M was later returned. Whether it was fraud is still on appeal (as of 2026).</span></p>' +
            '<div class="sim-figrow"><span class="sim-fig">~2,300%<small>oracle pump</small></span><span class="sim-fig">&gt;$100M<small>drained (~$110M)</small></span><span class="sim-fig">$0<small>contract bugs used</small></span></div>' +
            sourcesFor("mango", [{ label: "TRM Labs — judge overturns all Mango convictions (2025)", url: "https://www.trmlabs.com/resources/blog/breaking-federal-judge-overturns-all-criminal-convictions-in-mango-markets-case-against-avraham-eisenberg" }, { label: "Solidus Labs — Mango exploit order-book analysis", url: "https://www.soliduslabs.com/post/mango-hack" }]) +
            '<p class="sim-note">Historical/legal reference. The 2025 vacatur was on venue + absence of material misrepresentation, not a substantive finding of innocence; appeal pending.</p>';
        } }
    ]
  });

  // ================= SIM: ore — Congestion Mine (ORE) =================
  register("ore", {
    accent: "#ffd479",
    mount: function (stage, ctx) {
      var st = ctx.state, P = panels(stage); st.P = P;
      st.memeOn = true; st.quicOn = true; st.swapSent = false;
      P.main.innerHTML =
        '<div class="emis-slot"></div>' +
        '<div class="dial-slot"></div>' +
        '<div class="ore-stats"></div>' +
        '<div class="ore-meters"></div>' +
        '<div class="swap-slot"></div>' +
        '<div class="toggles-slot"></div>' +
        '<div class="timeline-slot"></div>';
      st.emis = UI.meter("Network emission · split among ALL miners"); P.main.querySelector(".emis-slot").appendChild(st.emis.el);
      st.emis.set(100, "1 ORE / minute · FIXED", "gold");
      st.dial = UI.slider("⛏ Miners (each spams proof-submission txns)", 1, 5000, 1, function (v) { recompute(); });
      P.main.querySelector(".dial-slot").appendChild(st.dial.el);
      st.reward = UI.stat("Your reward / transaction"); st.txph = UI.stat("ORE txns / hour"); st.yourShare = UI.stat("Your share of the 1 ORE/min pie");
      var sw = P.main.querySelector(".ore-stats"); sw.appendChild(st.reward.el); sw.appendChild(st.txph.el); sw.appendChild(st.yourShare.el);
      st.spamCard = el("div", "spam-card", '<button class="btn-hud b-spam" type="button">Spam harder — 2× your submissions ▸</button><div class="spam-note muted small"></div>'); sw.appendChild(st.spamCard);
      st.bSpam = st.spamCard.querySelector(".b-spam"); st.spamNote = st.spamCard.querySelector(".spam-note");
      st.share = UI.meter("ORE share of txns SUBMITTED to Solana"); st.fail = UI.meter("Network non-vote failure rate");
      var mw = P.main.querySelector(".ore-meters"); mw.appendChild(st.share.el); mw.appendChild(st.fail.el);
      st.swapCard = el("div", "swap-card", '<button class="btn-hud b-swap" type="button">Send an ordinary swap</button><span class="swap-stat"></span><div class="swap-foot muted"></div>');
      P.main.querySelector(".swap-slot").appendChild(st.swapCard);
      st.bSwap = st.swapCard.querySelector(".b-swap"); st.swapStat = st.swapCard.querySelector(".swap-stat"); st.swapFoot = st.swapCard.querySelector(".swap-foot");
      st.tMeme = UI.toggle("Memecoin trading surge", function (on) { st.memeOn = on; recompute(); }); st.tMeme.set(true);
      st.tQuic = UI.toggle("QUIC ingress bottleneck (no mempool)", function (on) { st.quicOn = on; recompute(); }); st.tQuic.set(true);
      var tw = P.main.querySelector(".toggles-slot"); tw.appendChild(st.tMeme.el); tw.appendChild(st.tQuic.el);
      P.main.querySelector(".timeline-slot").innerHTML = '<div class="tl-chips"><span class="tl">Apr 2, 2024 · ORE v1 launches</span><span class="tl">Apr 15 · Anza v1.17.31 (first relief)</span><span class="tl">Apr 16 · creator pauses v1</span><span class="tl">Aug 6 · v2 relaunch</span></div>';

      function failPct() { var base = (st.memeOn ? 25 : 0) + (st.quicOn ? 15 : 0); return Math.max(0, Math.min(80, base + (st.dial.value() / 5000) * 40)); }
      function recompute() {
        var m = st.dial.value();
        st.dial.setVal(m.toLocaleString() + " miners");
        st.reward.set((1 / Math.max(1, m)).toFixed(m > 50 ? 4 : 3) + " ORE", m > 200 ? "bad" : "");
        st.txph.set((m * 200).toLocaleString(), m > 1000 ? "bad" : "");
        if (!st.spamBusy) { var yb = 1 / Math.max(1, m) * 100; st.yourShare.set("~" + yb.toFixed(yb < 1 ? 3 : 1) + "%", ""); }
        var sh = (m / 5000) * 16;
        st.share.set(sh / 16 * 100, "~" + sh.toFixed(1) + "% submitted", sh > 8 ? "gold" : "");
        var f = failPct();
        st.fail.set(f / 80 * 100, "~" + Math.round(f) + "%", f > 45 ? "bad" : (f > 20 ? "warn" : ""));
        if (st.swapSent) paintSwap();
      }
      function paintSwap() {
        var f = failPct();
        if (f > 55) { st.swapStat.innerHTML = '<span class="bad">✗ FAILED</span> (dropped at the ingress)'; st.swapFoot.textContent = "one developer reported landing only ~1 of ~25,000 ORE txns — a separate, ORE-specific figure, not the network rate above."; }
        else { st.swapStat.innerHTML = '<span class="ok">✓ landed</span>'; st.swapFoot.textContent = ""; }
      }
      st.recompute = recompute; st.paintSwap = paintSwap;
      st.bSwap.addEventListener("click", function () { st.swapSent = true; paintSwap(); ctx.speak(failPct() > 55 ? "Your ordinary swap failed — dropped under the congestion" : "Your swap landed"); });
      st.bSpam.addEventListener("click", function () {
        if (st.spamBusy) return; st.spamBusy = true;
        var m = st.dial.value(), boosted = 2 / (m + 1) * 100;
        st.yourShare.set("~" + boosted.toFixed(boosted < 1 ? 3 : 1) + "% ▲", "gold");
        st.spamNote.innerHTML = '<span class="warn">you grabbed a bigger slice — for a moment.</span>';
        ctx.speak("You spammed harder and grabbed a bigger slice, for a moment");
        setTimeout(function () {
          st.spamBusy = false; st.dial.set(Math.min(5000, m + 800));
          st.spamNote.innerHTML = 'the bots copied you within seconds — your slice <b>snapped back</b>, and everyone’s extra spam pushed the load <b>up</b>. Spamming gains you nothing; it only floods the funnel.';
        }, 1200);
      });
      st.slots = { emis: P.main.querySelector(".emis-slot"), dial: P.main.querySelector(".dial-slot"), stats: sw, meters: mw, swap: P.main.querySelector(".swap-slot"), toggles: tw, timeline: P.main.querySelector(".timeline-slot") };
      st.mShow = function (names) { for (var k in st.slots) st.slots[k].style.display = names.indexOf(k) >= 0 ? "" : "none"; };
      st.dial.set(1); recompute();
    },
    steps: [
      { head: "The pie is fixed: 1 ORE per minute", body: "ORE was a Bitcoin-style mineable token built as a Solana program (launched Apr 2, 2024). To “mine,” you submit a proof transaction. But the reward is <strong>fixed at 1 ORE per minute, network-wide</strong>, split among everyone whose proof lands — so right now, as the only miner, you get the whole minute.", hint: "Note the emission bar: it’s <strong>fixed</strong>, no matter how many miners show up.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.dial.set(1); s.mShow(["emis", "stats"]); } },
      { head: "More submissions = a bigger slice. So everyone spams.", body: "Since the pie is split by share of valid submissions, the rational move is to fire as many proof transactions as possible. But try to <strong>Spam harder</strong> to grab a bigger slice — the bots copy you in seconds and your share <strong>snaps right back</strong>, while everyone’s extra spam floods the funnel. Self-defeating, yet every miner does it.", hint: "Drag <strong>⛏ Miners</strong> up — then hit <strong>Spam harder</strong> and watch your slice snap back.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.mShow(["emis", "dial", "stats"]); } },
      { head: "One funnel: the leader’s QUIC ingress", body: "Solana has no mempool — txns hit the current leader’s QUIC ingress directly. At ~5,000 miners that’s ~1,000,000 txns/hour, peaking around <strong>16% of all transactions submitted</strong> to Solana. The funnel saturates and starts dropping connections roughly at random.", hint: "Push the dial to max — watch <strong>ORE share</strong> and the <strong>failure rate</strong> climb.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.mShow(["dial", "stats", "meters"]); if (s.dial.value() < 4000) s.dial.set(5000); } },
      { head: "Your swap just bounced", body: "Now try to do something ordinary. Under the load, network-wide <strong>non-vote failure hit ~75–80%</strong> in early April 2024 — ordinary transactions kept bouncing. Watch it all in one frame: your <strong>reward/tx has collapsed</strong>, the failure meter is red, and your swap <strong>fails</strong> anyway. (The chain never halted or got hacked; it kept producing blocks — this was congestion, a liveness problem.)", hint: "Hit <strong>Send an ordinary swap</strong> with the miners maxed — reward collapsed AND swap failed, together.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.mShow(["dial", "stats", "meters", "swap"]); if (s.dial.value() < 4000) s.dial.set(5000); } },
      { head: "ORE wasn’t alone in the funnel", body: "Here’s the honest part: ORE was <strong>one of several</strong> pipes flooding the same funnel. Toggle the memecoin surge and the QUIC bottleneck — even with the miners at zero, the funnel still strains. Three independent pressures, one pipe.", hint: "Toggle <strong>memecoins</strong> and <strong>QUIC</strong> on/off — and try the miners at 0.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.mShow(["dial", "meters", "toggles"]); } },
      { head: "The fix: pause, then rebuild", body: "The creator paused v1 on Apr 16, 2024; Anza shipped v1.17.31 (first relief) on Apr 15 with the central-scheduler / QUIC work landing in v1.18; ORE v2 relaunched Aug 6, 2024. The lesson: a reward split by share turns every miner into a spammer — and on a no-mempool chain, that spam bounces everyone.", hint: "Open the sources, or replay from step 1.", enter: function (ctx) {
          var s = ctx.state; s.P.show(false);
          s.P.closing.innerHTML =
            '<p class="sim-closing-lead">A fixed reward split by share turns every miner into a spammer — and with no mempool, that spam doesn’t just starve the miners, it bounces everyone’s transactions. <span class="sim-muted">ORE didn’t “break Solana” alone: a memecoin surge and a real QUIC-ingress bottleneck were independent contributors. The chain kept producing blocks throughout — this was congestion (liveness), not a hack or a halt.</span></p>' +
            '<div class="tl-chips"><span class="tl">Apr 2 · v1 launch</span><span class="tl">Apr 15 · v1.17.31</span><span class="tl">Apr 16 · v1 paused</span><span class="tl">Aug 6 · v2</span></div>' +
            '<div class="sim-figrow"><span class="sim-fig">~16%<small>of txns submitted</small></span><span class="sim-fig">~75–80%<small>non-vote fail rate</small></span><span class="sim-fig">1 ORE<small>/min · fixed pie</small></span></div>' +
            sourcesFor("ore", [{ label: "DL News — Solana users spend thousands to earn ORE", url: "https://www.dlnews.com/articles/defi/solana-users-spend-thousands-to-earn-ore-tokens/" }, { label: "RockawayX — Solana congestion explained (QUIC)", url: "https://medium.com/rockaway-blockchain/solana-congestion-explained-0086c2095c5a" }]) +
            '<p class="sim-note">Historical reference. Failure rate is a range (~75–80%) for network-wide non-vote txns — distinct from ORE-specific landing rates; figures approximate.</p>';
        } }
    ]
  });

  // ================= SIM: restart — Mount Restart (Sept 14 2021 outage + restart) =================
  register("restart", {
    accent: "#46c7ec",
    unmount: function (ctx) { if (ctx.state.timer) { clearInterval(ctx.state.timer); ctx.state.timer = null; } },
    mount: function (stage, ctx) {
      var st = ctx.state, P = panels(stage); st.P = P;
      st.slot = 99180142; st.running = true; st.halted = false; st.stake = 0; st.lvl = 0; st.slotSel = false;
      P.main.innerHTML =
        '<div class="slotbar"><span class="slot-num"></span><span class="slot-status"></span><span class="slot-clock muted"></span></div>' +
        '<div class="vgrid"></div>' +
        '<div class="lanes-row"><span class="muted small">parallel lanes</span><div class="lanes"></div></div>' +
        '<div class="queue-slot"></div>' +
        '<div class="dial-slot2"></div>' +
        '<div class="restart-panel"></div>' +
        '<div class="stake-slot"></div>';
      st.slotNum = P.main.querySelector(".slot-num"); st.slotStatus = P.main.querySelector(".slot-status"); st.slotClock = P.main.querySelector(".slot-clock");
      st.grid = P.main.querySelector(".vgrid"); st.lanes = P.main.querySelector(".lanes");
      var gh = ""; for (var i = 0; i < 24; i++) gh += '<i class="vn on"></i>'; st.grid.innerHTML = gh;
      var lh = ""; for (var j = 0; j < 8; j++) lh += '<i class="lane"></i>'; st.lanes.innerHTML = lh;
      st.queue = UI.meter("Forwarder queue · memory (grows unbounded)"); P.main.querySelector(".queue-slot").appendChild(st.queue.el);
      st.dial = UI.slider("Transaction load", 0, 100, 1, function (v) { onDial(v); });
      P.main.querySelector(".dial-slot2").appendChild(st.dial.el);
      st.rpanel = P.main.querySelector(".restart-panel");
      st.rpanel.innerHTML = '<div class="rp-row"><button class="btn-hud b-selslot" type="button">Select last optimistically-confirmed slot</button><span class="sel-slot muted"></span></div>' +
        '<div class="rp-row"><button class="btn-hud b-snap" type="button" disabled>Create hard-fork snapshot</button></div>' +
        '<div class="flag-readout muted">restart slot is agreed OFF-chain (Solana Tech Discord) — not on-chain.</div>';
      st.bSel = st.rpanel.querySelector(".b-selslot"); st.bSnap = st.rpanel.querySelector(".b-snap"); st.selSlot = st.rpanel.querySelector(".sel-slot"); st.flags = st.rpanel.querySelector(".flag-readout");
      st.stakeWrap = P.main.querySelector(".stake-slot");
      st.stakeWrap.innerHTML = '<div class="stake-bar"><i class="stake-fill"></i><span class="stake-line"></span><span class="stake-val">0%</span></div>' +
        '<div class="rp-row"><button class="btn-hud b-online" type="button">Bring a validator cluster online ▸</button><span class="muted small">block production needs ~80% of active stake back in gossip</span></div>';
      st.stakeFill = st.stakeWrap.querySelector(".stake-fill"); st.stakeVal = st.stakeWrap.querySelector(".stake-val"); st.bOnline = st.stakeWrap.querySelector(".b-online");

      function renderSlot() {
        st.slotNum.textContent = "SLOT " + st.slot.toLocaleString();
        st.slotStatus.textContent = st.halted ? (st.running ? "● RESUMED" : "■ NETWORK HALTED") : "● RUNNING";
        st.slotStatus.className = "slot-status " + (st.halted && !st.running ? "bad" : "ok");
        st.slotClock.textContent = (st.halted && !st.running) ? "no block confirmed · ~17h offline" : "";
      }
      function setGrid(on) { var ns = st.grid.querySelectorAll(".vn"); for (var k = 0; k < ns.length; k++) ns[k].className = "vn" + (k < on ? " on" : " red"); }
      function onDial(v) { st.dial.setVal(Math.round(v * 3200).toLocaleString() + " tx/s"); st.queue.set(v, v > 85 ? "FULL · won’t drain" : Math.round(v) + "%", v > 70 ? "bad" : (v > 35 ? "warn" : "")); }
      st.renderSlot = renderSlot; st.setGrid = setGrid; st.onDial = onDial;
      st.bSel.addEventListener("click", function () { st.slotSel = true; st.selSlot.textContent = "✓ slot " + st.slot.toLocaleString(); st.bSnap.disabled = false; });
      st.bSnap.addEventListener("click", function () { if (!st.slotSel) return; st.flags.innerHTML = "$ agave-ledger-tool create-snapshot " + st.slot.toLocaleString() + " --hard-fork " + st.slot.toLocaleString() + "<br>each validator reboots: --wait-for-supermajority · --expected-bank-hash · --hard-fork<br><b>staged — but still frozen until ~80% of stake returns</b>"; ctx.speak("Snapshot staged; the chain is still frozen until a supermajority returns"); });
      st.bOnline.addEventListener("click", function () {
        var levels = [25, 50, 70, 79, 92, 100];
        st.stake = levels[Math.min(st.lvl, levels.length - 1)]; st.lvl++;
        st.stakeFill.style.width = st.stake + "%"; st.stakeVal.textContent = Math.round(st.stake) + "%";
        st.stakeFill.className = "stake-fill" + (st.stake >= 80 ? " ok" : "");
        setGrid(Math.round(st.stake / 100 * 24));
        if (st.stake >= 80 && !st.running) { st.running = true; renderSlot(); ctx.speak("Crossed ~80% of stake — block production resumes"); }
        else if (st.stake < 80) { ctx.speak(Math.round(st.stake) + "% of stake — still below the ~80% threshold; nothing moves"); }
      });
      st.startTick = function () { if (st.timer) return; st.timer = setInterval(function () { if (st.running) st.slot += 2; renderSlot(); }, 350); };
      st.slots = { slotbar: P.main.querySelector(".slotbar"), grid: st.grid, lanes: P.main.querySelector(".lanes-row"), queue: P.main.querySelector(".queue-slot"), dial: P.main.querySelector(".dial-slot2"), rpanel: st.rpanel, stake: st.stakeWrap };
      st.mShow = function (names) { for (var n in st.slots) st.slots[n].style.display = names.indexOf(n) >= 0 ? "" : "none"; };
      onDial(8); renderSlot(); st.startTick();
    },
    steps: [
      { head: "A normal day on Solana", body: "Validators hum along: the forwarder queue stays near-empty, transactions run in parallel across many lanes, and the slot counter ticks up. Grab the <strong>Transaction Load</strong> dial — it’s at normal.", hint: "Nudge the <strong>Transaction Load</strong> dial — the queue still drains and the slot keeps ticking.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.running = true; s.halted = false; s.setGrid(24); s.lanes.classList.remove("collapsed"); s.dial.set(8); s.renderSlot(); s.mShow(["slotbar", "grid", "lanes", "queue", "dial"]); } },
      { head: "Sept 14, 2021: the Grape IDO bots arrive", body: "Grape Protocol’s IDO launches on Raydium and bots open fire. Crank the dial toward the real peak — some validators saw <strong>over 300,000 tx/s</strong>, more than 1 Gbps of raw traffic. (No funds were ever at risk; this was an overload, not a breach.)", hint: "Drag the dial up to the bot-flood peak.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.running = true; s.halted = false; s.lanes.classList.remove("collapsed"); s.renderSlot(); s.mShow(["slotbar", "grid", "lanes", "queue", "dial"]); } },
      { head: "18 accounts lock, parallel execution dies", body: "The way the bot transactions are structured ends up <strong>write-locking 18 key accounts</strong> — including the global SPL Token program. With those locked, transactions can’t run side-by-side anymore; everything funnels into one lane.", hint: "Hold the dial high — watch the parallel lanes collapse to one.", enter: function (ctx) { var s = ctx.state; s.P.show(true); if (s.dial.value() < 60) s.dial.set(95); s.lanes.classList.add("collapsed"); s.mShow(["slotbar", "grid", "lanes", "queue", "dial"]); } },
      { head: "The network halts", body: "Validators exhaust memory and crash; producers spew competing forks; nodes can’t agree on the chain’s state. The slot counter stops dead — and stays down for <strong>~17 hours</strong>. The catch: <strong>there is no “on” switch</strong>. The restart slot isn’t decided on-chain.", hint: "Watch the validators flip red and the slot counter freeze.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.running = false; s.halted = true; s.dial.set(100); s.setGrid(0); s.renderSlot(); s.mShow(["slotbar", "grid", "lanes", "queue"]); } },
      { head: "Agree on a slot, hard-fork from it", body: "Operators jump into the Solana Tech Discord and agree on the last optimistically-confirmed slot — then each builds a snapshot that <strong>hard-forks</strong> at that exact slot. No confirmed balances are reversed; no funds were lost.", hint: "Select the slot, then <strong>Create hard-fork snapshot</strong>.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.mShow(["slotbar", "rpanel"]); } },
      { head: "Rally ~80% of stake, or nothing moves", body: "Reboot validators cluster by cluster and watch the stake meter climb. The chain stays <strong>dead</strong> until ~80% of active stake is back in gossip agreeing on the same slot and bank hash. It took <strong>1,000+ validators</strong> to do this for real.", hint: "Tap <strong>Bring a validator cluster online</strong> until you cross the ~80% line.", enter: function (ctx) {
          var s = ctx.state; s.P.show(true); s.mShow(["slotbar", "grid", "stake"]);
          if (!s.crossedDone) { s.stake = 0; s.lvl = 0; s.stakeFill.style.width = "0%"; s.stakeFill.className = "stake-fill"; s.stakeVal.textContent = "0%"; s.running = false; s.setGrid(0); s.renderSlot(); }
          s.bClose = function () { };
          s.afterCross = true;
        } },
      { head: "A halt is a bug; a restart is people", body: "Solana didn’t reboot itself. Over a thousand operators had to agree on one slot and bring ~80% of the stake back online together. The 2021 reboot also added rate limits on transaction forwarding to blunt the next storm.", hint: "Open the sources, or replay from step 1.", enter: function (ctx) {
          var s = ctx.state; s.P.show(false);
          s.P.closing.innerHTML =
            '<p class="sim-closing-lead">A halt is a software bug; a restart is <strong>human coordination</strong>. No single party can flip Solana back on — the restart slot is agreed off-chain, and blocks only flow once ~80% of stake returns together. <span class="sim-muted">This is the Sept 14, 2021 Grape-IDO bot flood (a resource-exhaustion overload — no funds lost), not the Sept 2022 duplicate-block outage.</span></p>' +
            '<div class="sim-figrow"><span class="sim-fig">~300k<small>tx/s on some validators</small></span><span class="sim-fig">~17h<small>offline</small></span><span class="sim-fig">~80%<small>stake to restart</small></span></div>' +
            sourcesFor("restart", [{ label: "Anza docs — restarting a Solana cluster", url: "https://docs.anza.xyz/operations/guides/restart-cluster" }, { label: "Helius — a complete history of Solana outages", url: "https://www.helius.dev/blog/solana-outages-complete-history" }]) +
            '<p class="sim-note">Historical reference. ~80% and ~300k tx/s are approximate; the restart is operator consensus, not a unilateral switch.</p>';
        } }
    ]
  });

  // ---- helper for walkthrough sims: build named slots + mShow ----
  function slotShell(P, names) {
    P.main.innerHTML = names.map(function (n) { return '<div class="wt-slot slot-' + n + '"></div>'; }).join("");
    var slots = {}; names.forEach(function (n) { slots[n] = P.main.querySelector(".slot-" + n); });
    return { slots: slots, show: function (vis) { for (var k in slots) slots[k].style.display = vis.indexOf(k) >= 0 ? "" : "none"; } };
  }

  // ================= WALKTHROUGH: raydium — Liquidity Vortex (AMM) =================
  register("raydium", {
    accent: "#14f195",
    mount: function (stage, ctx) {
      var st = ctx.state, P = panels(stage); st.P = P;
      var BASE_X = 1000, BASE_Y = 100000; // SOL / USDC, mid-price 100 at any depth
      var sh = slotShell(P, ["depth", "reserves", "curve", "swap", "stats", "book", "mig"]); st.sh = sh;
      st.depth = UI.slider("Pool depth · how much liquidity is in the pool", 1, 10, 1, function () { recompute(); });
      sh.slots.depth.appendChild(st.depth.el);
      st.solBar = UI.meter("Pool reserve · SOL"); st.usdBar = UI.meter("Pool reserve · USDC");
      sh.slots.reserves.appendChild(st.solBar.el); sh.slots.reserves.appendChild(st.usdBar.el);
      st.curveWrap = el("div", "amm-curve"); sh.slots.curve.appendChild(st.curveWrap);
      st.kStat = UI.stat("invariant  k = SOL × USDC"); st.pxStat = UI.stat("price (USDC per SOL)"); st.slipStat = UI.stat("slippage on your swap");
      sh.slots.stats.appendChild(st.kStat.el); sh.slots.stats.appendChild(st.pxStat.el); sh.slots.stats.appendChild(st.slipStat.el);
      st.swap = UI.slider("Your swap · SOL sold into the pool", 0, 600, 5, function () { recompute(); });
      sh.slots.swap.appendChild(st.swap.el);
      st.bookTgl = UI.toggle("Mirror pool liquidity onto the Serum order book", function (on) { renderBook(on); });
      sh.slots.book.appendChild(st.bookTgl.el);
      st.bookPanel = el("div", "book-panel"); sh.slots.book.appendChild(st.bookPanel);
      sh.slots.mig.innerHTML = '<div class="mig-flow"><span class="mig-node">Raydium pool</span><span class="mig-arrow">→</span><span class="mig-node bad" id="mig-serum">Serum ✕ (FTX keys)</span><span class="mig-arrow">→</span><span class="mig-node ok" id="mig-ob">OpenBook ✓</span></div><button class="btn-hud b-migrate" type="button">Re-route order-book leg</button><div class="mig-cap muted"></div>';
      st.bMig = sh.slots.mig.querySelector(".b-migrate"); st.migCap = sh.slots.mig.querySelector(".mig-cap");

      function fmt(n) { return Math.round(n).toLocaleString(); }
      function dims() { var d = st.depth.value(); return { d: d, X0: BASE_X * d, Y0: BASE_Y * d, K: BASE_X * d * BASE_Y * d }; }
      function drawCurve(D, inSol) {
        var K = D.K, X0 = D.X0, Y0 = D.Y0, xMax = X0 * 2.4, yMax = Y0 * 2.4;
        function sx(x) { return (x / xMax * 100).toFixed(2); }
        function sy(y) { return (64 - y / yMax * 64).toFixed(2); }
        var pts = [], i, x; for (i = 0; i <= 48; i++) { x = X0 * 0.32 + (xMax - X0 * 0.32) * i / 48; pts.push(sx(x) + "," + sy(K / x)); }
        var xR = X0 + inSol, yR = K / xR;
        st.curveWrap.innerHTML = '<svg viewBox="0 0 100 64" class="amm-svg" aria-hidden="true">'
          + '<path class="amm-path" d="M ' + pts.join(" L ") + '"/>'
          + '<line class="amm-guide" x1="' + sx(xR) + '" y1="' + sy(yR) + '" x2="' + sx(xR) + '" y2="64"/>'
          + '<line class="amm-guide" x1="0" y1="' + sy(yR) + '" x2="' + sx(xR) + '" y2="' + sy(yR) + '"/>'
          + '<circle class="amm-dot" cx="' + sx(xR) + '" cy="' + sy(yR) + '" r="2.6"/></svg>'
          + '<div class="amm-axes"><span>SOL reserve →</span><span>your marker slides into the steep zone</span></div>';
      }
      function recompute() {
        var D = dims(), inSol = st.swap.value();
        var x = D.X0 + inSol, y = D.K / x, out = D.Y0 - y, px = inSol > 0 ? out / inSol : D.Y0 / D.X0, slip = (100 - px) / 100 * 100;
        st.depth.setVal("×" + D.d + " deep"); st.swap.setVal(inSol + " SOL");
        st.solBar.set(x / (D.X0 * 2) * 100, fmt(x) + " SOL", inSol > 0 ? "warn" : "");
        st.usdBar.set(y / D.Y0 * 100, fmt(y) + " USDC", "");
        st.kStat.set(fmt(D.K)); st.pxStat.set("$" + px.toFixed(2)); st.slipStat.set(inSol > 0 ? "−" + slip.toFixed(1) + "%" : "—", slip > 8 ? "bad" : (inSol > 0 ? "warn" : ""));
        drawCurve(D, inSol);
      }
      function renderBook(on) { st.bookPanel.innerHTML = on ? '<div class="book-cols"><div class="bcol bid">bids<br>$99.8 · $99.5 · $99.1</div><div class="bcol ask">asks<br>$100.2 · $100.5 · $100.9</div></div><div class="muted small">the pool’s curve is posted AS limit orders — order-book traders fill against the same depth.</div>' : '<div class="muted small">toggle on to see the pool mirrored as order-book depth.</div>'; }
      st.recompute = recompute; st.renderBook = renderBook;
      st.bMig.addEventListener("click", function () { var s = sh.slots.mig.querySelector("#mig-serum"); s.textContent = "Serum ✕ (deprecated)"; sh.slots.mig.querySelector("#mig-ob").classList.add("live"); st.migCap.textContent = "After FTX’s collapse compromised Serum’s upgrade keys, the community forked it into OpenBook (Nov 2022) and Raydium re-pointed here (~Dec 14, 2022). Later AMM versions run mainly as standalone pools."; ctx.speak("Order-book leg re-routed from Serum to OpenBook"); });
      recompute(); renderBook(false);
    },
    steps: [
      { head: "A pool, not a counterparty", body: "Raydium launched in Feb 2021 as one of Solana’s earliest big AMMs. There’s no buyer on the other side — just a <strong>pool</strong> holding two reserves (SOL and USDC). A fixed formula sets the price from the ratio: <strong>k = SOL × USDC</strong> stays constant.", hint: "Drag <strong>pool depth</strong> up — a deeper pool means a bigger k and <strong>less slippage</strong> on the same swap.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["depth", "reserves", "stats"]); if (s.swap.value() === 0) s.swap.set(200); s.recompute(); } },
      { head: "Swap, and the price slides along a curve", body: "Sell SOL into the pool and USDC comes out — but each unit moves the ratio, so the price <strong>slides</strong> along the constant-product curve <strong>x·y=k</strong>. Your marker travels down the curve into the steep part: bigger swap vs. pool depth = worse price. <strong>That steepening IS slippage</strong> — no order book required.", hint: "Drag your swap up — watch the marker slide into the steep zone, and slippage climb.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["curve", "swap", "stats"]); s.recompute(); } },
      { head: "The hybrid twist: mirror onto the order book", body: "Raydium’s original design was hybrid: it also posted the pool’s liquidity <strong>as limit orders</strong> onto Serum, Solana’s central order book — so order-book traders could fill against the same pool depth.", hint: "Toggle the order-book mirror on and off.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["swap", "book"]); } },
      { head: "After FTX: re-route to OpenBook", body: "When FTX collapsed it compromised Serum’s upgrade keys. The community forked Serum into <strong>OpenBook</strong>, and Raydium re-pointed its order-book leg there. (Later Raydium versions run mainly as standalone pools.)", hint: "Press <strong>Re-route order-book leg</strong>.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["mig"]); } },
      { head: "Why it worked here", body: "Raydium was early proof that Solana’s low fees and fast finality could support real on-chain market-making — and it became one of the most integrated liquidity venues in the ecosystem.", hint: "Open the sources, or replay.", enter: function (ctx) { var s = ctx.state; s.P.show(false); s.P.closing.innerHTML = '<p class="sim-closing-lead">No counterparty, no order book required — just two reserves and a constant-product formula. <span class="sim-muted">Slippage/price figures here are an illustrative toy model, not live quotes.</span></p>' + sourcesFor("raydium", []) + '<p class="sim-note">Constant-product (x·y=k) is a general AMM mechanism Raydium implemented, not invented.</p>'; } }
    ]
  });

  // ================= WALKTHROUGH: jup_port — Aggregator Starport (routing) =================
  register("jup_port", {
    accent: "#46c7ec",
    mount: function (stage, ctx) {
      var st = ctx.state, P = panels(stage); st.P = P;
      var sh = slotShell(P, ["intent", "single", "split", "cmp"]); st.sh = sh;
      var PX = 100, VEN = [{ n: "Venue A", d: 1.2e6 }, { n: "Venue B", d: 0.5e6 }, { n: "Venue C", d: 0.3e6 }];
      function impact(a, d) { var r = a / d; return Math.min(0.6, r * 0.5 + r * r * 0.6); } // convex depth curve
      function alloc(w, sz) { var s = (w[0] + w[1] + w[2]) || 1; return [sz * w[0] / s, sz * w[1] / s, sz * w[2] / s]; }
      function outFor(a) { var o = 0; for (var i = 0; i < 3; i++) o += a[i] / PX * (1 - impact(a[i], VEN[i].d)); return o; }
      function optimal(sz) { var best = [100, 0, 0], bo = -1; for (var a = 0; a <= 100; a += 5) for (var b = 0; a + b <= 100; b += 5) { var o = outFor(alloc([a, b, 100 - a - b], sz)); if (o > bo) { bo = o; best = [a, b, 100 - a - b]; } } return { w: best, o: bo }; }
      st.size = UI.slider("Swap size (USDC → SOL)", 1000, 200000, 1000, function () { recompute(); });
      sh.slots.intent.appendChild(st.size.el);
      st.singleOut = UI.stat("Output · whole order in one venue"); st.singleImp = UI.meter("Price impact · one venue");
      sh.slots.single.appendChild(st.singleOut.el); sh.slots.single.appendChild(st.singleImp.el);
      st.w = [40, 30, 30]; st.wSliders = []; // step-aligned, sums to 100, deliberately suboptimal so "Let Jupiter route it" visibly beats it
      VEN.forEach(function (v, i) { var s = UI.slider("Route to " + v.n, 0, 100, 5, function () { st.w[i] = st.wSliders[i].value(); recompute(); }); st.wSliders.push(s); sh.slots.split.appendChild(s.el); });
      st.yourOut = UI.stat("Your hand-routed output");
      st.optBtn = el("button", "btn-hud b-opt", "Let Jupiter route it ▸"); st.optBtn.type = "button";
      sh.slots.split.appendChild(st.yourOut.el); sh.slots.split.appendChild(st.optBtn);
      st.cmp = el("div", "cmp-row muted"); sh.slots.cmp.appendChild(st.cmp);
      function recompute() {
        var sz = st.size.value(); st.size.setVal("$" + sz.toLocaleString());
        for (var i = 0; i < 3; i++) st.wSliders[i].setVal(st.w[i] + "%");
        var sImp = impact(sz, VEN[0].d), sOut = sz / PX * (1 - sImp);
        st.singleOut.set(sOut.toFixed(1) + " SOL", "bad"); st.singleImp.set(sImp / 0.6 * 100, "−" + (sImp * 100).toFixed(1) + "%", sImp > 0.15 ? "bad" : "warn");
        var yOut = outFor(alloc(st.w, sz));
        st.yourOut.set(yOut.toFixed(1) + " SOL " + (yOut > sOut ? "(beats one venue)" : "(worse than one venue)"), yOut > sOut ? "ok" : "warn");
      }
      st.optBtn.addEventListener("click", function () {
        var sz = st.size.value(), opt = optimal(sz);
        st.w = opt.w.slice(); for (var i = 0; i < 3; i++) st.wSliders[i].set(st.w[i]); recompute();
        var sImp = impact(sz, VEN[0].d), sOut = sz / PX * (1 - sImp), better = (opt.o / sOut - 1) * 100;
        st.cmp.innerHTML = 'Jupiter’s split → <b class="ok">' + opt.o.toFixed(1) + ' SOL</b> (A ' + opt.w[0] + '% · B ' + opt.w[1] + '% · C ' + opt.w[2] + '%) — <b class="ok">~' + better.toFixed(1) + '% better</b> than one venue, in one signature. Note the best split <b>shifts with size</b>. <span class="small">(illustrative)</span>';
        ctx.speak("Jupiter found the optimal split, about " + better.toFixed(0) + " percent better than a single venue");
      });
      st.recompute = recompute; for (var qi = 0; qi < 3; qi++) st.wSliders[qi].set(st.w[qi]); recompute();
    },
    steps: [
      { head: "You just want the best price", body: "Jupiter grew into Solana’s default swap <strong>aggregator</strong> — most major wallets embed it. You set an amount; it finds the best execution. Set a swap size to begin.", hint: "Drag the swap size — bigger sizes are where routing matters.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["intent"]); } },
      { head: "One venue is never the whole picture", body: "Any single pool has limited depth — push a big order through one place and the price impact climbs. The bigger your order, the more it costs you on one venue.", hint: "See the output and price impact for a single venue.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["intent", "single"]); s.recompute(); } },
      { head: "Now YOU try to route it by hand", body: "Splitting across venues can beat any single pool — but the <strong>right</strong> split is hard to guess, and it changes with order size. Drag the three route sliders and try to beat one venue yourself. (Each venue has different depth.)", hint: "Drag the three <strong>route</strong> sliders — try to beat the single-venue output by hand.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["intent", "split"]); s.recompute(); } },
      { head: "Let Jupiter do it — one tap, optimal split", body: "The aggregator quotes every venue at once and solves the split for you, filling in parallel and reassembling into one transaction. Press it — the optimal allocation usually beats your hand-route, and the <strong>weights shift</strong> as the order grows.", hint: "Press <strong>Let Jupiter route it</strong> — compare it to your hand-route and to one venue.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["single", "split", "cmp"]); s.recompute(); } },
      { head: "Why this is a landmark", body: "Jupiter stands for infrastructure that vanishes into the user experience: routes, quotes, and liquidity access that just work. (Exact venue counts and market share are dynamic — not fixed facts.)", hint: "Open the sources, or replay.", enter: function (ctx) { var s = ctx.state; s.P.show(false); s.P.closing.innerHTML = '<p class="sim-closing-lead">The “best price” was never one magic pool — your order was quietly split across venues and reassembled, and you never had to know. <span class="sim-muted">Split shapes and savings here are illustrative, not live quotes.</span></p>' + sourcesFor("jup_port", []) + '<p class="sim-note">Aggregator market share is dynamic; this documents the role, not a permanent ranking.</p>'; } }
    ]
  });

  // ================= WALKTHROUGH: helium — Migration Gate (DePIN onto Solana) =================
  register("helium", {
    accent: "#9b6bff",
    mount: function (stage, ctx) {
      var st = ctx.state, P = panels(stage); st.P = P;
      var sh = slotShell(P, ["tower", "move", "oracle", "live"]); st.sh = sh;
      sh.slots.tower.innerHTML = '<div class="tower-diagram"><div class="tower">📡 Helium · real wireless network</div><div class="slab" id="hslab">on its own Layer-1 blockchain</div></div>';
      st.slab = sh.slots.tower.querySelector("#hslab");
      st.moveTgl = UI.toggle("HIP-70 · deprecate the L1, move onto Solana", function (on) { st.slab.textContent = on ? "settling on Solana" : "on its own Layer-1 blockchain"; st.slab.classList.toggle("moved", on); });
      sh.slots.move.appendChild(st.moveTgl.el);
      st.load = UI.slider("Network activity · coverage + data-transfer checks", 0, 100, 1, function () { recompute(); });
      st.onchainTgl = UI.toggle("Instead, settle every check ON-CHAIN (the naive way)", function () { recompute(); });
      st.oracleWork = UI.meter("Off-chain oracle work · PoC + Data-Transfer");
      st.settle = UI.meter("On-chain settlement load · Solana");
      st.oracleNote = el("div", "muted small");
      sh.slots.oracle.appendChild(st.load.el); sh.slots.oracle.appendChild(st.onchainTgl.el); sh.slots.oracle.appendChild(st.oracleWork.el); sh.slots.oracle.appendChild(st.settle.el); sh.slots.oracle.appendChild(st.oracleNote);
      sh.slots.live.innerHTML = '<button class="btn-hud b-live" type="button">Go live · April 18, 2023</button><div class="live-badge muted"></div>';
      st.bLive = sh.slots.live.querySelector(".b-live"); st.liveBadge = sh.slots.live.querySelector(".live-badge");
      function recompute() {
        var v = st.load.value(), onchain = st.onchainTgl.checked();
        st.load.setVal(Math.round(v) + "% activity");
        st.oracleWork.set(v, Math.round(v) + "% · absorbed off-chain", v > 60 ? "warn" : "");
        if (onchain) {
          st.settle.set(v, Math.round(v) + "% · scales with activity", v > 55 ? "bad" : "warn");
          st.oracleNote.innerHTML = '<b>If</b> every coverage/data-transfer check settled on-chain, load would climb 1:1 with activity — the naive design that <b>would not scale</b>. HIP-70 deliberately did <b>not</b> do this.';
        } else {
          var s = 4 + v * 0.05;
          st.settle.set(s, Math.round(s) + "% · stays low", "");
          st.oracleNote.innerHTML = 'Proof-of-Coverage &amp; Data-Transfer are computed <b>off-chain by oracles</b>; only results post to Solana — so on-chain load stays low <b>even as activity maxes out</b>.';
        }
      }
      st.recompute = recompute;
      st.bLive.addEventListener("click", function () { st.liveBadge.innerHTML = "● LIVE on Solana — one of the largest DePIN networks to abandon a bespoke chain"; st.liveBadge.classList.add("ok"); ctx.speak("Helium migration went live on Solana, April 18 2023"); });
      recompute();
    },
    steps: [
      { head: "A real wireless network, on its own chain", body: "Helium is a decentralized wireless network (DePIN) — thousands of physical hotspots providing real-world coverage. Originally it ran on its <strong>own Layer-1 blockchain</strong>.", hint: "This is the starting setup.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["tower"]); } },
      { head: "HIP-70: deprecate the L1, move onto Solana", body: "The community approved <strong>HIP-70</strong> (“Scaling the Helium Network”): retire Helium’s own chain and migrate its tokens, governance, and operations onto Solana. The radios and hardware don’t change — only where things settle.", hint: "Toggle the migration on.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["tower", "move"]); } },
      { head: "The hard part: accounting goes off-chain to oracles", body: "Crunching every coverage check and data-transfer record on-chain wouldn’t scale. So HIP-70 moved <strong>Proof-of-Coverage and Data-Transfer accounting to oracles</strong> — they compute off-chain and post results; Solana just settles outcomes. <strong>Max out activity</strong>: the raw work climbs, but on-chain load barely moves — until you force it back on-chain.", hint: "Max out activity: off-chain maxes but on-chain stays flat. Now flip <strong>settle on-chain</strong> to break it — watch on-chain shoot up to match.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["move", "oracle"]); s.recompute(); } },
      { head: "Go-live: April 18, 2023", body: "After community approval, the migration went live on April 18, 2023 (a ~24-hour cutover) — one of the largest DePIN networks to abandon a bespoke chain for Solana.", hint: "Press <strong>Go live</strong>.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["live"]); } },
      { head: "Why it matters", body: "It validated Solana as <strong>settlement infrastructure for real-world physical networks</strong> — helping establish the DePIN category there.", hint: "Open the sources, or replay.", enter: function (ctx) { var s = ctx.state; s.P.show(false); s.P.closing.innerHTML = '<p class="sim-closing-lead">Solana didn’t run the radios — it became the <strong>settlement layer</strong> under a live, real-world physical network.</p>' + sourcesFor("helium", [{ label: "HIP-70 spec (GitHub)", url: "https://github.com/helium/HIP/blob/main/0070-scaling-helium.md" }]) + '<p class="sim-note">“DePIN” is a retroactive label; go-live was a ~24-hour cutover beginning Apr 18, 2023.</p>'; } }
    ]
  });

  // ================= WALKTHROUGH: pumpfun — Degen Launchpad (token creation) =================
  register("pumpfun", {
    accent: "#14f195",
    mount: function (stage, ctx) {
      var st = ctx.state, P = panels(stage); st.P = P;
      var sh = slotShell(P, ["before", "form", "deploy", "risk"]); st.sh = sh;
      // --- the old way: four real gates you must clear one by one ---
      st.gates = [
        { k: "write a contract", why: "learn Rust, write & test a token program" },
        { k: "fund liquidity", why: "put up real capital to seed a market" },
        { k: "deploy + verify", why: "deploy on-chain, verify, wire up a pool" },
        { k: "list it", why: "get it in front of buyers — indexers, sites" }
      ];
      st.cleared = 0; st.deployed = false;
      var gateWrap = el("div", "pipe-old");
      st.gates.forEach(function (g, i) { var b = el("button", "pgate", g.k); b.type = "button"; b.setAttribute("data-i", i); gateWrap.appendChild(b); });
      st.friction = UI.meter("Friction to launch (the old way)");
      st.gateCap = el("div", "muted small", "Tap each gate to clear it — the old way was gate after gate.");
      sh.slots.before.appendChild(gateWrap); sh.slots.before.appendChild(st.friction.el); sh.slots.before.appendChild(st.gateCap);
      function nextBtn() { return document.querySelector(".sim-modal .breach-next"); }
      function syncGate() {
        st.friction.set(st.cleared / 4 * 100, st.cleared + " / 4 gates", st.cleared >= 4 ? "bad" : "warn");
        if (st.cleared >= 4) st.gateCap.innerHTML = '<span class="warn">All four cleared — skill, money, gatekeepers — <b>and you still haven’t launched.</b></span>';
        var nb = nextBtn(); if (nb && !st.deployed) nb.disabled = st.cleared < 4;
      }
      st.syncGate = syncGate;
      gateWrap.addEventListener("click", function (e) { var b = e.target.closest(".pgate"); if (!b || b.disabled) return; var i = +b.getAttribute("data-i"); b.disabled = true; b.className = "pgate done"; b.innerHTML = st.gates[i].k + ' <span class="small">✓ ' + st.gates[i].why + '</span>'; st.cleared++; syncGate(); ctx.speak("Gate cleared: " + st.gates[i].k); });
      // --- the new way: a name and one tap ---
      sh.slots.form.innerHTML = '<div class="mock-form"><span class="mf-tag">MOCK · illustrative</span><input class="mf-name" placeholder="token name (e.g. Catdog)" /><input class="mf-tick" placeholder="ticker (e.g. CATDOG)" maxlength="10" /><div class="mf-img">🖼 image</div></div>';
      st.mfName = sh.slots.form.querySelector(".mf-name"); st.mfTick = sh.slots.form.querySelector(".mf-tick");
      st.formCap = el("div", "muted small", "That’s basically the whole form."); sh.slots.form.appendChild(st.formCap);
      st.mfName.addEventListener("input", function () { var ok = st.mfName.value.trim().length > 0; st.formCap.innerHTML = ok ? '<span class="ok">✓ that’s it — ready to launch.</span>' : "That’s basically the whole form."; if (ok && !st.mfTick.value) st.mfTick.value = st.mfName.value.replace(/[^a-z0-9]/gi, "").slice(0, 10).toUpperCase(); });
      sh.slots.deploy.innerHTML = '<button class="btn-hud b-deploy" type="button">DEPLOY (mock) ▸ one tap</button><div class="deploy-stat muted"></div>';
      st.bDeploy = sh.slots.deploy.querySelector(".b-deploy"); st.deployStat = sh.slots.deploy.querySelector(".deploy-stat");
      st.bDeploy.addEventListener("click", function () {
        st.deployed = true;
        st.friction.set(4, "one tap", "");
        st.gateCap.innerHTML = '<span class="ok">…or skip all four. One tap just did what the four gates used to.</span>';
        var nm = (st.mfName.value.trim() || "Catdog").replace(/</g, "");
        st.deployStat.innerHTML = '<b class="ok">deployed “' + nm + '”.</b> gates: <b>4 → 1 tap</b> · skill: <b>required → none</b> · barrier: <b>high → near-zero</b> <span class="small">(illustrative/relative, not exact figures)</span>';
        var nb = nextBtn(); if (nb) nb.disabled = false;
        ctx.speak("Token deployed in one tap — the four gates collapsed to one");
      });
      st.riskTgl = UI.toggle("Risk lens", function (on) { st.riskNote.style.display = on ? "" : "none"; });
      st.riskNote = el("div", "risk-note", "Same frictionlessness cuts both ways: near-zero cost + permissionless launch also means rampant speculation, rugs, and real legal/regulatory scrutiny. This landmark documents the mechanic neutrally — it’s history, not endorsement or investment advice.");
      st.riskNote.style.display = "none";
      sh.slots.risk.appendChild(st.riskTgl.el); sh.slots.risk.appendChild(st.riskNote);
      st.friction.set(0, "0 / 4 gates", "warn");
    },
    steps: [
      { head: "Before: launching a token was a project", body: "Pre-Pump.fun, minting a tradable token took coding, liquidity, and know-how — <strong>gate after gate</strong>. Most people simply couldn’t. Clear all four to feel the grind — you can’t move on until you do.", hint: "Tap each gate, one by one, to clear it.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["before"]); s.syncGate(); } },
      { head: "The new way: name it, picture it", body: "Pump.fun (launched ~Jan 2024) made creation fast, permissionless, and nearly free. The “form” is basically a <strong>name and an image</strong>. <span class=\"muted\">(This is a mock — nothing is created.)</span>", hint: "Type a playful name — the ticker fills itself.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["form"]); var nb = document.querySelector(".sim-modal .breach-next"); if (nb) nb.disabled = false; } },
      { head: "One tap: deploy", body: "Those four gates you cleared? Watch the whole friction bar <strong>collapse in a single tap</strong>. That compression — skill, money, gatekeepers → one button — is why Solana’s meme floodgates never closed again.", hint: "Press <strong>DEPLOY</strong> and watch the friction bar drop.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["before", "form", "deploy"]); var nb = document.querySelector(".sim-modal .breach-next"); if (nb) nb.disabled = (s.deployed !== true); } },
      { head: "Same machine, second consequence", body: "That frictionlessness is the whole story — for better and worse. Flip the risk lens to see the other side of the same mechanic.", hint: "Toggle the <strong>Risk lens</strong>.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["risk"]); var nb = document.querySelector(".sim-modal .breach-next"); if (nb) nb.disabled = false; } },
      { head: "A culture & product moment — treated neutrally", body: "Pump.fun turned meme-coin launches into a constant, high-volume cultural activity on Solana. We document it as history, with the risks named — not as a recommendation.", hint: "Open the sources, or replay.", enter: function (ctx) { var s = ctx.state; s.P.show(false); s.P.closing.innerHTML = '<p class="sim-closing-lead">Launching a token went from a technical project to <strong>filling in a name and hitting one button</strong> — that frictionlessness is exactly why it mattered, and exactly why it’s risky.</p>' + sourcesFor("pumpfun", [{ label: "Wikipedia — Pump.fun (overview, dates, legal)", url: "https://en.wikipedia.org/wiki/Pump.fun" }]) + '<p class="sim-note">Historical/culture reference, not investment advice. The “30 seconds” is illustrative; the product has ongoing legal/regulatory exposure.</p>'; } }
    ]
  });

  // ================= WALKTHROUGH: backpack — Bearproof Bastion (Mad Lads mint) =================
  register("backpack", {
    accent: "#46c7ec",
    unmount: function (ctx) { var s = ctx.state; if (s.crowd) { clearInterval(s.crowd); s.crowd = null; } if (s.hi) { clearInterval(s.hi); s.hi = null; } },
    mount: function (stage, ctx) {
      var st = ctx.state, P = panels(stage); st.P = P;
      var sh = slotShell(P, ["mood", "xnft", "load", "fix"]); st.sh = sh;
      st.mood = UI.slider("Market mood", 0, 100, 1, function (v) { st.mood.setVal(v < 50 ? "deep bear ❄" : "bull"); st.moodCap.textContent = v < 50 ? "It’s the coldest part of the crypto winter — most teams stopped shipping." : "warmer markets"; });
      st.moodCap = el("div", "muted small"); sh.slots.mood.appendChild(st.mood.el); sh.slots.mood.appendChild(st.moodCap);
      st.xnft = UI.toggle("Show xNFT (executable) vs static NFT", function (on) { st.xnftCard.innerHTML = on ? '<div class="xn ok"><b>xNFT</b> — an <b>executable</b> NFT: code that runs <b>inside the wallet</b> itself (a mini-app).</div>' : '<div class="xn"><b>static NFT</b> — just an image + metadata.</div>'; });
      st.xnftCard = el("div", "xnft-card"); sh.slots.xnft.appendChild(st.xnft.el); sh.slots.xnft.appendChild(st.xnftCard);
      // --- mint day: HOLD to claim; you + the whole crowd overload the RPC nodes ---
      st.load = 0; st.claim = "idle";
      sh.slots.load.innerHTML = '<button class="btn-hud b-claim" type="button">HOLD to CLAIM your Mad Lad (press &amp; hold) ▸</button>';
      st.bClaim = sh.slots.load.querySelector(".b-claim");
      st.rpc = UI.meter("RPC node load · you + the whole crowd"); st.yourClaim = UI.stat("Your claim"); st.nodeA = UI.stat("RPC node A"); st.nodeB = UI.stat("RPC node B");
      sh.slots.load.appendChild(st.rpc.el); sh.slots.load.appendChild(st.yourClaim.el);
      var ns = el("div", "node-row"); ns.appendChild(st.nodeA.el); ns.appendChild(st.nodeB.el); sh.slots.load.appendChild(ns);
      sh.slots.fix.innerHTML = '<button class="btn-hud b-day" type="button">Pause &amp; delay the mint by 1 day ▸</button><div class="day-note muted"></div>';
      st.bDay = sh.slots.fix.querySelector(".b-day"); st.dayNote = sh.slots.fix.querySelector(".day-note");
      function paint() {
        var v = st.load, down = v >= 82;
        st.rpc.set(v, v >= 98 ? "GRIDLOCK" : Math.round(v) + "%", v > 70 ? "bad" : (v > 40 ? "warn" : ""));
        st.nodeA.set(down ? "DOWN" : "ok", down ? "bad" : "ok"); st.nodeB.set(down ? "DOWN" : "ok", down ? "bad" : "ok");
        if (st.claim === "minted") st.yourClaim.set("MINTED ✓ — you’re a Mad Lad", "ok");
        else if (down) { st.claim = "failed"; st.yourClaim.set("failed · timeout", "bad"); }
        else if (st.claim === "trying") st.yourClaim.set("trying…", "warn");
        else st.yourClaim.set("—", "");
      }
      st.paint = paint;
      function hold(on) {
        if (st.claim === "minted") return;
        if (on) {
          st.claim = "trying";
          // once you join, the whole crowd keeps piling on — load climbs to failure even if you let go (no dead-end)
          if (!st.crowd) st.crowd = setInterval(function () { st.load = Math.min(100, st.load + 2.2); paint(); if (st.load >= 100 || st.claim === "minted") { clearInterval(st.crowd); st.crowd = null; } }, 130);
          st.hi = setInterval(function () { st.load = Math.min(100, st.load + 6); paint(); }, 90);
        } else { clearInterval(st.hi); st.hi = null; paint(); }
      }
      st.bClaim.addEventListener("pointerdown", function (e) { e.preventDefault(); hold(true); });
      ["pointerup", "pointerleave", "touchend"].forEach(function (ev) { st.bClaim.addEventListener(ev, function () { hold(false); }); });
      st.bDay.addEventListener("click", function () { clearInterval(st.hi); st.hi = null; clearInterval(st.crowd); st.crowd = null; st.load = 15; st.claim = "minted"; st.bClaim.disabled = true; paint(); st.dayNote.innerHTML = '<span class="ok">recovered — and your claim went through.</span> Mad Lads delayed one day, then minted; Backpack grew into a wallet + exchange.'; ctx.speak("Mint delayed one day; RPC recovered and your claim minted"); });
      st.xnftCard.innerHTML = '<div class="xn"><b>static NFT</b> — just an image + metadata.</div>'; paint();
    },
    steps: [
      { head: "Winter on Solana", body: "April 2023 — deep in the bear market, right after FTX gutted Solana’s reputation. Most teams had gone quiet. The Backpack team shipped anyway.", hint: "Drag the market mood to the frozen bottom.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["mood"]); s.mood.set(15); } },
      { head: "What’s an xNFT?", body: "On Apr 21, 2023 the Backpack team minted <strong>Mad Lads</strong> — a 10,000-piece collection claimable only through Backpack, and the first high-profile <strong>xNFT</strong>: an “executable” NFT whose code runs inside the wallet itself.", hint: "Toggle static NFT vs xNFT.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["xnft"]); } },
      { head: "Mint day: demand becomes a load test", body: "Demand was so intense it caused a denial-of-service-like load. <strong>Press and HOLD to claim</strong> — you and the whole crowd pile onto the same RPC nodes until they buckle and <strong>your own claim times out</strong>. (Two Solana RPC nodes and the project’s UI actually went down.)", hint: "Press and HOLD the claim button — watch the nodes go DOWN and your claim fail.", enter: function (ctx) { var s = ctx.state; clearInterval(s.hi); s.hi = null; clearInterval(s.crowd); s.crowd = null; s.P.show(true); s.sh.show(["load"]); s.load = 0; s.claim = "idle"; s.bClaim.disabled = false; s.paint(); } },
      { head: "Pause, fix, ship", body: "The team paused and delayed the mint by a day, then completed it — and your blocked claim finally went through. A defining bear-market product moment, and a real stress test of Solana’s RPC infrastructure.", hint: "Press to delay one day — and watch your claim finally mint.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["load", "fix"]); } },
      { head: "Why this keep still stands", body: "Mad Lads showed a polished product + a novel primitive could capture mainstream attention even in a deep bear — and stress-tested Solana’s RPC under real demand.", hint: "Open the sources, or replay.", enter: function (ctx) { var s = ctx.state; s.P.show(false); s.P.closing.innerHTML = '<p class="sim-closing-lead">Shipping a polished product with a novel primitive in the depth of winter generated demand so real it <strong>knocked out two RPC nodes</strong> and forced a one-day delay.</p>' + sourcesFor("backpack", []) + '<p class="sim-note">Historical reference; load values here are illustrative.</p>'; } }
    ]
  });

  // ================= WALKTHROUGH: firedancer — Two Engines, One Network =================
  register("firedancer", {
    accent: "#14f195",
    mount: function (stage, ctx) {
      var st = ctx.state, P = panels(stage); st.P = P;
      var sh = slotShell(P, ["diag", "stat", "ctrl", "evo"]); st.sh = sh;
      // Two clients, each carrying an illustrative SHARE OF STAKE. alive = online.
      st.engines = [{ name: "Agave", alive: true }, { name: "Firedancer", alive: true, exists: false }];
      st.diag = el("div", "engine-diag"); sh.slots.diag.appendChild(st.diag);
      st.finStat = UI.stat("Network finalizing blocks?"); sh.slots.stat.appendChild(st.finStat.el);
      st.riskNote = el("div", "muted small"); sh.slots.stat.appendChild(st.riskNote);
      st.share = UI.slider("Share of stake running Firedancer", 0, 100, 1, function () { render(); });
      st.ctrl = el("div", "engine-ctrl", '<span class="muted small">Click a client above to simulate a bug taking it offline.</span>');
      sh.slots.ctrl.appendChild(st.share.el); sh.slots.ctrl.appendChild(st.ctrl);
      st.evo = UI.slider("Firedancer maturity", 0, 1, 1, function (v) { renderEvo(v); });
      st.evoNote = el("div", "muted small"); sh.slots.evo.appendChild(st.evo.el); sh.slots.evo.appendChild(st.evoNote);
      var SUPER = 67; // ~two-thirds supermajority — standard BFT pedagogy shown illustratively
      function shares() { var fdExists = st.engines[1].exists !== false; var fd = fdExists ? st.share.value() : 0; return { fdExists: fdExists, fd: fd, ag: 100 - fd }; }
      function onlineStake() { var s = shares(), o = 0; if (st.engines[0].alive) o += s.ag; if (s.fdExists && st.engines[1].alive) o += s.fd; return o; }
      function render() {
        var s = shares();
        st.share.setVal("Firedancer " + Math.round(s.fd) + "% · Agave " + Math.round(s.ag) + "%");
        st.diag.innerHTML = st.engines.map(function (e, i) {
          if (e.exists === false) return '<div class="eng ghost">+ second client?</div>';
          var pct = Math.round(i === 1 ? s.fd : s.ag);
          return '<div class="eng ' + (e.alive ? "on" : "off") + '" data-i="' + i + '">' + e.name + ' · ' + pct + '% stake' + (e.alive ? "" : " · DOWN") + '</div>';
        }).join('<span class="eng-or">+</span>');
        var online = onlineStake(), fin = online >= SUPER;
        st.finStat.set(fin ? "YES · " + Math.round(online) + "% of stake online" : "NO — halted · only " + Math.round(online) + "% < ~⅔", fin ? "ok" : "bad");
        if (!s.fdExists) { st.riskNote.innerHTML = 'One client carries <b>100%</b> of stake — a bug here has nothing to fall back on.'; }
        else {
          var kAg = Math.round(s.fd), kFd = Math.round(s.ag);
          st.riskNote.innerHTML = 'Bug hits Agave → <b>' + kAg + '%</b> left → ' + (kAg >= SUPER ? '<span class="ok">survives</span>' : '<span class="bad">HALT</span>') +
            ' &nbsp;·&nbsp; Bug hits Firedancer → <b>' + kFd + '%</b> left → ' + (kFd >= SUPER ? '<span class="ok">survives</span>' : '<span class="bad">HALT</span>') +
            '. <span class="small">Finalizing needs ~⅔ of stake online.</span>';
        }
      }
      st.render = render;
      function renderEvo(v) { st.evoNote.innerHTML = v < 0.5 ? '<b>Frankendancer (from 2024):</b> Firedancer’s networking layer bolted onto Agave’s runtime — a hybrid, sharing lineage.' : '<b>Full Firedancer (Dec 2025):</b> an independent, clean-room client — first non-Agave-descended codebase to finalize mainnet blocks. Jump kept the rollout deliberately slow.'; }
      st.renderEvo = renderEvo;
      st.diag.addEventListener("click", function (e) { var c = e.target.closest(".eng"); if (!c || c.dataset.i == null) return; var i = +c.dataset.i; if (st.engines[i].exists === false) return; st.engines[i].alive = !st.engines[i].alive; render(); ctx.speak(onlineStake() >= SUPER ? "Still finalizing — enough stake is still online" : "Halted — online stake fell below ~two-thirds"); });
      st.share.set(10); renderEvo(1);
    },
    steps: [
      { head: "One client, one point of failure", body: "For years almost every Solana validator ran the <strong>same</strong> client (Agave) — one codebase carrying ~100% of stake. If every node speaks one dialect, a single bug can topple the whole network — the monoculture risk behind past outages.", hint: "Click Agave to simulate a bug — the whole network halts.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.engines[0].alive = true; s.engines[1].exists = false; s.render(); s.sh.show(["diag", "stat"]); } },
      { head: "A second dialect, written from scratch", body: "<strong>Firedancer</strong> is an independent client built from scratch by Jump Crypto — a clean-room reimplementation, not a fork of Agave. Jump rolled it out <em>deliberately slowly</em>, so at first only a small slice of stake ran it.", hint: "Two clients now — but look at the stake split.", enter: function (ctx) { var s = ctx.state; s.engines[0].alive = true; s.engines[1].exists = true; s.engines[1].alive = true; s.share.set(10); s.P.show(true); s.sh.show(["diag", "stat"]); } },
      { head: "Existence isn’t enough — stake is", body: "Here’s the counter-intuitive part: a second client <em>existing</em> proves nothing — what matters is how much <strong>stake</strong> runs it. Kill Agave now, at a ~10% Firedancer share, and the net still <strong>halts</strong> — the survivor is far below the ~⅔ a supermajority needs. Now drag Firedancer’s share up and kill Agave again. The network survives a client’s failure only when the <em>other</em> client holds ≥ ~⅔. (At 50/50, killing <em>either</em> one halts it — so the real goal is: no single client above ~⅓ of stake.)", hint: "Kill Agave, then drag Firedancer’s stake up until killing Agave is survivable.", enter: function (ctx) { var s = ctx.state; s.engines[0].alive = true; s.engines[1].exists = true; s.engines[1].alive = true; s.render(); s.P.show(true); s.sh.show(["diag", "stat", "ctrl"]); } },
      { head: "Frankendancer vs. the full client", body: "It shipped in stages: first <strong>Frankendancer</strong> (Firedancer’s networking on Agave’s runtime — a hybrid), then the <strong>full Firedancer</strong>, which first finalized mainnet blocks in <strong>December 2025</strong> — the first non-Agave-descended client to do so.", hint: "Slide from hybrid to the full client.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["evo"]); } },
      { head: "Why this matters", body: "Client diversity is only real insurance when <strong>stake is distributed</strong> so no single implementation sits above the liveness threshold — then a critical bug in one client need not halt the whole network.", hint: "Open the sources, or replay.", enter: function (ctx) { var s = ctx.state; s.P.show(false); s.P.closing.innerHTML = '<p class="sim-closing-lead">A second furnace beside the first only keeps the realm warm if it carries enough of the load — <strong>resilience is about the stake behind each client, not merely that two exist.</strong> <span class="sim-muted">Jump advised validators not to switch at scale until audits were complete; the rollout was deliberately cautious.</span></p>' + sourcesFor("firedancer", []) + '<p class="sim-note">The ~⅔ supermajority is standard BFT pedagogy shown illustratively; stake shares here are not live figures. Distinguish hybrid “Frankendancer” from the full Firedancer (first mainnet blocks Dec 2025).</p>'; } }
    ]
  });

  // ================= WALKTHROUGH: wen_temple — A Poem Becomes a Trillion Tokens =================
  register("wen_temple", {
    accent: "#9b6bff",
    mount: function (stage, ctx) {
      var st = ctx.state, P = panels(stage); st.P = P;
      var sh = slotShell(P, ["poem", "frac", "claim"]); st.sh = sh;
      sh.slots.poem.innerHTML = '<div class="poem-card"><span class="pc-tag">NFT · supply 1</span><div class="pc-title">“wen?” — a poem</div><div class="pc-auth muted">written by Meow · a Jupiter founder, for the community that endlessly asked “wen token?”</div></div>';
      st.frac = UI.slider("Fractionalize the single NFT", 0, 100, 1, function (v) { var n = Math.round(Math.pow(v / 100, 2) * 1e12); st.fracCount.textContent = n.toLocaleString() + " WEN"; st.fracBar.set(v, v > 0 ? Math.round(v) + "% minted" : "—", "gold"); });
      st.fracCount = el("div", "frac-count", "1 WEN"); st.fracBar = UI.meter("Supply minted from the poem-NFT");
      sh.slots.frac.appendChild(st.fracCount); sh.slots.frac.appendChild(st.frac.el); sh.slots.frac.appendChild(st.fracBar.el);
      st.claimBox = el("div", "claim-box", '<div class="claim-grid cg-run"></div><div class="row"><button class="btn-hud b-wen" type="button">Run the WEN airdrop ▸</button><button class="btn-hud b-jup" type="button" disabled>Re-run the same machinery for JUP ▸</button></div><div class="claim-cap muted small">WEN was the <b>first</b> token launched through Jupiter’s <b>LFG Launchpad</b> — press to distribute ~70% to the community.</div>');
      sh.slots.claim.appendChild(st.claimBox);
      st.cg = st.claimBox.querySelector(".claim-grid"); st.bWen = st.claimBox.querySelector(".b-wen"); st.bJup = st.claimBox.querySelector(".b-jup"); st.claimCap = st.claimBox.querySelector(".claim-cap");
      var CGH = ""; for (var ci = 0; ci < 60; ci++) CGH += '<i class="cw"></i>'; st.cg.innerHTML = CGH;
      function fillGrid(cls) { var cs = st.cg.querySelectorAll(".cw"), on = Math.round(cs.length * 0.70); for (var j = 0; j < cs.length; j++) cs[j].className = "cw" + (j < on ? " on" + (cls ? " " + cls : "") : ""); }
      st.bWen.addEventListener("click", function () { fillGrid(""); st.bWen.disabled = true; st.bJup.disabled = false; st.claimCap.innerHTML = '<b>~70%</b> of the one-trillion supply airdropped to <b>1M+</b> eligible wallets (past Jupiter users, Saga owners) on Jan 26, 2024 — a public <b>dry-run</b> of the launchpad.'; ctx.speak("WEN airdrop distributed to over a million wallets"); });
      st.bJup.addEventListener("click", function () { fillGrid("jup"); st.bJup.disabled = true; st.claimCap.innerHTML = 'Days later, the <b>same machinery</b> distributed <b>JUP</b> itself. WEN wasn’t only a meme — it was the <b>rehearsal</b> that proved Jupiter’s launchpad at scale.'; ctx.speak("The same distribution machinery then ran the JUP airdrop"); });
    },
    steps: [
      { head: "The question that wouldn’t stop", body: "“<strong>wen?</strong>” — the word the Solana community shouted a thousand times, asking when the next thing would ship. In early 2024 the answer finally became a real token.", hint: "This running joke is about to become a landmark.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["poem"]); } },
      { head: "One poem, one NFT", body: "WEN didn’t start as a token. It started as a <strong>poem</strong> — written for the community by Meow, a Jupiter founder — minted as a single NFT.", hint: "Read the poem-NFT (supply: 1).", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["poem"]); } },
      { head: "Fractionalize: 1 → 1,000,000,000,000", body: "That one NFT was <strong>fractionalized</strong> into a one-trillion-supply token. Drag to shatter the single stone into a trillion fragments.", hint: "Drag to fractionalize — watch the supply counter climb.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["frac"]); } },
      { head: "Claims open — and it doubles as a rehearsal", body: "On <strong>Jan 26, 2024</strong>, ~70% of supply was airdropped to over a million wallets — and WEN was the <strong>first</strong> token through Jupiter’s LFG Launchpad. Run the WEN airdrop, then re-run the <em>very same machinery</em> for JUP: WEN was the public <strong>dry-run</strong> for Jupiter’s own flagship drop.", hint: "Press <strong>Run the WEN airdrop</strong>, then <strong>Re-run for JUP</strong> — same machinery, days apart.", enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["claim"]); } },
      { head: "Why it’s a landmark", body: "WEN turned a piece of crypto vernacular into a documented culture moment — and demonstrated Jupiter’s launchpad mechanics at scale before its flagship token went live.", hint: "Open the sources, or replay.", enter: function (ctx) { var s = ctx.state; s.P.show(false); s.P.closing.innerHTML = '<p class="sim-closing-lead">The word the community shouted a thousand times didn’t just get answered with a token — the answer <strong>was a poem</strong>, minted as one NFT and split into a trillion.</p>' + sourcesFor("wen_temple", []) + '<p class="sim-note">Historical/culture reference, not investment. The poem’s author was Jupiter’s own founder, not an anonymous community member.</p>'; } }
    ]
  });

  // ================= DEEP-DIVE TIER: data-driven animated timeline + one hands-on beat =================
  function ddInteractive(spec) {
    var host = el("div", "dd-int");
    if (spec.kind === "reveal") {
      host.innerHTML = '<button class="btn-hud dd-btn" type="button">' + spec.label + '</button><div class="dd-reveal" hidden>' + spec.reveal + '</div>';
      var rb = host.querySelector(".dd-btn"), rv = host.querySelector(".dd-reveal");
      rb.addEventListener("click", function () { rv.hidden = false; rb.disabled = true; });
    } else if (spec.kind === "tapgrid") {
      host.innerHTML = '<button class="btn-hud dd-btn" type="button">' + spec.label + '</button><div class="claim-grid dd-grid"></div><div class="dd-cap muted small"></div>';
      var g = host.querySelector(".dd-grid"), gh = ""; for (var i = 0; i < 50; i++) gh += '<i class="cw"></i>'; g.innerHTML = gh;
      var tb = host.querySelector(".dd-btn"), tc = host.querySelector(".dd-cap");
      tb.addEventListener("click", function () { var cs = g.querySelectorAll(".cw"), on = Math.round(cs.length * (spec.pct || 0.5)); for (var j = 0; j < cs.length; j++) cs[j].className = "cw" + (j < on ? " on" : ""); tc.innerHTML = spec.caption; tb.disabled = true; });
    } else if (spec.kind === "slider") {
      var m = UI.meter(spec.meterLabel || "value"), cap = el("div", "dd-cap muted small");
      var sl = UI.slider(spec.label, spec.min || 0, spec.max || 100, spec.step || 1, function (v) { var r = spec.compute(v); m.set(r.pct, r.text, r.state); sl.setVal(r.sliderText || ""); cap.innerHTML = r.crossed ? spec.crossedCaption : ""; });
      host.appendChild(sl.el); host.appendChild(m.el); host.appendChild(cap);
      var r0 = spec.compute(spec.min || 0); m.set(r0.pct, r0.text, r0.state);
    } else if (spec.kind === "gauge") {
      host.innerHTML = '<button class="btn-hud dd-btn" type="button">' + spec.label + '</button>';
      var gm = UI.meter(spec.meterLabel || "load"), gn = el("div", "dd-cap muted small");
      host.appendChild(gm.el); host.appendChild(gn);
      var gb = host.querySelector(".dd-btn");
      var gPeak = spec.peak != null ? spec.peak : 88, gState = spec.peakState || "warn";
      gb.addEventListener("click", function () {
        gb.disabled = true; var p = 0;
        var iv = setInterval(function () { p += 12; if (p >= gPeak) { clearInterval(iv); gm.set(gPeak, spec.peakText || "strained, then eased", gState);
          if (spec.refund) { var q = gPeak; var iv2 = setInterval(function () { q -= 14; if (q <= 2) { clearInterval(iv2); gm.set(0, spec.refundText || "refunded → $0", ""); gn.innerHTML = spec.caption; } else gm.set(q, Math.round(q) + "% · refunding", ""); }, 120); }
          else gn.innerHTML = spec.caption;
        } else gm.set(p, Math.round(p) + "%", gState); }, 110);
      });
    } else if (spec.kind === "guess") {
      // commit a guess, THEN reveal whether it was right — no free spoiler
      host.innerHTML = '<div class="dd-q">' + spec.label + '</div><div class="dd-opts"></div><div class="dd-reveal" hidden>' + spec.reveal + '</div>';
      var gopts = host.querySelector(".dd-opts"), grev = host.querySelector(".dd-reveal");
      spec.options.forEach(function (o) { var b = el("button", "btn-hud dd-opt", o.t); b.type = "button"; b.setAttribute("data-c", o.correct ? "1" : "0"); gopts.appendChild(b); });
      gopts.addEventListener("click", function (e) { var b = e.target.closest(".dd-opt"); if (!b) return; var bs = gopts.querySelectorAll(".dd-opt"); for (var j = 0; j < bs.length; j++) { bs[j].disabled = true; if (bs[j].getAttribute("data-c") === "1") bs[j].classList.add("correct"); } if (b.getAttribute("data-c") !== "1") b.classList.add("wrong"); grev.hidden = false; });
    } else if (spec.kind === "tug") {
      // two opposing momentum meters + a crossover caption
      var tl = UI.meter(spec.leftLabel), tr = UI.meter(spec.rightLabel), tcap = el("div", "dd-cap muted small");
      var ts = UI.slider(spec.label, 0, 100, 1, function (v) { var r = spec.compute(v); tl.set(r.left, r.leftText, r.leftState); tr.set(r.right, r.rightText, r.rightState); ts.setVal(r.sliderText || ""); tcap.innerHTML = r.caption || ""; });
      host.appendChild(ts.el); host.appendChild(tl.el); host.appendChild(tr.el); host.appendChild(tcap);
      ts.set(spec.start != null ? spec.start : 0);
    } else if (spec.kind === "duel") {
      // one trigger -> two meters diverge: one spikes then eases, the other holds steady
      host.innerHTML = '<button class="btn-hud dd-btn" type="button">' + spec.label + '</button>';
      var dSpike = UI.meter(spec.spikeLabel), dSteady = UI.meter(spec.steadyLabel), dcap = el("div", "dd-cap muted small");
      host.appendChild(dSpike.el); host.appendChild(dSteady.el); host.appendChild(dcap);
      dSpike.set(6, "idle", ""); dSteady.set(100, spec.steadyText || "online", "ok");
      var db = host.querySelector(".dd-btn");
      db.addEventListener("click", function () { db.disabled = true; var p = 6, up = true; var iv = setInterval(function () { dSteady.set(100, spec.steadyText || "online · finalizing", "ok"); if (up) { p += 16; if (p >= 92) up = false; dSpike.set(Math.min(92, p), Math.round(Math.min(92, p)) + "% · straining", "bad"); } else { p -= 10; if (p <= 18) { clearInterval(iv); dSpike.set(18, "recovered", "warn"); dcap.innerHTML = spec.caption; } else dSpike.set(p, Math.round(p) + "% · easing", "warn"); } }, 120); });
    } else if (spec.kind === "fork") {
      // pick a path; each reveals its outcome, flagged as real history or counterfactual
      host.innerHTML = '<div class="dd-q">' + spec.label + '</div><div class="dd-opts"></div><div class="dd-reveal" hidden></div>';
      var fopts = host.querySelector(".dd-opts"), frev = host.querySelector(".dd-reveal");
      spec.options.forEach(function (o, oi) { var b = el("button", "btn-hud dd-opt", o.t); b.type = "button"; b.setAttribute("data-i", oi); fopts.appendChild(b); });
      fopts.addEventListener("click", function (e) { var b = e.target.closest(".dd-opt"); if (!b) return; var o = spec.options[+b.getAttribute("data-i")]; var bs = fopts.querySelectorAll(".dd-opt"); for (var j = 0; j < bs.length; j++) bs[j].disabled = true; b.classList.add(o.real ? "correct" : "wrong"); frev.hidden = false; frev.innerHTML = (o.real ? '<b class="ok">What actually happened:</b> ' : '<b class="warn">Counterfactual — not what happened:</b> ') + o.outcome; });
    }
    return host;
  }
  function deepDive(id, cfg) {
    register(id, {
      accent: cfg.accent || "#9b6bff",
      mount: function (stage, ctx) {
        var st = ctx.state, P = panels(stage); st.P = P;
        P.main.innerHTML = '<div class="dd-timeline"></div><div class="dd-visual"></div>';
        st.tl = P.main.querySelector(".dd-timeline"); st.vis = P.main.querySelector(".dd-visual");
        st.tl.innerHTML = cfg.beats.map(function (b, i) { return '<span class="dd-beat" data-i="' + i + '"><i>' + (b.date || "") + '</i>' + (b.tag || "") + '</span>'; }).join('<span class="dd-conn">→</span>');
        st.ivMap = {}; if (cfg.interactives) cfg.interactives.forEach(function (iv) { st.ivMap[iv.beat] = ddInteractive(iv); }); else if (cfg.interactive) st.iv = ddInteractive(cfg.interactive);
      },
      steps: cfg.beats.map(function (b, i) {
        var ivHint = ""; if (cfg.interactives) for (var z = 0; z < cfg.interactives.length; z++) if (cfg.interactives[z].beat === i) ivHint = cfg.interactives[z].hint || "Try it ↓";
        return {
          head: b.head, body: b.body,
          hint: cfg.interactives ? (ivHint || b.hint || "Step through the timeline →") : ((cfg.interactive && i === cfg.interactive.beat) ? (cfg.interactive.hint || "Try it ↓") : (b.hint || "Step through the timeline →")),
          enter: function (ctx) {
            var s = ctx.state; s.P.show(true);
            var bs = s.tl.querySelectorAll(".dd-beat"); for (var k = 0; k < bs.length; k++) bs[k].className = "dd-beat" + (k < i ? " done" : k === i ? " active" : "");
            if (cfg.interactives) { if (s.ivMap[i]) { s.vis.innerHTML = ""; s.vis.appendChild(s.ivMap[i]); } else s.vis.innerHTML = (typeof b.visual === "string" ? b.visual : ""); }
            else if (cfg.interactive && i >= cfg.interactive.beat) { s.vis.innerHTML = ""; s.vis.appendChild(s.iv); }
            else s.vis.innerHTML = (typeof b.visual === "string" ? b.visual : "");
          }
        };
      }).concat([{
        head: cfg.closeHead || "Why it’s on the map", body: cfg.why || "", hint: "Open the sources, or replay.",
        enter: function (ctx) {
          var s = ctx.state; s.P.show(false);
          s.P.closing.innerHTML = '<p class="sim-closing-lead">' + cfg.closingLead + '</p>' +
            (cfg.figures ? '<div class="sim-figrow">' + cfg.figures.map(function (f) { return '<span class="sim-fig">' + f.big + '<small>' + f.small + '</small></span>'; }).join("") + '</div>' : '') +
            sourcesFor(id, cfg.sourceExtras || []) +
            (cfg.note ? '<p class="sim-note">' + cfg.note + '</p>' : '');
        }
      }])
    });
  }

  // ================= WALKTHROUGH: ftx_crater — The Contagion Map =================
  register("ftx_crater", {
    accent: "#ff5066",
    mount: function (stage, ctx) {
      var st = ctx.state, P = panels(stage); st.P = P;
      var sh = slotShell(P, ["graph", "meters", "act", "cap"]); st.sh = sh;
      // dependency nodes hanging off FTX/Alameda (center). dep = the KIND of link.
      st.NODES = [
        { id: "serum", name: "Serum", sub: "central order book", x: 16, y: 20, dep: "keys", link: "program upgrade keys held by FTX", down: "FROZEN — upgrade key inaccessible", fixable: true },
        { id: "wrapped", name: "Sollet assets", sub: "wrapped BTC / ETH", x: 84, y: 20, dep: "custody", link: "collateral custodied through FTX", down: "STUCK — redemptions frozen" },
        { id: "mm", name: "Market makers", sub: "Alameda liquidity", x: 14, y: 66, dep: "mm", link: "much liquidity provided by Alameda", down: "ILLIQUID — spreads blow out" },
        { id: "found", name: "Solana Foundation", sub: "treasury", x: 86, y: 66, dep: "exposure", link: "held some assets on FTX (disclosed)", down: "DENTED — disclosed balance locked" },
        { id: "narr", name: "“exchange chain”", sub: "reputation by association", x: 50, y: 82, dep: "narrative", link: "narrative association only — no real dependency", down: "FEAR — confidence only, nothing on-chain broke", stylized: true }
      ];
      st.phase = "audit"; st.audited = {}; st.forked = false;
      var COLOR = { keys: "#ff5066", custody: "#ffab3d", mm: "#e0c65a", exposure: "#c98bff", narrative: "#6b7c93" };
      st.COLOR = COLOR;
      // ---- graph: SVG edges under absolutely-positioned node chips ----
      var g = el("div", "ftx-graph");
      var edges = st.NODES.map(function (n) { return '<line class="ftx-edge" data-id="' + n.id + '" x1="50" y1="46" x2="' + n.x + '" y2="' + n.y + '"/>'; }).join("");
      g.innerHTML = '<svg class="ftx-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + edges + '</svg>' +
        '<button class="ftx-core" type="button" disabled><b>FTX / Alameda</b><span>Nov 2022 · collapse</span></button>';
      st.NODES.forEach(function (n) {
        var b = el("button", "ftx-node dep-" + n.dep + (n.stylized ? " is-stylized" : ""), '<b>' + n.name + '</b><span class="fn-sub">' + n.sub + '</span><span class="fn-link"></span><span class="fn-state"></span>');
        b.type = "button"; b.style.left = n.x + "%"; b.style.top = n.y + "%";
        b.setAttribute("data-id", n.id);
        b.addEventListener("click", function () { auditNode(n); });
        g.appendChild(b); n.elBtn = b;
      });
      st.g = g; sh.slots.graph.appendChild(g);
      st.svg = g.querySelector(".ftx-edges");
      // ---- meters ----
      st.conf = UI.meter("Confidence · price / sentiment"); st.net = UI.meter("Network · blocks finalized");
      sh.slots.meters.appendChild(st.conf.el); sh.slots.meters.appendChild(st.net.el);
      st.conf.set(100, "steady", ""); st.net.set(100, "finalizing", "ok");
      // ---- action + caption ----
      st.cap = el("div", "ftx-cap muted"); sh.slots.cap.appendChild(st.cap);
      st.act = el("div", "ftx-act"); sh.slots.act.appendChild(st.act);

      function edgeEl(id) { return st.svg.querySelector('.ftx-edge[data-id="' + id + '"]'); }
      function auditNode(n) {
        if (st.phase !== "audit" || st.audited[n.id]) return;
        st.audited[n.id] = true;
        n.elBtn.classList.add("audited");
        n.elBtn.querySelector(".fn-link").textContent = n.link;
        var e = edgeEl(n.id); e.classList.add("shown"); e.style.stroke = COLOR[n.dep];
        var done = st.NODES.filter(function (x) { return st.audited[x.id]; }).length;
        ctx.speak("Audited: " + n.name + " — " + n.link);
        st.cap.innerHTML = done < st.NODES.length
          ? "Audited <b>" + done + " / " + st.NODES.length + "</b> links. Each edge is a <b>different kind</b> of dependency — keys, custody, liquidity, exposure, or just narrative."
          : "All links mapped. Notice the colors: only <b>one</b> is a hard technical dependency (Serum's upgrade keys). Now detonate FTX and watch what actually travels.";
        if (done === st.NODES.length && st.detonateBtn) st.detonateBtn.disabled = false;
      }
      st.auditNode = auditNode;
      st.edgeEl = edgeEl;
      st.paintContagion = function () {
        st.NODES.forEach(function (n) {
          n.elBtn.classList.add("down");
          n.elBtn.querySelector(".fn-state").textContent = n.down;
          var e = edgeEl(n.id); e.classList.add("shown", "hot"); e.style.stroke = COLOR[n.dep];
        });
        st.conf.set(9, "cratering", "bad");
        st.net.set(100, "still finalizing", "ok");
      };
      st.doFork = function () {
        var n = st.NODES[0]; // serum
        st.forked = true;
        n.elBtn.classList.remove("down"); n.elBtn.classList.add("forked");
        n.elBtn.querySelector("b").textContent = "OpenBook";
        n.elBtn.querySelector(".fn-sub").textContent = "community fork of Serum";
        n.elBtn.querySelector(".fn-state").textContent = "RELINKED — new keys, no FTX";
        var e = edgeEl("serum"); e.classList.remove("hot"); e.style.stroke = "#14f195";
        st.conf.set(24, "rebuilding", "warn");
      };
    },
    steps: [
      {
        head: "Map the blast radius", body: "When FTX and Alameda imploded in November 2022, SOL was the chain most tied to them. But “tied” meant different things. Click each node to <strong>audit its link</strong> to FTX — and see what kind of dependency it really was.",
        hint: "Click all five nodes to audit how each one actually depended on FTX.",
        enter: function (ctx) {
          var s = ctx.state; s.P.show(true); s.sh.show(["graph", "meters", "cap"]);
          s.phase = "audit";
          s.cap.innerHTML = "Five things people called “Solana's FTX exposure.” Audit each link — they are not the same kind.";
        }
      },
      {
        head: "Detonate — and watch what travels", body: "Contagion spreads along <strong>dependency edges</strong>, not through the blockchain. Custody freezes, liquidity dries up, keys lock — but a hard technical break only exists where FTX literally held the keys. Press detonate and watch the two meters.",
        hint: "Press DETONATE — confidence craters, the network keeps finalizing blocks.",
        enter: function (ctx) {
          var s = ctx.state; s.P.show(true); s.sh.show(["graph", "meters", "act", "cap"]);
          s.phase = "armed";
          s.act.innerHTML = "";
          var btn = el("button", "btn-hud ftx-detonate", "⚠ DETONATE FTX");
          btn.type = "button"; btn.disabled = Object.keys(s.audited).length < s.NODES.length;
          if (btn.disabled) s.cap.innerHTML = "Go back and audit all five links first — you can't read the blast radius without the map.";
          else s.cap.innerHTML = "Every link is mapped. Press detonate.";
          btn.addEventListener("click", function () {
            if (s.phase === "detonated") return;
            s.phase = "detonated";
            s.paintContagion(); btn.disabled = true;
            ctx.speak("FTX detonated. Confidence craters; the network keeps finalizing blocks.");
            s.cap.innerHTML = "Look at the meters. <b class=\"bad\">Confidence cratered.</b> But the <b class=\"ok\">network never stopped finalizing blocks</b> — the only hard on-chain break is Serum, the one place FTX held the upgrade keys. Everything else was custody, liquidity, or fear.";
          });
          s.act.appendChild(btn); s.detonateBtn = btn;
        }
      },
      {
        head: "The fix was social, not technical", body: "Serum couldn't be upgraded — its keys were with FTX. So the community did the one thing a permissionless chain lets you do: <strong>fork the program</strong> under fresh keys. Serum became <strong>OpenBook</strong> in about 48 hours, and the order-book liquidity that Raydium and others relied on came back.",
        hint: "Cut the compromised key and fork Serum into OpenBook.",
        enter: function (ctx) {
          var s = ctx.state; s.P.show(true); s.sh.show(["graph", "meters", "act", "cap"]);
          if (s.phase !== "detonated" && s.phase !== "forked") { s.paintContagion(); s.phase = "detonated"; }
          s.act.innerHTML = "";
          var btn = el("button", "btn-hud ftx-fork", "✂ CUT KEY & FORK → OpenBook");
          btn.type = "button"; if (s.forked) btn.disabled = true;
          btn.addEventListener("click", function () {
            if (s.forked) return;
            s.doFork(); btn.disabled = true;
            ctx.speak("Serum forked into OpenBook under community keys — the order book came back.");
            s.cap.innerHTML = "Serum → <b class=\"ok\">OpenBook</b>, forked under community keys in ~48h. Confidence stays scarred — that heals slowly — but the <b>infrastructure was recoverable because no one owned the chain itself.</b>";
          });
          s.act.appendChild(btn); s.forkBtn = btn;
          if (s.forked) s.cap.innerHTML = "Serum is now OpenBook — relinked under community keys.";
          else s.cap.innerHTML = "One node is still frozen: Serum. Its keys were FTX's. Fork it.";
        }
      },
      {
        head: "Why this keep still stands", body: "The FTX crater is the closest call on the whole map — and it teaches the most durable lesson: on a permissionless chain, <strong>contagion travels your dependency graph, not your blockchain</strong>. Custody, liquidity, and keys are the attack surface; the ledger itself kept producing blocks the entire time.",
        hint: "Open the sources, or replay.",
        enter: function (ctx) {
          var s = ctx.state; s.P.show(false);
          s.P.closing.innerHTML = '<p class="sim-closing-lead">The blast radius was a <strong>dependency graph</strong> — custody, liquidity, and one set of upgrade keys — not the blockchain. What cratered was <strong>confidence</strong>; the chain never stopped finalizing blocks, and the one hard break (Serum) was fixable by forking it into OpenBook.</p>' +
            '<div class="sim-figrow"><span class="sim-fig">Nov 2022<small>FTX / Alameda collapse</small></span><span class="sim-fig">~48h<small>Serum → OpenBook fork</small></span><span class="sim-fig">0<small>blocks the chain missed</small></span></div>' +
            sourcesFor("ftx_crater", [{ label: "openbook-dex — community fork of Serum (GitHub)", url: "https://github.com/openbook-dex/program" }]) +
            '<p class="sim-note">Confidence/price levels here are an illustrative model. The Foundation’s own FTX exposure is per its public disclosure; the “exchange chain” node is stylized to show a narrative-only link, not a technical one. The chain did not halt during the FTX collapse.</p>';
        }
      }
    ]
  });

  // ================= WALKTHROUGH: woof_city — Aggregation vs. Interface =================
  register("woof_city", {
    accent: "#d7c08a",
    unmount: function (ctx) { var s = ctx.state; if (s.crowd) { clearInterval(s.crowd); s.crowd = null; } if (s.drain) { clearInterval(s.drain); s.drain = null; } },
    mount: function (stage, ctx) {
      var st = ctx.state, P = panels(stage); st.P = P;
      var sh = slotShell(P, ["fork", "holders", "fund", "cap"]); st.sh = sh;
      st.choice = null; st.raised = 0; st.crowd = null; st.executed = false;
      // ---- Act 1: allocation fork ----
      st.forkWrap = el("div", "wc-fork");
      st.forkWrap.innerHTML =
        '<button class="wc-fork-btn cf" data-c="insiders" type="button"><b>Allocate ~50% to insiders</b><span>team, VCs, market makers</span></button>' +
        '<button class="wc-fork-btn" data-c="airdrop" type="button"><b>Airdrop ~50% to active participants</b><span>wallets already using Solana</span></button>';
      sh.slots.fork.appendChild(st.forkWrap);
      st.holderOverlap = UI.meter("Holders who already build / use Solana");
      st.holderVerdict = UI.stat("What the token becomes");
      sh.slots.holders.appendChild(st.holderOverlap.el); sh.slots.holders.appendChild(st.holderVerdict.el);
      [].forEach.call(st.forkWrap.querySelectorAll(".wc-fork-btn"), function (b) {
        b.addEventListener("click", function () {
          if (st.choice) return;
          st.choice = b.getAttribute("data-c");
          [].forEach.call(st.forkWrap.querySelectorAll(".wc-fork-btn"), function (x) { x.disabled = true; x.classList.toggle("chosen", x === b); });
          if (st.choice === "airdrop") {
            st.holderOverlap.set(88, "mostly the ecosystem", "ok");
            st.holderVerdict.set("morale + recognition for people already here", "ok");
            ctx.speak("Airdropped to active participants — the holders are the ecosystem itself.");
            st.cap.innerHTML = "This is what BONK did on Dec 25, 2022 (~half the supply, per BONK's own framing): a <b>grassroots morale boost</b> in the depths of the post-FTX bear. The token's holders <b>are</b> the people building — so it reads as recognition, not a sale.";
          } else {
            st.holderOverlap.set(16, "mostly disconnected", "bad");
            st.holderVerdict.set("just another coin (counterfactual)", "warn");
            ctx.speak("Counterfactual: insider allocation — holders disconnected from the ecosystem.");
            st.cap.innerHTML = "<b>Counterfactual.</b> Concentrate in insiders and the holders have little to do with the ecosystem — it's just another launch. BONK chose the other branch, and that's why it landed as a community morale event.";
          }
        });
      });
      // ---- Act 2: crowdfund gauge ----
      st.gauge = UI.meter("Raised toward the $690k Vegas Sphere goal");
      st.fundBtn = el("button", "btn-hud wc-pledge", "▲ PLEDGE — join the crowdfund");
      st.execBtn = el("button", "btn-hud wc-exec", "EXECUTE — put WIF on the Sphere");
      st.fundBtn.type = "button"; st.execBtn.type = "button"; st.execBtn.disabled = true; st.execBtn.style.display = "none";
      sh.slots.fund.appendChild(st.gauge.el); sh.slots.fund.appendChild(st.fundBtn); sh.slots.fund.appendChild(st.execBtn);
      st.gauge.set(0, "$0", "");
      function paintFund() {
        var pct = Math.min(100, st.raised / 690000 * 100);
        st.gauge.set(pct, "$" + Math.round(st.raised).toLocaleString(), pct >= 100 ? "warn" : "");
        if (st.raised >= 690000 && !st.executed) {
          st.fundBtn.disabled = true; st.fundBtn.textContent = "✓ $690k raised in under 4 days";
          st.execBtn.style.display = ""; st.execBtn.disabled = false;
          if (st.crowd) { clearInterval(st.crowd); st.crowd = null; }
          st.cap.innerHTML = "<b class=\"ok\">$690k in under four days.</b> The crowd aggregated the money effortlessly. Now press <b>EXECUTE</b> — turn the money into a meme on the Las Vegas Sphere.";
        }
      }
      st.fundBtn.addEventListener("click", function () {
        if (st.executed || st.raised >= 690000) return;
        st.raised = Math.min(690000, st.raised + 60000);
        if (!st.crowd) st.crowd = setInterval(function () { st.raised = Math.min(690000, st.raised + 47000); paintFund(); }, 220);
        paintFund();
      });
      st.execBtn.addEventListener("click", function () {
        if (st.executed) return;
        st.executed = true; st.execBtn.disabled = true;
        ctx.speak("No venue deal was ever secured. The money is refunded — the Sphere never ran.");
        // refund drain
        st.drain = setInterval(function () {
          st.raised = Math.max(0, st.raised - 90000);
          st.gauge.set(Math.min(100, st.raised / 690000 * 100), "$" + Math.round(st.raised).toLocaleString() + " · refunding", "bad");
          if (st.raised <= 0) { clearInterval(st.drain); st.drain = null; st.gauge.set(0, "refunded → $0 (Apr 2025)", "bad"); }
        }, 120);
        st.cap.innerHTML = "The display <b class=\"bad\">never ran.</b> Raising the money was easy; <b>signing a contract with the venue was not</b> — that needs a single accountable legal entity, which a meme crowd is not. Organizers never secured a deal and <b>refunded backers in April 2025.</b>";
      });
      st.paintFund = paintFund;
      st.cap = el("div", "ftx-cap muted"); sh.slots.cap.appendChild(st.cap);
    },
    steps: [
      {
        head: "Act I — who gets the tokens?", body: "Solana's dog-meme dynasty starts on Christmas Day 2022, weeks after FTX gutted the ecosystem's reputation. An anonymous community launches <strong>BONK</strong>. The first decision decides everything: where does the supply go?",
        hint: "Choose an allocation — insiders, or the people already using Solana.",
        enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["fork", "holders", "cap"]); s.cap.innerHTML = "A community's first real power is <b>distribution</b>. Pick a branch and see who ends up holding the token."; }
      },
      {
        head: "Aggregation, pointed at the right people", body: "BONK airdropped roughly half its supply to <strong>active Solana wallets</strong>, not insiders — “for the people, by the people.” Distributing to the ecosystem is the thing decentralized communities do best: they <strong>aggregate</strong> — attention, participation, and here, ownership — with no central organizer.",
        hint: "If you didn't already, pick the airdrop branch to see the difference.",
        enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["fork", "holders", "cap"]); if (!s.choice) s.cap.innerHTML = "Pick a branch above — then compare who holds the token."; }
      },
      {
        head: "Act II — the community tries to interface with the real world", body: "Fast-forward: <strong>dogwifhat (WIF)</strong>, a Shiba in a pink beanie, becomes one of the internet's most-shared images. In March 2024 its community sets out to put the meme on the <strong>Las Vegas Sphere</strong> and crowdfunds the cost. Press pledge and watch the crowd aggregate money.",
        hint: "Press PLEDGE — the crowd piles in and blows past $690k in under four days.",
        enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["fund", "cap"]); if (!s.executed && s.raised < 690000) s.cap.innerHTML = "Same superpower, bigger stage: can the crowd <b>aggregate</b> the money to buy a spot on the Sphere?"; s.paintFund(); }
      },
      {
        head: "Money raised. Now execute.", body: "The money came together almost instantly — aggregation is effortless. But putting a meme on the Sphere isn't a transfer; it's a <strong>contract with a single venue</strong>, which needs one accountable, signing legal entity. Press EXECUTE.",
        hint: "Press EXECUTE — and watch what a crowd can't do.",
        enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["fund", "cap"]); if (s.raised < 690000) { s.raised = 690000; s.paintFund(); } if (!s.executed) s.cap.innerHTML = "The $690k is sitting there. Press <b>EXECUTE</b> to turn it into a Sphere booking."; }
      },
      {
        head: "Why this keep still stands", body: "The Dog Dynasty Forge holds one lesson in two acts: a decentralized community's <strong>strongest</strong> muscle is <strong>aggregation</strong> — distributing tokens, pooling money, coordinating attention with no central boss. Its <strong>weakest</strong> is <strong>interfacing</strong> with a world that still requires a single signing entity. BONK aggregated ownership perfectly; the Sphere fund aggregated money perfectly and then hit the wall of a contract it couldn't sign.",
        hint: "Open the sources, or replay.",
        enter: function (ctx) {
          var s = ctx.state; s.P.show(false);
          s.P.closing.innerHTML = '<p class="sim-closing-lead">Same community, two outcomes: it can <strong>aggregate</strong> ownership and money in days, but it cannot <strong>interface</strong> with a venue that needs one accountable signer. BONK\'s broad airdrop became a template for grassroots distribution; the Sphere fund showed the ceiling.</p>' +
            '<div class="sim-figrow"><span class="sim-fig">~50%<small>BONK supply airdropped</small></span><span class="sim-fig">$690k<small>raised in &lt;4 days</small></span><span class="sim-fig">$0<small>Sphere ran → refunded Apr 2025</small></span></div>' +
            sourcesFor("woof_city", []) +
            '<p class="sim-note">“First Solana dog coin” and the ~50% airdrop figure are BONK\'s own framing. The Sphere display never ran; backers were refunded in April 2025. The insider-allocation branch is a counterfactual; holder-overlap percentages are an illustrative model. Documented as internet culture, not investment.</p>';
        }
      }
    ]
  });

  // ================= WALKTHROUGH: saga — The Negative-Price Phone =================
  register("saga", {
    accent: "#46c7ec",
    mount: function (stage, ctx) {
      var st = ctx.state, P = panels(stage); st.P = P;
      var PHONE = 599, BONK_PER = 30; // illustrative units: "30" = 30M BONK; bundle value = bonk * BONK_PER
      var sh = slotShell(P, ["demand", "price", "arb", "ledger", "cap"]); st.sh = sh;
      st.stock = 20; st.wallet = 0; st.flips = 0; st.bonk = 0; st.ebay = PHONE;
      // two kinds of demand
      st.specBar = UI.meter("Spec demand · “is it a good phone?”");
      st.arbBar = UI.meter("Arbitrage demand · “is the bundle > price?”");
      sh.slots.demand.appendChild(st.specBar.el); sh.slots.demand.appendChild(st.arbBar.el);
      st.specBar.set(8, "widely panned", "bad"); st.arbBar.set(0, "—", "");
      // BONK price slider drives bundle value
      st.bundleMeter = UI.meter("Bundled airdrop value · vs the $599 phone");
      st.price = UI.slider("BONK price (illustrative) →", 0, 100, 1, function (v) { recompute(v); });
      sh.slots.price.appendChild(st.price.el); sh.slots.price.appendChild(st.bundleMeter.el);
      // arbitrage loop button + inventory/wallet stats
      st.arbBtn = el("button", "btn-hud saga-arb", "① BUY phone −$599  ② CLAIM 30M BONK  ③ SELL");
      st.arbBtn.type = "button"; st.arbBtn.disabled = true;
      sh.slots.arb.appendChild(st.arbBtn);
      st.stockStat = UI.stat("Saga inventory"); st.walletStat = UI.stat("Your net profit, per flip"); st.ebayStat = UI.stat("Secondary (eBay) price");
      sh.slots.ledger.appendChild(st.stockStat.el); sh.slots.ledger.appendChild(st.walletStat.el); sh.slots.ledger.appendChild(st.ebayStat.el);
      st.cap = el("div", "ftx-cap muted"); sh.slots.cap.appendChild(st.cap);
      st.stockStat.set(st.stock + " units", ""); st.walletStat.set("$0", ""); st.ebayStat.set("$" + PHONE, "");

      function bundleVal(v) { return v * BONK_PER; } // illustrative $
      function recompute(v) {
        st.bonk = v;
        var bv = bundleVal(v), crossed = bv > PHONE;
        st.price.setVal("bundle ≈ $" + Math.round(bv));
        st.bundleMeter.set(Math.min(100, bv / (PHONE * 1.6) * 100), "$" + Math.round(bv), crossed ? "gold" : (bv > 300 ? "warn" : ""));
        st.arbBar.set(crossed ? Math.min(100, (bv - PHONE) / PHONE * 140 + 20) : 0, crossed ? "profit on every unit" : "underwater", crossed ? "ok" : "");
        st.arbBtn.disabled = !crossed || st.stock <= 0;
        if (st.stock <= 0) st.cap.innerHTML = "Inventory: <b>0</b>. Saga is <b class=\"ok\">sold out</b> — and the secondary price has floated up to meet the bundle. The phone's spec demand never moved; arbitrage demand cleared the shelves.";
        else if (crossed) st.cap.innerHTML = "Bundle ≈ <b>$" + Math.round(bv) + "</b> &gt; $" + PHONE + " phone. Every purchase now nets a profit — <b>run the loop</b> and watch inventory drain.";
        else st.cap.innerHTML = "Bundle ≈ <b>$" + Math.round(bv) + "</b>. Below the $" + PHONE + " price, buying is a loss — a rational buyer skips. Drag BONK higher.";
      }
      st.arbBtn.addEventListener("click", function () {
        var bv = bundleVal(st.bonk); if (bv <= PHONE || st.stock <= 0) return;
        st.stock--; st.flips++;
        var profit = Math.round(bv - PHONE);
        st.wallet = profit;
        st.stockStat.set(st.stock + " units", st.stock <= 3 ? "warn" : "");
        st.walletStat.set("+$" + profit, "ok");
        // secondary price floats up toward bundle value as arbitrage clears stock
        st.ebay = Math.round(PHONE + (bv - PHONE) * Math.min(1, (20 - st.stock) / 20));
        st.ebayStat.set("$" + st.ebay, "ok");
        ctx.speak("Flip " + st.flips + ": bought at $" + PHONE + ", bundle worth $" + Math.round(bv) + ", net +$" + profit + ". Inventory " + st.stock + ".");
        if (st.stock <= 0) { st.arbBtn.disabled = true; recompute(st.bonk); }
      });
      st.recompute = recompute;
      st.reset = function () { st.stock = 20; st.wallet = 0; st.flips = 0; st.ebay = PHONE; st.stockStat.set("20 units", ""); st.walletStat.set("$0", ""); st.ebayStat.set("$" + PHONE, ""); };
    },
    steps: [
      {
        head: "A phone almost nobody wanted", body: "On May 8, 2023 Solana Mobile shipped <strong>Saga</strong> — a flagship Android phone with a hardware Secure Element (Seed Vault) and a fee-free dApp Store. Launched near $1,000, cut to $599, it was <strong>widely panned</strong>. On the spec sheet alone, demand was flat.",
        hint: "Note the two demand meters — spec demand is the only one alive, and it's near zero.",
        enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["demand", "cap"]); s.cap.innerHTML = "Two completely different kinds of demand. Right now only <b>spec demand</b> exists — and it's flat."; }
      },
      {
        head: "The airdrop changes the arithmetic", body: "In December 2023 the BONK community airdropped <strong>30M BONK to every Saga</strong>. Now the phone comes with a bag of tokens. Drag BONK's price up and watch the bundle value cross the $599 line — the moment it does, the phone's <em>effective</em> price goes negative.",
        hint: "Drag BONK up until the bundled airdrop is worth more than the $599 phone.",
        enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["demand", "price", "cap"]); s.recompute(s.price.value()); }
      },
      {
        head: "Now YOU run the arbitrage", body: "When the bundle beats the price, buying isn't consumption — it's a trade. Press the loop: <strong>buy at $599 → claim the BONK → sell it</strong>, pocket the difference. Do it until the shelves are empty, and watch the secondary price float up to meet the bundle.",
        hint: "Set BONK high, then press the arbitrage loop until inventory hits zero.",
        enter: function (ctx) { var s = ctx.state; s.P.show(true); s.sh.show(["price", "arb", "ledger", "cap"]); if (s.price.value() < 25) s.price.set(30); s.recompute(s.price.value()); }
      },
      {
        head: "Chapter 2: buying the expectation", body: "The lesson wasn't lost on anyone. When <strong>Chapter 2</strong> was announced in January 2024, it drew <strong>over 30,000 preorders in ~30 hours</strong> — for a phone with no airdrop yet announced. People weren't buying specs, or even a known bundle. They were buying the <strong>expected value of the next airdrop</strong>.",
        hint: "Reveal what 30,000 preorders were really pricing.",
        enter: function (ctx) {
          var s = ctx.state; s.P.show(true); s.sh.show(["ledger", "cap"]);
          s.cap.innerHTML = "<b>30,000+ preorders in ~30 hours</b>, no airdrop announced. Demand had fully detached from the hardware — the phone became a <b>call option on the next drop</b>.";
        }
      },
      {
        head: "Why this keep still stands", body: "Saga was the first deeply crypto-native smartphone — but its real lesson is economic: <strong>token incentives, not specs, can make or break consumer hardware.</strong> When a product ships with a claimable asset, demand can switch species — from product demand (bounded by how good it is) to arbitrage demand (bounded only by the spread).",
        hint: "Open the sources, or replay.",
        enter: function (ctx) {
          var s = ctx.state; s.P.show(false);
          s.P.closing.innerHTML = '<p class="sim-closing-lead">The Saga didn\'t sell out because it got better — it sold out because it became a <strong>trade</strong>. The spec sheet lost to an airdrop; the second phone sold on the expectation of the next one.</p>' +
            '<div class="sim-figrow"><span class="sim-fig">$599<small>phone price (cut)</small></span><span class="sim-fig">30M BONK<small>airdropped per device</small></span><span class="sim-fig">30k+<small>Chapter 2 preorders, ~30h</small></span></div>' +
            sourcesFor("saga", [{ label: "TechCrunch — Chapter 2 preorder frenzy (Jan 2024)", url: "https://techcrunch.com/2024/01/18/solana-mobiles-second-phone-announcement-drives-buying-frenzy/" }]) +
            '<p class="sim-note">BONK price, bundle value, per-flip profit, inventory, and the secondary price here are an illustrative model of the arbitrage mechanism, not historical figures. The $599 price, 30M-BONK airdrop, the sell-out, and 30k+ Chapter 2 preorders are from the cited sources. Earlier phones (HTC Exodus, Sirin Finney) also had hardware key storage.</p>';
        }
      }
    ]
  });

  deepDive("myro", {
    accent: "#d7c08a",
    interactive: { beat: 1, kind: "guess", label: "Whose dog is Myro — really?", hint: "Commit a guess, then reveal.", options: [{ t: "A random meme dog, no real owner" }, { t: "Solana co-founder Raj Gokal’s actual pet", correct: true }, { t: "A purely fictional mascot" }], reveal: "It’s <b>Raj Gokal’s real dog</b> — a Solana co-founder’s pet. Community folklore, turned into a meme." },
    beats: [
      { date: "Nov 2023", tag: "launch", head: "Named after a co-founder’s dog", body: "Myro launched in November 2023, named after Solana co-founder Raj Gokal’s pet dog — riding Solana’s dog-mascot tradition." },
      { date: "community", tag: "folklore", head: "Folklore turned into a meme", body: "It built community tooling (like a Telegram bot surfacing trending projects); the direct tie to a co-founder’s real dog made it a recognizable thread in Solana’s dog-meme lineage." }
    ],
    why: "Solana’s meme culture often grows out of the community’s own folklore.",
    closingLead: "Insider references become shared cultural landmarks — Myro is a thread in Solana’s dog-meme lineage, tied directly to a co-founder’s real dog.",
    note: "Documented as community history. Tier-1 reporting on Myro is sparse, so specifics are kept minimal and neutral."
  });

  deepDive("gigachad", {
    accent: "#14f195",
    interactive: { beat: 1, kind: "slider", label: "Drag through the winter — watch who’s left", hint: "Drag <strong>all the way to the far end</strong> (the trough) — then watch who’s left.", meterLabel: "believers still holding", min: 0, max: 100, compute: function (v) { var left = Math.max(6, 100 - v * 0.85); return { pct: left, text: Math.round(left) + "% still holding", state: v >= 85 ? "gold" : (v > 50 ? "warn" : ""), sliderText: v < 30 ? "bull top" : (v < 70 ? "deep winter ❄" : "the trough"), crossed: v >= 85 }; }, crossedCaption: "The few still standing became the ‘diamond hands’ — the conviction GIGA turned into a totem. <span class='small'>(Illustrative: GIGA launched in 2024 and symbolizes this culture; it didn’t itself trade through the 2022–23 winter.)</span>" },
    beats: [
      { date: "2024", tag: "launch", head: "A totem of endurance", body: "GIGA launched in 2024, honoring Ernest Khalimov — the model behind the internet ‘Gigachad’ figure — as a community-organized project." },
      { date: "2024", tag: "culture", head: "The ‘Chad’ archetype", body: "It drew public endorsements (Khalimov, bodybuilder Mike O’Hearn, UFC’s Paulo Costa) and grew into a rallying point for conviction and endurance — shorthand for those who weathered the bear." }
    ],
    why: "GIGA became shorthand for the culture of endurance — staying the course through the bear.",
    closingLead: "More than a mascot, GIGA turned a stoic internet meme into a symbol of conviction and endurance.",
    note: "Culture/endurance landmark, documented neutrally — not investment advice. The survivor curve is illustrative; GIGA (2024) symbolizes the culture, it didn’t itself trade through the 2022–23 winter."
  });

  deepDive("jup_drop", {
    accent: "#46c7ec",
    interactive: { beat: 1, kind: "duel", label: "Fire the airdrop ▸", hint: "Fire it — watch which layer strains and which holds.", spikeLabel: "RPC / access layer", steadyLabel: "Consensus layer · block finalization", steadyText: "online · finalizing", caption: "The <b>RPC/access layer</b> strained for ~30–45 min — but the <b>consensus layer never stopped finalizing</b>. The layer that strained wasn’t the layer that mattered." },
    beats: [
      { date: "Jan 31, 2024", tag: "claims", head: "~$700M to nearly a million wallets", body: "Jupiter opened its first <strong>JUP airdrop</strong> — roughly $700M worth of tokens to nearly a million wallets that had routed swaps through it." },
      { date: "+30–45 min", tag: "the test", head: "The base layer held", body: "The consensus layer stayed online through the surge (RPC nodes struggled for the first 30–45 minutes). A stress test the base layer <strong>passed</strong> — signaling Solana had matured past its 2021–2022 outage era." },
      { date: "the plan", tag: "4 rounds", head: "Community-weighted by design", body: "Round one of four planned distributions, with half of JUP’s supply earmarked for the community." }
    ],
    why: "An airdrop that doubled as a maturity test — and the base layer passed.",
    closingLead: "A template for large, community-weighted launches — and a visible signal that Solana’s base layer had matured past its outage era.",
    figures: [{ big: "~$700M", small: "round-one value" }, { big: "~1M", small: "wallets" }],
    note: "‘$700M’ is a press-time valuation, not a fixed cash amount; JUP’s price moved intraday."
  });

  deepDive("mew_forest", {
    accent: "#14f195",
    interactive: { beat: 0, kind: "tapgrid", label: "Run MEW’s fair-launch airdrop ▸", hint: "Press <strong>Run the airdrop</strong> — watch it distribute to the community.", pct: 0.9, caption: "MEW launched as a <b>fair launch</b> — much of the supply airdropped to the community, no insider pre-sale. The ‘cat in a dog’s world’ pitch did the rest." },
    beats: [
      { date: "Mar 2024", tag: "fair launch", head: "A cat in a dog’s world", body: "<strong>MEW</strong> launched in late March 2024 via a fair launch (part of supply airdropped). Its premise was explicitly cultural: a cat staking a claim in a meme ecosystem long dominated by dog mascots." },
      { date: "2024", tag: "cat season", head: "Sparking ‘cat season’", body: "Its arrival is <strong>widely credited</strong> with sparking the wave crypto-natives nicknamed ‘cat season.’" }
    ],
    why: "MEW marked the moment cat-meme culture asserted itself as a distinct identity on Solana.",
    closingLead: "A simple cultural frame — ‘cat in a dog’s world’ — organized a large community around a shared in-joke.",
    note: "‘Cat season’ has no single authoritative origin; MEW is ‘widely credited,’ not the sole cause."
  });

  deepDive("shark_bay", {
    accent: "#46c7ec",
    interactive: { beat: 2, kind: "fork", label: "You’re the team. The IP holder objects. What do you do?", hint: "Pick a path — then see what actually happened.", options: [{ t: "Fight it in court", outcome: "a lawsuit would mean months of legal cost and uncertainty for a meme project built on someone else’s copyrighted photo.", real: false }, { t: "Negotiate a license", outcome: "the team secured official rights to the Nala Cat IP — a crypto lawyer helped ‘Pookie’ pro bono. <b>Licensing, not virality, is what kept Shark Cat alive.</b>", real: true }] },
    beats: [
      { date: "early 2024", tag: "the meme", head: "A cat in a shark suit", body: "Shark Cat was built on a <strong>copyrighted photo</strong> of Nala — a famous Instagram cat (owned by pseudonymous ‘Pookie’) — pictured in a shark costume, used without permission." },
      { date: "Apr 2024", tag: "dispute", head: "The claws come out", body: "A public dispute over IP rights played out in April 2024, including cease-and-desist notices." },
      { date: "~May 2024", tag: "license", head: "Settled with a license", body: "It resolved around May 2024 when the team secured an official <strong>license</strong> to the Nala Cat IP rather than going to court — a crypto lawyer assisting Pookie pro bono." }
    ],
    why: "Community projects built on real people’s pets carry genuine intellectual-property obligations.",
    closingLead: "An early case study in meme-culture IP: <strong>licensing, not just virality,</strong> is what kept Shark Cat alive.",
    note: "Exact license terms are private. Documented as a culture/IP episode, not investment."
  });

  deepDive("meow_sanctuary", {
    accent: "#9b6bff",
    interactive: { beat: 2, kind: "tug", label: "Drag the meme-share momentum: dogs ← → cats", hint: "Drag <strong>past the middle</strong> toward cats — watch it tip into ‘cat season’.", leftLabel: "Dog camp · the incumbents", rightLabel: "Cat camp · the challengers", start: 28, compute: function (v) { var cat = v, dog = 100 - v; return { left: dog, leftText: dog + "% momentum", leftState: dog > cat ? "warn" : "", right: cat, rightText: cat + "% momentum", rightState: cat > dog ? "gold" : "", sliderText: cat >= 50 ? "cats ahead" : "dogs ahead", caption: cat >= 50 ? "Cats pull ahead of the dog dynasty — the 2024 run crypto-natives nicknamed <b>‘cat season.’</b> (Popcat became the first cat coin past a $1B cap that July.)" : "" }; } },
    beats: [
      { date: "Dec 2023", tag: "Popcat", head: "Cats stake a claim", body: "<strong>Popcat</strong> — from the 2020 ‘Oatmeal’ cat-clicker meme — launched as a Solana token in December 2023, a deliberate counter to the dog-dominated meme scene." },
      { date: "Mar 2024", tag: "MEW", head: "‘Cat in a dog’s world’", body: "In March 2024, MEW launched with its narrative baked into its name — a lone cat surviving among dogs." },
      { date: "Jul 2024", tag: "$1B", head: "First cat coin to $1B", body: "In <strong>July 2024</strong>, Popcat became the first cat-themed meme coin to cross a $1B market cap; the cat-coin rally through 2024 became known as ‘cat season.’" }
    ],
    why: "Meme culture as identity and rivalry — dogs the incumbent dynasty, cats the scrappy challengers.",
    closingLead: "How online communities use humor, mascots, and us-vs-them stories to build belonging — cats vs. dogs, played out on-chain.",
    figures: [{ big: "Dec 2023", small: "Popcat launches" }, { big: "Jul 2024", small: "first cat coin to $1B" }],
    note: "The $1B milestone was a thin-market move; ‘cat season’ has no single authoritative origin."
  });
})();
