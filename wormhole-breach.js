// Playable explainer: "How the Wormhole breach worked" (Feb 2022).
// Self-contained module (alive.js / share-card.js pattern). No network, no CDN, no build step.
// Pedagogy: the attacker forged the PROOF that signatures were checked — not the signatures,
// not the keys, not the vault. A live solvency ledger makes "counterfeiting, not theft" felt.
// Every line of copy is reconciled with an adversarially fact-checked source sheet; identifiers
// used are documented ones only (verify_signatures, load_instruction_at[_checked], Instructions
// sysvar / Sysvar1nstructions, Secp256k1 precompile, SignatureSet, post_vaa, complete_wrapped, VAA).
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // sources rendered on the closing card (deduped against the record's own sources by URL)
  var CITATIONS = [
    { label: "samczsun / Paradigm — technical root cause", url: "https://threadreaderapp.com/thread/1489044939732406275.html" },
    { label: "Kudelski Security — Quick Analysis of the Wormhole Attack", url: "https://kudelskisecurity.com/research/quick-analysis-of-the-wormhole-attack/" },
    { label: "Chainalysis — Wormhole hack analysis", url: "https://www.chainalysis.com/blog/wormhole-hack-february-2022/" },
    { label: "Wormhole — Protocol security docs (guardians, VAAs)", url: "https://wormhole.com/docs/protocol/security/" },
    { label: "Decrypt — Wormhole replenished after hack (Jump)", url: "https://decrypt.co/91962/crypto-bridge-wormhole-replenished-after-hack-320m-ethereum" }
  ];

  // ---- step content (copy is fact-checked; do not embellish beyond the sheet) ----
  var STEPS = [
    {
      head: "Lock real ETH, mint wrapped ETH",
      body: "Wormhole is a <em>lock-and-mint</em> bridge. You lock real ETH on Ethereum, and an equal amount of wrapped ETH (wETH) is minted 1:1 on Solana, redeemable for the real thing. One rule keeps it solvent: wETH should only be minted when a matching deposit is actually locked behind it.",
      hint: "Tap “Lock 1 ETH → mint 1 wETH” and watch the ledger stay balanced.",
      action: "Lock 1 ETH → mint 1 wETH",
      focus: "lock"
    },
    {
      head: "Two chains that can’t talk — so 19 guardians watch",
      body: "Solana and Ethereum can’t read each other. So a network of <strong>19 “guardian” validators</strong> watches both sides. When a real deposit happens they collectively sign an authorization message called a <strong>VAA</strong>. Solana is meant to mint only when a supermajority — <strong>13 of 19</strong> — has signed.",
      hint: "Tap “Collect signatures” to reach the 13-of-19 quorum and produce a VAA.",
      action: "Collect signatures",
      focus: "guardians"
    },
    {
      head: "The clerk doesn’t check the signatures himself",
      body: "Here’s the design that mattered. Wormhole’s <code>verify_signatures</code> step didn’t check the guardian signatures itself — it handed that to Solana’s Secp256k1 precompile, then confirmed “the check ran” by reading the transaction’s <strong>Instructions sysvar</strong>. The catch: it read it with the deprecated <code>load_instruction_at</code>, which never confirms the account it reads is the <em>real</em> sysvar.",
      hint: "Tap “Inspect the clerk” to see what he thinks he checks vs. what he actually checks.",
      action: "Inspect the clerk",
      focus: "diff"
    },
    {
      head: "Forge the receipt, not the signature",
      body: "The attacker never broke the cryptography and never stole a guardian key. <strong>You be the clerk.</strong> Two accounts arrive: the real Instructions sysvar and a <strong>look-alike fake</strong> pre-loaded to say “verified.” With the deprecated <code>load_instruction_at</code> you can’t tell them apart — with <code>load_instruction_at_checked</code> you can. Feed the fake to each reader and watch what happens.",
      hint: "Pick a reader mode, then click the ATTACKER ACCOUNT — unchecked stamps it FORGED, checked REJECTS it.",
      action: null,
      focus: "swap"
    },
    {
      head: "Mint 120,000 wETH from nothing",
      body: "With the signature set marked all-valid, the attacker generated a “valid” VAA (<code>post_vaa</code>) and triggered the mint (<code>complete_wrapped</code>): <strong>120,000 wrapped ETH</strong> on Solana — worth roughly $320M at the time — with <strong>zero</strong> ETH locked behind it. A pile of notes, an empty vault.",
      hint: "Tap “Mint” — then look for the ETH backing it.",
      action: "Mint 120,000 wETH",
      focus: "mint"
    },
    {
      head: "No keys broken. A backer wrote the check.",
      body: "The lesson is input and account validation — not broken cryptography. The attacker bridged roughly 93,750 wETH back to real ETH on Ethereum and kept the rest (~26,250 wETH, ~$42.5M) on Solana; they were never publicly identified or prosecuted. <strong>Jump Crypto</strong>, a Wormhole backer, then replaced about 120,000 ETH within roughly a day so users stayed whole — a discretionary backstop, not funds clawed back from the attacker.",
      hint: "Read the takeaway, then open the sources or replay.",
      action: null,
      focus: "closing"
    }
  ];

  // canonical ledger end-state per step (deterministic => navigation is always consistent)
  function ledgerFor(i) {
    return [
      { locked: 1, minted: 1, cap: 1, mode: "THE RULE", status: "backed", note: "BACKED 1:1" },
      { locked: 1, minted: 1, cap: 1, mode: "THE RULE", status: "backed", note: "a valid VAA needs 13-of-19" },
      { locked: 1, minted: 1, cap: 1, mode: "THE RULE", status: "backed", note: "the check the clerk leans on" },
      { locked: 1, minted: 1, cap: 1, mode: "THE RULE", status: "forged", note: "verification forged" },
      { locked: 0, minted: 120000, cap: 120000, mode: "THE ATTACK", status: "unbacked", note: "UNBACKED · 0 ETH behind 120,000 wETH" },
      { locked: 120000, minted: 120000, cap: 120000, mode: "AFTERMATH", status: "restored", note: "RESTORED by Jump Crypto*" }
    ][i];
  }
  // trust-chain node states per step
  var CHAIN = [
    { label: "ETH vault", sub: "Ethereum" },
    { label: "19 guardians", sub: "sign the VAA" },
    { label: "VAA", sub: "authorization" },
    { label: "verify_signatures", sub: "Solana program" },
    { label: "mint wETH", sub: "Solana" }
  ];
  function chainStateFor(i) {
    // returns {on:[idx], warn:[idx], bad:[idx]}
    return [
      { on: [0, 4], warn: [], bad: [] },
      { on: [1, 2], warn: [], bad: [] },
      { on: [3], warn: [3], bad: [] },
      { on: [3], warn: [], bad: [3] },
      { on: [4], warn: [], bad: [3] },
      { on: [], warn: [], bad: [] }
    ][i];
  }

  function fmt(n) { return n.toLocaleString("en-US"); }

  // ---- module state ----
  var lastRecord = null, step = 0, swapped = false, readerChecked = false, stopped = false;
  var modal = null, els = {};

  function commaRecord() {
    if (lastRecord) return lastRecord;
    var L = window.SOLANA_HISTORY_LANDMARKS || [];
    for (var i = 0; i < L.length; i++) if (L[i].id === "wormhole") return L[i];
    return null;
  }

  // ---------- entry button (injected into the record panel for wormhole only) ----------
  function injectButton() {
    var actions = document.querySelector(".panel-actions");
    if (!actions || document.getElementById("btn-breach")) return;
    var b = document.createElement("button");
    b.id = "btn-breach";
    b.type = "button";
    b.className = "btn-hud btn-breach";
    b.hidden = true;
    b.setAttribute("aria-label", "Play interactive: how the Wormhole breach worked");
    b.innerHTML = "▶ Play: how the breach worked";
    b.addEventListener("click", function () { open(commaRecord()); });
    actions.insertBefore(b, actions.firstChild);
  }
  function onSelect(e) {
    lastRecord = e && e.detail ? e.detail : null;
    injectButton();
    var b = document.getElementById("btn-breach");
    if (b) b.hidden = !(lastRecord && lastRecord.id === "wormhole");
  }

  // ---------- modal build ----------
  function build() {
    if (modal) return;
    modal = document.createElement("div");
    modal.className = "breach-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "breach-head");
    modal.innerHTML =
      '<div class="breach-backdrop" data-close></div>' +
      '<div class="breach-dialog" role="document">' +
        '<div class="breach-top">' +
          '<div class="breach-rail" aria-hidden="true"></div>' +
          '<span class="breach-count" id="breach-count">STEP 1 / 6</span>' +
          '<button class="breach-x" data-close type="button" aria-label="Close interactive">✕</button>' +
        '</div>' +
        '<div class="breach-ledger" aria-hidden="false">' +
          '<div class="breach-ledger-mode"><span class="bl-mode-tag">THE RULE</span><span class="bl-note"></span></div>' +
          '<div class="bl-row" data-row="locked"><span class="bl-label">ETH locked · Ethereum</span><span class="bl-track"><i class="bl-fill"></i></span><span class="bl-val">0</span></div>' +
          '<div class="bl-row" data-row="minted"><span class="bl-label">wETH minted · Solana</span><span class="bl-track"><i class="bl-fill"></i></span><span class="bl-val">0</span></div>' +
        '</div>' +
        '<div class="breach-chain"></div>' +
        '<div class="breach-stage">' +
          '<h2 class="breach-head" id="breach-head"></h2>' +
          '<p class="breach-body"></p>' +
          '<div class="breach-focus"></div>' +
        '</div>' +
        '<p class="breach-say" aria-live="polite"></p>' +
        '<div class="breach-foot">' +
          '<p class="breach-hint"></p>' +
          '<div class="breach-nav">' +
            '<button class="btn-hud breach-prev" type="button">← Prev</button>' +
            '<button class="btn-hud breach-next primary" type="button">Next →</button>' +
          '</div>' +
        '</div>' +
        '<p class="breach-live shm-vh" aria-live="polite"></p>' +
      '</div>';
    document.body.appendChild(modal);

    els.dialog = modal.querySelector(".breach-dialog");
    els.rail = modal.querySelector(".breach-rail");
    els.count = modal.querySelector(".breach-count");
    els.modeTag = modal.querySelector(".bl-mode-tag");
    els.note = modal.querySelector(".bl-note");
    els.ledger = modal.querySelector(".breach-ledger");
    els.lockRow = modal.querySelector('.bl-row[data-row="locked"]');
    els.mintRow = modal.querySelector('.bl-row[data-row="minted"]');
    els.chain = modal.querySelector(".breach-chain");
    els.head = modal.querySelector(".breach-head");
    els.bodyP = modal.querySelector(".breach-body");
    els.focus = modal.querySelector(".breach-focus");
    els.hint = modal.querySelector(".breach-hint");
    els.prev = modal.querySelector(".breach-prev");
    els.next = modal.querySelector(".breach-next");
    els.live = modal.querySelector(".breach-live"); els.say = modal.querySelector(".breach-say");

    // rail segments
    var rh = "";
    for (var i = 0; i < STEPS.length; i++) rh += '<i class="rail-seg"></i>';
    els.rail.innerHTML = rh;

    modal.addEventListener("click", function (e) {
      if (e.target.hasAttribute && e.target.hasAttribute("data-close")) close();
    });
    els.prev.addEventListener("click", function () { go(step - 1); });
    els.next.addEventListener("click", function () { if (step >= STEPS.length - 1) close(); else go(step + 1); });
    document.addEventListener("keydown", onKey);
  }

  function onKey(e) {
    if (!modal || !modal.classList.contains("open")) return;
    if (e.key === "Escape") return close();
    if (e.key === "ArrowRight") { if (step < STEPS.length - 1) go(step + 1); }
    else if (e.key === "ArrowLeft") { if (step > 0) go(step - 1); }
    else if (e.key === "Tab") trapFocus(e);
  }
  function trapFocus(e) {
    var f = modal.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])');
    f = Array.prototype.filter.call(f, function (n) { return n.offsetParent !== null && !n.disabled; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // ---------- painters ----------
  function paintLedger(i, animate) {
    var L = ledgerFor(i);
    els.modeTag.textContent = L.mode;
    els.modeTag.className = "bl-mode-tag mode-" + L.mode.toLowerCase().replace(/[^a-z]/g, "");
    els.note.textContent = L.note;
    els.ledger.setAttribute("data-status", L.status);
    var rows = [["locked", els.lockRow, L.locked], ["minted", els.mintRow, L.minted]];
    rows.forEach(function (r) {
      var fill = r[1].querySelector(".bl-fill");
      var val = r[1].querySelector(".bl-val");
      var pct = L.cap ? Math.max(0, Math.min(100, (r[2] / L.cap) * 100)) : 0;
      if (!animate || reduce) fill.style.transition = "none"; else fill.style.transition = "";
      fill.style.width = pct + "%";
      r[1].setAttribute("data-fillstate", r[0] === "locked"
        ? (L.status === "restored" ? "restored" : (r[2] === 0 ? "empty" : "ok"))
        : (L.status === "unbacked" ? "bad" : (L.status === "restored" ? "ok" : "ok")));
      // count-up for the big mint number, else set directly
      tweenNum(val, r[2], animate && !reduce && i === 4 && r[0] === "minted");
    });
  }
  function tweenNum(el, target, doTween) {
    el._tw = (el._tw || 0) + 1; var myTw = el._tw; // supersede any in-flight tween
    if (!doTween) { el.textContent = fmt(target); return; }
    var start = 0, t0 = null, dur = 900;
    function frame(ts) {
      if (el._tw !== myTw) return; // a newer paint took over
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(start + (target - start) * eased));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function paintChain(i) {
    var st = chainStateFor(i);
    var html = "";
    for (var n = 0; n < CHAIN.length; n++) {
      var cls = "chain-node";
      if (st.bad.indexOf(n) >= 0) cls += " bad";
      else if (st.warn.indexOf(n) >= 0) cls += " warn";
      else if (st.on.indexOf(n) >= 0) cls += " on";
      else cls += " dim";
      var sub = CHAIN[n].sub;
      if (n === 1 && i >= 1) sub = "13 / 19 signed";
      html += '<div class="' + cls + '"><span class="cn-label">' + CHAIN[n].label + '</span><span class="cn-sub">' + sub + '</span></div>';
      if (n < CHAIN.length - 1) html += '<span class="chain-link ' + (st.bad.indexOf(n) >= 0 || st.bad.indexOf(n + 1) >= 0 ? "bad" : "") + '">›</span>';
    }
    els.chain.innerHTML = html;
  }
  function paintRail(i) {
    var segs = els.rail.querySelectorAll(".rail-seg");
    for (var s = 0; s < segs.length; s++) {
      segs[s].className = "rail-seg" + (s < i ? " done" : s === i ? " active" : "");
    }
  }

  // ---------- focus zones ----------
  function buildFocus(i) {
    var f = els.focus;
    f.innerHTML = "";
    f.className = "breach-focus focus-" + STEPS[i].focus;
    if (i === 2) {
      f.innerHTML =
        '<div class="diff-grid">' +
          '<div class="diff-col bad"><div class="diff-h"><code>load_instruction_at</code><span class="diff-tag">UNCHECKED</span></div>' +
            '<p>Reads whatever account you pass as the Instructions sysvar — <strong>no address check</strong>. Hand it a fake, it reads the fake.</p></div>' +
          '<div class="diff-col ok"><div class="diff-h"><code>load_instruction_at_checked</code><span class="diff-tag">SAFE</span></div>' +
            '<p>Validates the account really is <code>Sysvar1nstructions</code> before reading it. Solana had deprecated the unchecked call back in Oct 2021.</p></div>' +
        '</div>' +
        '<p class="diff-foot">Wormhole was still calling the unchecked one.</p>';
    } else if (i === 3) {
      f.innerHTML =
        '<div class="swap-wrap">' +
          '<div class="reader-mode" role="group" aria-label="clerk reader mode">' +
            '<button class="rm-opt' + (readerChecked ? '' : ' on') + '" data-mode="unchecked" type="button"><code>load_instruction_at</code><small>unchecked — what Wormhole used</small></button>' +
            '<button class="rm-opt' + (readerChecked ? ' on' : '') + '" data-mode="checked" type="button"><code>load_instruction_at_checked</code><small>validates the address</small></button>' +
          '</div>' +
          '<div class="swap-cards">' +
            '<button class="acct-card fake" data-kind="fake" type="button"><span class="ac-tag">ATTACKER ACCOUNT</span><span class="ac-name">looks like Sysvar1nstructions</span><span class="ac-body">pre-loaded: “signatures verified ✓”</span></button>' +
            '<button class="acct-card real" data-kind="real" type="button"><span class="ac-tag">REAL</span><span class="ac-name">Sysvar1nstructions</span><span class="ac-body">the genuine sysvar</span></button>' +
          '</div>' +
          '<div class="reader"><span class="reader-label">You are the clerk — feed an account to the reader</span><div class="reader-slot" data-empty="1">click an account to read it</div><div class="reader-stamp"></div></div>' +
        '</div>';
      var slot = f.querySelector(".reader-slot"), stamp = f.querySelector(".reader-stamp");
      Array.prototype.forEach.call(f.querySelectorAll(".rm-opt"), function (b) { b.addEventListener("click", function () { readerChecked = b.getAttribute("data-mode") === "checked"; Array.prototype.forEach.call(f.querySelectorAll(".rm-opt"), function (x) { x.classList.toggle("on", x === b); }); resetReader(slot, stamp); }); });
      Array.prototype.forEach.call(f.querySelectorAll(".acct-card"), function (c) { c.addEventListener("click", function () { readCard(c.getAttribute("data-kind"), c, slot, stamp); }); });
      if (swapped) applySwapped(f.querySelector(".acct-card.fake"), slot, stamp, false);
      else if (stopped) { slot.setAttribute("data-empty", "0"); slot.textContent = "account read"; stamp.className = "reader-stamp show rejected"; stamp.textContent = "✗ REJECTED — address ≠ Sysvar1nstructions"; }
    } else if (i === 5) {
      f.innerHTML = renderClosing();
    } else {
      // lock / guardians / mint: a single action chip lives in the footer; focus shows a caption
      var cap = i === 0 ? "Every wETH minted = one ETH locked. That invariant is the whole game."
        : i === 1 ? "13 of 19 guardian signatures = a valid VAA the program will accept."
        : "Press it. The bars tell the story.";
      f.innerHTML = '<p class="focus-caption">' + cap + '</p>' +
        (i === 1 ? '<div class="guardian-grid"></div>' : "");
      if (i === 1) paintGuardians(i >= 1);
    }
  }
  function paintGuardians(full) {
    var g = els.focus.querySelector(".guardian-grid");
    if (!g) return;
    var html = "";
    for (var k = 0; k < 19; k++) html += '<i class="gd' + (full && k < 13 ? " on" : "") + '"></i>';
    g.innerHTML = html;
  }
  function doSwap(fake, slot, stamp) {
    if (swapped) return;
    swapped = true;
    applySwapped(fake, slot, stamp, !reduce);
    paintChain(3); // verify node turns red
    speak("Forged account accepted. Signatures marked valid without any real check.");
  }
  function resetReader(slot, stamp) { swapped = false; stopped = false; slot.setAttribute("data-empty", "1"); slot.textContent = "click an account to read it"; stamp.className = "reader-stamp"; stamp.textContent = ""; var f = els.focus.querySelector(".acct-card.fake.placed"); if (f) f.classList.remove("placed"); paintChain(3 - 1); }
  function readCard(kind, card, slot, stamp) {
    slot.setAttribute("data-empty", "0"); slot.textContent = "account read";
    stamp.className = "reader-stamp show";
    if (kind === "real") { stamp.classList.add("genuine"); stamp.textContent = "✓ genuine sysvar — a real verification"; speak("That is the genuine Instructions sysvar — a real verification, no attack."); return; }
    if (readerChecked) {
      stopped = true; swapped = false; paintChain(2);
      stamp.classList.add("rejected"); stamp.textContent = "✗ REJECTED — address ≠ Sysvar1nstructions";
      speak("The checked reader validated the address and rejected the forged account — the attack stops here.");
    } else {
      swapped = true; stopped = false; card.classList.add("placed"); paintChain(3);
      stamp.textContent = "SIGNATURES VERIFIED ✓";
      if (!reduce) setTimeout(function () { stamp.classList.add("forged"); stamp.textContent = "✓ FORGED"; }, 560);
      else { stamp.classList.add("forged"); stamp.textContent = "✓ FORGED"; }
      speak("Forged account accepted — the unchecked reader couldn’t tell, so signatures are marked valid.");
    }
  }
  function applySwapped(fake, slot, stamp, animate) {
    fake.classList.add("placed");
    slot.setAttribute("data-empty", "0");
    slot.textContent = "account read";
    stamp.classList.add("show");
    stamp.textContent = "SIGNATURES VERIFIED ✓";
    if (animate) {
      setTimeout(function () { stamp.classList.add("forged"); stamp.textContent = "✓ FORGED"; }, 620);
    } else {
      stamp.classList.add("forged"); stamp.textContent = "✓ FORGED";
    }
  }
  function enableDrag(card, slot, stamp) {
    if (reduce) return;
    var dragging = false, ox = 0, oy = 0;
    card.addEventListener("pointerdown", function (e) {
      if (swapped) return;
      dragging = true; ox = e.clientX; oy = e.clientY;
      card.setPointerCapture(e.pointerId); card.classList.add("dragging");
    });
    card.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      card.style.transform = "translate(" + (e.clientX - ox) + "px," + (e.clientY - oy) + "px)";
    });
    card.addEventListener("pointerup", function (e) {
      if (!dragging) return;
      dragging = false; card.classList.remove("dragging"); card.style.transform = "";
      var r = slot.getBoundingClientRect();
      if (e.clientX >= r.left - 40 && e.clientX <= r.right + 40 && e.clientY >= r.top - 60 && e.clientY <= r.bottom + 60) {
        doSwap(card, slot, stamp);
      }
    });
  }
  function renderClosing() {
    var rec = commaRecord();
    var seen = {}, items = [];
    (rec && rec.sources ? rec.sources : []).concat(CITATIONS).forEach(function (s) {
      if (!s || !s.url || seen[s.url]) return; seen[s.url] = 1;
      items.push('<li><a href="' + s.url + '" target="_blank" rel="noopener">' + s.label + '</a></li>');
    });
    return '<div class="closing">' +
      '<p class="closing-lead">A bridge that minted wETH on a <strong>forged proof of verification</strong> — not broken crypto, not a stolen key, not a drained vault. One unvalidated account ⇒ 120,000 wETH (~$320M, approx.) with nothing behind it. Users were made whole only because <strong>Jump Crypto chose to replace ~120,000 ETH</strong>.</p>' +
      '<details class="closing-sources" open><summary>Sources</summary><ul>' + items.join("") + '</ul></details>' +
      '<p class="closing-note">Historical reference only. No affiliation with Wormhole or Jump is implied.</p>' +
      '</div>';
  }

  function speak(msg) { if (els.say) els.say.textContent = msg || ""; if (els.live) els.live.textContent = msg; }

  // footer action chip for lock/guardians/mint steps
  function setupAction(i) {
    // remove any prior action chip
    var old = els.hint.parentNode.querySelector(".breach-action");
    if (old) old.remove();
    var def = STEPS[i];
    if (!def.action) return;
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "btn-hud breach-action primary-soft";
    btn.textContent = def.action;
    btn.addEventListener("click", function () { runAction(i, btn); });
    els.hint.parentNode.insertBefore(btn, els.hint.nextSibling);
  }
  function runAction(i, btn) {
    btn.disabled = true; btn.classList.add("spent");
    if (i === 0) { paintLedger(0, true); speak("Locked 1 ETH, minted 1 wETH. Backed 1 to 1."); }
    else if (i === 1) { paintGuardians(true); paintChain(1); speak("13 of 19 guardians signed. A valid VAA is produced."); }
    else if (i === 4) {
      if (stopped) { paintLedger(0, true); els.modeTag.textContent = "COUNTERFACTUAL"; els.modeTag.className = "bl-mode-tag mode-therule"; els.note.textContent = "checked reader rejected the forgery — mint refused, 1:1 preserved"; paintChain(2); speak("With the checked reader the forged account was rejected — the 120,000 wETH mint never happens; the bridge stays solvent."); }
      else { paintLedger(4, true); paintChain(4); speak("120,000 wETH minted with zero ETH locked. The bridge is now unbacked."); }
    }
  }

  // ---------- navigation ----------
  function go(i) {
    i = Math.max(0, Math.min(STEPS.length - 1, i));
    step = i;
    var d = STEPS[i];
    if (els.say) els.say.textContent = ""; // fresh status per step
    els.head.innerHTML = d.head;
    els.bodyP.innerHTML = d.body;
    els.hint.textContent = d.hint;
    els.count.textContent = "STEP " + (i + 1) + " / " + STEPS.length;
    paintRail(i);
    paintChain(i);
    // ledger: animate on the dramatic transitions if the action is auto-applied;
    // for action-gated steps (0,1,4) show the *prior* settled state then let the chip animate.
    var gated = (i === 0 || i === 1 || i === 4);
    paintLedger(gated && i > 0 ? Math.max(0, i - 1) : i, false);
    if (i === 0) paintLedger(0, false); // step 1 baseline is its own 1/1 once acted; show empty-ish before
    if (i === 0) { // before the lock action, show 0/0
      els.modeTag.textContent = "THE RULE"; els.note.textContent = "press to mint your first wETH";
      els.lockRow.querySelector(".bl-fill").style.width = "0%"; els.lockRow.querySelector(".bl-val").textContent = "0";
      els.mintRow.querySelector(".bl-fill").style.width = "0%"; els.mintRow.querySelector(".bl-val").textContent = "0";
      els.ledger.setAttribute("data-status", "init");
    }
    buildFocus(i);
    setupAction(i);
    // auto-apply non-gated steps' ledger so back/forward is consistent
    if (i === 2 || i === 3) paintLedger(i, false);
    if (i === 3 && swapped) paintChain(3);
    if (i === 3 && stopped) paintChain(2);
    if (i === 4 && stopped) {
      els.head.innerHTML = "The mint that never happens";
      els.bodyP.innerHTML = "You fed the forged account through the <strong>checked</strong> reader, so it was rejected upstream — there’s nothing to mint. Press <strong>Try to mint</strong> and watch it refuse: the ledger stays <strong>1:1 backed</strong>. <span class=\"bl-note\">(In reality Wormhole used the unchecked call, so the mint went through — this is the one-line fix that would have prevented ~$320M.)</span>";
      paintChain(2);
      var ab4 = els.hint.parentNode.querySelector(".breach-action"); if (ab4) ab4.textContent = "Try to mint";
    }
    if (i === 5) paintLedger(5, !reduce);
    els.prev.disabled = (i === 0);
    els.next.textContent = (i === STEPS.length - 1) ? "Close" : "Next →";
    if (els.live) els.live.textContent = "Step " + (i + 1) + " of " + STEPS.length + ": " + d.head; // a11y only
    // move focus to heading for SR
    els.head.setAttribute("tabindex", "-1");
    try { els.head.focus({ preventScroll: false }); } catch (e) {}
  }

  // ---------- open / close ----------
  var lastFocused = null;
  function open(record) {
    lastRecord = record || lastRecord || commaRecord();
    build();
    swapped = false; readerChecked = false; stopped = false; step = 0;
    lastFocused = document.activeElement;
    document.body.classList.add("breach-lock");
    modal.classList.add("open");
    go(0);
  }
  function close() {
    if (!modal) return;
    modal.classList.remove("open");
    document.body.classList.remove("breach-lock");
    if (lastFocused && lastFocused.focus) { try { lastFocused.focus(); } catch (e) {} }
  }

  // ---------- boot ----------
  function init() { document.addEventListener("shm:select", onSelect); injectButton(); if (window.__shmSelected) onSelect({ detail: window.__shmSelected }); }
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);

  window.SHMBreach = { open: function () { open(commaRecord()); }, close: close, mount: init };
})();
