import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const origin = (process.env.INDEXNOW_ORIGIN || "https://www.meow-woof.org").replace(/\/$/, "");
const keyFile = "indexnow-key.txt";
const key = (await readFile(join(siteRoot, keyFile), "utf8")).trim();
const sitemap = await readFile(join(siteRoot, "sitemap.xml"), "utf8");
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

if (!/^[a-f0-9]{32}$/.test(key)) throw new Error("Invalid IndexNow key file");
if (!urlList.length) throw new Error("No URLs found in sitemap.xml");
for (const url of urlList) {
  if (new URL(url).origin !== origin) throw new Error(`Unexpected sitemap origin: ${url}`);
}

const payload = {
  host: new URL(origin).host,
  key,
  keyLocation: `${origin}/${keyFile}`,
  urlList,
};

if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify({ dryRun: true, submitted: urlList.length, ...payload }, null, 2));
  process.exit(0);
}

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify(payload),
});
const responseBody = await response.text();

console.log(JSON.stringify({
  ok: response.ok,
  status: response.status,
  submitted: urlList.length,
  keyLocation: payload.keyLocation,
  response: responseBody,
}, null, 2));

if (!response.ok) process.exitCode = 1;
