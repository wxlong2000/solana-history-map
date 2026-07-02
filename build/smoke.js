// Smoke test layer 1: syntax-check every shipped JS file. Zero dependencies.
// Run:  node build/smoke.js
// (Layer 2 — headless browser checks — runs in CI only; see .github/workflows/ci.yml)

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const SITE = path.resolve(__dirname, "..");
const files = fs.readdirSync(SITE).filter((f) => f.endsWith(".js"))
  .concat(fs.readdirSync(path.join(SITE, "build")).map((f) => "build/" + f).filter((f) => f.endsWith(".js")));

let bad = 0;
for (const f of files) {
  try {
    execFileSync(process.execPath, ["--check", path.join(SITE, f)], { stdio: "pipe" });
    console.log("  ✓ " + f);
  } catch (e) {
    bad++;
    console.error("  ✗ " + f + "\n" + e.stderr.toString().split("\n").slice(0, 3).join("\n"));
  }
}
console.log(bad ? `\nFAILED — ${bad} file(s) with syntax errors` : `\nAll ${files.length} JS files parse cleanly`);
process.exit(bad ? 1 : 0);
