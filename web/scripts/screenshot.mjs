import { chromium } from "playwright";

const url = process.argv[2];
const outPath = process.argv[3] ?? "debug.png";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

page.on("console", (msg) => console.log(`[console.${msg.type()}]`, msg.text()));
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
await page.screenshot({ path: outPath, fullPage: true });

await browser.close();
