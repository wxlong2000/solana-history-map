#!/usr/bin/env node

const DATASET = "shm_hits";
const SHARE_EVENTS = ["share_open", "share_download", "share_native", "share_copy", "share_x"];

function parseArgs(argv) {
  const out = { days: 7, campaign: "", sqlOnly: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--days") out.days = Number(argv[++i]);
    else if (argv[i] === "--campaign") out.campaign = argv[++i] || "";
    else if (argv[i] === "--sql") out.sqlOnly = true;
    else if (argv[i] === "--help" || argv[i] === "-h") out.help = true;
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  if (!Number.isInteger(out.days) || out.days < 1 || out.days > 90) throw new Error("--days must be an integer from 1 to 90");
  if (out.campaign && !/^[a-z0-9_:-]{1,32}$/.test(out.campaign)) throw new Error("--campaign must match [a-z0-9_:-] and be at most 32 characters");
  return out;
}

function sqlFor({ days, campaign }) {
  const campaignFilter = campaign ? `\n  AND blob6 = '${campaign}'` : "";
  return `SELECT
  if(empty(blob6), '(direct)', blob6) AS campaign,
  if(empty(blob5), '(none)', blob5) AS landmark,
  sumIf(_sample_interval, blob4 = 'pageview') AS landings,
  sumIf(_sample_interval, blob4 = 'sim_start') AS starts,
  sumIf(_sample_interval, blob4 = 'sim_complete') AS completes,
  sumIf(_sample_interval, blob4 = 'challenge_open') AS challenge_opens,
  sumIf(_sample_interval, blob4 IN ('challenge_answer_correct', 'challenge_answer_other')) AS challenge_answers,
  sumIf(_sample_interval, blob4 IN (${SHARE_EVENTS.map((event) => `'${event}'`).join(", ")})) AS shares,
  sumIf(_sample_interval, blob4 = 'github_click') AS github_clicks,
  sumIf(_sample_interval, blob4 = 'source_click') AS source_clicks
FROM ${DATASET}
WHERE timestamp >= NOW() - INTERVAL '${days}' DAY${campaignFilter}
GROUP BY campaign, landmark
HAVING landings + starts + completes + challenge_opens + challenge_answers + shares + github_clicks + source_clicks > 0
ORDER BY starts DESC, landings DESC
LIMIT 200
FORMAT JSON`;
}

function pct(part, whole) {
  if (!whole) return "-";
  return `${((Number(part) / Number(whole)) * 100).toFixed(1)}%`;
}

function cell(value) {
  return String(value ?? "").replaceAll("|", "\\|");
}

function markdown(rows, days) {
  const head = [
    `# Solana History Map conversion funnel (${days}d)`,
    "",
    "Aggregate counts only. Ratios compare event totals; they do not identify or follow individual visitors.",
    "",
    "| Campaign | Landmark | Landing | Start | Start/Landing | Complete | Complete/Start | Challenge | Answered | Share | GitHub | Source |",
    "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
  ];
  if (!rows.length) return [...head, "| No events returned | - | 0 | 0 | - | 0 | - | 0 | 0 | 0 | 0 | 0 |"].join("\n");
  return [...head, ...rows.map((row) => [
    cell(row.campaign),
    cell(row.landmark),
    row.landings,
    row.starts,
    pct(row.starts, row.landings),
    row.completes,
    pct(row.completes, row.starts),
    row.challenge_opens,
    row.challenge_answers,
    row.shares,
    row.github_clicks,
    row.source_clicks,
  ].join(" | ").replace(/^/, "| ").replace(/$/, " |"))].join("\n");
}

function usage() {
  return `Usage: node scripts/report-funnel.mjs [--days 7] [--campaign x_wormhole] [--sql]

Environment for live queries:
  CLOUDFLARE_ACCOUNT_ID   32-character account ID
  CLOUDFLARE_API_TOKEN    token with Account Analytics:Read

Without those variables, the command prints the SQL instead of making a request.`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return console.log(usage());
  const sql = sqlFor(args);
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
  const token = process.env.CLOUDFLARE_API_TOKEN || "";
  if (args.sqlOnly || !accountId || !token) {
    if (!args.sqlOnly) console.error("Cloudflare read credentials are not set; printing SQL for the dashboard.\n");
    return console.log(sql);
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "text/plain" },
    body: sql,
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Cloudflare SQL API ${response.status}: ${body.slice(0, 500)}`);
  let payload;
  try { payload = JSON.parse(body); } catch (error) { throw new Error(`Cloudflare returned non-JSON data: ${body.slice(0, 500)}`); }
  console.log(markdown(Array.isArray(payload.data) ? payload.data : [], args.days));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
