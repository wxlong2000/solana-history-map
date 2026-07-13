# Contributing

The most valuable contribution to this project is a **factual correction with
a primary source**. The whole point of the atlas is that every claim can be
checked — help us keep that true.

## Reporting a factual error (highest priority)

Open an issue using the **Factual correction** template (or email
wxlong20000@gmail.com if you don't use GitHub). Include:

1. **Which landmark** (name or `id` from `landmarks-data.js`)
2. **The exact sentence** that is wrong or misleading
3. **What it should say**
4. **A primary source URL** — official post-mortem, court document, spec,
   on-chain data, or first-party statement. News articles are fine as
   supporting sources; primary beats secondary.

## How corrections flow

1. The fix is made in [`landmarks-data.js`](./landmarks-data.js) — the single
   source of truth. Generated files are never edited by hand.
2. `node build/generate.js` regenerates the landmark pages, `landmarks.json`,
   `sources.html`, and `sitemap.xml`.
3. `node build/verify.js` must pass (data schema, generated-file sync, no
   dead links/assets).
4. The landmark's `lastVerified` date is updated, and the change lands in
   [`CHANGELOG.md`](./CHANGELOG.md).

## Editorial rules (non-negotiable)

These mirror the rules the existing content was written under:

- **No invented numbers.** Every figure is either from a cited source or
  explicitly labeled *illustrative* in-frame.
- **Hedge disputed facts.** If the record is contested (e.g. the Slope leak
  attribution), the copy says so and cites both sides — we don't pick winners.
- **Separate liveness from loss.** Outage/congestion events must not read as
  "hack" or "funds lost" when they weren't.
- **Culture, not investment.** Meme-era records document cultural history;
  no price talk, no promotion, affiliation disclaimers stay.
- **Primary sources first.** Official post-mortems, filings, and specs
  outrank commentary.

## Code contributions

Keep the footprint small — that's a feature:

- Vanilla JS/CSS/HTML only; no frameworks, no runtime dependencies, no
  build chain for the site itself.
- No third-party analytics, cookies, fingerprints, or user IDs. Privacy-first
  aggregate page and interaction events must honor DNT/GPC.
- `_worker.js` stays a minimal read-only RPC proxy; secrets live only in the
  Cloudflare environment.
- Match the existing code style; run `node build/verify.js` and
  `node build/smoke.js` before submitting.

## Proposing a new landmark

Open an issue first. A landmark needs: a clearly dated event, ecosystem-level
significance, and **at least two independent sources** (one primary). The
map's building art is hand-illustrated, so new landmarks are batched with art
updates rather than added ad hoc.
