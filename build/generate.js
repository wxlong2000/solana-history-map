// Build script: from landmarks-data.js, generate
//   - /landmarks/<id>.html   per-landmark static pages (own title/desc/og:image)
//   - /assets/og/<id>.jpg     1200x630 cyberpunk share cards (sharp)
//   - /landmarks.json         open dataset
//   - /dataset.html           dataset + methodology page
//   - /sitemap.xml
// Run:  node build/generate.js      (from site-new/)
// sharp is optional: without it, OG share cards are kept as-is and only the
// HTML pages / landmarks.json / sitemap are regenerated.

const fs = require("fs");
const path = require("path");

const SITE = path.resolve(__dirname, "..");
let sharp = null;
try { sharp = require("sharp"); }
catch (e) {
  try { sharp = require(path.resolve(SITE, "..", "cron-final", "node_modules", "sharp")); }
  catch (e2) { console.warn("sharp not available — skipping OG card regeneration"); }
}

// Deploy-time base URL — CONFIRM/EDIT before deploying (OG tags need absolute URLs).
const BASE_URL = "https://www.meow-woof.org";
// Single cache-busting version for CSS shared across every generated page —
// hand-written pages (index/about/sources/dataset/footprint) must match.
const CSS_VERSION = 20;
const DATASET_VERSION = "1.0.0";

global.window = {};
require(path.join(SITE, "landmarks-data.js"));
const ALL = global.window.SOLANA_HISTORY_LANDMARKS || [];
const LM = ALL.filter((l) => l.status !== "archive");

const OG_DIR = path.join(SITE, "assets", "og");
const LMK_DIR = path.join(SITE, "landmarks");
fs.mkdirSync(OG_DIR, { recursive: true });
fs.mkdirSync(LMK_DIR, { recursive: true });

