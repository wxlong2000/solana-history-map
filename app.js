const LANDMARKS = [
  { id: "architects_echo", name: "ARCHITECT’S ECHO", x: 82.3, y: 23.3 },
  { id: "backpack", name: "BEARPROOF BASTION", x: 83.9, y: 76.6 },
  { id: "firedancer", name: "FIREDANCER REACTOR", x: 65.6, y: 42.4 },
  { id: "ftx_crater", name: "FTX FALLOUT CRATER", x: 52.9, y: 65.3, side: "meow" },
  { id: "gigachad", name: "DIAMONDHANDS FORGE", x: 28.1, y: 47.9 },
  { id: "helium", name: "MIGRATION GATE", x: 57.7, y: 19.1 },
  { id: "jup_drop", name: "GRAND AIRDROP SHRINE", x: 41.1, y: 18.9 },
  { id: "jup_port", name: "AGGREGATOR STARPORT", x: 69.6, y: 66.3 },
  { id: "mango", name: "ORACLE MIRAGE", x: 39.2, y: 31.3 },
  { id: "meow_sanctuary", name: "MEOW SANCTUARY", x: 25.1, y: 75.7 },
  { id: "mew_forest", name: "MEWVEIL WOODS", x: 77.4, y: 41.3 },
  { id: "myro", name: "PUP-LINE CIRCUIT", x: 71.4, y: 28.2 },
  { id: "ore", name: "CONGESTION MINE", x: 53.1, y: 32.8 },
  { id: "pumpfun", name: "DEGEN LAUNCHPAD", x: 80.2, y: 54.7 },
  { id: "raydium", name: "LIQUIDITY VORTEX", x: 56.8, y: 79.8, side: "meow" },
  { id: "restart", name: "MOUNT RESTART", x: 24.6, y: 23.2 },
  { id: "saga", name: "SAGA MONOLITH", x: 45.1, y: 57.7 },
  { id: "shark_bay", name: "SHARKCAT COVE", x: 39.1, y: 81.3 },
  { id: "slope", name: "LEAK RUINS", x: 32.7, y: 69.4 },
  { id: "wen_temple", name: "TEMPLE OF \"WHEN?\"", x: 16.1, y: 35.3 },
  { id: "woof_city", name: "WOOF IRONWORKS", x: 84.6, y: 38.6 },
  { id: "wormhole", name: "WORMHOLE BREACH", x: 89.5, y: 60.0 },
];

const MOCK_STATE = {
  roundCurrent: 1,
  defcon: 1,
  resetIn: "04h 58m 14s",
  ca: "MEOW: CAign7KRPN5xSxHALXiYJBPfyaGurmXg7hMST7snixFH | WOOF: 9aZjzzYXv4pqwdJLSxJwAaMS8dhSMV2bWkL71SKbu9U6",
  ticker: "MEOW vs WOOF is live. Weekly War Chest unlock at week start. Voting decides allocation.",
  pin: "Weekly War Chest unlock happens at week start.",
  intel: "Weekly War Chest unlock happens at week start. Voting decides allocation.",
  tokenSupply: { meow: 5000000000, woof: 5000000000 },
  locks: {
    lpPct: 70, warPct: 20, teamPct: 10,
    lpStatus: "LP BURNED",
    warStatus: "WEEKLY UNLOCKS",
    teamStatus: "LINEAR 12M",
    lpTtl: "",
    warTtl: "04d 12h",
    teamTtl: "STARTS IN 05m 18d"
  },
  proofs: {
    meow: {
      lp: "https://solscan.io/tx/317Jac7WJWCgkrsEZouMfmmEKzvKScxSVP3e95g2gbHZxZkmtCDr4mzkAa6f1RSbjhA7Dc2cnHTauG1ziGKiTWd",
      war: "https://app.streamflow.finance/contract/solana/mainnet/51zie9oHdgM2jUtxsRNxMYrQCLXZs5mm5CmqXHrBhyWi",
      team: "https://app.streamflow.finance/contract/solana/mainnet/Bn8QfWjUxXDBJEjgoroy6ktorF9vqHHCws3gMZPzNNH",
    },
    woof: {
      lp: "https://solscan.io/tx/24o9BVJrZroMpADudjcXPQ3pWF3qQKzfQTTddRiRiE1kL5nZEXCGFT7TrHxZtn4QmdcNzkHFd5ZwNzRp8eSjRxVw",
      war: "https://app.streamflow.finance/contract/solana/mainnet/9WX9frGJZBnxVFgMg7WZeFgojBLAtpbZmCwqyw88bUE9",
      team: "https://app.streamflow.finance/contract/solana/mainnet/4A2t3ek9CqRxrVm8WB76ALrss5u24gQd6RzauhtdKTqD",
    },
  },
  meow: {
    str: 4500000, def: 120000, dex: 50000, chr: 1500, luck: 80,
    warchest: {
      total: 1000000000,
      locked: 910000000,
      available: 8500000,
      spent: 81000000,
      bulletin: ""
    }
  },
  woof: {
    str: 3200000, def: 90000, dex: 12000, chr: 900, luck: 40,
    warchest: {
      total: 1000000000,
      locked: 885000000,
      available: 10000000,
      spent: 105000000,
      bulletin: ""
    }
  },
};


const DEFAULT_TOKEN_SUPPLY = { meow: 5_000_000_000, woof: 5_000_000_000 };
const LAST_GOOD_STATE_KEY = "meowwoof:last-good-state:v1";

// --- HARD-CODED PROOF LINKS (Frontend fallback) ---
const HARDCODED_PROOFS = {
  meow: {
    lp: "https://solscan.io/tx/317Jac7WJWCgkrsEZouMfmmEKzvKScxSVP3e95g2gbHZxZkmtCDr4mzkAa6f1RSbjhA7Dc2cnHTauG1ziGKiTWd",
    war: "https://app.streamflow.finance/contract/solana/mainnet/51zie9oHdgM2jUtxsRNxMYrQCLXZs5mm5CmqXHrBhyWi",
    team: "https://app.streamflow.finance/contract/solana/mainnet/Bn8QfWjUxXDBJEjgoroy6ktorF9vqHHCws3gMZPzNNH",
  },
  woof: {
    lp: "https://solscan.io/tx/24o9BVJrZroMpADudjcXPQ3pWF3qQKzfQTTddRiRiE1kL5nZEXCGFT7TrHxZtn4QmdcNzkHFd5ZwNzRp8eSjRxVw",
    war: "https://app.streamflow.finance/contract/solana/mainnet/9WX9frGJZBnxVFgMg7WZeFgojBLAtpbZmCwqyw88bUE9",
    team: "https://app.streamflow.finance/contract/solana/mainnet/4A2t3ek9CqRxrVm8WB76ALrss5u24gQd6RzauhtdKTqD",
  },
};

// --- API URL HELPER ---
function getApiUrl(path) {
  // 如果当前是在 Worker 域名下运行，用相对路径
  if (location.hostname === "api.meow-woof.org") return path;
  
  // 否则（比如在 Pages 预览或主站），强制指向 Worker 的绝对地址
  const baseUrl = "https://api.meow-woof.org"; 
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return baseUrl + cleanPath;
}

