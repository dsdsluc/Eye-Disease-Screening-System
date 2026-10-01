import { chromium } from "playwright";

const outTop = process.argv[2];
const outScrolled = process.argv[3];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 500 } });

page.on("pageerror", (err) => console.log("[pageerror]", err.message));

await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: outTop });

await page.evaluate(() => window.scrollTo(0, 500));
await page.waitForTimeout(700);
await page.screenshot({ path: outScrolled });

await browser.close();
