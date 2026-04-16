import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const output = resolve("docs/screenshots");
await mkdir(output, { recursive: true });
const browser = await chromium.launch();

const prepare = async (page) => {
  await page.goto("http://127.0.0.1:4473");
  await page.getByRole("button", { name: "Reset lab" }).click();
  await page.getByRole("button", { name: "Run query" }).click();
  await page.getByRole("button", { name: "Apply guarded repair" }).click();
  await page.getByText("One active invoice remains: 1", { exact: true }).waitFor();
};

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
await prepare(desktop);
await desktop.screenshot({ path: resolve(output, "verified-repair-desktop.png"), fullPage: true });

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await prepare(mobile);
await mobile.screenshot({ path: resolve(output, "verified-repair-mobile.png"), fullPage: true });

await browser.close();
console.log(`Wrote screenshots to ${output}`);