function guessStateUrl() {
  const host = (location && location.hostname) ? location.hostname : "";
  if (host.startsWith("api.")) return "/api/state";
  return "https://api.meow-woof.org/api/state";
}

function normalizeApiState(api) {
  const treasury = api?.facts?.treasury || {};
  const stats = api?.facts?.roundStats || {};
  const briefing = api?.content?.briefing || {};
  const links = api?.facts?.links || {};

  function sideState(side) {
    const t = treasury?.[side] || {};
    const st = stats?.[side] || {};
    return {
      str: util.num(st.str),
      def: util.num(st.def),
      dex: util.num(st.dex),
      chr: util.num(st.chr),
      luck: util.num(st.luck),
      warchest: {
        total: util.num(t.warTotal),
        locked: util.num(t.locked),
        available: util.num(t.available),
        spent: util.num(t.expended),
        bulletin: briefing?.[side] ?? "",
      },
    };
  }

  return {
    roundCurrent: api?.facts?.countdown?.round ?? api?.round?.current ?? api?.battle?.round ?? 1,
    defcon: api?.facts?.countdown?.round ?? api?.round?.current ?? api?.battle?.round ?? 1,
    resetIn: api?.facts?.countdown?.reset_ttl ?? "—",
    nextResetAt: api?.facts?.countdown?.next_reset_at ?? "",
    ca: api?.facts?.links?.ca ?? "",
    pin: api?.content?.pin ?? "",
    ticker: Array.isArray(api?.content?.marquee)
      ? api.content.marquee.map((x) => (typeof x === "string" ? x : (x?.text ?? ""))).filter(Boolean).join(" • ")
      : "",
    tokenSupply: DEFAULT_TOKEN_SUPPLY,
    proofs: {
      meow: {
        lp: (links?.meow?.liquidity_proof && links.meow.liquidity_proof !== "#") ? links.meow.liquidity_proof : HARDCODED_PROOFS.meow.lp,
        war: (links?.meow?.war_chest_proof && links.meow.war_chest_proof !== "#") ? links.meow.war_chest_proof : HARDCODED_PROOFS.meow.war,
        team: (links?.meow?.team_lock_proof && links.meow.team_lock_proof !== "#") ? links.meow.team_lock_proof : HARDCODED_PROOFS.meow.team,
      },
      woof: {
        lp: (links?.woof?.liquidity_proof && links.woof.liquidity_proof !== "#") ? links.woof.liquidity_proof : HARDCODED_PROOFS.woof.lp,
        war: (links?.woof?.war_chest_proof && links.woof.war_chest_proof !== "#") ? links.woof.war_chest_proof : HARDCODED_PROOFS.woof.war,
        team: (links?.woof?.team_lock_proof && links.woof.team_lock_proof !== "#") ? links.woof.team_lock_proof : HARDCODED_PROOFS.woof.team,
      },
    },
    locks: {
      lpPct: 70,
      warPct: 20,
      teamPct: 10,
      lpStatus: "LP BURNED",
      warStatus: "WEEKLY UNLOCKS",
      teamStatus: "LINEAR 12M",
      warTtl: api?.facts?.countdown?.reset_ttl ?? "—",
      teamTtl: "STARTS IN —",
    },
    meow: sideState("meow"),
    woof: sideState("woof"),
    battle: api?.battle || null,
    world: api?.world || null,
    // [New] Pass vote data
    vote: api?.vote || null 
  };
}

function saveLastGoodState(state) {
  try {
    localStorage.setItem(LAST_GOOD_STATE_KEY, JSON.stringify(state));
  } catch (_) {}
}

function loadLastGoodState() {
  try {
    const raw = localStorage.getItem(LAST_GOOD_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === "object") ? parsed : null;
  } catch (_) {
    return null;
  }
}

function buildEmptyLiveState() {
  return normalizeApiState({
    facts: {
      countdown: {},
      treasury: {},
      roundStats: {},
      links: {},
    },
    content: {
      pin: "",
      marquee: [],
      briefing: { meow: "", woof: "" },
    },
    battle: null,
    world: null,
    vote: null,
  });
}

const data = {
  async getState() {
    const url = (window.MEOWWOOF_STATE_URL || guessStateUrl());
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`state fetch failed: ${res.status}`);
      const api = await res.json();
      const normalized = normalizeApiState(api);
      saveLastGoodState(normalized);
      return normalized;
    } catch (e) {
      console.warn("State fetch failed, using last good state:", e);
      const cached = loadLastGoodState();
      if (cached) return cached;
      return buildEmptyLiveState();
    }
  },
};

document.addEventListener("DOMContentLoaded", initApp);

const util = {
  noop() { },
  num(v) { return Number(v ?? 0); },
  clamp01(v) { return Math.max(0, Math.min(1, v)); },
  alloc(total, pct) {
    return Math.round((util.num(total) * util.num(pct)) / 100);
  },
  esc(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  },
};

const dom = (() => {
  const cache = Object.create(null);
  function get(id) {
    const cached = cache[id];
    if (cached && cached.isConnected) return cached;
    const fresh = document.getElementById(id);
    cache[id] = fresh;
    return fresh;
  }
  function resolve(target) { return typeof target === "string" ? get(target) : target; }
  function text(target, txt) { const el = resolve(target); if (el) el.textContent = txt; }
  function attr(target, attrName, value) { const el = resolve(target); if (!el || typeof value !== "string") return; el.setAttribute(attrName, value); }
  function pct(target, prop, pctVal) { const el = resolve(target); if (el) el.style[prop] = `${pctVal}%`; }
  return { get, resolve, text, attr, pct };
})();

