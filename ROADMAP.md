# Roadmap

Solana History Map is a free, open-source public good: a source-cited,
interactive way to **learn Solana's core mechanisms through the real events
that defined them**. This roadmap separates what has already shipped from what
grant funding would build next, framed as measurable milestones.

## Shipped (v1.0)

- **22 source-cited landmark records · 73 references**, weighted toward primary
  sources (official post-mortems, court filings, specs, root-cause analyses).
- **16 playable mechanism simulations** — you operate the failure mode yourself
  (forge the Wormhole receipt, tamper a real SHA-256 Proof-of-History chain,
  drain the Mango oracle, audit the FTX dependency graph, run the Saga
  arbitrage flywheel, crowdfund-then-fail the WIF Sphere).
- **[Learn](https://www.meow-woof.org/learn.html)** — the simulations organized
  into four mechanism tracks (consensus & liveness; exploits, security & systemic
  risk; markets & liquidity; scale & distribution).
- **Open dataset** — `landmarks.json` (CC-BY-4.0), versioned, with per-landmark
  `lastVerified` dates and a documented schema.
- **Editorial method in public** — every claim cited, disputed facts hedged (not
  smoothed), a factual-correction issue template, and editorial rules in
  [CONTRIBUTING](./CONTRIBUTING.md).
- **Engineering** — zero-dependency static site, CSP + security headers,
  Lighthouse-tuned, self-hosted fonts (no third-party requests), privacy-first
  self-hosted analytics (no cookies, no fingerprinting, DNT/GPC honored), and a
  CI pipeline (`build/verify.js` + `build/smoke.js`) that guards data↔page
  consistency on every push.

## What grant funding would build (milestones)

Each milestone is independently shippable, has a measurable acceptance bar, and
extends the same open dataset and CC-BY simulation engine.

### M1 — Complete the playable curriculum
Upgrade the remaining six illustrated-timeline landmarks (MEWVEIL WOODS, PUP-LINE
CIRCUIT, DIAMONDHANDS FORGE, SHARKCAT COVE, GRAND AIRDROP SHRINE, CAT SEASON
PEAKS) into full mechanism simulations at the depth of the Wormhole and
Proof-of-History teardowns. Together they form a coherent "meme attention
economics" unit (ecosystem niche, cultural reserve, borrowed credibility,
costly signals, mass distribution, IP rights).
*Acceptance: 22/22 landmarks playable; each new sim ships with a source-review
record and passes the editorial red-lines (illustrative labels, hedged disputes).*

### M2 — Open dataset v2 (machine-readable Solana history)
Extend `landmarks.json` into a structured event schema (timeline, protocols
involved, loss figures with source-confidence, root cause, remediation), served
at a stable versioned URL with a read-only API, so researchers, journalists, and
educators can cite and build on it.
*Acceptance: v2 schema published under CC-BY-4.0 with a changelog and at least one
external reuse.*

### M3 — Embeddable widgets + educator adoption
Package each simulation as an embeddable widget (single-line embed) with an
educator guide, so the teardowns can live inside courses, documentation, and
articles rather than only on this site.
*Acceptance: embed API documented; target ≥5 external sites/courses embedding a
teardown.*

### M4 — Sustainability: community fact-maintenance
Operate the public correction pipeline (issue template + primary-source
requirement + CI guard), a proposal/acceptance standard for new landmarks, and a
quarterly full re-verification that refreshes every `lastVerified` date and lands
in the changelog — so the archive keeps growing and staying accurate after the
grant period.
*Acceptance: documented landmark-acceptance criteria; one quarterly
re-verification cycle completed in public.*

### M5 (optional) — Localization
Localize the landmark pages and simulation UI into at least two additional
languages.

## Maintenance commitment

Independent of funding, the project commits to: responding to factual-correction
issues, keeping `lastVerified` dates honest, and publishing changes in
[CHANGELOG.md](./CHANGELOG.md).
