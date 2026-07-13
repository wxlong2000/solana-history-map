// Opens a requested playable teardown after the map and both simulator engines
// are ready. Unknown or non-playable IDs safely remain on the selected record.
(function () {
  "use strict";

  var opened = false;

  function requestedId() {
    try {
      var id = new URLSearchParams(location.search).get("play") || "";
      return /^[a-z0-9_]{1,40}$/.test(id) ? id : "";
    } catch (e) {
      return "";
    }
  }

  function selectRecord(id) {
    if (!window.SHM || !window.SHM.byId || !window.SHM.byId.has(id)) return false;
    window.SHM.select(id, { noHash: true });
    if (location.hash !== "#" + id) history.replaceState(null, "", location.pathname + location.search + "#" + id);
    return true;
  }

  function openRequested() {
    if (opened) return;
    var id = requestedId();
    if (!id || !selectRecord(id)) return;

    var mode = "";
    try { mode = new URLSearchParams(location.search).get("mode") || ""; } catch (e) {}

    if (id === "wormhole" && mode === "challenge" && window.SHMChallenge && window.SHMChallenge.open) {
      opened = true;
      window.SHMChallenge.open();
      return;
    }

    if (id === "wormhole" && window.SHMBreach && window.SHMBreach.open) {
      opened = true;
      window.SHMBreach.open();
      return;
    }

    if (window.SHMSim && window.SHMSim.has && window.SHMSim.has(id)) {
      opened = true;
      window.SHMSim.open(id);
    }
  }

  function init() {
    // One frame lets the selected-record event settle before the modal takes focus.
    requestAnimationFrame(openRequested);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