// --- SYSTEM MODAL HELPER ---
// If fancy modal DOM is missing/broken, fall back to native alert/confirm
const sys = {
  _hasModal() {
    return !!(
      dom.get("sys-modal") &&
      dom.get("sys-title") &&
      dom.get("sys-msg") &&
      dom.get("sys-btns")
    );
  },

  alert(msg, title = "SYSTEM ALERT") {
    if (!sys._hasModal()) {
      window.alert(`${title}\n\n${msg}`);
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      dom.text("sys-title", title);
      dom.text("sys-msg", msg);

      const btns = dom.get("sys-btns");
      btns.innerHTML = `<button class="sys-btn" id="sys-ok">ACKNOWLEDGE</button>`;

      const modal = dom.get("sys-modal");
      modal.style.display = "flex";

      dom.get("sys-ok").onclick = () => {
        modal.style.display = "none";
        resolve(true);
      };
    });
  },

  confirm(msg, title = "CONFIRMATION REQUIRED") {
    if (!sys._hasModal()) {
      return Promise.resolve(window.confirm(`${title}\n\n${msg}`));
    }
    return new Promise((resolve) => {
      dom.text("sys-title", title);
      dom.text("sys-msg", msg);

      const btns = dom.get("sys-btns");
      btns.innerHTML = `
        <button class="sys-btn" id="sys-cancel">CANCEL</button>
        <button class="sys-btn primary" id="sys-confirm">PROCEED</button>
      `;

      const modal = dom.get("sys-modal");
      modal.style.display = "flex";

      const onKey = (e) => {
        if (e.key === "Escape") {
          cleanup();
          resolve(false);
        }
      };

      const cleanup = () => {
        modal.style.display = "none";
        document.removeEventListener("keydown", onKey);
      };

      document.addEventListener("keydown", onKey);

      dom.get("sys-cancel").onclick = () => {
        cleanup();
        resolve(false);
      };
      dom.get("sys-confirm").onclick = () => {
        cleanup();
        resolve(true);
      };
    });
  },

  confirmAction(msg, title = "CONFIRMATION REQUIRED", onConfirm = () => {}) {
    if (!sys._hasModal()) {
      const ok = window.confirm(`${title}\n\n${msg}`);
      if (!ok) return Promise.resolve(false);
      return Promise.resolve()
        .then(() => onConfirm())
        .then(() => true)
        .catch((e) => {
          console.error(e);
          return true;
        });
    }

    return new Promise((resolve) => {
      dom.text("sys-title", title);
      dom.text("sys-msg", msg);

      const btns = dom.get("sys-btns");
      btns.innerHTML = `
        <button class="sys-btn" id="sys-cancel">CANCEL</button>
        <button class="sys-btn primary" id="sys-confirm">PROCEED</button>
      `;

      const modal = dom.get("sys-modal");
      modal.style.display = "flex";

      const onKey = (e) => {
        if (e.key === "Escape") {
          cleanup();
          resolve(false);
        }
      };

      const cleanup = () => {
        modal.style.display = "none";
        document.removeEventListener("keydown", onKey);
      };

      document.addEventListener("keydown", onKey);

      dom.get("sys-cancel").onclick = () => {
        cleanup();
        resolve(false);
      };

      dom.get("sys-confirm").onclick = async () => {
        cleanup();
        try {
          await onConfirm();
        } catch (e) {
          console.error(e);
        }
        resolve(true);
      };
    });
  },
};

const countdown = (() => {
  let nextResetAtMs = 0;
  let timer = null;
  function pad2(n) { return String(n).padStart(2, "0"); }
  function format(msLeft) {
    const s = Math.max(0, Math.floor(msLeft / 1000));
    const dd = Math.floor(s / 86400);
    const hh = Math.floor((s % 86400) / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (dd > 0) return `${dd}d ${pad2(hh)}h ${pad2(mm)}m ${pad2(ss)}s`;
    return `${pad2(hh)}h ${pad2(mm)}m ${pad2(ss)}s`;
  }
  function setText(id, txt) { const el = document.getElementById(id); if (el) el.textContent = (txt ?? "—"); }
  function tick() {
    if (!nextResetAtMs || !Number.isFinite(nextResetAtMs)) {
      setText("top-reset", "—");
      setText("war-ttl", "—");
      return;
    }
    const left = nextResetAtMs - Date.now();
    setText("top-reset", format(left));
    setText("war-ttl", format(left));
  }
  function start(nextResetAtISO) {
    const ms = nextResetAtISO ? Date.parse(nextResetAtISO) : NaN;
    if (!Number.isFinite(ms) || ms <= 0) {
      nextResetAtMs = 0; if (timer) { clearInterval(timer); timer = null; } tick(); return;
    }
    if (ms === nextResetAtMs && timer) { tick(); return; }
    nextResetAtMs = ms;
    if (timer) clearInterval(timer);
    tick();
    timer = setInterval(tick, 1000);
  }
  return { start };
})();

// === 核心逻辑修改：省流防抖刷新 ===
let lastWorldStr = "";
let lastBattleStr = "";

async function initApp() {
  map.initNodes(LANDMARKS);

  // 1. 首次加载：执行一次完整更新
  await runUpdateCycle();

  // 2. 定时器：5分钟一次 (300,000ms)
  setInterval(runUpdateCycle, 300000);

  // 3. 智能刷新
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      runUpdateCycle();
    }
  });

  startTributeTypewriter();
  events.init();
  voteUI.init();
  
  // [!code ++] Bind Contact Form here
  if (typeof bindContactForm === 'function') bindContactForm();
}

// 统一的更新函数
async function runUpdateCycle() {
  try {
    const s = await data.getState();
    
    // A. 总是更新 UI 文字
    ui.render(s);
    countdown.start(s.nextResetAt);

    // B. 地图数据 (连线、归属)
    const newWorldStr = JSON.stringify(s.world);
    const newBattleStr = JSON.stringify(s.battle);

    if (newWorldStr !== lastWorldStr || newBattleStr !== lastBattleStr) {
      map.applyWorld(s.world, s.battle);
      lastWorldStr = newWorldStr;
      lastBattleStr = newBattleStr;
    }
  } catch (err) {
    console.warn("Update cycle failed:", err);
  }
}

function bindCopyButton() {
  // 绑定所有带 copy-trigger 类的按钮
  document.querySelectorAll('.copy-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const code = btn.dataset.code; 
      if (!code) return;
      
      navigator.clipboard.writeText(code).then(() => {
        // --- 视觉反馈逻辑 ---
        
        // 1. 保存原来的图标 (复制图标)
        const originalHtml = btn.innerHTML;
        
        // 2. 变成绿色的对号图标
        // 这里直接嵌入一个简单的 Checkmark SVG
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="#4cd137" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        
        // 3. 给按钮加个临时样式 (比如边框变绿)
        btn.classList.add('copied-success');

        // 4. 1.5秒后恢复原状
        setTimeout(() => {
          btn.innerHTML = originalHtml;
          btn.classList.remove('copied-success');
        }, 1500);

      }).catch(err => {
        console.error("Copy failed", err);
      });
    });
  });
}

function bindTradeMenu() {
  const tradeWrap = dom.get(ids.tradeWrap);
  const btnTrade = dom.get(ids.btnTrade);
  if (!tradeWrap || !btnTrade) return;
  btnTrade.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    tradeWrap.classList.toggle("open");
  });
  const closeTrade = () => { tradeWrap.classList.remove("open"); };
  document.addEventListener("click", closeTrade);
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeTrade());
}

function bindProofLinks() {
  // Proof links (LP / WAR / TEAM) 不要把长URL放在 href，避免 hover 出现巨大预览条
  // 点击时从 data-url 取真实链接，强制新开标签页
  document.querySelectorAll(".p-link").forEach((a) => {
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener");
    a.addEventListener("click", (e) => {
      const url = a.getAttribute("data-url");
      e.preventDefault();
      e.stopPropagation();
      if (!url || url === "#") return;
      window.open(url, "_blank", "noopener,noreferrer");
    });
  });
}

function bindPlaceholderLinks() {
  const linkIds = [
    ids.btnVote, ids.txMint, ids.txFreeze, ids.tradeJupiter, ids.tradeRaydium,
    ids.navX, ids.navTelegram, ids.navDiscord, ids.navWhitepaper,
    // [!code --] Removed navContact from here
    ids.navTerms, ids.navPrivacy,
  ];
  for (const id of linkIds) {
    const el = dom.get(id);
    if (!el) continue;
    if (el.tagName === "A" && el.getAttribute("href") === "#") {
      el.addEventListener("click", (e) => e.preventDefault());
    }
  }
}

