-- Aggregate, privacy-first conversion funnel for the last 7 days.
-- Paste this into the Cloudflare Analytics Engine SQL console.
SELECT
  if(empty(blob6), '(direct)', blob6) AS campaign,
  if(empty(blob5), '(none)', blob5) AS landmark,
  sumIf(_sample_interval, blob4 = 'pageview') AS landings,
  sumIf(_sample_interval, blob4 = 'sim_start') AS starts,
  sumIf(_sample_interval, blob4 = 'sim_complete') AS completes,
  sumIf(_sample_interval, blob4 = 'challenge_open') AS challenge_opens,
  sumIf(_sample_interval, blob4 IN ('challenge_answer_correct', 'challenge_answer_other')) AS challenge_answers,
  sumIf(_sample_interval, blob4 IN ('share_open', 'share_download', 'share_native', 'share_copy', 'share_x')) AS shares,
  sumIf(_sample_interval, blob4 = 'github_click') AS github_clicks,
  sumIf(_sample_interval, blob4 = 'source_click') AS source_clicks
FROM shm_hits
WHERE timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY campaign, landmark
HAVING landings + starts + completes + challenge_opens + challenge_answers + shares + github_clicks + source_clicks > 0
ORDER BY starts DESC, landings DESC
LIMIT 200
FORMAT JSON
