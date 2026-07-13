# Privacy-first conversion reporting

The public site writes aggregate interaction events to the `shm_hits` Workers
Analytics Engine dataset. Events contain only the canonical path, referrer host,
coarse device class, event name, landmark/action key, and campaign label. There
are no cookies, fingerprints, or user IDs, and DNT/GPC is honored in the browser
and Worker.

## Run the funnel

Create a Cloudflare API token with `Account Analytics: Read`, then keep both
values outside the repository:

```bash
export CLOUDFLARE_ACCOUNT_ID="..."
export CLOUDFLARE_API_TOKEN="..."
node scripts/report-funnel.mjs --days 7
node scripts/report-funnel.mjs --days 14 --campaign x_wormhole
```

The report groups aggregate totals by campaign and landmark and prints landing,
simulation start/completion, share, GitHub, and source-click counts. Conversion
ratios compare event totals; they are not user-level cohorts.

Without credentials, the command prints a query that can be pasted into the
Cloudflare dashboard. The fixed seven-day version lives at
[`analytics/funnel.sql`](./analytics/funnel.sql).

Never commit an API token. `.env*` and `.dev.vars` are ignored by Git.