const events = (() => {
  let inited = false;
  function init() {
    if (inited) return;
    inited = true;
    bindCopyButton();
    bindTradeMenu();
    bindProofLinks();
    bindPlaceholderLinks();
  }
  return { init };
})();

const map = (() => {
  let points = [];
  let pointById = new Map();
  let manualLines = [];
  let ownership = null;
  let warLink = null;

  function getEls() {
    const layer = document.getElementById("map-layer") || document.querySelector(".map-layer");
    const img = document.getElementById("world-map") || document.querySelector(".world-map");
    const container = document.getElementById("nodes-container");
    const overlay = (layer && layer.querySelector(".map-overlay")) || document.querySelector(".map-overlay");
    const svg = document.getElementById("links-svg");
    return { layer, img, container, overlay, svg };
  }
  
  function syncContainerToImageRect() {
    const topbar = document.querySelector('.topbar');
    if (topbar) {
      const h = topbar.getBoundingClientRect().height;
      if (h) document.documentElement.style.setProperty('--topbar-h', `${Math.round(h)}px`);
    }
    const { layer, img, container, overlay, svg } = getEls();
    if (!layer || !img || !container) return;

    const layerRect = layer.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    if (!imgRect.width || !imgRect.height) return;
    const left = Math.max(0, imgRect.left - layerRect.left);
    const top = Math.max(0, imgRect.top - layerRect.top);

    container.style.left = `${left}px`;
    container.style.top = `${top}px`;
    container.style.width = `${imgRect.width}px`;
    container.style.height = `${imgRect.height}px`;
    container.style.right = "auto";
    container.style.bottom = "auto";
    if (svg) {
      svg.style.left = `${left}px`;
      svg.style.top = `${top}px`;
      svg.style.width = `${imgRect.width}px`;
      svg.style.height = `${imgRect.height}px`;
      svg.setAttribute("width", String(Math.max(1, Math.round(imgRect.width))));
      svg.setAttribute("height", String(Math.max(1, Math.round(imgRect.height))));
      svg.setAttribute("viewBox", `0 0 ${Math.max(1, Math.round(imgRect.width))} ${Math.max(1, Math.round(imgRect.height))}`);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    }
    if (overlay) {
      const rootStyles = getComputedStyle(document.documentElement);
      const sweepH = parseFloat(rootStyles.getPropertyValue("--map-sweep-h")) || 95;
      const travel = imgRect.height + sweepH * 2;
      overlay.style.setProperty("--map-sweep-travel", `${travel}px`);
    }
  }
  
  function applyPointToNode(el, p) {
    el.style.left = `${p.x}%`;
    el.style.top = `${p.y}%`;
    el.dataset.x = String(p.x);
    el.dataset.y = String(p.y);
  }

  function hash01(a, b) {
    const s = `${a}::${b}`;
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 10000) / 10000;
  }

  function quadFromPoints(x1, y1, x2, y2, bendKeyA, bendKeyB) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const amp = Math.max(18, Math.min(64, dist * 0.12));
    const r = hash01(bendKeyA, bendKeyB);
    const dir = r > 0.5 ? 1 : -1;
    const wiggle = (r - 0.5) * 0.35;
    const cX = midX + (dx * 0.08);
    const cY = midY + dir * amp * (1 + wiggle);
    return { x1, y1, cx: cX, cy: cY, x2, y2 };
  }

  function quadToPath(q) {
    return `M ${q.x1.toFixed(2)} ${q.y1.toFixed(2)} Q ${q.cx.toFixed(2)} ${q.cy.toFixed(2)} ${q.x2.toFixed(2)} ${q.y2.toFixed(2)}`;
  }

  function splitQuadHalf(q) {
    const p0 = { x: q.x1, y: q.y1 };
    const p1 = { x: q.cx, y: q.cy };
    const p2 = { x: q.x2, y: q.y2 };
    const p01 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const p12 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    const p012 = { x: (p01.x + p12.x) / 2, y: (p01.y + p12.y) / 2 };
    const left = { x1: p0.x, y1: p0.y, cx: p01.x, cy: p01.y, x2: p012.x, y2: p012.y };
    const right = { x1: p012.x, y1: p012.y, cx: p12.x, cy: p12.y, x2: p2.x, y2: p2.y };
    return { left, right, mid: p012 };
  }

  function getSideForPoint(p) {
    if (!p) return "net";
    const own = (ownership && typeof ownership === "object") ? ownership[p.id] : null;
    if (own === "meow" || own === "woof") return own;
    if (p.side === "meow" || p.side === "woof") return p.side;
    return (p.x < 50) ? "meow" : "woof";
  }

  function lineKey(a, b) {
    if (!a || !b) return "";
    return (a < b) ? `${a}::${b}` : `${b}::${a}`;
  }

  function normalizeLines(input) {
    const arr = Array.isArray(input) ? input : [];
    const out = [];
    const seen = new Set();
    for (const ln of arr) {
      if (!ln || !ln.a || !ln.b) continue;
      if (ln.a === ln.b) continue;
      const kind = (ln.kind === "war") ? "war" : "route";
      const side = (ln.side === "woof") ? "woof" : (ln.side === "meow") ? "meow" : (ln.side === "net") ? "net" : "auto";
      const k = `${kind}::${lineKey(ln.a, ln.b)}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ a: ln.a, b: ln.b, kind, side });
    }
    return out;
  }

  function applyOwnershipToNodes() {
    const { container } = getEls();
    if (!container) return;
    container.querySelectorAll(".map-node").forEach((n) => {
      const p = pointById.get(n.dataset.id);
      if (!p) return;
      const side = getSideForPoint(p);
      n.dataset.side = side;
      n.classList.remove("meow", "woof", "net");
      n.classList.add(side);
      if (!n.classList.contains("owned")) n.classList.add("owned");
    });
  }

  function renderAllLinks() {
    const { svg } = getEls();
    if (!svg) return;
    svg.innerHTML = "";
    const vb = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : null;
    const W = (vb && vb.width) ? vb.width : svg.getBoundingClientRect().width;
    const H = (vb && vb.height) ? vb.height : svg.getBoundingClientRect().height;
    if (!W || !H) return;

    function renderWarBetween(fromId, toId, opts = { hit: false }) {
      const pA = pointById.get(fromId);
      const pB = pointById.get(toId);
      if (!pA || !pB) return;
      const x1 = (pA.x / 100) * W;
      const y1 = (pA.y / 100) * H;
      const x2 = (pB.x / 100) * W;
      const y2 = (pB.y / 100) * H;
      const sideA = getSideForPoint(pA);
      const sideB = getSideForPoint(pB);
      const side = (sideA === sideB) ? sideA : "net";
      const q = quadFromPoints(x1, y1, x2, y2, fromId, toId);
      const sp = splitQuadHalf(q);

      const glow = document.createElementNS("http://www.w3.org/2000/svg", "path");
      glow.setAttribute("d", quadToPath(q));
      glow.setAttribute("class", `link-glow ${side}`);
      svg.appendChild(glow);

      const pathA = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathA.setAttribute("d", quadToPath(sp.left));
      pathA.setAttribute("class", `link-path war ${sideA}`);
      const pathB = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathB.setAttribute("d", quadToPath(sp.right));
      pathB.setAttribute("class", `link-path war ${sideB}`);
      svg.appendChild(pathA);
      svg.appendChild(pathB);

      const flowA = document.createElementNS("http://www.w3.org/2000/svg", "path");
      flowA.setAttribute("d", quadToPath(sp.left));
      flowA.setAttribute("class", `link-path warflow ${sideA}`);
      const flowB = document.createElementNS("http://www.w3.org/2000/svg", "path");
      flowB.setAttribute("d", quadToPath(sp.right));
      flowB.setAttribute("class", `link-path warflow ${sideB} rev`);
      svg.appendChild(flowA);
      svg.appendChild(flowB);

      if (opts && opts.hit) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "battle-hit");
        g.setAttribute("transform", `translate(${sp.mid.x.toFixed(2)}, ${sp.mid.y.toFixed(2)})`);
        const r1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        r1.setAttribute("class", "battle-core meow");
        r1.setAttribute("r", "10");
        const r2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        r2.setAttribute("class", "battle-core woof");
        r2.setAttribute("r", "14");
        g.appendChild(r1);
        g.appendChild(r2);
        svg.appendChild(g);
      }
    }

    for (const ln of manualLines) {
      const a = pointById.get(ln.a);
      const b = pointById.get(ln.b);
      if (!a || !b) continue;
      if (ln.kind === "war") {
        renderWarBetween(ln.a, ln.b, { hit: false });
        continue;
      }

      const x1 = (a.x / 100) * W;
      const y1 = (a.y / 100) * H;
      const x2 = (b.x / 100) * W;
      const y2 = (b.y / 100) * H;
      const q = quadFromPoints(x1, y1, x2, y2, ln.a, ln.b);
      const d = quadToPath(q);
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      let sideClass = ln.side;
      if (!sideClass || sideClass === "auto") {
        const sideA = getSideForPoint(a);
        const sideB = getSideForPoint(b);
        sideClass = (sideA === sideB) ? sideA : "net";
      }
      path.setAttribute("class", `link-path route ${sideClass}`);

      // 随机闪烁参数
      const randomDur = (4 + Math.random() * 6).toFixed(2); 
      const randomDelay = -(Math.random() * 10).toFixed(2);
      path.style.setProperty("--route-dur", `${randomDur}s`);
      path.style.setProperty("--route-off", `${randomDelay}s`);
      
      svg.appendChild(path);
    }

    if (warLink && warLink.fromId && warLink.toId && warLink.fromId !== warLink.toId) {
      renderWarBetween(warLink.fromId, warLink.toId, { hit: true });
    }
  }

  function initNodes(inputPoints) {
    const { container, img } = getEls();
    if (!container) return;
    points = (inputPoints || []).map((p) => ({ ...p }));
    pointById = new Map(points.map((p) => [p.id, p]));
    container.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (const p of points) {
      const side = (p.side === "meow" || p.side === "woof") ? p.side : (p.x < 50 ? "meow" : "woof");
      const node = document.createElement("div");
      node.className = `map-node ${side} owned`;
      node.dataset.id = p.id;
      node.dataset.side = side;
      node.innerHTML = `
        <div class="iso-base" aria-hidden="true"></div>
        <div class="laser-beam" aria-hidden="true"></div>
        <div class="float-icon" aria-hidden="true"></div>
        <div class="node-label">${util.esc(p.name)}</div>
      `;
      applyPointToNode(node, p);
      frag.appendChild(node);
    }
    container.appendChild(frag);
    const sync = () => {
      syncContainerToImageRect();
      container.querySelectorAll(".map-node").forEach((n) => {
        const p = pointById.get(n.dataset.id);
        if (p) applyPointToNode(n, p);
      });
      renderAllLinks();
    };
    sync();
    if (img && !img.complete) img.addEventListener("load", sync, { once: true });
    window.addEventListener("resize", sync);
  }

  function applyWorld(world, battle) {
    ownership = (world && world.ownership && typeof world.ownership === "object") ? world.ownership : null;
    manualLines = normalizeLines(world && world.lines);
    applyOwnershipToNodes();
    if (battle && battle.a && battle.b && battle.a !== battle.b) {
      warLink = { fromId: battle.a, toId: battle.b };
    } else {
      warLink = null;
    }
    renderAllLinks();
  }
  return { initNodes, syncContainerToImageRect, applyWorld };
})();

const CONFIG = {
  barEntries: [["str", 6000000], ["def", 200000], ["dex", 100000], ["chr", 2000], ["luck", 100]],
  trustKinds: ["lp", "war", "team"],
  sides: ["meow", "woof"],
  titleByKind: { lp: "LP", war: "WAR CHEST", team: "TEAM" },
  trustRows: [
    ["lp", "lpStatus", "LP BURNED", "lpTtl", ""],
    ["war", "warStatus", "WEEKLY UNLOCKS", "warTtl", "—"],
    ["team", "teamStatus", "LINEAR 12M", "teamTtl", "STARTS IN —"],
  ],
  fmt: { billionDecimals: 2, millionDecimals: 2, thousandDecimals: 1 },
};

const fmt = {
  short(n) {
    const v = util.num(n);
    if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(CONFIG.fmt.billionDecimals) + "B";
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(CONFIG.fmt.millionDecimals) + "M";
    if (v >= 1_000) return (v / 1_000).toFixed(CONFIG.fmt.thousandDecimals) + "K";
    return String(v);
  },
  pct0(p) { return `${Math.round(util.num(p))}%`; },
  addr(s) { return String(s ?? ""); },
  time(s) { return String(s ?? ""); },
};

const ids = {
  bar: (side, k) => `bar-${k}-${side}`,
  nodesContainer: "nodes-container",
  wcAvail: (side) => `wc-avail-${side}`,
  wcSpent: (side) => `wc-spent-${side}`,
  wcLocked: (side) => `wc-locked-${side}`,
  wcBulletin: (side) => `wc-bulletin-${side}`,
  tubeTotal: (side) => `${side}-tube-total`,
  tubeSeg: (side, seg) => `${side}-tube-${seg}`,
  pct: (side, seg) => `${side}-pct-${seg}`,
  topRound: "top-round",
  topReset: "top-reset",
  caText: "ca-txt",
  tickerPin: "ticker-pin",
  tickerScroll: "ticker-scroll",
  trustPct: (kind) => `${kind}-pct`,
  trustAmt: (kind, side) => `${kind}-${side}-amt`,
  trustSub: (kind) => `${kind}-sub`,
  trustTtl: (kind) => `${kind}-ttl`,
  proof: (kind, side) => `${kind}-${side}`,
  btnCopy: "btn-copy", btnTrade: "btn-trade", btnVote: "btn-vote", btnConnect: "btn-connect",
  tradeWrap: "trade-wrap", tradeDropdown: "trade-dropdown", tradeJupiter: "trade-jupiter", tradeRaydium: "trade-raydium",
  txMint: "tx-mint", txFreeze: "tx-freeze",
  navX: "nav-x", navTelegram: "nav-telegram", navDiscord: "nav-discord", navWhitepaper: "nav-whitepaper",
  navContact: "nav-contact", navTerms: "nav-terms", navPrivacy: "nav-privacy",
  tributeLine: "tribute-line",
};

function forEachSideKind(fn) {
  for (const side of CONFIG.sides) {
    for (const kind of CONFIG.trustKinds) {
      fn(side, kind);
    }
  }
}

function renderBars(prefix, stats) {
  if (!stats) return;

  // 遍历 5 个属性
  const keys = ["str", "def", "dex", "chr", "luck"];
  
  for (const k of keys) {
    const pctVal = util.num(stats[k]); 
    const safePct = util.clamp01(pctVal / 100) * 100;
    dom.pct(ids.bar(prefix, k), "width", safePct);
  }
}

function renderWarChest(prefix, wc) {
  if (!wc) return;
  
  const total = util.num(wc.total) || 1; 
  const amtAvail = util.num(wc.available);
  const amtSpent = util.num(wc.spent);
  const amtLocked = util.num(wc.locked); 

  dom.text(ids.wcAvail(prefix), fmt.short(amtAvail));
  dom.text(ids.wcSpent(prefix), fmt.short(amtSpent));
  dom.text(ids.wcLocked(prefix), fmt.short(amtLocked));
  dom.text(ids.wcBulletin(prefix), wc.bulletin ?? "—");
  dom.text(ids.tubeTotal(prefix), fmt.short(total));

  const spentPct = (amtSpent / total) * 100;
  const availPct = (amtAvail / total) * 100;
  const lockedPct = Math.max(0, 100 - spentPct - availPct);

  dom.text(ids.pct(prefix, "spent"), fmt.pct0(spentPct));
  dom.text(ids.pct(prefix, "avail"), fmt.pct0(availPct));
  dom.text(ids.pct(prefix, "locked"), fmt.pct0(lockedPct));

  const hSpent = Math.max(0, spentPct);
  const hAvail = Math.max(0, availPct);
  const hLocked = Math.max(0, 100 - hSpent - hAvail);

  dom.pct(ids.tubeSeg(prefix, "spent"), "height", hSpent);
  dom.pct(ids.tubeSeg(prefix, "avail"), "height", hAvail);
  dom.pct(ids.tubeSeg(prefix, "locked"), "height", hLocked);
}

const ui = {
  render(s) {
    ui.topbar(s);
    ui.ticker(s);
    const pctByKind = ui.center.trustPercents(s);
    ui.center.trustAmounts(s, pctByKind);
    ui.center.proofLinks(s);
    ui.center.trustRows(s);
    ui.sides(s);
    
    // [!code focus] Update Vote UI
    if (typeof voteUI !== 'undefined') voteUI.update(s.vote);
  },
  topbar(s) {
    dom.text(ids.topRound, String(s?.roundCurrent ?? "—"));
    dom.text(ids.topReset, String(s?.resetIn ?? "—"));
    dom.text(ids.caText, s?.ca ?? "");
  },
  ticker(s) {
    const pin = (s.pin || s.intel || "").trim();
    const scroll = (s.ticker || s.intel || "Waiting for updates...").trim();
    
    dom.text(ids.tickerPin, pin ? pin : "—");
    
    const el = dom.get(ids.tickerScroll);
    if(el) {
      const spacer = " \u00A0 \u00A0 • \u00A0 \u00A0 ";
      el.textContent = (scroll + spacer).repeat(4);
    }
  },
  center: {
    trustPercents(s) {
      const locks = s.locks || {};
      const pctByKind = Object.create(null);
      for (const kind of CONFIG.trustKinds) {
        const pct = locks[`${kind}Pct`] ?? 0;
        pctByKind[kind] = pct;
        dom.text(ids.trustPct(kind), `${pct}%`);
      }
      return pctByKind;
    },
    trustAmounts(s, pctByKind) {
      const supply = s.tokenSupply || {};
      forEachSideKind((side, kind) => {
        const total = util.num(supply[side]);
        const amt = util.alloc(total, pctByKind[kind]);
        dom.text(ids.trustAmt(kind, side), fmt.short(amt));
      });
    },
    proofLinks(s) {
      const locks = s.locks || {};
      const proofs = s.proofs || {};
      forEachSideKind((side, kind) => {
        const href = proofs?.[side]?.[kind] || "#";
        const status = locks[`${kind}Status`] || "";
        const id = ids.proof(kind, side);
        // 不把真实链接放进 href，避免 hover 出现长条预览
        dom.attr(id, "href", "#");
        dom.attr(id, "data-url", href);
        dom.attr(id, "target", "_blank");
        dom.attr(id, "rel", "noopener");

        // title 也短一点，避免提示太大挡 UI
        dom.attr(id, "title", `${side.toUpperCase()} ${CONFIG.titleByKind[kind]} Proof`);
      });
    },
    trustRows(s) {
      const locks = s.locks || {};
      for (const [k, statusKey, statusFallback, ttlKey, ttlFallback] of CONFIG.trustRows) {
        dom.text(ids.trustSub(k), locks[statusKey] || statusFallback);
        dom.text(ids.trustTtl(k), locks[ttlKey] || ttlFallback);
      }
    },
  },
  sides(s) {
    for (const side of CONFIG.sides) {
      renderWarChest(side, s[side]?.warchest);
      renderBars(side, s[side]);
    }
  },
};

function startTributeTypewriter() {
  const el = dom.get(ids.tributeLine);
  if (!el) return;
  const lines = ["SALUTE TO THE PIONEERS.", "SALUTE TO THE BUILDERS.", "SALUTE TO THE SURVIVORS."];
  el.classList.add("typewriter");
  let lineIdx = 0, charIdx = 0, mode = "type";
  const typeSpeed = 85, delSpeed = 55, holdTime = 1400, gapTime = 450;
  function step() {
    const line = lines[lineIdx];
    if (mode === "type") {
      charIdx = Math.min(line.length, charIdx + 1);
      el.textContent = line.slice(0, charIdx);
      if (charIdx >= line.length) {
        mode = "hold";
        setTimeout(step, holdTime);
        return;
      }
      setTimeout(step, typeSpeed);
      return;
    }
    if (mode === "hold") {
      mode = "del";
      setTimeout(step, gapTime);
      return;
    }
    charIdx = Math.max(0, charIdx - 1);
    el.textContent = line.slice(0, charIdx);
    if (charIdx <= 0) {
      lineIdx = (lineIdx + 1) % lines.length;
      mode = "type";
      setTimeout(step, gapTime);
      return;
    }
    setTimeout(step, delSpeed);
  }
  el.textContent = "";
  step();
}

/* =========================================
   WALLET & VOTE LOGIC (Vanilla JS)
   ========================================= */

function getPhantomProvider() {
  // 兼容 Phantom 新老注入路径
  if (window.solana && window.solana.isPhantom) return window.solana;
  if (window.phantom && window.phantom.solana) return window.phantom.solana;
  return null;
}

const wallet = {
  addr: null,
  _bound: false,

  _bindListeners() {
    if (this._bound) return;
    const provider = getPhantomProvider();
    if (!provider || typeof provider.on !== "function") return;

    this._bound = true;

    provider.on("accountChanged", (pubkey) => {
      // Some wallets may emit accountChanged around disconnect; trust isConnected first.
      if (!provider.isConnected) {
        this.addr = null;
        this.updateUI();
        return;
      }
      this.addr = pubkey ? pubkey.toString() : null;
      this.updateUI();
    });

    provider.on("disconnect", () => {
      this.addr = null;
      this.updateUI();
    });
  },

  // 简单连接：不弹自定义确认框；如果已经连过，再点一次会先断开再重连（让 Phantom 自己弹出切换/重连 UI）
  async connect(opts = {}) {
    const provider = getPhantomProvider();
    if (!provider) {
      await sys.alert("Phantom wallet not found. Please install it.", "MISSING HARDWARE");
      window.open("https://phantom.app/", "_blank");
      return;
    }

    const force = !!opts.force;

    try {
      // 已连接时，再点 CONNECT：强制断开再重连，触发 Phantom 的连接弹窗/切换流程
      if (force && (provider.isConnected || this.addr)) {
        try {
          // Phantom disconnect() 可能是同步也可能是异步，统一 await
          await provider.disconnect();
        } catch (_) {
          // 忽略断开失败
        }
        this.addr = null;
        this.updateUI();
        // 给浏览器一个极短的喘息时间，避免“闪一下没反应”
        await new Promise((r) => setTimeout(r, 50));
      }

      const resp = await provider.connect();
      const pk = (resp && resp.publicKey) ? resp.publicKey : provider.publicKey;
      this.addr = pk ? pk.toString() : null;

      this._bindListeners();
      this.updateUI();
    } catch (err) {
      console.warn("Wallet connect cancelled/failed:", err);
    }
  },

  // Explicit disconnect: click on the connected button should simply disconnect (no auto-reconnect)
  async disconnect() {
    const provider = getPhantomProvider();
    if (!provider) {
      this.addr = null;
      this.updateUI();
      return;
    }
    try {
      await provider.disconnect();
    } catch (_) {
      // ignore
    }
    this.addr = null;
    this.updateUI();
  },

  // 静默恢复：页面加载后尝试 onlyIfTrusted，不会弹窗
  async tryRestore() {
    const provider = getPhantomProvider();
    if (!provider) return;
    this._bindListeners();

    try {
      const resp = await provider.connect({ onlyIfTrusted: true });
      const pk = (resp && resp.publicKey) ? resp.publicKey : provider.publicKey;
      this.addr = pk ? pk.toString() : null;
      this.updateUI();
    } catch (_) {
      // 未授权过/用户拒绝：忽略
    }
  },

  updateUI() {
    const btn = dom.get(ids.btnConnect);
    if (!btn) return;

    if (this.addr) {
      const short = this.addr.slice(0, 4) + "..." + this.addr.slice(-4);
      btn.textContent = short;
      btn.classList.add("connected");
    } else {
      btn.textContent = "CONNECT";
      btn.classList.remove("connected");
    }
  },
};

// 页面加载后：尝试静默恢复已授权的钱包连接（不会弹 Phantom）
document.addEventListener("DOMContentLoaded", () => {
  wallet.tryRestore();
});

const voteUI = {
  state: null,
  _submitting: false,

    init() {
      // CONNECT：不弹你那种“Switch Wallet”自定义框，直接交给 Phantom 自己处理
      const btnConn = dom.get(ids.btnConnect);
      if (btnConn) {
        btnConn.onclick = async (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (wallet.addr) {
            await wallet.disconnect();
            return;
          }
          await wallet.connect();
        };
        wallet.updateUI();
      }

      // VOTE NOW
      const btnVote = dom.get(ids.btnVote);
      if (btnVote) {
        btnVote.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.open();
        };
      }

      // Close vote modal
      const btnClose = document.getElementById("btn-close-vote");
      if (btnClose) {
        btnClose.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.close();
        };
      }

      // 兜底：即使 DOM 被替换/旧监听器乱套，也能点得动（捕获阶段）
      if (!this._delegatedBound) {
        this._delegatedBound = true;
        document.addEventListener(
          "click",
          (e) => {
            const a = e.target?.closest?.("#" + ids.btnConnect);
            if (a) {
              e.preventDefault();
              e.stopPropagation();
              if (wallet.addr) {
                wallet.disconnect();
              } else {
                wallet.connect();
              }
              return;
            }
            const b = e.target?.closest?.("#" + ids.btnVote);
            if (b) {
              e.preventDefault();
              e.stopPropagation();
              this.open();
            }
          },
          true
        );
      }
    },
  

  update(v) {
    this.state = v;
    const btn = dom.get(ids.btnVote);
    if (!btn) return;

    if (v && v.status === 'open' && v.winner) {
      btn.classList.remove("disabled");
      btn.textContent = "VOTE NOW";
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
      
      // 动态变色：狗赢了变青色，猫赢了变橙色
      if (v.winner.toLowerCase() === 'woof') {
        btn.style.backgroundColor = 'var(--woof)'; 
        btn.style.borderColor = 'var(--woof)';
        btn.style.color = '#000';
      } else {
        btn.style.backgroundColor = 'var(--meow)';
        btn.style.borderColor = 'var(--meow)';
        btn.style.color = '#000';
      }
      
    } else {
      btn.classList.add("disabled");
      btn.textContent = "VOTE LOCKED";
      btn.style.opacity = "0.5";
      btn.style.cursor = "not-allowed";
      // 恢复默认样式
      btn.style.backgroundColor = 'transparent'; 
      btn.style.borderColor = 'rgba(255,255,255,0.3)';
      btn.style.color = '#fff';
    }
  },

  open() {
    // 1. 检查钱包
    if (!wallet.addr) { wallet.connect(); return; }
    
    // 2. 检查状态
    if (!this.state || this.state.status !== 'open') {
      sys.alert("Voting is currently OFFLINE.\nAwaiting Sunday settlement.", "ACCESS DENIED");
      return;
    }

    // 3. 尝试渲染 (带错误捕获)
    try {
      this.renderModal();
      document.getElementById("vote-modal").style.display = "flex";
    } catch (e) {
      console.error(e);
      sys.alert("UI Render Error: " + (e?.message || String(e)), "UI ERROR");
    }
  },

  close() { document.getElementById("vote-modal").style.display = "none"; },

  renderModal() {
    const v = this.state; 
    const st = v.stats || {};
    
    // 1. 评级逻辑
    const margin = parseFloat(st.margin||0);
    let tier = "VICTORY"; let color = "#fff";
    if(margin<5) { tier="NARROW WIN"; color="#FFD700"; }
    else if(margin<15) { tier="SOLID VICTORY"; color="#7CFFB2"; }
    else { tier="DOMINATION"; color="#FF36F7"; }
    
    // 2. 填充顶部数据
    dom.text("vm-status", "OPEN");
    const me = document.getElementById("vm-margin");
    if(me) {
        me.textContent = `${tier} (+${margin}%)`; 
        me.style.color = color; 
        me.style.fontSize="11px";
    }
    dom.text("vm-base", st.baseBurn ? `${st.baseBurn}%` : "—");

    // 3. 填充选项
    const con = document.getElementById("vm-options-container"); 
    if(con) {
        con.innerHTML = "";
        (v.options||[]).forEach(opt => {
          const c = v.counts?.[opt.id] || 0;
          const burnVal = Number(opt.val);
          const reserve = Number.isFinite(burnVal) ? (100 - burnVal).toFixed(1) : "—";
          const safeId = util.esc(String(opt.id || ""));
          const safeLabel = util.esc(String(opt.label || ""));
          const safeBurn = Number.isFinite(burnVal) ? String(burnVal) : "—";
          const card = document.createElement("div"); 
          card.className = "v-card";
          card.innerHTML = `
            <div>
                <span class="v-opt-id">${safeId}</span>
                <span class="v-opt-desc">${safeLabel}</span>
                <div style="font-size:10px;color:#666;margin-left:20px;margin-top:2px;">Leaves <span style="color:#aaa">${reserve}%</span> for War Chest</div>
            </div>
            <div style="text-align:right;">
                <div class="v-opt-val">BURN ${safeBurn}%</div>
                <span class="v-opt-count">${fmt.short(c)} VOTES</span>
            </div>
          `;
          card.onclick = () => this.submitVote(opt.id);
          con.appendChild(card);
        });
    }
    
    // 4. 填充滚动条 (带假数据兜底)
    const tr = document.getElementById("vm-recent-track");
    if(tr) {
        let rec = (v.recent||[]);
        // [关键修改] 如果没数据，塞入假数据撑场面
        if (rec.length === 0) {
            rec = [
                "Waiting for votes...", 
                "System Online...", 
                "Awaiting Input...",
                "Connect Wallet to Vote"
            ];
        }
        
        const html = rec.map(r => `<span class="vt-item">${util.esc(String(r))}</span>`).join("");
        // 重复两遍实现无缝滚动
        tr.innerHTML = html + html; 
    }
  },

    submitVote(optId) {
      if (this._submitting) return;
      sys.confirmAction(
        `Initiate vote for Option ${optId}?`,
        "CONFIRMATION REQUIRED",
        () => this._doVote(optId)
      );
    },

    async _doVote(optId) {
      if (this._submitting) return;
      this._submitting = true;

      const con = document.getElementById("vm-options-container");
      if (con) con.style.pointerEvents = "none";

      try {
        const round = (this.state && (this.state.round ?? this.state.roundCurrent)) || 0;
        const msg = `Vote for Option ${optId} in Round ${round}`;
        const enc = new TextEncoder().encode(msg);

        // 关键：现在是在 PROCEED 按钮 click 里触发 → 更不容易全屏/卡死
        const provider = getPhantomProvider();
        if (!provider || typeof provider.signMessage !== "function") {
          throw new Error("Phantom provider not available");
        }
        const { signature } = await provider.signMessage(enc, "utf8");

        // safer base64
        const bytes = signature instanceof Uint8Array ? signature : new Uint8Array(signature);
        let bin = "";
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        const sigStr = btoa(bin);

        const url = getApiUrl("/api/vote");
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 15000);

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ optionId: optId, address: wallet.addr, message: msg, signature: sigStr }),
          signal: ctrl.signal,
        });

        clearTimeout(timeout);

        let json = {};
        try { json = await res.json(); } catch (_) { json = {}; }
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);

        const w = Number(json.weight);
        const wTxt = Number.isFinite(w) ? (w < 1 ? w.toFixed(2) : fmt.short(w)) : (json.weight ?? "—");

        await sys.alert(`Vote verified.\nWeight added: ${wTxt}`, "VOTE SUCCESS");
        this.close();
        runUpdateCycle();
      } catch (e) {
        console.error(e);
        const m = (e && e.name === "AbortError") ? "Request timeout" : (e?.message || String(e));
        sys.alert("Error: " + m, "TRANSMISSION ERROR");
      } finally {
        this._submitting = false;
        if (con) con.style.pointerEvents = "auto";
      }
    }

};

// --- Contact Form (Silent & Sleek) ---
function bindContactForm() {
  const btn = document.getElementById("nav-contact");
  const modal = document.getElementById("email-modal");
  const close = document.getElementById("btn-close-email");
  const send = document.getElementById("btn-send-email");
  
  if (!btn || !modal) return;
  
  // Clone to remove old listeners
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  newBtn.addEventListener("click", (e) => {
    e.preventDefault(); e.stopPropagation();
    modal.style.display = "flex";
  });
  
  const closeModal = () => { modal.style.display = "none"; };
  close.addEventListener("click", closeModal);
  
  // Clone send btn
  const newSend = send.cloneNode(true);
  send.parentNode.replaceChild(newSend, send);

  newSend.addEventListener("click", async () => {
    const msgInput = document.getElementById("email-msg");
    const contactInput = document.getElementById("email-contact");
    const msg = msgInput.value.trim();
    const contact = contactInput.value.trim() || "Anonymous";
    
    if (!msg) { 
      // 简单的晃动效果或者变红提示（这里简单处理：变红一下）
      newSend.innerHTML = `<span class="v-opt-id" style="color:#FF8A8A">EMPTY MESSAGE</span>`;
      setTimeout(() => newSend.innerHTML = `<span class="v-opt-id">SEND TRANSMISSION</span>`, 1000);
      return; 
    }
    
    // 1. 变为发送中状态
    newSend.innerHTML = `<span class="v-opt-id">SENDING...</span>`;
    newSend.style.opacity = "0.7";
    
    try {
      const url = getApiUrl("/api/contact");
      const res = await fetch(url, {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ msg, contact })
      });
      
      if (res.ok) {
        // 2. 成功：变绿，显示 SENT
        newSend.innerHTML = `<span class="v-opt-id" style="color:#7CFFB2">TRANSMISSION SENT</span>`;
        newSend.classList.add("selected"); // 加亮
        
        msgInput.value = ""; // 清空输入
        
        // 3. 等待 1.5秒 后自动关闭
        setTimeout(() => {
          closeModal();
          // 还原按钮状态，方便下次用
          newSend.innerHTML = `<span class="v-opt-id">SEND TRANSMISSION</span>`;
          newSend.style.opacity = "1";
          newSend.classList.remove("selected");
        }, 2000);
        
      } else {
        throw new Error("Failed");
      }
    } catch (e) { 
      // 失败：变红
      newSend.innerHTML = `<span class="v-opt-id" style="color:#FF8A8A">ERROR</span>`;
      setTimeout(() => {
        newSend.innerHTML = `<span class="v-opt-id">SEND TRANSMISSION</span>`;
        newSend.style.opacity = "1";
      }, 2000);
    }
  });
}
