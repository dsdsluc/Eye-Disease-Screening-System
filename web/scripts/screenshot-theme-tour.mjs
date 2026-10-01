import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: "D:/Fundas_System/scratch_theme/landing.png" });

await page.goto("http://localhost:3000/upload", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: "D:/Fundas_System/scratch_theme/upload.png" });

await browser.close();
