import { chromium } from "playwright";

const url = process.argv[2];
const outPath = process.argv[3] ?? "debug.png";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });

page.on("console", (msg) => {
  if (msg.type() === "error") console.log("[console.error]", msg.text());
});
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.getByText("Tạo diễn giải AI").click();
await page.waitForSelector("text=Diễn giải hỗ trợ đọc ảnh", { timeout: 20000 });
await page.waitForTimeout(500);
await page.screenshot({ path: outPath, fullPage: true });

await browser.close();
