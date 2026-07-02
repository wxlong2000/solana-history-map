// Paw Brawl — the origin easter egg. meow-woof began as a cats-vs-dogs game;
// this is the one relic of that war, a 20-second tug-of-war that hands you to the
// archive when it ends. Self-contained (no deps beyond optional window.SHM).
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var modal = null, els = {}, raf = 0, lastFocused = null;
  var t = 50, side = "cat", running = false, timeLeft = 20, lastTs = 0, surge = false, surgeTimer = 4;

  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

  function build() {
    if (modal) return;
    modal = el("div", "brawl-modal");
    modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true"); modal.setAttribute("aria-label", "Meow vs Woof — a game");
    modal.innerHTML =
      '<div class="brawl-backdrop" data-close></div>' +
      '<div class="brawl-dialog" role="document">' +
        '<button class="brawl-x" data-close type="button" aria-label="Close">✕</button>' +
        '<div class="brawl-screen brawl-start">' +
          '<div class="brawl-emblem">🐾</div>' +
          '<h2 class="brawl-title">MEOW <span>⚔</span> WOOF</h2>' +
          '<p class="brawl-lore">Before this was a source-cited archive, it was a cats-vs-dogs brawl. Pick a side — one more round, for old times.</p>' +
          '<div class="brawl-sides">' +
            '<button class="brawl-side" data-side="cat" type="button"><span class="bs-face">🐱</span><span class="bs-name">Team Meow</span></button>' +
            '<button class="brawl-side" data-side="dog" type="button"><span class="bs-face">🐶</span><span class="bs-name">Team Woof</span></button>' +
          '</div>' +
        '</div>' +
        '<div class="brawl-screen brawl-arena" hidden>' +
          '<div class="brawl-topline"><span class="brawl-youare"></span><span class="brawl-timer">20</span></div>' +
          '<div class="brawl-rope">' +
            '<span class="brawl-end left">🐱</span>' +
            '<div class="brawl-track"><span class="brawl-mid"></span><i class="brawl-token">🧶</i></div>' +
            '<span class="brawl-end right">🐶</span>' +
          '</div>' +
          '<button class="brawl-mash" type="button">PULL!</button>' +
          '<p class="brawl-tip">Mash to pull the yarn to your side. Watch for 💥 SURGE.</p>' +
        '</div>' +
        '<div class="brawl-screen brawl-over" hidden>' +
          '<div class="brawl-result"></div>' +
          '<p class="brawl-outro">That was the game <b>meow-woof</b> used to be.<br>The history it grew into is on the map.</p>' +
          '<div class="brawl-overbtns">' +
            '<button class="brawl-again" type="button">↺ Rematch</button>' +
            '<button class="brawl-explore" type="button">Explore the archive →</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    els.start = modal.querySelector(".brawl-start");
    els.arena = modal.querySelector(".brawl-arena");
    els.over = modal.querySelector(".brawl-over");
    els.token = modal.querySelector(".brawl-token");
    els.timer = modal.querySelector(".brawl-timer");
    els.mash = modal.querySelector(".brawl-mash");
    els.youare = modal.querySelector(".brawl-youare");
    els.endL = modal.querySelector(".brawl-end.left");
    els.endR = modal.querySelector(".brawl-end.right");
    els.result = modal.querySelector(".brawl-result");

    modal.addEventListener("click", function (e) { if (e.target.hasAttribute && e.target.hasAttribute("data-close")) close(); });
    [].forEach.call(modal.querySelectorAll(".brawl-side"), function (b) {
      b.addEventListener("click", function () { start(b.getAttribute("data-side")); });
    });
    // mash: pointerdown for snappy feel, ignore the synthetic click
    els.mash.addEventListener("pointerdown", function (e) { e.preventDefault(); tap(); });
    els.mash.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); tap(); } });
    modal.querySelector(".brawl-again").addEventListener("click", function () { showScreen("start"); });
    modal.querySelector(".brawl-explore").addEventListener("click", function () { close(); handoff(); });
    document.addEventListener("keydown", onKey);
  }

  function onKey(e) {
    if (!modal || !modal.classList.contains("open")) return;
    if (e.key === "Escape") close();
  }
  function showScreen(name) {
    els.start.hidden = name !== "start";
    els.arena.hidden = name !== "arena";
    els.over.hidden = name !== "over";
  }

  function start(picked) {
    side = picked; t = 50; timeLeft = 20; running = true; surge = false; surgeTimer = 4; lastTs = 0;
    els.youare.innerHTML = "you are " + (side === "cat" ? "🐱 Team Meow — pull left" : "🐶 Team Woof — pull right");
    els.endL.classList.toggle("me", side === "cat"); els.endR.classList.toggle("me", side === "dog");
    els.mash.classList.remove("surge");
    showScreen("arena");
    render();
    try { els.mash.focus(); } catch (e) {}
    if (reduce) { // no rAF loop under reduced motion; drive with an interval
      startInterval();
    } else {
      raf = requestAnimationFrame(frame);
    }
  }
  var iv = 0;
  function startInterval() { clearInterval(iv); iv = setInterval(function () { step(0.05); }, 50); }

  function tap() {
    if (!running) return;
    var p = (surge ? 2 : 1) * 2.7;
    t += (side === "cat" ? -p : p);
    clampT();
    els.mash.classList.remove("hit"); void els.mash.offsetWidth; els.mash.classList.add("hit");
    render();
    checkEnd();
  }
  function clampT() { if (t < 0) t = 0; if (t > 100) t = 100; }

  function frame(ts) {
    if (!running) return;
    var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016; lastTs = ts;
    step(dt);
    if (running) raf = requestAnimationFrame(frame);
  }
  function step(dt) {
    if (!running) return;
    timeLeft -= dt;
    var elapsed = 20 - timeLeft;
    var aiRate = 7 + elapsed * 0.65;         // AI pull per second, ramps up
    t += (side === "cat" ? aiRate : -aiRate) * dt;  // opponent drags toward its goal
    clampT();
    surgeTimer -= dt;
    if (surgeTimer <= 0) {
      if (surge) { surge = false; surgeTimer = 3 + Math.round((elapsed % 3)); els.mash.classList.remove("surge"); els.mash.textContent = "PULL!"; }
      else { surge = true; surgeTimer = 1.4; els.mash.classList.add("surge"); els.mash.textContent = "💥 MASH!"; }
    }
    els.timer.textContent = Math.max(0, Math.ceil(timeLeft));
    render();
    if (checkEnd()) return;
    if (timeLeft <= 0) end(t <= 50 ? "cat" : "dog");
  }

  function render() {
    els.token.style.left = t + "%";
    var strainL = Math.max(0, (50 - t) / 50), strainR = Math.max(0, (t - 50) / 50);
    els.endL.style.transform = "scale(" + (1 + strainL * 0.25) + ")";
    els.endR.style.transform = "scale(" + (1 + strainR * 0.25) + ")";
    modal.querySelector(".brawl-track").setAttribute("data-lead", t < 44 ? "cat" : (t > 56 ? "dog" : ""));
  }
  function checkEnd() {
    if (t <= 4) { end("cat"); return true; }
    if (t >= 96) { end("dog"); return true; }
    return false;
  }
  function end(winner) {
    running = false; cancelAnimationFrame(raf); clearInterval(iv);
    var won = winner === side;
    els.result.className = "brawl-result " + (won ? "win" : "lose");
    els.result.innerHTML = (winner === "cat" ? "🐱" : "🐶") + '<span>' + (won ? "YOU WIN" : "YOU LOSE") + '</span>' +
      '<small>' + (winner === "cat" ? "Team Meow" : "Team Woof") + ' takes the round</small>';
    showScreen("over");
  }
  function handoff() {
    // drop the player into the archive at the winning faction's base, if the map is wired up
    var id = t <= 50 ? "meow_sanctuary" : "woof_city";
    try {
      if (window.SHM && window.SHM.select) { window.SHM.select(id); if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id); }
    } catch (e) {}
  }

  var lastF;
  function open() {
    build();
    lastFocused = document.activeElement;
    t = 50; running = false; showScreen("start");
    document.body.classList.add("breach-lock");
    modal.classList.add("open");
    try { modal.querySelector(".brawl-side").focus(); } catch (e) {}
  }
  function close() {
    if (!modal) return;
    running = false; cancelAnimationFrame(raf); clearInterval(iv);
    modal.classList.remove("open");
    document.body.classList.remove("breach-lock");
    if (lastFocused && lastFocused.focus) { try { lastFocused.focus(); } catch (e) {} }
  }

  // ---- entry button (fixed paw emblem) ----
  function injectEntry() {
    if (document.getElementById("brawl-entry")) return;
    var b = el("button", "brawl-entry", '🐾');
    b.id = "brawl-entry"; b.type = "button";
    b.setAttribute("aria-label", "Meow vs Woof — the game this archive grew from");
    b.setAttribute("title", "Where it all started — Meow vs Woof");
    b.addEventListener("click", open);
    document.body.appendChild(b);
  }
  function init() { injectEntry(); }
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);

  window.SHMBrawl = { open: open, close: close };
})();
