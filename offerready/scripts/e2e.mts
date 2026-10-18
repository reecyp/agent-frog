// End-to-end checks of secondary workflows through the real UI, in headless Chrome.
// Needs the dev server running. Uses a fresh browser profile, so the demo student is active
// except for the onboarding check, which creates a practice profile (removed by Reset demo).
// Usage: npx tsx scripts/e2e.mts [resume.pdf]
import puppeteer, { type Page } from "puppeteer-core";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const resumePdf = process.argv[2];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function clickText(page: Page, selector: string, text: string) {
  const ok = await page.evaluate((sel, t) => {
    const el = [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.textContent?.trim().includes(t) && !(e as HTMLButtonElement).disabled);
    el?.click();
    return !!el;
  }, selector, text);
  if (!ok) throw new Error(`No ${selector} containing "${text}"`);
}
const toasts = (page: Page) => page.evaluate(() => [...document.querySelectorAll("[role=status],[role=alert]")].map((e) => e.textContent ?? "").join(" | "));

async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    check(name, false, (e as Error).message);
  }
}

const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 900 });
const pageErrors: string[] = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));

// ---------- Network: find an alum, save a note with a follow-up, draft outreach ----------
await step("network", async () => {
  await page.goto(`${BASE}/network?q=Deloitte`, { waitUntil: "networkidle0" });
  const href = await page.$eval("a[href^='/network/']", (a) => a.getAttribute("href"));
  await page.goto(BASE + href, { waitUntil: "networkidle0" });
  await page.type("#n-body", "Sent a short intro email asking about the audit internship.");
  const follow = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
  await page.$eval("#n-follow", (el, v) => {
    const i = el as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(i, v);
    i.dispatchEvent(new Event("input", { bubbles: true }));
  }, follow);
  await clickText(page, "button", "Save note");
  await wait(2500);
  check("network: note saved with follow-up reminder", (await toasts(page)).includes("follow-up reminder added"));
  await page.reload({ waitUntil: "networkidle0" });
  check("network: note appears in history", (await page.content()).includes("Sent a short intro email"));
  await clickText(page, "button", "Draft email");
  await wait(2500);
  const body = await page.$eval("#body", (el) => (el as HTMLTextAreaElement).value);
  check("network: outreach draft has blanks and no fabricated meeting", body.includes("[[PERSONALIZE") && !/we met|great to meet|as we discussed/i.test(body));
  const html = await page.content();
  check("network: no email address in the page", !/[\w.+-]+@(?!tcu\.edu)[\w-]+\.[a-z]{2,}/i.test(html.replace(/horned\.frogs@tcu\.edu/g, "")));
});

// ---------- Interview: start a session and get feedback on a typed answer ----------
await step("interview", async () => {
  await page.goto(`${BASE}/interview`, { waitUntil: "networkidle0" });
  const href = await page.$eval("a[href^='/interview/']", (a) => a.getAttribute("href"));
  await page.goto(BASE + href, { waitUntil: "networkidle0" });
  if (await page.evaluate(() => document.body.innerText.includes("Start practice"))) {
    await clickText(page, "button", "Start practice");
    await wait(3000);
    await page.reload({ waitUntil: "networkidle0" });
  }
  await clickText(page, "button", "Skip the countdown");
  await wait(400);
  await page.type("textarea[id^='a-']", "Last summer at my internship I had to take over portfolio reporting. The task was to deliver quarterly reports for 40 clients. I built Excel models that pulled benchmark data, and I asked the advisor to review the first two. As a result we cut preparation from 3 days to 1.");
  await clickText(page, "button", "Get feedback");
  await wait(3500);
  const text = await page.evaluate(() => document.body.innerText);
  check("interview: feedback with STAR breakdown shown", /out of 5/.test(text) && /Situation/i.test(text) && /Talking points from your own experience/.test(text));
});

// ---------- Onboarding: upload a resume PDF into a practice profile ----------
if (resumePdf) {
  await step("onboarding", async () => {
    await page.goto(`${BASE}/onboarding`, { waitUntil: "networkidle0" });
    const input = await page.$("input[name=resume]");
    await input!.uploadFile(resumePdf);
    await page.type("#ob-roles", "Finance intern");
    await clickText(page, "button", "Import and continue");
    await page.waitForFunction(() => document.body.innerText.includes("Imported.") || document.querySelector("[role=alert]"), { timeout: 60_000 });
    const text = await page.evaluate(() => document.body.innerText);
    check("onboarding: resume imported", text.includes("Imported."), text.match(/Resume:[^\n]*/)?.[0] ?? text.slice(0, 200));
    await page.goto(`${BASE}/profile`, { waitUntil: "networkidle0" });
    const prof = await page.evaluate(() => document.body.innerText);
    check("onboarding: extracted items await confirmation", /need a look/.test(prof) && /From upload, confirm it/.test(prof));
    check("onboarding: practice profile is active (demo untouched)", /Practice profile/.test(prof));
  });
}

check("no uncaught page errors", pageErrors.length === 0, pageErrors.slice(0, 2).join(" | "));
await browser.close();
console.log(failures ? `${failures} failure(s)` : "All end-to-end checks passed");
process.exit(failures ? 1 : 0);
