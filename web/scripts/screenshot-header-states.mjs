import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 400 } });

page.on("pageerror", (err) => console.log("[pageerror]", err.message));

await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: "/d/Fundas_System/scratch_header_top.png" });

await page.evaluate(() => window.scrollTo(0, 500));
await page.waitForTimeout(700);
await page.screenshot({ path: "/d/Fundas_System/scratch_header_scrolled.png" });

await browser.close();
