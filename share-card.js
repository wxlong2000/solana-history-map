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

  function buildCanvas(l) {
    var cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.className = "shm-card-canvas";
    draw(cv, l);
    return cv;
  }

  // ---------- modal ----------
  var modal = null, preview = null, statusEl = null, cur = null, curCanvas = null;

  function filenameFor(l) { return "solana-history-" + pad2(l.num) + "-" + (l.id || "record") + ".png"; }
  function recordUrl(l) { return location.origin + location.pathname + "#" + l.id; }
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
      toBlob(function (b) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(b); a.download = filenameFor(cur);
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        flash("Saved " + filenameFor(cur));
      });
    } else if (act === "share") {
      toBlob(function (b) {
        var file = new File([b], filenameFor(cur), { type: "image/png" });
        var payload = { title: cur.name, text: cur.name + " — " + (cur.tldr || ""), url: recordUrl(cur) };
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: payload.title, text: payload.text }).catch(function () {});
        } else if (navigator.share) {
          navigator.share(payload).catch(function () {});
        } else {
          handle("download"); flash("Image saved — attach it to your post");
        }
      });
    } else if (act === "copy") {
      var url = recordUrl(cur);
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { flash("Link copied"); }, function () { flash(url); });
      else flash(url);
    } else if (act === "tweet") {
      var text = cur.name + " — " + (cur.tldr || "") + "  via Solana History Map";
      window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(recordUrl(cur)), "_blank", "noopener");
    }
  }

  function open(l) {
    if (!l) return;
    cur = l;
    ensureModal();
    var render = function () {
      curCanvas = buildCanvas(l);
      preview.innerHTML = ""; preview.appendChild(curCanvas);
      modal.classList.add("open");
    };
    if (document.fonts && document.fonts.load) {
      Promise.all([
        document.fonts.load("800 96px 'Inter'"),
        document.fonts.load("500 39px 'Inter'"),
        document.fonts.load("700 36px 'JetBrains Mono'")
      ]).then(render, render);
    } else render();
  }

  window.SHMShareCard = { open: open };
})();
