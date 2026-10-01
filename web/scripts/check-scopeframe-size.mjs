import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto("http://localhost:3000/doctor", { waitUntil: "networkidle" });
await page.waitForTimeout(400);

const box = await page.locator("a.group").first().locator("div.relative.aspect-square").first().boundingBox();
console.log("desktop scopeframe box:", box);

await browser.close();
