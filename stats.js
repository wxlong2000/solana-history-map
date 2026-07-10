// Privacy-first aggregate analytics. No cookies, fingerprints, user IDs, or
// third-party scripts. Events carry only a canonical path, event name, optional
// landmark/action key, referrer host (derived server-side), coarse device class,
// and an optional campaign label. DNT/GPC are honored here and server-side.
(function () {
  "use strict";
  if (navigator.doNotTrack === "1" || window.globalPrivacyControl) return;

  function campaign() {
    try {
      var q = new URLSearchParams(location.search);
      return q.get("utm_source") || q.get("src") || "";
    } catch (e) { return ""; }
  }

  function landmarkKey() {
    var hash = (location.hash || "").replace(/^#/, "");
    if (/^[a-z0-9_]{1,40}$/.test(hash)) return hash;
    var m = location.pathname.match(/^\/landmarks\/([a-z0-9_]+)(?:\.html)?\/?$/);
    return m ? m[1] : "";
  }

  function send(event, object) {
    try {
      var payload = JSON.stringify({
        p: location.pathname,
        r: document.referrer || "",
        m: window.matchMedia && matchMedia("(max-width: 760px)").matches ? 1 : 0,
        e: event || "pageview",
        o: object || "",
        c: campaign(),
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/hit", new Blob([payload], { type: "application/json" }));
      } else {
        fetch("/api/hit", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(function () {});
      }
    } catch (e) { /* analytics must never break the page */ }
  }

  window.SHMStats = { track: send, landmark: landmarkKey };
  send("pageview", landmarkKey());

  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (/^https:\/\/github\.com\/wxlong2000\/solana-history-map(?:[\/#?]|$)/i.test(href)) {
      send("github_click", "repo");
    } else if (a.closest(".source-line,.sim-sources,.evidence")) {
      send("source_click", landmarkKey());
    }
  });
})();
