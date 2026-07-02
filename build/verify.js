// Consistency checks for the Solana History Map. Zero dependencies.
// Run:  node build/verify.js      (exit 0 = healthy, exit 1 = a check failed)
//
// 1. Data schema     — every landmark has the required, well-formed fields
// 2. Generated sync  — landmarks.json / landmark pages / sitemap match the data
// 3. Assets & links  — every referenced local file actually exists
// 4. Version drift   — one cache-busting version per shared asset, site-wide
// 5. Tier honesty    — tier:"playable" matches an actually registered sim

const fs = require("fs");
const path = require("path");

const SITE = path.resolve(__dirname, "..");
let failures = 0;
function fail(msg) { failures++; console.error("  ✗ " + msg); }
function ok(msg) { console.log("  ✓ " + msg); }

global.window = {};
require(path.join(SITE, "landmarks-data.js"));
const LM = (global.window.SOLANA_HISTORY_LANDMARKS || []).filter((l) => l.status !== "archive");

// ---------- 1. schema ----------
console.log("1. data schema");
if (LM.length !== 22) fail(`expected 22 landmarks, got ${LM.length}`);
const REQ = ["id", "name", "category", "date", "tldr", "whatHappened", "whyItMatters", "lastVerified", "tier"];
const seen = new Set();
for (const l of LM) {
  for (const k of REQ) if (!l[k]) fail(`${l.id || "?"}: missing field "${k}"`);
  if (seen.has(l.id)) fail(`duplicate id ${l.id}`); seen.add(l.id);
  if (typeof l.x !== "number" || typeof l.y !== "number") fail(`${l.id}: x/y must be numbers`);
  if (!Array.isArray(l.sources) || l.sources.length === 0) fail(`${l.id}: sources must be a non-empty array`);
  else for (const s of l.sources) {
    if (!s.label || !/^https:\/\//.test(s.url || "")) fail(`${l.id}: bad source ${JSON.stringify(s)}`);
  }
  if (!/^\d{4}-\d{2}$/.test(l.lastVerified || "")) fail(`${l.id}: lastVerified must be YYYY-MM`);
  if (!["playable", "timeline"].includes(l.tier)) fail(`${l.id}: tier must be playable|timeline`);
}
if (!failures) ok(`22 landmarks, ${LM.reduce((n, l) => n + l.sources.length, 0)} sources, all fields well-formed`);

// ---------- 2. generated sync ----------
console.log("2. generated files in sync");
const json = JSON.parse(fs.readFileSync(path.join(SITE, "landmarks.json"), "utf8"));
if (json.count !== LM.length || json.landmarks.length !== LM.length) fail("landmarks.json count mismatch");
if (!json.version || !json.license) fail("landmarks.json missing version/license");
for (const l of LM) {
  const j = json.landmarks.find((x) => x.id === l.id);
  if (!j) { fail(`landmarks.json missing ${l.id}`); continue; }
  for (const k of ["name", "tldr", "tier", "lastVerified"])
    if (j[k] !== l[k]) fail(`landmarks.json ${l.id}.${k} out of date — rerun: node build/generate.js`);
  if ((j.sources || []).length !== l.sources.length) fail(`landmarks.json ${l.id}.sources out of date`);
  const page = path.join(SITE, "landmarks", l.id + ".html");
  if (!fs.existsSync(page)) { fail(`missing page landmarks/${l.id}.html`); continue; }
  const html = fs.readFileSync(page, "utf8");
  if (!html.includes("application/ld+json")) fail(`landmarks/${l.id}.html missing JSON-LD — rerun generate`);
  if (!html.includes(`sources last verified ${l.lastVerified}`)) fail(`landmarks/${l.id}.html verified date stale — rerun generate`);
}
const sitemap = fs.readFileSync(path.join(SITE, "sitemap.xml"), "utf8");
const urlCount = (sitemap.match(/<loc>/g) || []).length;
if (urlCount !== 6 + LM.length) fail(`sitemap has ${urlCount} urls, expected ${6 + LM.length}`);
if (!sitemap.includes("footprint.html")) fail("sitemap missing footprint.html");
if (!failures) ok("landmarks.json, 22 pages, sitemap all match the data");

// ---------- 3. assets & links ----------
console.log("3. referenced assets exist");
const htmlFiles = ["index.html", "about.html", "sources.html", "dataset.html", "footprint.html", "404.html", "learn.html"]
  .map((f) => path.join(SITE, f))
  .concat(fs.readdirSync(path.join(SITE, "landmarks")).map((f) => path.join(SITE, "landmarks", f)));
let checked = 0;
for (const file of htmlFiles) {
  const dir = path.dirname(file);
  const html = fs.readFileSync(file, "utf8");
  const refs = [...html.matchAll(/(?:src|href)="([^"#]+?)(?:\?[^"]*)?"/g)].map((m) => m[1])
    .filter((u) => !/^(https?:|mailto:|data:|\/api\/)/.test(u));
  for (const u of refs) {
    const target = u.startsWith("/") ? path.join(SITE, u) : path.resolve(dir, u);
    if (!fs.existsSync(target)) fail(`${path.relative(SITE, file)} → dead ref ${u}`);
    checked++;
  }
}
for (const l of LM) {
  if (l.image && !fs.existsSync(path.join(SITE, l.image))) fail(`${l.id}: hero image missing ${l.image}`);
  if (!fs.existsSync(path.join(SITE, "assets", "og", l.id + ".jpg"))) fail(`${l.id}: og card missing`);
}
if (!failures) ok(`${checked} local references + 22 heroes + 22 OG cards all exist`);

// ---------- 4. version drift ----------
console.log("4. cache-version consistency");
for (const asset of ["history-map.css", "landmarks-data.js"]) {
  const versions = new Set();
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    for (const m of html.matchAll(new RegExp(asset.replace(".", "\\.") + "\\?v=(\\d+)", "g"))) versions.add(m[1]);
  }
  if (versions.size > 1) fail(`${asset} referenced with mixed versions: ${[...versions].join(", ")}`);
}
if (!failures) ok("one version per shared asset site-wide");

// ---------- 5. tier honesty ----------
console.log("5. tier labels match registered sims");
const simSrc = fs.readFileSync(path.join(SITE, "interactive-sim.js"), "utf8");
const registered = new Set([...simSrc.matchAll(/^\s*register\("([a-z_]+)"/gm)].map((m) => m[1]));
registered.add("wormhole"); // standalone module (wormhole-breach.js)
for (const l of LM) {
  const has = registered.has(l.id);
  if (l.tier === "playable" && !has) fail(`${l.id} labeled playable but no sim registered`);
  if (l.tier === "timeline" && has) fail(`${l.id} has a registered sim but is labeled timeline`);
}
if (!failures) ok(`14 playable tiers all backed by registered sims`);

console.log(failures ? `\nFAILED — ${failures} problem(s)` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
