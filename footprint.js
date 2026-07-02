(function () {
  // Demo uses the public RPC. Before launch, point this at YOUR Cloudflare Worker
  // proxy (Helius key hidden as a Worker secret) — frontend code stays the same.
  var RPC_URL = "https://api.mainnet-beta.solana.com";
  var TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

  // Verified mainnet mints -> faction + the landmark they evoke.
  var TOKENS = [
    { sym: "JUP", mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", faction: "none", landmark: "jup_drop", line: "Holds JUP — a relic of the Grand Airdrop" },
    { sym: "WEN", mint: "WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk", faction: "none", landmark: "wen_temple", line: "Holds WEN — answered the eternal “when?”" },
    { sym: "BONK", mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", faction: "dog", landmark: "woof_city", line: "Holds BONK — flies the dog dynasty colors" },
    { sym: "WIF", mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", faction: "dog", landmark: "woof_city", line: "Holds WIF — the pink-beanie Shiba" },
    { sym: "MEW", mint: "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5", faction: "cat", landmark: "meow_sanctuary", line: "Holds MEW — a cat in a dog’s world" },
    { sym: "POPCAT", mint: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", faction: "cat", landmark: "meow_sanctuary", line: "Holds POPCAT — the clicking cat" }
  ];
  var MINT_SET = {}; TOKENS.forEach(function (t) { MINT_SET[t.mint] = t; });

  var byId = new Map((window.SOLANA_HISTORY_LANDMARKS || []).map(function (l) { return [l.id, l.name]; }));

  var addrEl = document.getElementById("fp-addr");
  var traceBtn = document.getElementById("fp-trace");
  var connectBtn = document.getElementById("fp-connect");
  var exampleBtn = document.getElementById("fp-example");
  var statusEl = document.getElementById("fp-status");
  var resultEl = document.getElementById("fp-result");

  function esc(v) { return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
  function setStatus(msg, isErr) { statusEl.textContent = msg || ""; statusEl.classList.toggle("error", !!isErr); }
  function validAddr(a) { return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a); }
  function shortAddr(a) { return a.length > 12 ? a.slice(0, 4) + "…" + a.slice(-4) : a; }

  function rpc(method, params) {
    return fetch(RPC_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: method, params: params })
    }).then(function (r) {
      if (!r.ok) throw new Error("RPC " + r.status);
      return r.json();
    }).then(function (j) { if (j.error) throw new Error(j.error.message || "RPC error"); return j.result; });
  }

  function getHeldSyms(addr) {
    return rpc("getParsedTokenAccountsByOwner", [addr, { programId: TOKEN_PROGRAM }, { encoding: "jsonParsed" }])
      .then(function (res) {
        var held = [];
        (res && res.value || []).forEach(function (acc) {
          try {
            var info = acc.account.data.parsed.info;
            var amt = info.tokenAmount && info.tokenAmount.uiAmount;
            if (amt > 0 && MINT_SET[info.mint]) held.push(MINT_SET[info.mint].sym);
          } catch (e) {}
        });
        return held;
      });
  }

  function getEra(addr) {
    return rpc("getSignaturesForAddress", [addr, { limit: 1000 }]).then(function (sigs) {
      if (!sigs || !sigs.length) return { firstYear: null, txLabel: "0" };
      var oldest = sigs[sigs.length - 1];
      var firstYear = oldest && oldest.blockTime ? new Date(oldest.blockTime * 1000).getUTCFullYear() : null;
      var txLabel = sigs.length >= 1000 ? "1000+" : String(sigs.length);
      return { firstYear: firstYear, txLabel: txLabel };
    });
  }

  function eraLabel(y) {
    if (!y) return "Unknown era";
    if (y <= 2021) return "Solana OG · " + y;
    if (y === 2022) return "FTX-era · 2022";
    if (y === 2023) return "Bear-builder · 2023";
    if (y === 2024) return "Meme-season · 2024";
    return "Recent arrival · " + y;
  }
  function factionOf(held) {
    var f = TOKENS.filter(function (t) { return held.indexOf(t.sym) >= 0; }).map(function (t) { return t.faction; });
    var dog = f.indexOf("dog") >= 0, cat = f.indexOf("cat") >= 0;
    return dog && cat ? "both" : dog ? "dog" : cat ? "cat" : "none";
  }

  function buildFootprint(fp) {
    // fp: { address, firstYear, txLabel, held:[syms] }
    var lms = [], seen = {};
    function add(id, tag, text) { var k = id + "|" + text; if (seen[k]) return; seen[k] = 1; lms.push({ id: id, tag: tag, text: text }); }
    if (fp.firstYear && fp.firstYear <= 2022) add("ftx_crater", String(fp.firstYear), "On Solana through the FTX Fallout Crater era");
    TOKENS.forEach(function (t) { if (fp.held.indexOf(t.sym) >= 0) add(t.landmark, t.sym, t.line); });
    return lms;
  }

  function render(fp) {
    var lms = buildFootprint(fp);
    var faction = factionOf(fp.held);
    var factionLabel = faction === "both" ? "Cat + Dog" : faction === "dog" ? "Dog dynasty" : faction === "cat" ? "Cat season" : "Unaligned";
    var era = eraLabel(fp.firstYear);

    var chips = lms.length ? lms.map(function (l) {
      var name = byId.get(l.id) || l.id;
      return '<a class="fp-lm" href="./landmarks/' + esc(l.id) + '.html" title="' + esc(name) + '">' +
        '<span class="fp-lm-tag">' + esc(l.tag) + '</span><span class="fp-lm-text">' + esc(l.text) + '</span></a>';
    }).join("") : '<p class="fp-empty">No mapped landmarks from current holdings — but every wallet has a story. Try one that holds JUP, BONK, WIF, MEW, or POPCAT.</p>';

    resultEl.innerHTML =
      '<div class="fp-card" id="fp-card">' +
        '<div class="fp-card-top">Solana history · footprint</div>' +
        '<div class="fp-addr">' + esc(shortAddr(fp.address)) + '</div>' +
        '<h2 class="fp-headline">You’ve walked ' + lms.length + ' moment' + (lms.length === 1 ? "" : "s") + ' on the map.</h2>' +
        '<div class="fp-badges">' +
          '<span class="fp-badge">ERA · ' + esc(era) + '</span>' +
          '<span class="fp-badge ' + (faction === "none" ? "" : faction) + '">FACTION · ' + esc(factionLabel) + '</span>' +
          '<span class="fp-badge">TX · ' + esc(fp.txLabel) + '</span>' +
        '</div>' +
        '<div class="fp-landmarks">' + chips + '</div>' +
        '<div class="fp-wm">SOLANA HISTORY MAP</div>' +
      '</div>' +
      '<div class="fp-actions">' +
        '<button class="btn-hud" id="fp-share" type="button">Share</button>' +
        '<a class="btn-hud" href="./index.html">Back to map</a>' +
      '</div>';
    resultEl.hidden = false;

    var shareBtn = document.getElementById("fp-share");
    if (shareBtn) shareBtn.addEventListener("click", function () {
      var url = location.origin + location.pathname;
      var text = "My Solana history footprint: " + era + (faction !== "none" ? ", " + factionLabel : "") +
        ", " + lms.length + " landmark" + (lms.length === 1 ? "" : "s") + " walked. Trace yours —";
      if (navigator.share) { navigator.share({ title: "Solana history footprint", text: text, url: url }).catch(function () {}); return; }
      window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(url), "_blank", "noopener");
    });
  }

  function trace(addr) {
    addr = (addr || "").trim();
    if (!validAddr(addr)) { setStatus("That doesn’t look like a Solana address (base58, 32–44 chars).", true); return; }
    setStatus("Reading the chain…");
    resultEl.hidden = true;
    Promise.all([getHeldSyms(addr), getEra(addr)]).then(function (out) {
      setStatus("");
      render({ address: addr, held: out[0], firstYear: out[1].firstYear, txLabel: out[1].txLabel });
    }).catch(function (e) {
      setStatus("Couldn’t read the chain (" + (e.message || "RPC error") + "). The public RPC rate-limits browsers — wire up the Worker proxy for reliability.", true);
    });
  }

  function example() {
    setStatus("Example footprint (sample data).");
    render({ address: "EXAMPLE7xKXtg2CW87d97TXJSDpbD5jBkheTqA9aZj", held: ["JUP", "BONK", "WIF"], firstYear: 2021, txLabel: "1000+" });
  }

  function init() {
    if (traceBtn) traceBtn.addEventListener("click", function () { trace(addrEl.value); });
    if (addrEl) addrEl.addEventListener("keydown", function (e) { if (e.key === "Enter") trace(addrEl.value); });
    if (exampleBtn) exampleBtn.addEventListener("click", example);
    if (window.solana && window.solana.isPhantom && connectBtn) {
      connectBtn.hidden = false;
      connectBtn.addEventListener("click", function () {
        window.solana.connect().then(function (resp) {
          var pk = resp.publicKey.toString();
          addrEl.value = pk; trace(pk);
        }).catch(function () { setStatus("Connection cancelled.", true); });
      });
    }
    // deep-link ?addr=
    var m = location.search.match(/[?&]addr=([1-9A-HJ-NP-Za-km-z]{32,44})/);
    if (m) { addrEl.value = m[1]; trace(m[1]); }
  }
  init();
})();
