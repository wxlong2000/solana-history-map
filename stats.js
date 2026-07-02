// Privacy-first page-view ping — the ENTIRE analytics stack of this site is
// this file plus the /api/hit endpoint in _worker.js (Workers Analytics Engine).
// No cookies, no fingerprinting, no third parties, no IDs of any kind: one
// beacon per page view carrying (path, referrer, coarse device class).
// Honors Do-Not-Track and Global Privacy Control (also enforced server-side).
(function () {
  "use strict";
  try {
    if (navigator.doNotTrack === "1" || window.globalPrivacyControl) return;
    var payload = JSON.stringify({
      p: location.pathname,
      r: document.referrer || "",
      m: window.matchMedia && matchMedia("(max-width: 760px)").matches ? 1 : 0,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/hit", new Blob([payload], { type: "application/json" }));
    } else {
      fetch("/api/hit", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(function () {});
    }
  } catch (e) { /* analytics must never break the page */ }
})();
