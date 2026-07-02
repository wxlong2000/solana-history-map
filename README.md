# Solana History Map

[![CI](https://github.com/wxlong2000/solana-history-map/actions/workflows/ci.yml/badge.svg)](https://github.com/wxlong2000/solana-history-map/actions/workflows/ci.yml)

**Learn Solana's core mechanisms through the real events that defined them.**
A source-cited, interactive atlas of 22 ecosystem history landmarks — outages,
exploits, infrastructure milestones, airdrops, and meme culture — on a
hand-illustrated map. The defining moments are playable, step-by-step
simulations of the actual mechanism: you don't read about the Wormhole
exploit, you forge the receipt; you don't read about Proof of History, you
tamper with a real SHA-256 chain and watch it break.

**Live:** https://www.meow-woof.org/ · **Start here:** [Learn tracks](https://www.meow-woof.org/learn.html)
(4 tracks × 16 playable teardowns: consensus & liveness, exploits & security,
markets & liquidity, scale & distribution)

- 🗺️ **22 landmarks · 62 references**, weighted toward primary sources
  (official post-mortems, court filings, specs, root-cause analyses)
- 🕹️ **Playable teardowns** — operate the failure mode yourself:
  - **Wormhole Breach** — be the clerk: forge the *receipt*, not the
    signature (`load_instruction_at` vs `load_instruction_at_checked`)
  - **Architect's Echo (Proof of History)** — real SHA-256 chaining in your
    browser; tamper one event and watch every later hash cascade-break
  - **Oracle Mirage (Mango)** — pump a thin oracle until fake PnL outweighs
    the real treasury, then drain it
  - **Firedancer Reactor** — kill a validator client and learn why *stake*,
    not client count, decides liveness
  - **Congestion Mine (ORE)**, **Leak Ruins (Slope)**, **Mount Restart** —
    congestion economics, the seed-phrase leak forensics, and how a cluster
    restart actually works
- 📊 **Open dataset** — [`landmarks.json`](./landmarks.json) (CC BY 4.0),
  regenerated from a single source of truth
- 📱 Mobile feed mode, per-landmark static pages, share cards, a read-only
  wallet "footprint" tool, and a live on-chain pulse via a tiny RPC proxy

## Editorial method

The content bet is **verifiability over vibes**:

- Every landmark cites its sources; disputed facts are hedged in the copy,
  not smoothed over. Examples shipped today:
  - Slope leak: only ~15% (1,444 of 9,229) of drained wallets were traced to
    the leaked server — stated as the *leading hypothesis*, with Slope's
    contestation noted.
  - Proof of History: explicitly flagged that "PoH as a strict VDF" is
    academically debated (Boneh/Bonneau/Bünz/Fisch definition vs. critics).
  - Mango: reflects the May 2025 vacated convictions, not just the 2024
    verdict.
- Numbers inside simulations are labeled *illustrative* where they are toy
  models; historical figures come from the cited sources.
- Meme-era tokens are documented **as culture, not investment** — every such
  record carries an affiliation disclaimer. No token, no tracking, no ads.

Found an error? See [CONTRIBUTING.md](./CONTRIBUTING.md) — factual
corrections with a primary source get priority.

## Architecture

Deliberately small and auditable:

- **Zero-dependency static site** — hand-written vanilla JS/CSS/HTML,
  no framework, no build chain for the runtime (~3,900 lines of JS total)
- **`_worker.js`** (85 lines) — the only server code: a method-whitelisted,
  edge-cached, read-only Solana RPC proxy (`/api/chain`) for the live pulse;
  the upstream key lives in the Cloudflare environment, never in the repo
- **`build/generate.js`** — regenerates the 22 landmark pages, OG share
  cards, `landmarks.json`, `sources.html`, and `sitemap.xml` from
  [`landmarks-data.js`](./landmarks-data.js), the single source of truth
- Landmark detail pages are pure HTML/CSS (zero JS) — fast and crawlable

## Run locally

Any static file server works:

```bash
cd site-new
python3 -m http.server 8123      # or: npx serve .
# open http://localhost:8123
```

To regenerate pages/dataset after editing `landmarks-data.js`:

```bash
node build/generate.js
# sharp (npm i sharp) is optional — without it, OG share cards are kept
# as-is and only HTML/JSON/sitemap are regenerated
node build/verify.js             # consistency checks (data ↔ generated files)
```

## Licensing

- **Code:** [MIT](./LICENSE)
- **Dataset & written content:** [CC BY 4.0](./LICENSE-DATA.md) — reuse it,
  cite it, build on it

## Origin

The map art was born in a cats-vs-dogs meme experiment (meow-woof). The token
era is over; the map grew up into this archive. The full transition is
visible in the git history — kept honestly, not rewritten.
