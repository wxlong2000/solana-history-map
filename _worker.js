// Cloudflare Pages advanced-mode Worker.
// Beyond serving the static site, it adds ONE endpoint: a cached, method-whitelisted Solana RPC
// proxy at /api/chain for the homepage live chain pulse. It hides the upstream RPC, whitelists only
// the read methods the pulse needs (so it can't be abused as an open relay), edge-caches a few
// seconds so all visitors collapse into a handful of upstream calls, and falls through a list of
// upstreams (skipping any that block the Worker's datacenter IP).
//
// Upstream: the public api.mainnet-beta endpoint blocks Cloudflare IPs, so the keyless default is
// PublicNode. Set RPC_UPSTREAM in the Pages project env to a paid/Helius URL to take priority; the
// key then lives only in the Cloudflare dashboard, never in this repo.

const ALLOWED = new Set(["getEpochInfo", "getRecentPerformanceSamples", "getSlot"]);
const FALLBACK_UPSTREAMS = ["https://solana-rpc.publicnode.com"];
const MAX_AGE = 8; // seconds

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/chain") return chain(request, env, ctx);
    if (url.pathname === "/_worker.js") return new Response("Not found", { status: 404 });
    return env.ASSETS.fetch(request); // everything else = static site
  },
};

function cors(resp) {
  const r = new Response(resp.body, resp);
  r.headers.set("Access-Control-Allow-Origin", "*");
  r.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  r.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return r;
}
function json(obj, status) {
  return cors(new Response(JSON.stringify(obj), { status: status || 200, headers: { "Content-Type": "application/json" } }));
}
async function sha1(s) {
  const b = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
// upstream refused us (datacenter-IP block, missing key, free-tier gate, …)
function isBlocked(text) {
  return /"code"\s*:\s*(403|-32052|35)\b|blocked|forbidden|api key|upgrade to paid/i.test(text);
}

async function chain(request, env, ctx) {
  if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
  if (request.method !== "POST") return json({ error: "POST only" }, 405);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "invalid json" }, 400); }

  const reqs = Array.isArray(body) ? body : [body];
  if (!reqs.length || reqs.length > 4) return json({ error: "bad batch size" }, 400);
  for (const r of reqs) {
    if (!r || typeof r.method !== "string" || !ALLOWED.has(r.method)) return json({ error: "method not allowed" }, 403);
  }

  const cache = caches.default;
  const key = new Request("https://chain-pulse.cache/" + (await sha1(JSON.stringify(reqs))), { method: "GET" });
  const hit = await cache.match(key);
  if (hit) return cors(hit);

  const upstreams = [];
  if (env && env.RPC_UPSTREAM) upstreams.push(env.RPC_UPSTREAM);
  for (const u of FALLBACK_UPSTREAMS) if (!upstreams.includes(u)) upstreams.push(u);

  const payload = JSON.stringify(body);
  let last = null;
  for (const upstream of upstreams) {
    let up;
    try {
      up = await fetch(upstream, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload });
    } catch (e) { continue; }
    const text = await up.text();
    if (up.ok && !isBlocked(text)) {
      const resp = new Response(text, {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=" + MAX_AGE },
      });
      ctx.waitUntil(cache.put(key, resp.clone()));
      return cors(resp);
    }
    last = text;
  }
  return json({ error: "all upstreams unavailable", detail: last ? last.slice(0, 160) : null }, 502);
}
