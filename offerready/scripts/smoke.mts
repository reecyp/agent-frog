// Visual + runtime smoke test. Visits every route at desktop and phone widths in headless Chrome,
// fails on console errors, page errors, HTTP errors, or horizontal page overflow, and saves screenshots.
// Usage: npm run dev (in another terminal), then: npx tsx scripts/smoke.mts [outDir] [route...]
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const out = process.argv[2] ?? path.join(process.cwd(), ".data", "smoke");
const only = process.argv.slice(3);
fs.mkdirSync(out, { recursive: true });

const ROUTES = only.length ? only : [
  "/", "/studio", "/discover", "/applications", "/applications?view=board", "/network", "/interview", "/follow-ups",
  "/profile", "/profile/questions", "/start", "/start/questions", "/start/confirm", "/ai-log", "/settings", "/does-not-exist",
];
const VIEWPORTS = [
  { name: "desktop", width: 1366, height: 900 },
  { name: "phone", width: 390, height: 844 },
];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-first-run"] });
let failures = 0;
for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height });
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 200)}`); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));
  for (const r of ROUTES) {
    errors.length = 0;
    const res = await page.goto(BASE + r, { waitUntil: "networkidle0", timeout: 60_000 });
    await new Promise((x) => setTimeout(x, 400));
    const status = res?.status() ?? 0;
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const file = path.join(out, `${vp.name}${r.replace(/[^a-z0-9]+/gi, "_") || "_root"}.png`);
    await page.screenshot({ path: file, fullPage: true });
    const expectStatus = r === "/does-not-exist" ? 404 : 200;
    // The browser logs the expected 404 itself; that's not an app error.
    const real = errors.filter((e) => !(expectStatus === 404 && e.includes("status of 404")));
    errors.splice(0, errors.length, ...real);
    const ok = status === expectStatus && errors.length === 0 && overflow <= 1;
    if (!ok) failures++;
    console.log(`${ok ? "PASS" : "FAIL"} ${vp.name} ${r} status=${status} overflowX=${overflow}px ${errors.join(" | ")}`);
  }
  await page.close();
}
await browser.close();
console.log(failures ? `${failures} failure(s)` : "All routes passed");
process.exit(failures ? 1 : 0);
