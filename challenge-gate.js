// Optional no-spoiler prediction gate for the Wormhole teardown.
// The normal Play button remains unchanged; this is an alternate entry path.
(function () {
  "use strict";

  var modal = null, feedback = null, launchButton = null, lastFocused = null, answered = false;

  function track(event) {
    if (window.SHMStats && window.SHMStats.track) window.SHMStats.track(event, "wormhole");
  }

  function build() {
    if (modal) return;
    modal = document.createElement("div");
    modal.className = "challenge-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "challenge-title");
    modal.innerHTML =
      '<div class="challenge-backdrop" data-close></div>' +
      '<div class="challenge-dialog" role="document">' +
        '<div class="challenge-top"><span>NO-SPOILER ENTRY · WORMHOLE 2022</span><button type="button" class="challenge-x" data-close aria-label="Close challenge">✕</button></div>' +
        '<div class="challenge-index" aria-hidden="true">PREDICTION / 01</div>' +
        '<h2 id="challenge-title" tabindex="-1">What failed first?</h2>' +
        '<p class="challenge-lead">Make a prediction before the replay reveals the mechanism.</p>' +
        '<div class="challenge-options" role="group" aria-label="Choose what failed first">' +
          '<button type="button" data-answer="signatures"><b>01</b><span>Guardian signatures were forged</span></button>' +
          '<button type="button" data-answer="account"><b>02</b><span>The instruction account was not validated</span></button>' +
          '<button type="button" data-answer="consensus"><b>03</b><span>Consensus accepted an invalid block</span></button>' +
        '</div>' +
        '<div class="challenge-feedback" aria-live="polite" hidden></div>' +
        '<div class="challenge-actions"><button type="button" class="btn-hud" data-skip>Skip prediction</button><button type="button" class="btn-hud primary" data-launch hidden>Replay the mechanism →</button></div>' +
      '</div>';
    document.body.appendChild(modal);
    feedback = modal.querySelector(".challenge-feedback");
    launchButton = modal.querySelector("[data-launch]");

    modal.addEventListener("click", function (event) {
      var target = event.target.closest ? event.target.closest("button,[data-close]") : event.target;
      if (!target) return;
      if (target.hasAttribute("data-close")) return close();
      if (target.hasAttribute("data-skip")) { track("challenge_skip"); return launch(); }
      if (target.hasAttribute("data-launch")) return launch();
      if (target.hasAttribute("data-answer")) answer(target);
    });
    document.addEventListener("keydown", function (event) {
      if (!modal.classList.contains("open")) return;
      if (event.key === "Escape") close();
      else if (event.key === "Tab") trap(event);
    });
  }

  function answer(button) {
    if (answered) return;
    answered = true;
    var correct = button.getAttribute("data-answer") === "account";
    track(correct ? "challenge_answer_correct" : "challenge_answer_other");
    var options = modal.querySelectorAll("[data-answer]");
    for (var i = 0; i < options.length; i++) {
      options[i].disabled = true;
      if (options[i] === button) options[i].setAttribute("data-selected", "true");
      if (options[i].getAttribute("data-answer") === "account") options[i].setAttribute("data-correct", "true");
    }
    feedback.hidden = false;
    feedback.innerHTML = correct
      ? '<strong>Correct.</strong> The signatures were valid; the unchecked reader trusted a look-alike instruction account.'
      : '<strong>Not this time.</strong> The signatures and consensus held. An unchecked reader trusted a look-alike instruction account.';
    launchButton.hidden = false;
    launchButton.focus();
  }

  function trap(event) {
    var nodes = Array.prototype.filter.call(modal.querySelectorAll('button:not([disabled]),[tabindex]:not([tabindex="-1"])'), function (node) { return node.offsetParent !== null; });
    if (!nodes.length) return;
    var first = nodes[0], last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function open() {
    build();
    answered = false;
    feedback.hidden = true;
    feedback.textContent = "";
    launchButton.hidden = true;
    var options = modal.querySelectorAll("[data-answer]");
    for (var i = 0; i < options.length; i++) {
      options[i].disabled = false;
      options[i].removeAttribute("data-selected");
      options[i].removeAttribute("data-correct");
    }
    lastFocused = document.activeElement;
    document.body.classList.add("breach-lock");
    modal.classList.add("open");
    track("challenge_open");
    requestAnimationFrame(function () { modal.querySelector("#challenge-title").focus(); });
  }

  function close() {
    if (!modal) return;
    modal.classList.remove("open");
    document.body.classList.remove("breach-lock");
    if (lastFocused && lastFocused.focus) { try { lastFocused.focus(); } catch (e) {} }
  }

  function launch() {
    close();
    if (window.SHMBreach && window.SHMBreach.open) window.SHMBreach.open();
  }

  function injectButton() {
    var actions = document.querySelector(".panel-actions");
    if (!actions || document.getElementById("btn-wormhole-challenge")) return;
    var button = document.createElement("button");
    button.id = "btn-wormhole-challenge";
    button.type = "button";
    button.className = "btn-hud btn-challenge";
    button.hidden = true;
    button.textContent = "◇ No-spoiler challenge";
    button.setAttribute("aria-label", "Predict the Wormhole failure before the replay");
    button.addEventListener("click", open);
    var play = document.getElementById("btn-breach");
    if (play && play.parentNode === actions) actions.insertBefore(button, play.nextSibling);
    else actions.insertBefore(button, actions.firstChild);
  }

  function onSelect(event) {
    injectButton();
    var record = event && event.detail;
    var button = document.getElementById("btn-wormhole-challenge");
    if (button) button.hidden = !(record && record.id === "wormhole");
  }

  function init() {
    document.addEventListener("shm:select", onSelect);
    injectButton();
    if (window.__shmSelected) onSelect({ detail: window.__shmSelected });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  window.SHMChallenge = { open: open, close: close };
})();
