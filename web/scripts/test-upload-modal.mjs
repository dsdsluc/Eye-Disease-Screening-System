import { chromium } from "playwright";

const imagePath = process.argv[2];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 800 } });

page.on("console", (msg) => {
  if (msg.type() === "error") console.log("[console.error]", msg.text());
});
page.on("pageerror", (err) => console.log("[pageerror]", err.message));

await page.goto("http://localhost:3000/upload", { waitUntil: "networkidle" });
await page.setInputFiles('input[type="file"]', imagePath);

// Modal should appear almost immediately in "uploading" phase.
await page.waitForSelector("text=Đang tải ảnh lên", { timeout: 5000 });
await page.screenshot({ path: "D:/Fundas_System/scratch_modal_uploading.png" });
console.log("captured: uploading phase");

// Try to defeat the modal: press Escape and click outside -- should NOT close it.
await page.keyboard.press("Escape");
await page.mouse.click(20, 20);
await page.waitForTimeout(300);
const stillOpen = await page.locator('[data-slot="dialog-content"]').isVisible();
console.log("modal still open after Escape + outside click:", stillOpen);

await page.waitForSelector("text=Đang phân tích ảnh", { timeout: 5000 });
await page.screenshot({ path: "D:/Fundas_System/scratch_modal_processing.png" });
console.log("captured: processing phase");

await page.waitForURL(/\/results\//, { timeout: 30000 });
console.log("navigated to:", page.url());
await page.waitForSelector("text=Mức độ", { timeout: 30000 });
await page.waitForTimeout(800);
await page.screenshot({ path: "D:/Fundas_System/scratch_results_new.png" });

// Open the technical details accordion to confirm it's there but collapsed by default.
const trigger = page.getByText("Chi tiết kỹ thuật");
const wasCollapsed = !(await page.getByText("Inception v4").isVisible().catch(() => false));
console.log("technical details collapsed by default:", wasCollapsed);
await trigger.click();
await page.waitForTimeout(500);
await page.screenshot({ path: "D:/Fundas_System/scratch_results_expanded.png" });

await browser.close();
