// Shareable record card — turns any landmark into a downloadable cyberpunk PNG.
// Self-contained: history-map.js delegates the Share button to window.SHMShareCard.open(landmark).
// No build step, no network. Canvas-rendered, web-font aware, degrades to text share.
(function () {
  "use strict";

  var W = 1080, H = 1350;
  var BG = "#05070b", INK = "#f5f8fc", MUTED = "#9aa6b8", FAINT = "rgba(255,255,255,0.07)";
  var GREEN = "#14f195", CYAN = "#46c7ec", PURPLE = "#9b6bff", RED = "#ff5066", GOLD = "#d7c08a";
  var MONO = "'JetBrains Mono', ui-monospace, monospace";
  var SANS = "'Inter', system-ui, -apple-system, sans-serif";
  var SITE = "meow-woof.org";
  var COMPLETIONS = {
    wormhole: {
      accent: RED,
      headline: "120,000 wETH / 0 ETH LOCKED",
      verdict: "An unchecked instruction reader accepted a forged verification path. The cryptography was not broken.",
      note: "Simplified replay of the February 2022 Wormhole breach.",
      source: "WORMHOLE + CHAINALYSIS",
      metrics: [["ACCOUNT", "FORGED"], ["READER", "UNCHECKED"], ["BACKING", "0 ETH"]]
    },
    mango: {
      accent: GOLD,
      headline: "A THIN ORACLE CREATED $431M BORROW POWER",
      verdict: "In this simplified model, unrealized PnL became collateral and real treasury assets left the protocol.",
      note: "Illustrative model of the October 2022 Mango Markets mechanism.",
      source: "CFTC + 2 REFERENCES",
      metrics: [["ORACLE", "+2,295%"], ["BORROW MODEL", "$431M"], ["TREASURY", "$0"]]
    },
    architects_echo: {
      accent: GREEN,
      headline: "MOVE ONE EVENT. EVERY LATER HASH CHANGES.",
      verdict: "Sequential SHA-256 makes ordering tamper-evident and independently re-checkable before consensus.",
      note: "PoH is a clock primitive feeding consensus, not consensus itself.",
      source: "SOLANA WHITEPAPER + 2",
      metrics: [["STAMP", "HASH #5"], ["MUTATION", "1 TICK"], ["RE-CHECK", "VERIFIED"]]
    }
  };

  // ---------- small helpers ----------
  function pad2(n) { n = n == null ? 0 : n; return n < 10 ? "0" + n : "" + n; }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  var MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  function fmtDate(l) {
    var d = l.date || (l.year ? String(l.year) : "");
    var m = /^(\d{4})-(\d{2})/.exec(d);
    if (m) return MONTHS[parseInt(m[2], 10) - 1] + " " + m[1];
    if (l.year) return String(l.year);
    return "";
  }
  function publisher(l) {
    if (!l.sources || !l.sources.length) return "";
    var lab = l.sources[0].label || "";
    var p = lab.split(":")[0].trim();
    if (p.length > 26) p = p.slice(0, 25) + "…";
    var extra = l.sources.length > 1 ? "  +" + (l.sources.length - 1) : "";
    return p + extra;
  }
  function wrap(ctx, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], line = "";
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = words[i]; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }
  // shrink font until the title fits within maxLines
  function fitTitle(ctx, text, maxW, startPx, minPx, maxLines) {
    var size = startPx, lines;
    while (size >= minPx) {
      ctx.font = "800 " + size + "px " + SANS;
      lines = wrap(ctx, text, maxW);
      if (lines.length <= maxLines) break;
      size -= 4;
    }
    return { size: size, lines: lines };
  }
  function fitLine(ctx, text, maxW, startPx, minPx, weight, family) {
    var size = startPx;
    while (size > minPx) {
      ctx.font = (weight || 700) + " " + size + "px " + (family || SANS);
      if (ctx.measureText(text).width <= maxW) break;
      size -= 2;
    }
    return size;
  }
  function solanaMark(ctx, x, y, w, h, color) {
    // three slanted parallelograms, the Solana glyph
    var gap = h * 0.55, sk = w * 0.22;
    ctx.fillStyle = color;
    for (var i = 0; i < 3; i++) {
      var yy = y + i * gap, dir = i === 1 ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(x + (dir > 0 ? sk : 0), yy);
      ctx.lineTo(x + w + (dir > 0 ? 0 : -sk), yy);
      ctx.lineTo(x + w + (dir > 0 ? -sk : 0), yy + h * 0.34);
      ctx.lineTo(x + (dir > 0 ? 0 : sk), yy + h * 0.34);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ---------- the card ----------
  function draw(cv, l) {
    var ctx = cv.getContext("2d");
    var danger = !!l.danger;
    var accent = danger ? RED : GREEN;
    var M = 84, CW = W - M * 2;

    // base
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);

    // glow blobs
    function blob(cx, cy, r, col, a) {
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, col.replace(")", "," + a + ")").replace("rgb", "rgba"));
      g.addColorStop(1, col.replace(")", ",0)").replace("rgb", "rgba"));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    blob(180, 150, 760, "rgb(20,241,149)", danger ? 0.05 : 0.16);
    blob(W - 120, 360, 720, danger ? "rgb(255,80,102)" : "rgb(70,199,236)", 0.12);
    blob(W - 220, H - 180, 820, "rgb(155,107,255)", 0.14);
    if (danger) blob(160, H - 260, 620, "rgb(255,80,102)", 0.10);

    // faint dot grid
    ctx.fillStyle = FAINT;
    for (var gx = 60; gx < W; gx += 46) for (var gy = 60; gy < H; gy += 46) { ctx.fillRect(gx, gy, 1.4, 1.4); }

    // giant watermark number
    ctx.save();
    ctx.font = "800 560px " + SANS;
    ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(255,255,255,0.035)";
    ctx.fillText(pad2(l.num), W - 40, H - 150);
    ctx.restore();

    // vignette
    var vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.18, W / 2, H / 2, H * 0.72);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(2,3,6,0.78)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    // frame + corner ticks
    ctx.strokeStyle = "rgba(255,255,255,0.10)"; ctx.lineWidth = 2;
    rr(ctx, 34, 34, W - 68, H - 68, 26); ctx.stroke();
    ctx.strokeStyle = accent; ctx.lineWidth = 3;
    var T = 46, off = 34;
    [[off, off, 1, 1], [W - off, off, -1, 1], [off, H - off, 1, -1], [W - off, H - off, -1, -1]].forEach(function (c) {
      ctx.beginPath();
      ctx.moveTo(c[0] + c[2] * T, c[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(c[0], c[1] + c[3] * T);
      ctx.stroke();
    });

    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";

    // header row
    ctx.font = "700 25px " + MONO;
    ctx.fillStyle = accent;
    ctx.fillText("● SOLANA HISTORY MAP", M, 112);
    ctx.font = "500 23px " + MONO;
    ctx.fillStyle = MUTED;
    ctx.textAlign = "right";
    ctx.fillText("SOURCE-CITED ATLAS", W - M, 112);
    ctx.textAlign = "left";
    ctx.strokeStyle = "rgba(255,255,255,0.10)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(M, 140); ctx.lineTo(W - M, 140); ctx.stroke();

    // big number + category + date
    ctx.font = "800 188px " + SANS;
    ctx.fillStyle = INK;
    var numStr = pad2(l.num);
    ctx.fillText(numStr, M - 4, 330);
    var numW = ctx.measureText(numStr).width;
    var colX = M + numW + 34;
    ctx.font = "700 36px " + MONO;
    ctx.fillStyle = accent;
    ctx.fillText("// " + (l.category || "RECORD").toUpperCase(), colX, 250);
    ctx.font = "500 30px " + MONO;
    ctx.fillStyle = MUTED;
    ctx.fillText(fmtDate(l), colX, 300);
    if (danger) {
      ctx.font = "700 22px " + MONO;
      ctx.fillStyle = RED;
      ctx.fillText("⚠ EXPLOIT / INCIDENT", colX, 340);
    }

    // accent divider
    ctx.fillStyle = accent;
    ctx.fillRect(M, 392, 92, 5);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(M + 100, 394, CW - 100, 1.5);

    // title
    var t = fitTitle(ctx, l.name || "", CW, 96, 56, 3);
    ctx.fillStyle = INK;
    ctx.font = "800 " + t.size + "px " + SANS;
    var ty = 392 + 70 + t.size;
    var lh = t.size * 1.04;
    t.lines.forEach(function (ln, i) { ctx.fillText(ln, M, ty + i * lh); });
    var afterTitle = ty + (t.lines.length - 1) * lh;

    // hook (tldr)
    ctx.font = "500 39px " + SANS;
    ctx.fillStyle = "rgba(232,238,247,0.92)";
    var hookLines = wrap(ctx, l.tldr || "", CW).slice(0, 6);
    var hy = afterTitle + 78;
    hookLines.forEach(function (ln, i) { ctx.fillText(ln, M, hy + i * 54); });

    // ---- lower block (anchored to bottom) ----
    var footY = H - 96;

    // sourced stamp
    var stampY = footY - 150;
    ctx.font = "700 24px " + MONO;
    var pub = publisher(l);
    var stampLabel = "SOURCED";
    var sw = ctx.measureText(stampLabel).width + 78;
    ctx.strokeStyle = accent; ctx.lineWidth = 2;
    rr(ctx, M, stampY, sw, 50, 8); ctx.stroke();
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(M + 26, stampY + 25, 6, 0, 6.2832); ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillText(stampLabel, M + 44, stampY + 33);
    if (pub) {
      ctx.font = "500 27px " + MONO;
      ctx.fillStyle = MUTED;
      ctx.fillText(pub, M + sw + 26, stampY + 33);
    }

    // footer rule
    ctx.strokeStyle = "rgba(255,255,255,0.10)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(M, footY - 44); ctx.lineTo(W - M, footY - 44); ctx.stroke();

    // footer: solana mark + domain (left), record N/22 (right)
    solanaMark(ctx, M, footY - 18, 40, 30, accent);
    ctx.font = "700 30px " + MONO;
    ctx.fillStyle = INK;
    ctx.fillText(SITE, M + 62, footY + 6);
    ctx.font = "500 26px " + MONO;
    ctx.fillStyle = MUTED;
    ctx.textAlign = "right";
    ctx.fillText("RECORD " + pad2(l.num) + " / 22", W - M, footY + 6);
    ctx.textAlign = "left";
  }

  function completionFor(l, options) {
    var base = COMPLETIONS[l.id];
    if (l.id === "wormhole" && options && options.variant === "prevented") {
      return {
        accent: GREEN,
        headline: "FORGERY REJECTED. THE MINT NEVER HAPPENS.",
        verdict: "The checked reader verified the real Instructions sysvar before trusting the account.",
        note: "Counterfactual replay: the bridge remains 1:1 backed.",
        source: "WORMHOLE + CHAINALYSIS",
        metrics: [["ACCOUNT", "FORGED"], ["READER", "CHECKED"], ["BACKING", "1:1"]]
      };
    }
    return base || {
      accent: l.danger ? RED : GREEN,
      headline: l.tldr || l.name,
      verdict: l.whyItMatters || "A playable, source-cited teardown completed.",
      note: "Interactive model completed in Solana History Map.",
      metrics: [["RECORD", pad2(l.num)], ["STATUS", "COMPLETE"], ["SOURCES", String((l.sources || []).length)]]
    };
  }

  function drawCompletion(cv, l, options) {
    var ctx = cv.getContext("2d");
    var c = completionFor(l, options || {});
    var accent = c.accent || (l.danger ? RED : GREEN);
    var M = 74, CW = W - M * 2;

    ctx.fillStyle = "#06080d";
    ctx.fillRect(0, 0, W, H);

    // Archive grid and technical rails: deliberately flat, no decorative glow blobs.
    ctx.strokeStyle = "rgba(255,255,255,0.045)";
    ctx.lineWidth = 1;
    for (var x = 34; x < W; x += 46) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (var y = 34; y < H; y += 46) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 16, H);
    ctx.fillRect(16, 0, W - 16, 10);
    ctx.fillStyle = "rgba(255,255,255,0.035)";
    ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W, 350); ctx.lineTo(W - 350, 0); ctx.closePath(); ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 2;
    ctx.strokeRect(34, 34, W - 68, H - 68);
    ctx.strokeStyle = accent;
    ctx.beginPath(); ctx.moveTo(34, 136); ctx.lineTo(W - 34, 136); ctx.stroke();

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = "700 23px " + MONO;
    ctx.fillStyle = accent;
    ctx.fillText("● SOLANA HISTORY MAP", M, 94);
    ctx.textAlign = "right";
    ctx.fillStyle = MUTED;
    ctx.font = "500 21px " + MONO;
    ctx.fillText("PLAYABLE ARCHIVE / VERIFIED", W - M, 94);

    ctx.textAlign = "left";
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    rr(ctx, M, 170, 342, 50, 6); ctx.stroke();
    ctx.fillStyle = accent;
    ctx.font = "800 22px " + MONO;
    ctx.fillText("✓ TEARDOWN COMPLETE", M + 24, 203);
    ctx.textAlign = "right";
    ctx.font = "800 62px " + SANS;
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillText(pad2(l.num), W - M, 215);

    ctx.textAlign = "left";
    ctx.font = "800 48px " + SANS;
    ctx.fillStyle = INK;
    ctx.fillText(l.name || "SOLANA RECORD", M, 294);
    ctx.font = "600 23px " + MONO;
    ctx.fillStyle = MUTED;
    ctx.fillText((l.category || "RECORD").toUpperCase() + "  /  " + fmtDate(l), M, 334);

    ctx.fillStyle = accent;
    ctx.fillRect(M, 374, 130, 6);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(M + 142, 376, CW - 142, 2);

    var h = fitTitle(ctx, c.headline, CW, 88, 58, 3);
    ctx.fillStyle = INK;
    ctx.font = "850 " + h.size + "px " + SANS;
    var headlineY = 438 + h.size;
    var headlineLh = h.size * 1.02;
    h.lines.forEach(function (line, i) { ctx.fillText(line, M, headlineY + i * headlineLh); });
    var afterHeadline = headlineY + (h.lines.length - 1) * headlineLh;

    ctx.font = "700 20px " + MONO;
    ctx.fillStyle = accent;
    ctx.fillText("MECHANISM VERDICT", M, afterHeadline + 70);
    ctx.font = "500 34px " + SANS;
    ctx.fillStyle = "rgba(238,243,250,0.92)";
    var verdict = wrap(ctx, c.verdict, CW).slice(0, 4);
    verdict.forEach(function (line, i) { ctx.fillText(line, M, afterHeadline + 122 + i * 46); });

    var metricsY = 944;
    var colW = CW / 3;
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(M, metricsY); ctx.lineTo(W - M, metricsY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(M, metricsY + 150); ctx.lineTo(W - M, metricsY + 150); ctx.stroke();
    for (var mi = 0; mi < 3; mi++) {
      var mx = M + mi * colW;
      if (mi) { ctx.beginPath(); ctx.moveTo(mx, metricsY); ctx.lineTo(mx, metricsY + 150); ctx.stroke(); }
      ctx.font = "600 18px " + MONO;
      ctx.fillStyle = MUTED;
      ctx.fillText(c.metrics[mi][0], mx + 22, metricsY + 42);
      var value = c.metrics[mi][1];
      var valueSize = fitLine(ctx, value, colW - 44, 38, 24, 800, SANS);
      ctx.font = "800 " + valueSize + "px " + SANS;
      ctx.fillStyle = mi === 2 ? accent : INK;
      ctx.fillText(value, mx + 22, metricsY + 105);
    }

    ctx.font = "500 23px " + SANS;
    ctx.fillStyle = MUTED;
    var notes = wrap(ctx, c.note, CW).slice(0, 2);
    notes.forEach(function (line, i) { ctx.fillText(line, M, 1148 + i * 34); });
    var pub = publisher(l);
    ctx.font = "600 19px " + MONO;
    ctx.fillStyle = "rgba(255,255,255,0.54)";
    if (c.source || pub) ctx.fillText("SOURCES  /  " + (c.source || pub.toUpperCase()), M, 1217);

    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.beginPath(); ctx.moveTo(M, 1244); ctx.lineTo(W - M, 1244); ctx.stroke();
    solanaMark(ctx, M, 1270, 38, 28, accent);
    ctx.font = "800 29px " + MONO;
    ctx.fillStyle = INK;
    ctx.fillText(SITE, M + 58, 1293);
    ctx.textAlign = "right";
    ctx.font = "500 20px " + MONO;
    ctx.fillStyle = MUTED;
    ctx.fillText("OPEN SOURCE · SOURCE-CITED", W - M, 1293);
    ctx.textAlign = "left";
  }

  function buildCanvas(l, options) {
    var cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.className = "shm-card-canvas";
    if (options && options.completed) drawCompletion(cv, l, options);
    else draw(cv, l);
    return cv;
  }

  function loadCardFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load("850 88px 'Inter'"),
      document.fonts.load("800 62px 'Inter'"),
      document.fonts.load("500 39px 'Inter'"),
      document.fonts.load("700 23px 'JetBrains Mono'"),
      document.fonts.load("500 21px 'JetBrains Mono'")
    ]);
  }

  // ---------- modal ----------
  var modal = null, preview = null, statusEl = null, cur = null, curOptions = null, curCanvas = null;
  function track(event) { if (window.SHMStats && window.SHMStats.track) window.SHMStats.track(event, cur && cur.id); }

  function filenameFor(l) { return "solana-history-" + pad2(l.num) + "-" + (l.id || "record") + (curOptions && curOptions.completed ? "-complete" : "") + ".png"; }
  function recordUrl(l) {
    if (l.tier === "playable" || COMPLETIONS[l.id]) return location.origin + location.pathname + "?play=" + encodeURIComponent(l.id) + "&src=share_card#" + encodeURIComponent(l.id);
    return location.origin + location.pathname + "#" + encodeURIComponent(l.id);
  }
  function shareText(l) {
    if (curOptions && curOptions.completed) return completionFor(l, curOptions).headline + " — replayed in Solana History Map";
    return l.name + " — " + (l.tldr || "");
  }
  function flash(msg) { if (statusEl) { statusEl.textContent = msg; clearTimeout(flash._t); flash._t = setTimeout(function () { statusEl.textContent = ""; }, 2600); } }

  function ensureModal() {
    if (modal) return;
    modal = document.createElement("div");
    modal.className = "shm-card-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-label", "Share this record");
    modal.innerHTML =
      '<div class="shm-card-backdrop" data-close></div>' +
      '<div class="shm-card-dialog">' +
        '<button class="shm-card-x" data-close aria-label="Close">✕</button>' +
        '<div class="shm-card-stage"><div class="shm-card-preview"></div></div>' +
        '<div class="shm-card-bar">' +
          '<button class="shm-card-btn primary" data-act="download">Download PNG</button>' +
          '<button class="shm-card-btn" data-act="share">Share</button>' +
          '<button class="shm-card-btn" data-act="copy">Copy link</button>' +
          '<button class="shm-card-btn ghost" data-act="tweet">Post to X</button>' +
        '</div>' +
        '<p class="shm-card-status" aria-live="polite"></p>' +
      '</div>';
    document.body.appendChild(modal);
    preview = modal.querySelector(".shm-card-preview");
    statusEl = modal.querySelector(".shm-card-status");

    modal.addEventListener("click", function (e) {
      var act = e.target.getAttribute("data-act");
      if (e.target.hasAttribute("data-close")) return close();
      if (act) handle(act);
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal.classList.contains("open")) close(); });
  }

  function close() { if (modal) { modal.classList.remove("open"); if (preview) preview.innerHTML = ""; } }

  function toBlob(cb) {
    if (!curCanvas) return;
    if (curCanvas.toBlob) curCanvas.toBlob(function (b) { cb(b); }, "image/png");
    else { var d = curCanvas.toDataURL("image/png"); var bin = atob(d.split(",")[1]); var arr = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); cb(new Blob([arr], { type: "image/png" })); }
  }

  function handle(act) {
    if (!cur) return;
    if (act === "download") {
      track("share_download");
      toBlob(function (b) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(b); a.download = filenameFor(cur);
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        flash("Saved " + filenameFor(cur));
      });
    } else if (act === "share") {
      track("share_native");
      toBlob(function (b) {
        var file = new File([b], filenameFor(cur), { type: "image/png" });
        var payload = { title: cur.name, text: shareText(cur), url: recordUrl(cur) };
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: payload.title, text: payload.text }).catch(function () {});
        } else if (navigator.share) {
          navigator.share(payload).catch(function () {});
        } else {
          handle("download"); flash("Image saved — attach it to your post");
        }
      });
    } else if (act === "copy") {
      track("share_copy");
      var url = recordUrl(cur);
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { flash("Link copied"); }, function () { flash(url); });
      else flash(url);
    } else if (act === "tweet") {
      track("share_x");
      var text = shareText(cur);
      window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(recordUrl(cur)), "_blank", "noopener");
    }
  }

  function open(l, options) {
    if (!l) return;
    cur = l;
    curOptions = options || {};
    track("share_open");
    ensureModal();
    var render = function () {
      curCanvas = buildCanvas(l, curOptions);
      preview.innerHTML = ""; preview.appendChild(curCanvas);
      modal.setAttribute("data-mode", curOptions.completed ? "completion" : "record");
      modal.classList.add("open");
    };
    loadCardFonts().then(render, render);
  }

  window.SHMShareCard = { open: open, renderForTest: buildCanvas, loadFontsForTest: loadCardFonts };
})();