function esc(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
const W = 1200, H = 630;

async function makeCard(l) {
  if (!sharp) return; // no sharp available — keep existing OG cards
  let base;
  const ownImg = l.image ? path.join(SITE, l.image) : null;
  if (ownImg && fs.existsSync(ownImg)) {
    base = sharp(ownImg).resize(W, H, { fit: "cover", position: "centre" });
  } else {
    // crop the main map around this landmark's coordinates, at 1200:630 ratio
    const mapPath = path.join(SITE, "assets", "final_3840.webp");
    const meta = await sharp(mapPath).metadata();
    let cw = Math.round(meta.height * W / H), ch = meta.height;
    if (cw > meta.width) { cw = meta.width; ch = Math.round(meta.width * H / W); }
    let left = Math.round((l.x || 50) / 100 * meta.width - cw / 2);
    let top = Math.round((l.y || 50) / 100 * meta.height - ch / 2);
    left = Math.max(0, Math.min(left, meta.width - cw));
    top = Math.max(0, Math.min(top, meta.height - ch));
    base = sharp(mapPath).extract({ left, top, width: cw, height: ch }).resize(W, H, { fit: "cover" });
  }
  const accent = l.danger ? "#ff476f" : "#5df5b4";
  const cat = String(l.category || "").toUpperCase();
  const meta2 = [cat, l.year || ""].filter(Boolean).join("  ·  ");
  const sourced = (l.sources && l.sources.length) ? "VERIFIED · SOURCED" : "";
  const title = esc(l.name);
  const titleSize = title.length > 16 ? 62 : 76;
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#05070b" stop-opacity="0.05"/>
      <stop offset="0.5" stop-color="#05070b" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#05070b" stop-opacity="0.96"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <rect x="0" y="0" width="${W}" height="7" fill="${accent}"/>
    <text x="64" y="${H - 168}" font-family="monospace" font-size="26" letter-spacing="5" fill="${accent}">${esc(meta2)}</text>
    <text x="62" y="${H - 96}" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="${titleSize}" fill="#f4f7fb">${title}</text>
    ${sourced ? `<text x="64" y="${H - 48}" font-family="monospace" font-size="22" letter-spacing="3" fill="#9fb0c0">${sourced}</text>` : ""}
    <text x="${W - 64}" y="${H - 48}" text-anchor="end" font-family="monospace" font-size="20" letter-spacing="3" fill="#5df5b4">SOLANA HISTORY MAP</text>
  </svg>`;
  await base.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).jpeg({ quality: 82 }).toFile(path.join(OG_DIR, l.id + ".jpg"));
}

const LP_STYLE = `.lp{max-width:880px}
.lp-back{display:inline-block;margin-bottom:16px;font-family:var(--font-mono);font-size:12px;letter-spacing:.5px;color:var(--solana-green);text-decoration:none}
.lp-back:hover{text-shadow:var(--glow-green)}
.lp .selected-title{font-size:clamp(34px,6vw,64px);margin:4px 0 6px}
.lp-hero{width:100%;border-radius:12px;border:1px solid var(--line);margin:16px 0;display:block;aspect-ratio:1200/630;object-fit:cover;background:#0a0f14}
.lp .selected-tldr{font-size:clamp(17px,2vw,22px);margin:8px 0 4px}
.lp .story-block{margin-top:16px;gap:18px}
.lp .evidence{margin-top:18px}
.lp-nav{display:flex;justify-content:space-between;gap:14px;margin-top:28px;padding-top:18px;border-top:1px solid var(--line)}
.lp-nav a{font-family:var(--font-mono);font-size:13px;color:var(--solana-cyan);text-decoration:none}
.lp-nav a:hover{color:var(--solana-green)}
.lp-tier{display:inline-block;margin-left:10px;padding:2px 8px;border-radius:3px;border:1px solid var(--line);font-family:var(--font-mono);font-size:10px;letter-spacing:1.5px;color:var(--ink-dim);vertical-align:middle}
.lp-tier-play{border-color:rgba(93,245,180,.45);color:var(--solana-green)}`;

function pageHtml(l, prev, next) {
  const cat = String(l.category || "").toUpperCase();
  const metaBits = [l.year, cat, (l.sources && l.sources.length) ? "SOURCED" : ""].filter(Boolean).join("  ·  ");
  const desc = esc(l.tldr || "");
  const ogImg = `${BASE_URL}/assets/og/${l.id}.jpg`;
  const url = `${BASE_URL}/landmarks/${l.id}.html`;
  const story = [["What happened", l.whatHappened], ["Why Solana remembers it", l.whyItMatters], ["On the map", l.onMap]]
    .filter((s) => s[1]).map((s) => `<section><h4>${esc(s[0])}</h4><p>${esc(s[1])}</p></section>`).join("");
  const sources = (l.sources && l.sources.length)
    ? l.sources.map((s) => `<div class="source-line"><span class="src-tag">VERIFIED //</span><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></div>`).join("")
    : '<span class="story-empty">Source verification pending.</span>';
  const heroSrc = (l.image) ? "../" + esc(l.image) : `../assets/og/${l.id}.jpg`;
  const affil = l.affiliationNote ? `<p class="affiliation-note">${esc(l.affiliationNote)}</p>` : "";
  const tierBadge = l.tier === "playable"
    ? '<span class="lp-tier lp-tier-play">PLAYABLE TEARDOWN</span>'
    : '<span class="lp-tier">ILLUSTRATED TIMELINE</span>';
  const verified = l.lastVerified ? ` · sources last verified ${esc(l.lastVerified)}` : "";
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: l.name,
    description: l.tldr || "",
    url: url,
    image: ogImg,
    dateModified: l.lastVerified ? l.lastVerified + "-01" : undefined,
    isPartOf: { "@type": "WebSite", name: "Solana History Map", url: BASE_URL + "/" },
    license: "https://creativecommons.org/licenses/by/4.0/",
    citation: (l.sources || []).map((s) => s.url),
  });
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(l.name)} — Solana History Map</title>
<meta name="description" content="${desc}">
<meta property="og:title" content="${esc(l.name)} — Solana History Map">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="article"><meta property="og:url" content="${url}">
<meta property="og:image" content="${ogImg}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${ogImg}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon-32.png" sizes="32x32"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="../history-map.css?v=${CSS_VERSION}">
<script defer src="../stats.js?v=1"></script>
<style>${LP_STYLE}</style>
<script type="application/ld+json">${jsonLd}</script>
</head><body data-fx="on">
<header class="site-header">
  <a class="brand-mark" href="../index.html" aria-label="Solana History Map home"><span class="brand-kicker">SOURCE-CITED ATLAS</span><span class="brand-title">Solana History Map</span></a>
  <nav class="nav-links" aria-label="Primary navigation"><a href="../index.html">Atlas</a><a href="../learn.html">Learn</a><a href="../footprint.html">Footprint</a><a href="../sources.html">Sources</a><a href="../about.html">About</a></nav>
</header>
<main class="page-shell lp">
  <a class="lp-back" href="../index.html#${esc(l.id)}">← Back to the atlas</a>
  <p class="panel-topline">Record // ${esc(cat)} ${tierBadge}</p>
  <h1 class="selected-title">${esc(l.name)}</h1>
  <p class="selected-meta">${esc(metaBits)}</p>
  <img class="lp-hero" src="${heroSrc}" alt="${esc(l.name)} landmark artwork" loading="lazy" decoding="async">
  <p class="selected-tldr">${esc(l.tldr || "")}</p>
  <div class="story-block">${story}</div>
  <details class="evidence" open><summary>Evidence${verified}</summary><div class="evidence-body">${sources}</div></details>
  ${affil}
  <nav class="lp-nav"><a href="./${esc(prev.id)}.html">← ${esc(prev.name)}</a><a href="./${esc(next.id)}.html">${esc(next.name)} →</a></nav>
