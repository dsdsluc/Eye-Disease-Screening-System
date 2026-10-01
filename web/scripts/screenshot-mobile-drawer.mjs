import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("pageerror", (err) => console.log("[pageerror]", err.message));
page.on("console", (msg) => { if (msg.type() === "error") console.log("[console.error]", msg.text()); });

await page.goto("http://localhost:3000/doctor", { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: "D:/Fundas_System/scratch_theme/mobile-topbar.png" });

await page.getByLabel("Mở menu điều hướng").click();
await page.waitForTimeout(400);
await page.screenshot({ path: "D:/Fundas_System/scratch_theme/mobile-drawer-open.png" });

// click "Bệnh nhân" nav item inside drawer, drawer should close and navigate
await page.getByRole("link", { name: "Bệnh nhân" }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: "D:/Fundas_System/scratch_theme/mobile-after-nav.png" });

await browser.close();
