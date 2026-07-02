// THE TRUCE — the origin relic, rebuilt. meow-woof began as a cats-vs-dogs brawl;
// the war is over now, and the two mascots became co-keepers of the archive.
// A ~20s cooperative sync game: two neon lanes topped by the real cat keep and dog
// keep art. A mote drops down each lane toward a sync-gate; tap that side as it lands.
// Keep both keeps in sync and a bridge of light joins them. No quiz, no emoji.
// Self-contained (only optional dep: window.SHM for the end handoff).
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var CAT = { side: "cat", img: "assets/landmarks/meow_sanctuary.jpeg", name: "CAT KEEP", key: ["arrowleft", "a", "f"] };
  var DOG = { side: "dog", img: "assets/landmarks/woof_city.jpeg", name: "DOG KEEP", key: ["arrowright", "l", "j"] };
  var DURATION = 20;
  var GATE = 0.80;          // gate line as a fraction of lane height
  var W_PERFECT = 0.055;    // hit windows, in progress units (0..1 = top..gate)
  var W_GOOD = 0.135;
  var W_DRIFT = 1.16;       // past this, the mote has drifted (missed)

  var modal = null, els = {}, raf = 0, lastFocused = null;
  var running = false, lastTs = 0, timeLeft = DURATION, spawnAt = 0;
  var lanes = {}, harmony = 50, combo = 0, bestCombo = 0, syncs = 0, caught = 0, drifts = 0, ac = null;

  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

  // ---- tiny WebAudio blip (created on first user gesture; silent on any failure) ----
  function blip(freq, dur, gain) {
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      var o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
      o.type = "triangle"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain || 0.06, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.12));
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + (dur || 0.12) + 0.02);
    } catch (e) {}
  }

  function build() {
    if (modal) return;
    modal = el("div", "ksx-modal");
    modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true"); modal.setAttribute("aria-label", "The Truce — a game");
    modal.innerHTML =
      '<div class="ksx-backdrop" data-close></div>' +
      '<div class="ksx-dialog" role="document">' +
        '<button class="ksx-x" data-close type="button" aria-label="Close">×</button>' +
        // ---- start ----
        '<div class="ksx-screen ksx-start">' +
          '<div class="ksx-kicker">ORIGIN RELIC · MEOW / WOOF</div>' +
          '<h2 class="ksx-title">THE TRUCE</h2>' +
          '<p class="ksx-lore">The cats-vs-dogs war is over. Both mascots stayed on as <b>keepers</b> of the archive. Two keeps, one signal — tap each side the instant its mote reaches the <b>gate</b>. Keep them in sync.</p>' +
          '<div class="ksx-keeps">' +
            '<figure class="ksx-keep cat"><span class="kk-frame"><img alt="Cat keep" loading="lazy" src="' + CAT.img + '"></span><figcaption>CAT KEEP</figcaption></figure>' +
            '<span class="ksx-join" aria-hidden="true"></span>' +
            '<figure class="ksx-keep dog"><span class="kk-frame"><img alt="Dog keep" loading="lazy" src="' + DOG.img + '"></span><figcaption>DOG KEEP</figcaption></figure>' +
          '</div>' +
          '<button class="ksx-go" type="button">HOLD THE TRUCE · 20s</button>' +
          '<p class="ksx-controls">tap the left / right side · or use ← →</p>' +
        '</div>' +
        // ---- arena ----
        '<div class="ksx-screen ksx-arena" hidden>' +
          '<div class="ksx-hud">' +
            '<span class="ksx-harm">HARMONY <b>50%</b></span>' +
            '<span class="ksx-combo"></span>' +
            '<span class="ksx-time">20</span>' +
          '</div>' +
          '<div class="ksx-field">' +
            lane(CAT) +
            '<div class="ksx-bridge" aria-hidden="true"></div>' +
            lane(DOG) +
          '</div>' +
          '<p class="ksx-hint">tap a side the moment its mote crosses the gate line</p>' +
        '</div>' +
        // ---- over ----
        '<div class="ksx-screen ksx-over" hidden>' +
          '<div class="ksx-rank"></div>' +
          '<div class="ksx-stats"></div>' +
          '<p class="ksx-outro">That old brawl became this: two keeps, one archive.<br>Everything they now guard is on the map.</p>' +
          '<div class="ksx-overbtns">' +
            '<button class="ksx-again" type="button">↺ Again</button>' +
            '<button class="ksx-enter" type="button">Enter the archive →</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    els.start = modal.querySelector(".ksx-start");
    els.arena = modal.querySelector(".ksx-arena");
    els.over = modal.querySelector(".ksx-over");
    els.harm = modal.querySelector(".ksx-harm b");
    els.combo = modal.querySelector(".ksx-combo");
    els.time = modal.querySelector(".ksx-time");
    els.bridge = modal.querySelector(".ksx-bridge");
    els.rank = modal.querySelector(".ksx-rank");
    els.stats = modal.querySelector(".ksx-stats");
    [CAT, DOG].forEach(function (cfg) {
      var laneEl = modal.querySelector('.ksx-lane[data-side="' + cfg.side + '"]');
      lanes[cfg.side] = { cfg: cfg, el: laneEl, wrap: laneEl.querySelector(".ksx-pulses"), gate: laneEl.querySelector(".ksx-gate"), judge: laneEl.querySelector(".ksx-judge"), keep: laneEl.querySelector(".kk-frame"), motes: [] };
      // tap the whole lane to fire that keeper's sync
      laneEl.addEventListener("pointerdown", function (e) { e.preventDefault(); tap(cfg.side); });
    });

    modal.addEventListener("click", function (e) { if (e.target.hasAttribute && e.target.hasAttribute("data-close")) close(); });
    modal.querySelector(".ksx-go").addEventListener("click", start);
    modal.querySelector(".ksx-again").addEventListener("click", start);
    modal.querySelector(".ksx-enter").addEventListener("click", function () { close(); handoff(); });
    document.addEventListener("keydown", onKey);
  }

  function lane(cfg) {
    return '<div class="ksx-lane ' + cfg.side + '" data-side="' + cfg.side + '">' +
      '<span class="ksx-keepimg"><span class="kk-frame"><img alt="" src="' + cfg.img + '"></span><em>' + cfg.name + '</em></span>' +
      '<div class="ksx-pulses"></div>' +
      '<div class="ksx-gate"><span></span></div>' +
      '<div class="ksx-judge" aria-hidden="true"></div>' +
      '</div>';
  }

  function onKey(e) {
    if (!modal || !modal.classList.contains("open")) return;
    var k = e.key.toLowerCase();
    if (k === "escape") { close(); return; }
    if (!running) { if (k === "enter" || k === " ") { e.preventDefault(); start(); } return; }
    if (CAT.key.indexOf(k) >= 0) { e.preventDefault(); tap("cat"); }
    else if (DOG.key.indexOf(k) >= 0) { e.preventDefault(); tap("dog"); }
  }

  function showScreen(name) {
    els.start.hidden = name !== "start";
    els.arena.hidden = name !== "arena";
    els.over.hidden = name !== "over";
  }

  function start() {
    // reset state
    running = true; timeLeft = DURATION; lastTs = 0; spawnAt = 0.35;
    harmony = 50; combo = 0; bestCombo = 0; syncs = 0; caught = 0; drifts = 0;
    lanes.cat.motes.forEach(rm); lanes.dog.motes.forEach(rm);
    lanes.cat.motes = []; lanes.dog.motes = [];
    lanes.cat.wrap.innerHTML = ""; lanes.dog.wrap.innerHTML = "";
    paintHud();
    showScreen("arena");
    blip(330, 0.14, 0.05); // wake the audio graph on the start gesture
    if (reduce) { clearInterval(iv); iv = setInterval(function () { step(0.05); }, 50); }
    else { lastTs = 0; raf = requestAnimationFrame(frame); }
  }
  var iv = 0;

  function rm(m) { if (m && m.node && m.node.parentNode) m.node.parentNode.removeChild(m.node); }

  function spawn(side) {
    var L = lanes[side];
    var node = el("i", "ksx-mote");
    L.wrap.appendChild(node);
    L.motes.push({ node: node, p: 0, hit: false });
  }

  function frame(ts) {
    if (!running) return;
    var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016; lastTs = ts;
    step(dt);
    if (running) raf = requestAnimationFrame(frame);
  }

  function step(dt) {
    if (!running) return;
    timeLeft -= dt;
    var elapsed = DURATION - timeLeft;
    // difficulty ramp: fall speed + spawn cadence tighten a little across the round
    var speed = 0.62 + elapsed * 0.018;                 // progress per second
    var cadence = Math.max(0.62, 1.15 - elapsed * 0.026); // seconds between spawns
    spawnAt -= dt;
    if (spawnAt <= 0 && timeLeft > 0.6) {
      spawnAt = cadence;
      // usually one lane; occasionally both, more often as it heats up
      var both = Math.random() < Math.min(0.34, 0.08 + elapsed * 0.012);
      if (both) { spawn("cat"); spawn("dog"); }
      else spawn(Math.random() < 0.5 ? "cat" : "dog");
    }
    ["cat", "dog"].forEach(function (side) {
      var L = lanes[side], keep = L.motes;
      for (var i = keep.length - 1; i >= 0; i--) {
        var m = keep[i];
        if (m.hit) continue;
        m.p += speed * dt;
        m.node.style.top = (m.p * GATE * 100) + "%";
        m.node.style.opacity = m.p > 1 ? Math.max(0, 1 - (m.p - 1) * 4) : 1;
        if (m.p >= W_DRIFT) { drift(side, m); keep.splice(i, 1); }
      }
    });
    els.time.textContent = Math.max(0, Math.ceil(timeLeft));
    if (timeLeft <= 0) return end();
  }

  function nearest(side) {
    var keep = lanes[side].motes, best = null, bd = 99;
    for (var i = 0; i < keep.length; i++) {
      if (keep[i].hit) continue;
      var d = Math.abs(keep[i].p - 1);
      if (d < bd) { bd = d; best = keep[i]; }
    }
    return { m: best, d: bd };
  }

  function tap(side) {
    if (!running) return;
    var L = lanes[side], n = nearest(side);
    if (n.m && n.d <= W_GOOD) {
      var perfect = n.d <= W_PERFECT;
      n.m.hit = true;
      burst(L, n.m, perfect);
      combo++; caught++; if (combo > bestCombo) bestCombo = combo;
      lastSyncSide = side;
      if (perfect) { syncs++; harmony += 3.6; judge(L, "SYNC", "perfect"); blip(660 + Math.min(combo, 12) * 22, 0.12, 0.07); }
      else { harmony += 1.9; judge(L, "OK", "good"); blip(430, 0.1, 0.05); }
      if (combo && combo % 5 === 0) harmony += 2; // sustained-sync bonus
      // remove the mote node shortly after its burst
      var m = n.m; setTimeout(function () { rm(m); var k = L.motes.indexOf(m); if (k >= 0) L.motes.splice(k, 1); }, 220);
    } else {
      // tapped with nothing on the gate — harmless off-beat, just a flash
      judge(L, "—", "off");
      L.el.classList.remove("offbeat"); void L.el.offsetWidth; L.el.classList.add("offbeat");
    }
    clampHarm(); paintHud();
  }

  function drift(side, m) {
    var L = lanes[side];
    m.node.classList.add("drift");
    var node = m.node; setTimeout(function () { rm({ node: node }); }, 260);
    combo = 0; drifts++; harmony -= 6.5; clampHarm();
    judge(L, "DRIFT", "miss");
    L.el.classList.remove("shake"); void L.el.offsetWidth; if (!reduce) L.el.classList.add("shake");
    blip(150, 0.16, 0.05);
    paintHud();
  }

  function judge(L, text, kind) {
    var j = L.judge; j.textContent = text; j.className = "ksx-judge show " + kind;
    void j.offsetWidth; j.classList.remove("show"); j.classList.add("show");
    clearTimeout(j._t); j._t = setTimeout(function () { j.className = "ksx-judge " + kind; }, 480);
    if (kind === "perfect" || kind === "good") { L.keep.classList.remove("ping"); void L.keep.offsetWidth; L.keep.classList.add("ping"); }
  }

  function burst(L, m, perfect) {
    if (reduce) return;
    var g = L.gate;
    for (var i = 0; i < (perfect ? 7 : 4); i++) {
      var s = el("i", "ksx-spark");
      var ang = (Math.PI * 2 * i) / (perfect ? 7 : 4) + Math.random();
      var dist = 16 + Math.random() * 22;
      s.style.setProperty("--dx", (Math.cos(ang) * dist).toFixed(1) + "px");
      s.style.setProperty("--dy", (Math.sin(ang) * dist).toFixed(1) + "px");
      g.appendChild(s);
      (function (node) { setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 460); })(s);
    }
    g.classList.remove("lit"); void g.offsetWidth; g.classList.add("lit");
  }

  function clampHarm() { if (harmony < 0) harmony = 0; if (harmony > 100) harmony = 100; }

  function paintHud() {
    els.harm.textContent = Math.round(harmony) + "%";
    els.harm.parentNode.className = "ksx-harm" + (harmony >= 90 ? " hot" : harmony < 35 ? " cold" : "");
    els.combo.textContent = combo >= 3 ? combo + "× in sync" : "";
    els.combo.className = "ksx-combo" + (combo >= 8 ? " big" : "");
    // the truce bridge: brightens as harmony climbs
    var lvl = harmony >= 92 ? 2 : harmony >= 68 ? 1 : 0;
    els.bridge.setAttribute("data-lvl", lvl);
    modal.querySelector(".ksx-field").setAttribute("data-harm", lvl);
  }

  function end() {
    running = false; cancelAnimationFrame(raf); clearInterval(iv);
    var h = Math.round(harmony), rank, cls, note;
    if (h >= 96 || (bestCombo >= 18 && h >= 88)) { rank = "PERFECT HARMONY"; cls = "s3"; note = "the two keeps moved as one"; }
    else if (h >= 78) { rank = "IN SYNC"; cls = "s2"; note = "the truce held, clean and bright"; }
    else if (h >= 50) { rank = "TRUCE HELD"; cls = "s1"; note = "rough in places, but it held"; }
    else { rank = "SIGNAL FADED"; cls = "s0"; note = "the keeps drifted apart — try again"; }
    els.rank.className = "ksx-rank " + cls;
    els.rank.innerHTML = '<b>' + rank + '</b><span>' + note + '</span>';
    els.stats.innerHTML =
      stat(h + "%", "final harmony") + stat(bestCombo + "×", "best sync run") +
      stat(syncs, "perfect syncs") + stat(drifts, "drifts");
    showScreen("over");
    blip(h >= 78 ? 720 : 300, 0.2, 0.06);
  }
  function stat(v, l) { return '<span class="ksx-stat"><b>' + v + '</b><em>' + l + '</em></span>'; }

  var lastSyncSide = "cat";
  function handoff() {
    // drop the player into the archive at the keep they last synced
    var id = lastSyncSide === "dog" ? "woof_city" : "meow_sanctuary";
    try {
      if (window.SHM && window.SHM.select) {
        window.SHM.select(id);
        if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
      }
    } catch (e) {}
  }

  function open() {
    build();
    lastFocused = document.activeElement;
    running = false; showScreen("start");
    document.body.classList.add("breach-lock");
    modal.classList.add("open");
    try { modal.querySelector(".ksx-go").focus(); } catch (e) {}
  }
  function close() {
    if (!modal) return;
    running = false; cancelAnimationFrame(raf); clearInterval(iv);
    modal.classList.remove("open");
    document.body.classList.remove("breach-lock");
    if (lastFocused && lastFocused.focus) { try { lastFocused.focus(); } catch (e) {} }
  }

  // ---- footer trigger ----
  function wire() {
    var btn = document.getElementById("truce-play");
    if (btn) btn.addEventListener("click", open);
  }
  if (document.readyState !== "loading") wire();
  else document.addEventListener("DOMContentLoaded", wire);

  window.SHMTruce = { open: open, close: close };
})();
