import { chromium } from "playwright";

const outPath = process.argv[2];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on("console", (msg) => {
  if (msg.type() === "error") console.log("[console.error]", msg.text());
});
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.evaluate(() => window.scrollTo(0, 1400));
await page.waitForTimeout(1200);
await page.screenshot({ path: outPath });

await browser.close();
