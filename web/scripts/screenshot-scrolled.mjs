import { chromium } from "playwright";

const url = process.argv[2];
const outPath = process.argv[3] ?? "debug.png";
const width = Number(process.argv[4]) || 1280;
const height = Number(process.argv[5]) || 900;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });

page.on("console", (msg) => {
  if (msg.type() === "error" || msg.type() === "warning") console.log(`[console.${msg.type()}]`, msg.text());
});
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);

// Scroll through the whole page in steps so whileInView (IntersectionObserver)
// animations actually fire the way a real visitor scrolling down would trigger them.
const pageHeight = await page.evaluate(() => document.body.scrollHeight);
const step = 400;
for (let y = 0; y < pageHeight; y += step) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForTimeout(250);
}
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(600);

await page.screenshot({ path: outPath, fullPage: true });
await browser.close();
