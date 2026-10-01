import { chromium } from "playwright";

const imagePath = process.argv[2];
const outPath = process.argv[3] ?? "debug.png";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });

page.on("console", (msg) => {
  if (msg.type() === "error") console.log("[console.error]", msg.text());
});
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.setInputFiles('input[type="file"]', imagePath);

await page.waitForURL(/\/results\//, { timeout: 15000 });
console.log("navigated to:", page.url());

await page.waitForSelector("text=Mức độ", { timeout: 30000 });
await page.waitForTimeout(500);
await page.screenshot({ path: outPath, fullPage: true });

await browser.close();