</main>
<footer class="site-footer"><span class="foot-brand">Solana History Map</span><a href="../sources.html">Sources</a><a href="../about.html">About</a><span class="foot-spacer"></span><a href="../LICENSE">Open-source · MIT + CC-BY-4.0</a><a href="https://github.com/wxlong2000/solana-history-map" rel="noopener">GitHub</a></footer>
</body></html>`;
}

function datasetHtml(json) {
  const rows = LM.map((l) => `<tr><td>${esc(l.name)}</td><td>${esc(l.category || "")}</td><td>${esc(l.year || "")}</td><td>${esc(l.status)}</td><td>${(l.sources || []).length}</td><td>${esc(l.lastVerified || "")}</td></tr>`).join("");
  const dsLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: json.name,
    description: "Open, source-cited dataset of 22 Solana ecosystem history landmarks: outages, exploits, infrastructure milestones, airdrops, and culture.",
    url: `${BASE_URL}/dataset.html`,
    version: json.version,
    dateModified: json.generated_at,
    license: "https://creativecommons.org/licenses/by/4.0/",
    isAccessibleForFree: true,
    creator: { "@type": "Organization", name: "Solana History Map" },
    distribution: [{ "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${BASE_URL}/landmarks.json` }],
  });
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Open dataset — Solana History Map</title>
<meta name="description" content="Open, reusable dataset of Solana history landmarks with sources. CC-BY-4.0.">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon-32.png" sizes="32x32"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="./history-map.css?v=${CSS_VERSION}">
<script defer src="./stats.js?v=1"></script>
<style>.ds-table{width:100%;border-collapse:collapse;margin-top:18px;font-size:14px}.ds-table th,.ds-table td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line)}.ds-table th{font-family:var(--font-mono);font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--solana-green)}</style>
<script type="application/ld+json">${dsLd}</script>
</head><body data-fx="on">
<header class="site-header"><a class="brand-mark" href="./index.html"><span class="brand-kicker">SOURCE-CITED ATLAS</span><span class="brand-title">Solana History Map</span></a>
<nav class="nav-links"><a href="./index.html">Atlas</a><a href="./learn.html">Learn</a><a href="./footprint.html">Footprint</a><a href="./sources.html">Sources</a><a href="./about.html">About</a></nav></header>
<main class="page-shell">
<h1>Open dataset</h1>
<p>Every landmark on this map is open data you can reuse. Text and data are licensed <a href="./LICENSE-DATA.md">CC-BY-4.0</a>; the site code is <a href="./LICENSE">MIT</a>. No token, no tracking, no affiliation claims.</p>
<p><a class="btn-hud" href="./landmarks.json" download>Download landmarks.json</a></p>
<h2 style="margin-top:28px;font-size:20px">Methodology</h2>
<p>A landmark qualifies if it is (1) a real, documented Solana ecosystem event or culture moment, (2) sourceable to a primary or strongly authoritative reference, and (3) memorable enough to teach. Security and outage events lead with official post-mortems, court filings, or Chainalysis; meme/culture entries are documented neutrally as culture, never as investment advice. References are historical citations, not endorsements.</p>
<p class="src-count">Dataset v${esc(json.version)} · generated ${esc(json.generated_at)} · ${LM.length} landmarks</p>
<table class="ds-table"><thead><tr><th>Landmark</th><th>Category</th><th>Year</th><th>Status</th><th>Sources</th><th>Verified</th></tr></thead><tbody>${rows}</tbody></table>
</main>
<footer class="site-footer"><span class="foot-brand">Solana History Map</span><a href="./sources.html">Sources</a><a href="./about.html">About</a><span class="foot-spacer"></span><a href="./LICENSE">Open-source · MIT + CC-BY-4.0</a><a href="https://github.com/wxlong2000/solana-history-map" rel="noopener">GitHub</a></footer>
</body></html>`;
}

function sourcesHtml() {
  const blocks = LM.map((l) => {
    const links = (l.sources || []).length
      ? l.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`).join("")
      : `<li class="src-none">Source verification pending.</li>`;
    const meta = [String(l.category || "").toUpperCase(), l.year || (l.date || "").slice(0, 4)].filter(Boolean).join("  ·  ");
    return `<section class="src-entry"><h3><a href="./landmarks/${esc(l.id)}.html">${esc(l.name)}</a></h3>` +
      `<p class="src-meta">${esc(meta)}</p><p class="src-tldr">${esc(l.tldr || "")}</p>` +
      `<ul class="src-list">${links}</ul></section>`;
  }).join("");
  const total = LM.reduce((n, l) => n + (l.sources || []).length, 0);
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sources — Solana History Map</title>
<meta name="description" content="The source index for the Solana History Map — every landmark with its primary and journalistic references. CC-BY-4.0.">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon-32.png" sizes="32x32"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="./history-map.css?v=${CSS_VERSION}">
<script defer src="./stats.js?v=1"></script>
<style>.src-intro{max-width:760px;color:var(--muted,#9aa6b8)}
.src-count{font-family:var(--font-mono);font-size:12px;letter-spacing:1px;color:var(--solana-green);text-transform:uppercase}
.src-entry{padding:16px 0;border-bottom:1px solid var(--line)}
.src-entry h3{margin:0 0 2px;font-size:18px}
.src-entry h3 a{color:var(--ink,#f4f7fb);text-decoration:none}
.src-entry h3 a:hover{color:var(--solana-green)}
.src-meta{margin:0;font-family:var(--font-mono);font-size:11px;letter-spacing:1px;color:var(--solana-green)}
.src-tldr{margin:6px 0 8px;color:var(--muted,#9aa6b8);font-size:14px;max-width:760px}
.src-list{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px}
.src-list a{color:var(--solana-cyan);font-size:13px;text-decoration:none}
.src-list a:hover{color:var(--solana-green);text-decoration:underline}
.src-none{color:var(--muted,#9aa6b8);font-size:13px;list-style:none;margin-left:-18px}</style>
</head><body data-fx="on">
<header class="site-header"><a class="brand-mark" href="./index.html"><span class="brand-kicker">SOURCE-CITED ATLAS</span><span class="brand-title">Solana History Map</span></a>
<nav class="nav-links"><a href="./index.html">Atlas</a><a href="./learn.html">Learn</a><a href="./footprint.html">Footprint</a><a href="./sources.html" aria-current="page">Sources</a><a href="./about.html">About</a></nav></header>
<main class="page-shell">
<h1>Source Index</h1>
<p class="src-intro">Every landmark on the map is an interpretation of a documented Solana ecosystem memory, backed by primary or strongly authoritative references. Citations are historical references, not endorsements, partnerships, or affiliation claims.</p>
<p class="src-count">${LM.length} landmarks · ${total} references · auto-generated from <a href="./dataset.html" style="color:var(--solana-cyan,#46c7ec)">the open dataset</a></p>
${blocks}
</main>
<footer class="site-footer"><span class="foot-brand">Solana History Map</span><a href="./about.html">About</a><a href="./dataset.html">Dataset</a><span class="foot-spacer"></span><a href="./LICENSE">Open-source · MIT + CC-BY-4.0</a><a href="https://github.com/wxlong2000/solana-history-map" rel="noopener">GitHub</a></footer>
</body></html>`;
}

async function main() {
  for (let i = 0; i < LM.length; i++) {
    const l = LM[i];
    const prev = LM[(i - 1 + LM.length) % LM.length];
    const next = LM[(i + 1) % LM.length];
    await makeCard(l);
    fs.writeFileSync(path.join(LMK_DIR, l.id + ".html"), pageHtml(l, prev, next));
  }
  const json = {
    name: "Solana History Map — landmark dataset",
    license: "CC-BY-4.0",
    generated_from: "landmarks-data.js",
    version: DATASET_VERSION,
    generated_at: new Date().toISOString().slice(0, 10),
    count: LM.length,
    landmarks: LM.map((l) => ({
      id: l.id, name: l.name, category: l.category, year: l.year, date: l.date || "",
      tldr: l.tldr, whatHappened: l.whatHappened, whyItMatters: l.whyItMatters,
      status: l.status, tier: l.tier || "", lastVerified: l.lastVerified || "",
      sources: l.sources || [],
      page: `${BASE_URL}/landmarks/${l.id}.html`
    })),
  };
  fs.writeFileSync(path.join(SITE, "landmarks.json"), JSON.stringify(json, null, 2));
  fs.writeFileSync(path.join(SITE, "dataset.html"), datasetHtml(json));
  fs.writeFileSync(path.join(SITE, "sources.html"), sourcesHtml());
  const urls = [`${BASE_URL}/`, `${BASE_URL}/dataset.html`, `${BASE_URL}/sources.html`, `${BASE_URL}/about.html`, `${BASE_URL}/learn.html`, `${BASE_URL}/footprint.html`]
    .concat(LM.map((l) => `${BASE_URL}/landmarks/${l.id}.html`));
  fs.writeFileSync(path.join(SITE, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}\n</urlset>\n`);
  console.log("Generated " + LM.length + " landmark pages + OG cards, dataset.html, landmarks.json, sitemap.xml");
}

main().catch((e) => { console.error(e); process.exit(1); });
